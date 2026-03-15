'use client';

import {
  MessageCircle,
  Plus,
  Send,
  Trash2,
  X,
  Bot,
  User,
  Loader2,
  ChevronLeft,
  AlertCircle,
  Lightbulb,
  BookPlus,
  Check,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';

import { useCurrentUser, useAuthLoading } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { getAuthToken } from '@/lib/firebase';

// ---------------------------------------------------------------------------
// Types matching the API DTOs
// ---------------------------------------------------------------------------

interface ConversationSummary {
  id: number;
  languageCode: string;
  languageName: string;
  cefrLevel: string;
  topic: string;
  lessonId: number | null;
  createdAt: string;
  messageCount: number;
}

interface ConversationDetail {
  id: number;
  languageCode: string;
  languageName: string;
  cefrLevel: string;
  topic: string;
  lessonId: number | null;
  createdAt: string;
  messages: Message[];
}

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ConversationListResponse {
  items: ConversationSummary[];
  total: number;
  page: number;
  pageSize: number;
}

// A streaming message doesn't have a server ID yet
interface LocalMessage {
  id: number | null;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

// ---------------------------------------------------------------------------
// Correction parsing
// ---------------------------------------------------------------------------

interface CorrectionSegment {
  type: 'text' | 'correction';
  content: string;
  original?: string;
  explanation?: string;
}

/**
 * Parses AI message content for [CORRECTION]original|corrected|explanation[/CORRECTION] tags.
 * Returns an array of text and correction segments for inline rendering.
 * Only called on complete (non-streaming) assistant messages.
 */
function parseMessageContent(content: string): CorrectionSegment[] {
  const segments: CorrectionSegment[] = [];
  const regex = /\[CORRECTION\]([\s\S]*?)\[\/CORRECTION\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    const parts = match[1].split('|');
    const original = parts[0]?.trim();
    const corrected = parts[1]?.trim();
    const explanation = parts[2]?.trim();
    if (original && corrected) {
      segments.push({ type: 'correction', content: corrected, original, explanation });
    } else {
      // Malformed tag — treat as plain text
      segments.push({ type: 'text', content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', content }];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString();
}

const CEFR_COLORS: Record<string, string> = {
  A1: 'text-emerald-400',
  A2: 'text-green-400',
  B1: 'text-cyan-400',
  B2: 'text-blue-400',
  C1: 'text-violet-400',
  C2: 'text-purple-400',
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/** Maps language codes to BCP-47 locales for STT / TTS. */
function toSttLocale(langCode: string): string {
  const map: Record<string, string> = {
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    it: 'it-IT',
    pt: 'pt-BR',
    ja: 'ja-JP',
    ko: 'ko-KR',
    zh: 'zh-CN',
  };
  return map[langCode] ?? langCode;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConversationSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl bg-slate-700/40 p-4">
          <div className="mb-2 h-4 w-3/4 rounded bg-slate-600/60" />
          <div className="h-3 w-1/2 rounded bg-slate-600/40" />
        </div>
      ))}
    </div>
  );
}

function EmptyChatState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 ring-1 ring-cyan-500/30">
        <Bot className="h-10 w-10 text-cyan-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-100">Start a conversation</h2>
        <p className="max-w-sm text-sm text-slate-400">
          Practice your Spanish with an AI tutor tailored to your CEFR level. Select a conversation
          from the sidebar or start a new one.
        </p>
      </div>
      <button
        onClick={onNew}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 active:scale-95">
        <Plus className="h-4 w-4" />
        New Conversation
      </button>
    </div>
  );
}

interface NewConversationModalProps {
  onClose: () => void;
  onStart: (topic: string, lessonId: number | null) => Promise<void>;
  isLoading: boolean;
}

const TOPIC_SUGGESTIONS = [
  'Greetings & introductions',
  'Ordering food at a restaurant',
  'Asking for directions',
  'Shopping vocabulary',
  'Talking about hobbies',
  'Daily routines',
  'Making plans with friends',
  'Travel and transportation',
];

function NewConversationModal({ onClose, onStart, isLoading }: NewConversationModalProps) {
  const [topic, setTopic] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart(topic.trim() || 'General conversation', null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/95 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200">
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-100">New Conversation</h2>
          <p className="mt-1 text-sm text-slate-400">
            Choose a topic or start with general Spanish practice.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Topic <span className="text-slate-500">(optional)</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Ordering food at a restaurant"
              maxLength={200}
              className="w-full rounded-xl border border-slate-600/60 bg-slate-700/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40"
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              Suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {TOPIC_SUGGESTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className="rounded-full border border-slate-600/50 px-3 py-1 text-xs text-slate-400 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-400">
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-600/60 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-700">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4" />
              )}
              Start
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: LocalMessage;
  onSendMessage?: (text: string) => void;
}

function MessageBubble({ message, onSendMessage }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copiedWord, setCopiedWord] = useState<string | null>(null);

  // Parse corrections only on complete assistant messages
  const segments =
    !isUser && !message.isStreaming
      ? parseMessageContent(message.content)
      : [{ type: 'text' as const, content: message.content }];

  const corrections = segments.filter((s) => s.type === 'correction');

  const handleCopyWord = async (word: string) => {
    try {
      await navigator.clipboard.writeText(word);
      setCopiedWord(word);
      setTimeout(() => setCopiedWord(null), 2000);
    } catch {
      // Clipboard unavailable — ignore
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-gradient-to-br from-cyan-500 to-emerald-500'
            : 'bg-slate-700 ring-1 ring-slate-600'
        }`}>
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-cyan-400" />
        )}
      </div>

      {/* Content column */}
      <div className={`flex max-w-[75%] flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? 'rounded-tr-sm bg-gradient-to-br from-cyan-600/80 to-emerald-600/80 text-white'
              : 'rounded-tl-sm border border-slate-700/50 bg-slate-800/80 text-slate-100'
          }`}>
          {segments.map((seg, i) =>
            seg.type === 'text' ? (
              <span key={i}>{seg.content}</span>
            ) : (
              <span
                key={i}
                className="rounded bg-amber-500/20 px-1 py-0.5 font-medium text-amber-300 ring-1 ring-inset ring-amber-500/30"
                title={`Was: ${seg.original}`}>
                {seg.content}
              </span>
            )
          )}
          {message.isStreaming && (
            <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-current opacity-70" />
          )}
        </div>

        {/* Correction detail cards — shown below the bubble once streaming ends */}
        {corrections.length > 0 && !message.isStreaming && (
          <div className="w-full space-y-2">
            {corrections.map((seg, i) => (
              <div
                key={i}
                className="rounded-xl border border-amber-500/20 bg-amber-950/30 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="text-red-400/70 line-through">{seg.original}</span>
                  <span className="text-slate-500">→</span>
                  <span className="font-medium text-amber-300">{seg.content}</span>
                </div>
                {seg.explanation && (
                  <p className="mt-1 text-xs text-slate-400">{seg.explanation}</p>
                )}
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <button
                    onClick={() =>
                      onSendMessage?.(
                        `Can you explain more about why "${seg.original}" should be "${seg.content}"?`
                      )
                    }
                    className="flex items-center gap-1 text-cyan-400 transition-colors hover:text-cyan-300">
                    <Lightbulb className="h-3 w-3" />
                    Explain this
                  </button>
                  <span className="text-slate-600">·</span>
                  <button
                    onClick={() => handleCopyWord(seg.content)}
                    className="flex items-center gap-1 text-emerald-400 transition-colors hover:text-emerald-300">
                    {copiedWord === seg.content ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <BookPlus className="h-3 w-3" />
                        Add to vocabulary
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ConversationPage() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const authLoading = useAuthLoading();

  // Conversation list
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Active conversation
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Input
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Modals / UI
  const [showNewModal, setShowNewModal] = useState(false);
  const [newConvLoading, setNewConvLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Voice input ───────────────────────────────────────────────────────────
  const [micSupported, setMicSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const ttsCountRef = useRef(0);

  // Check browser mic support once on mount
  useEffect(() => {
    setMicSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  // Cancel recognition / speech synthesis on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Speak the last AI message once streaming completes (if TTS is on)
  useEffect(() => {
    if (!ttsEnabled || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant' || last.isStreaming) return;
    if (messages.length <= ttsCountRef.current) return;
    ttsCountRef.current = messages.length;

    // Strip [CORRECTION] markup — speak the corrected forms, not raw tags
    const plain = last.content.replace(
      /\[CORRECTION\]([\s\S]*?)\[\/CORRECTION\]/g,
      (_, inner) => inner.split('|')[1]?.trim() ?? ''
    );
    const utterance = new SpeechSynthesisUtterance(plain);
    utterance.lang = toSttLocale(activeConversation?.languageCode ?? 'es');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [messages, ttsEnabled, activeConversation]);

  const startRecording = () => {
    const Ctor: (new () => SpeechRecognition) | undefined =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = toSttLocale(activeConversation?.languageCode ?? 'es');
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          setInputValue((prev) => prev + result[0].transcript);
          setInterimTranscript('');
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) setInterimTranscript(interim);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimTranscript('');
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setInterimTranscript('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    // State is cleared in onend
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.replace('/login');
    }
  }, [authLoading, currentUser, router]);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    try {
      const data = await apiClient.get<ConversationListResponse>('/conversations?pageSize=50');
      setConversations(data.items);
    } catch {
      // Silently ignore — user will see empty state
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser, loadConversations]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load a conversation
  const openConversation = useCallback(
    async (id: number) => {
      if (id === activeId) return;
      setActiveId(id);
      setChatLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<ConversationDetail>(`/conversations/${id}`);
        setActiveConversation(data);
        setMessages(data.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })));
      } catch {
        setError('Failed to load conversation.');
      } finally {
        setChatLoading(false);
      }
    },
    [activeId]
  );

  // Start a new conversation
  const startConversation = useCallback(
    async (topic: string, lessonId: number | null) => {
      setNewConvLoading(true);
      setError(null);
      try {
        const data = await apiClient.post<ConversationDetail>('/conversations', {
          languageCode: 'es',
          topic: topic || 'General conversation',
          lessonId: lessonId ?? undefined,
        });
        setShowNewModal(false);
        await loadConversations();
        setActiveId(data.id);
        setActiveConversation(data);
        setMessages([]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to start conversation.';
        setError(msg);
      } finally {
        setNewConvLoading(false);
      }
    },
    [loadConversations]
  );

  // Delete a conversation
  const deleteConversation = useCallback(
    async (id: number) => {
      try {
        await apiClient.delete(`/conversations/${id}`);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeId === id) {
          setActiveId(null);
          setActiveConversation(null);
          setMessages([]);
        }
      } catch {
        setError('Failed to delete conversation.');
      } finally {
        setDeleteConfirmId(null);
      }
    },
    [activeId]
  );

  // Core send function — accepts text directly so "Explain this" buttons can trigger it
  const sendText = useCallback(
    async (text: string) => {
      if (!text || isStreaming || !activeId) return;

      setInputValue('');
      setError(null);

      // Optimistically add user message + streaming placeholder
      const userMsg: LocalMessage = { id: null, role: 'user', content: text };
      const assistantMsg: LocalMessage = {
        id: null,
        role: 'assistant',
        content: '',
        isStreaming: true,
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      const abortController = new AbortController();
      streamAbortRef.current = abortController;

      try {
        const token = await getAuthToken();
        const response = await fetch(`${BASE_URL}/conversations/${activeId}/messages/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: text }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          let errMsg = `Error ${response.status}`;
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            errMsg = retryAfter
              ? `Rate limit reached. Try again in ${retryAfter}s.`
              : 'Rate limit reached. Try again later.';
          }
          setMessages((prev) => prev.slice(0, -1));
          setError(errMsg);
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;
            accumulated += data;
            const snap = accumulated;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { ...updated[updated.length - 1], content: snap };
              return updated;
            });
          }
        }

        // Mark streaming complete — parseMessageContent will run on next render
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], isStreaming: false };
          return updated;
        });

        loadConversations();
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setMessages((prev) => prev.slice(0, -1));
        setError('Failed to send message. Please try again.');
      } finally {
        setIsStreaming(false);
        streamAbortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [isStreaming, activeId, loadConversations]
  );

  // Wrapper that reads from the textarea input state
  const sendMessage = useCallback(async () => {
    await sendText(inputValue.trim());
  }, [inputValue, sendText]);

  // Handle Enter key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      {/* Page header */}
      <header className="relative z-10 border-b border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <h1 className="text-sm font-semibold text-slate-100">AI Conversation Practice</h1>
          {activeConversation && (
            <>
              <div className="h-4 w-px bg-slate-700" />
              <span
                className={`text-xs font-medium ${CEFR_COLORS[activeConversation.cefrLevel] ?? 'text-cyan-400'}`}>
                {activeConversation.cefrLevel}
              </span>
              <span className="text-xs text-slate-400">{activeConversation.languageName}</span>
            </>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200 sm:hidden">
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 gap-0">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'flex' : 'hidden'
          } w-full flex-col border-r border-slate-700/50 bg-slate-900/40 backdrop-blur-sm sm:flex sm:w-72 lg:w-80`}>
          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
            <span className="text-sm font-medium text-slate-300">Conversations</span>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 px-3 py-1.5 text-xs font-medium text-cyan-400 ring-1 ring-cyan-500/30 transition-all hover:from-cyan-500/30 hover:to-emerald-500/30 hover:text-cyan-300">
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <ConversationSkeleton />
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <MessageCircle className="h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">No conversations yet</p>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="text-xs text-cyan-400 transition-colors hover:text-cyan-300">
                  Start your first conversation
                </button>
              </div>
            ) : (
              <ul className="space-y-1 p-2">
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      onClick={() => {
                        openConversation(conv.id);
                        setSidebarOpen(false);
                      }}
                      className={`group relative w-full rounded-xl p-3 text-left transition-all ${
                        activeId === conv.id
                          ? 'bg-gradient-to-r from-cyan-500/15 to-emerald-500/10 ring-1 ring-cyan-500/25'
                          : 'hover:bg-slate-700/50'
                      }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-200">
                            {conv.topic}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className={`text-xs font-medium ${CEFR_COLORS[conv.cefrLevel] ?? 'text-cyan-400'}`}>
                              {conv.cefrLevel}
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-slate-500">
                              {conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-xs text-slate-500">
                              {formatRelativeTime(conv.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Delete button */}
                        {deleteConfirmId === conv.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                              }}
                              className="rounded px-2 py-0.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10">
                              Delete
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(null);
                              }}
                              className="rounded px-2 py-0.5 text-xs text-slate-500 transition-colors hover:bg-slate-700">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(conv.id);
                            }}
                            className="rounded p-1 text-slate-600 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Main chat area */}
        <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
          {!activeId ? (
            <EmptyChatState onNew={() => setShowNewModal(true)} />
          ) : chatLoading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : (
            <>
              {/* Conversation meta bar */}
              {activeConversation && (
                <div className="border-b border-slate-700/40 bg-slate-900/30 px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 ring-1 ring-cyan-500/25">
                      <Bot className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {activeConversation.topic}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activeConversation.languageName} ·{' '}
                        <span
                          className={CEFR_COLORS[activeConversation.cefrLevel] ?? 'text-cyan-400'}>
                          {activeConversation.cefrLevel}
                        </span>{' '}
                        · Started {formatRelativeTime(activeConversation.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <Bot className="h-10 w-10 text-slate-600" />
                    <p className="text-sm text-slate-500">
                      Send your first message to start practicing!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {messages.map((msg, idx) => (
                      <MessageBubble
                        key={msg.id ?? `local-${idx}`}
                        message={msg}
                        onSendMessage={sendText}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Error banner */}
              {error && (
                <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 sm:mx-6">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                  <p className="flex-1 text-sm text-red-300">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 transition-colors hover:text-red-300">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Input area */}
              <div className="border-t border-slate-700/50 bg-slate-900/40 px-4 py-4 backdrop-blur-sm sm:px-6">
                <div className="flex items-end gap-2">
                  <div className="flex-1 rounded-2xl border border-slate-600/60 bg-slate-800/60 focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/30">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={isRecording ? inputValue + interimTranscript : inputValue}
                      onChange={isRecording ? () => {} : handleInput}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isRecording
                          ? 'Listening…'
                          : 'Type a message… (Enter to send, Shift+Enter for new line)'
                      }
                      disabled={isStreaming}
                      className="w-full resize-none rounded-2xl bg-transparent px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none disabled:opacity-50"
                      style={{ maxHeight: '160px' }}
                    />
                  </div>

                  {/* Microphone button — hidden on unsupported browsers (e.g. Firefox) */}
                  {micSupported && (
                    <button
                      onClick={toggleRecording}
                      disabled={isStreaming}
                      title={isRecording ? 'Stop recording' : 'Start voice input'}
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                        isRecording
                          ? 'animate-pulse bg-red-500 text-white shadow-lg shadow-red-500/25'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                      }`}>
                      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}

                  {/* TTS toggle — always visible */}
                  <button
                    onClick={() => setTtsEnabled((v) => !v)}
                    title={ttsEnabled ? 'Disable voice responses' : 'Enable voice responses'}
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all active:scale-95 ${
                      ttsEnabled
                        ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30 hover:bg-cyan-500/30'
                        : 'bg-slate-700 text-slate-500 hover:bg-slate-600 hover:text-slate-300'
                    }`}>
                    {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </button>

                  {/* Send button */}
                  <button
                    onClick={sendMessage}
                    disabled={!inputValue.trim() || isStreaming || isRecording}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-cyan-500/40 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-center text-xs text-slate-600">
                  Powered by OpenRouter · Messages limited to 30/hour
                </p>
              </div>
            </>
          )}
        </main>
      </div>

      {/* New conversation modal */}
      {showNewModal && (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onStart={startConversation}
          isLoading={newConvLoading}
        />
      )}
    </div>
  );
}
