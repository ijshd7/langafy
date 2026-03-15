import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated'
import {
  MessageSquareIcon,
  SendIcon,
  PlusIcon,
  ArrowLeftIcon,
  XIcon,
  TrashIcon,
  BotIcon,
  MessageCircleIcon,
  MicIcon,
  MicOffIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react-native'
import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import { apiClient } from '@/lib/api'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import * as Speech from 'expo-speech'

// --- Types ---

interface ConversationSummary {
  id: number
  topic: string | null
  cefrLevel: string
  languageCode: string
  languageName: string
  createdAt: string
  messageCount: number
  lastMessage: string | null
}

interface MessageDto {
  id: number
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ConversationDetail {
  id: number
  topic: string | null
  cefrLevel: string
  languageCode: string
  languageName: string
  messages: MessageDto[]
}

interface ConversationListResponse {
  items: ConversationSummary[]
  total: number
}

interface SendMessageResponse {
  userMessage: MessageDto
  assistantMessage: MessageDto
}

interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isTyping?: boolean
}

// --- Correction parsing ---

interface CorrectionSegment {
  type: 'text' | 'correction'
  content: string
  original?: string
  explanation?: string
}

function parseMessageContent(content: string): CorrectionSegment[] {
  const segments: CorrectionSegment[] = []
  const regex = /\[CORRECTION\]([\s\S]*?)\[\/CORRECTION\]/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    const parts = match[1].split('|')
    const original = parts[0]?.trim()
    const corrected = parts[1]?.trim()
    const explanation = parts[2]?.trim()
    if (original && corrected) {
      segments.push({ type: 'correction', content: corrected, original, explanation })
    } else {
      segments.push({ type: 'text', content: match[0] })
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', content }]
}

// --- Helpers ---

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
  }
  return map[langCode] ?? langCode
}

// --- Constants ---

const TOPIC_SUGGESTIONS = [
  'Daily routine',
  'Food and restaurants',
  'Travel and directions',
  'Shopping',
  'Weather and seasons',
  'Family and friends',
  'Work and hobbies',
  'Health and wellness',
]

const CEFR_COLORS: Record<string, string> = {
  A1: 'text-emerald-400',
  A2: 'text-green-400',
  B1: 'text-cyan-400',
  B2: 'text-blue-400',
  C1: 'text-violet-400',
  C2: 'text-purple-400',
}

// --- Sub-components ---

/** Three animated bars shown inside the mic button while recording. */
function RecordingWaveform() {
  const bar1 = useSharedValue(0.3)
  const bar2 = useSharedValue(0.6)
  const bar3 = useSharedValue(0.4)

  useEffect(() => {
    bar1.value = withRepeat(
      withSequence(withTiming(1, { duration: 250 }), withTiming(0.3, { duration: 250 })),
      -1,
      true
    )
    bar2.value = withRepeat(
      withSequence(withTiming(0.4, { duration: 350 }), withTiming(1, { duration: 350 })),
      -1,
      true
    )
    bar3.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 200 }), withTiming(0.2, { duration: 200 })),
      -1,
      true
    )
    return () => {
      cancelAnimation(bar1)
      cancelAnimation(bar2)
      cancelAnimation(bar3)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const s1 = useAnimatedStyle(() => ({ height: bar1.value * 20 }))
  const s2 = useAnimatedStyle(() => ({ height: bar2.value * 20 }))
  const s3 = useAnimatedStyle(() => ({ height: bar3.value * 20 }))

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 20 }}>
      <Animated.View style={[s1, { width: 3, borderRadius: 2, backgroundColor: 'white' }]} />
      <Animated.View style={[s2, { width: 3, borderRadius: 2, backgroundColor: 'white' }]} />
      <Animated.View style={[s3, { width: 3, borderRadius: 2, backgroundColor: 'white' }]} />
    </View>
  )
}

function TypingIndicator() {
  return (
    <View className="flex-row items-end gap-2 px-4 py-2">
      <View className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 items-center justify-center">
        <Icon as={BotIcon} className="size-4 text-cyan-400" />
      </View>
      <View className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#06B6D4" />
          <Text className="text-sm text-muted-foreground">Typing...</Text>
        </View>
      </View>
    </View>
  )
}

function MessageBubble({
  message,
  onSendMessage,
}: {
  message: LocalMessage
  onSendMessage?: (text: string) => void
}) {
  const isUser = message.role === 'user'
  const [addedWord, setAddedWord] = useState<string | null>(null)

  if (message.isTyping) {
    return <TypingIndicator />
  }

  // Parse corrections only on complete assistant messages
  const segments =
    !isUser && !message.isTyping
      ? parseMessageContent(message.content)
      : [{ type: 'text' as const, content: message.content }]

  const corrections = segments.filter((s) => s.type === 'correction')

  const handleAddVocab = (word: string) => {
    setAddedWord(word)
    setTimeout(() => setAddedWord(null), 2000)
  }

  return (
    <View className={`flex-row items-end gap-2 px-4 py-1 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <View className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 items-center justify-center shrink-0">
          <Icon as={BotIcon} className="size-4 text-cyan-400" />
        </View>
      )}

      {/* Content column */}
      <View style={{ maxWidth: '78%' }} className="gap-1">
        {/* Message bubble */}
        <View
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-cyan-600 rounded-br-sm'
              : 'bg-slate-800 border border-slate-700 rounded-bl-sm'
          }`}
        >
          <Text className={`text-sm leading-5 ${isUser ? 'text-white' : 'text-slate-100'}`}>
            {segments.map((seg, i) =>
              seg.type === 'text' ? (
                <Text key={i}>{seg.content}</Text>
              ) : (
                <Text key={i} className="text-amber-300 font-semibold">
                  {seg.content}
                </Text>
              )
            )}
          </Text>
        </View>

        {/* Correction cards — shown below bubble once message is complete */}
        {corrections.length > 0 &&
          corrections.map((seg, i) => (
            <View
              key={i}
              className="rounded-xl border border-amber-500/20 bg-amber-950/30 px-3 py-2.5 gap-1"
            >
              <View className="flex-row flex-wrap items-center gap-x-2">
                <Text className="text-xs text-red-400 line-through">{seg.original}</Text>
                <Text className="text-xs text-slate-500">→</Text>
                <Text className="text-xs font-semibold text-amber-300">{seg.content}</Text>
              </View>
              {seg.explanation ? (
                <Text className="text-xs text-slate-400">{seg.explanation}</Text>
              ) : null}
              <View className="flex-row items-center gap-3 mt-1">
                <TouchableOpacity
                  onPress={() =>
                    onSendMessage?.(
                      `Can you explain more about why "${seg.original}" should be "${seg.content}"?`
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-cyan-400">Explain this</Text>
                </TouchableOpacity>
                <Text className="text-xs text-slate-600">·</Text>
                <TouchableOpacity
                  onPress={() => handleAddVocab(seg.content)}
                  activeOpacity={0.7}
                >
                  <Text className="text-xs text-emerald-400">
                    {addedWord === seg.content ? '✓ Added' : 'Add to vocabulary'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
      </View>
    </View>
  )
}

interface NewConversationModalProps {
  visible: boolean
  onClose: () => void
  onStart: (topic: string) => void
  isLoading: boolean
}

function NewConversationModal({ visible, onClose, onStart, isLoading }: NewConversationModalProps) {
  const [topic, setTopic] = useState('')

  const handleClose = () => {
    setTopic('')
    onClose()
  }

  const handleStart = () => {
    onStart(topic.trim())
    setTopic('')
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-border">
          <Text className="text-lg font-semibold text-foreground">New Conversation</Text>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon as={XIcon} className="size-6 text-muted-foreground" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 py-6" keyboardShouldPersistTaps="handled">
          {/* Topic input */}
          <View className="gap-2 mb-6">
            <Text className="text-sm font-medium text-foreground">Topic (optional)</Text>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Daily routine, Food, Travel..."
              placeholderTextColor="#64748B"
              className="bg-card border border-border rounded-xl px-4 py-3"
              style={{ color: '#F1F5F9' }}
            />
            <Text className="text-xs text-muted-foreground">
              Leave blank to start a free-form conversation.
            </Text>
          </View>

          {/* Topic suggestions */}
          <View className="gap-3">
            <Text className="text-sm font-medium text-foreground">Suggestions</Text>
            <View className="flex-row flex-wrap gap-2">
              {TOPIC_SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setTopic(s)}
                  activeOpacity={0.7}
                  className={`px-3 py-2 rounded-full border ${
                    topic === s ? 'bg-cyan-600 border-cyan-600' : 'bg-card border-border'
                  }`}
                >
                  <Text className={`text-sm ${topic === s ? 'text-white' : 'text-foreground'}`}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Start button */}
        <View className="px-4 py-4 border-t border-border">
          <TouchableOpacity
            onPress={handleStart}
            disabled={isLoading}
            activeOpacity={0.7}
            className="bg-cyan-600 rounded-xl py-4 items-center"
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">Start Conversation</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// --- Main Screen ---

export default function PracticeScreen() {
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeConversation, setActiveConversation] = useState<ConversationDetail | null>(null)
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  // ── Voice input ───────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const ttsCountRef = useRef(0)

  // Speech recognition event handlers (hooks must be at top level, before early returns)
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript ?? ''
    if (event.isFinal) {
      setInputText((prev) => (prev ? prev + ' ' : '') + transcript)
      setInterimTranscript('')
    } else {
      setInterimTranscript(transcript)
    }
  })

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false)
    setInterimTranscript('')
  })

  useSpeechRecognitionEvent('error', () => {
    setIsRecording(false)
    setInterimTranscript('')
  })

  // Stop TTS when unmounting
  useEffect(() => {
    return () => {
      Speech.stop()
    }
  }, [])

  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingList(true)
      setError(null)
      const data = await apiClient.get<ConversationListResponse>('/conversations')
      setConversations(data.items)
    } catch {
      setError('Failed to load conversations.')
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const openConversation = async (id: number) => {
    try {
      setIsLoadingChat(true)
      setError(null)
      const data = await apiClient.get<ConversationDetail>(`/conversations/${id}`)
      setActiveConversation(data)
      setMessages(
        data.messages.map((m) => ({ id: String(m.id), role: m.role, content: m.content }))
      )
      setView('chat')
    } catch {
      setError('Failed to load conversation.')
    } finally {
      setIsLoadingChat(false)
    }
  }

  const createConversation = async (topic: string) => {
    try {
      setIsCreating(true)
      setError(null)
      const conversation = await apiClient.post<ConversationDetail>('/conversations', {
        languageCode: 'es',
        topic: topic || null,
      })
      setActiveConversation(conversation)
      setMessages([])
      setConversations((prev) => [
        {
          id: conversation.id,
          topic: conversation.topic,
          cefrLevel: conversation.cefrLevel,
          languageCode: conversation.languageCode,
          languageName: conversation.languageName,
          createdAt: new Date().toISOString(),
          messageCount: 0,
          lastMessage: null,
        },
        ...prev,
      ])
      setShowNewModal(false)
      setView('chat')
    } catch {
      setError('Failed to create conversation.')
    } finally {
      setIsCreating(false)
    }
  }

  // Core send function — accepts text directly so "Explain this" buttons can trigger it
  const sendText = useCallback(
    async (text: string) => {
      if (!text || !activeConversation || isSending) return

      setInputText('')
      setError(null)

      const userMsg: LocalMessage = { id: `user-${Date.now()}`, role: 'user', content: text }
      const typingMsg: LocalMessage = { id: 'typing', role: 'assistant', content: '', isTyping: true }
      setMessages((prev) => [...prev, userMsg, typingMsg])
      setIsSending(true)

      try {
        const response = await apiClient.post<SendMessageResponse>(
          `/conversations/${activeConversation.id}/messages`,
          { message: text }
        )
        setMessages((prev) => {
          const withoutTyping = prev.filter((m) => !m.isTyping)
          return [
            ...withoutTyping,
            {
              id: String(response.assistantMessage.id),
              role: 'assistant',
              content: response.assistantMessage.content,
            },
          ]
        })
      } catch (err: unknown) {
        setMessages((prev) => prev.filter((m) => !m.isTyping))
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 429) {
          setError('Message limit reached. Please wait before sending more messages.')
        } else {
          setError('Failed to send message. Please try again.')
        }
      } finally {
        setIsSending(false)
      }
    },
    [activeConversation, isSending]
  )

  // Wrapper that reads from the TextInput state
  const sendMessage = useCallback(async () => {
    await sendText(inputText.trim())
  }, [inputText, sendText])

  // Speak last AI message when it arrives (if TTS is on)
  useEffect(() => {
    if (!ttsEnabled || isSending) return
    const assistantMsgs = messages.filter((m) => m.role === 'assistant' && !m.isTyping)
    if (assistantMsgs.length <= ttsCountRef.current) return
    ttsCountRef.current = assistantMsgs.length

    const last = assistantMsgs[assistantMsgs.length - 1]
    // Strip [CORRECTION] markup — speak corrected forms
    const plain = last.content.replace(
      /\[CORRECTION\]([\s\S]*?)\[\/CORRECTION\]/g,
      (_, inner) => inner.split('|')[1]?.trim() ?? ''
    )
    Speech.speak(plain, { language: toSttLocale(activeConversation?.languageCode ?? 'es') })
  }, [messages, ttsEnabled, isSending, activeConversation])

  const handleMicPressIn = async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!granted) {
      setError('Microphone permission is required for voice input.')
      return
    }
    ExpoSpeechRecognitionModule.start({
      lang: toSttLocale(activeConversation?.languageCode ?? 'es'),
      interimResults: true,
      continuous: false,
    })
    setIsRecording(true)
  }

  const handleMicPressOut = () => {
    ExpoSpeechRecognitionModule.stop()
    // isRecording cleared by 'end' event
  }

  const deleteConversation = (id: number) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/conversations/${id}`)
              setConversations((prev) => prev.filter((c) => c.id !== id))
              if (activeConversation?.id === id) {
                handleBack()
              }
            } catch {
              setError('Failed to delete conversation.')
            }
          },
        },
      ]
    )
  }

  const handleBack = () => {
    setView('list')
    setActiveConversation(null)
    setMessages([])
    setError(null)
    loadConversations()
  }

  const renderConversationItem = ({ item }: { item: ConversationSummary }) => (
    <TouchableOpacity
      onPress={() => openConversation(item.id)}
      activeOpacity={0.7}
      className="flex-row items-center gap-3 px-4 py-4 border-b border-border"
    >
      <View className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 items-center justify-center shrink-0">
        <Icon as={MessageSquareIcon} className="size-5 text-cyan-400" />
      </View>
      <View className="flex-1 min-w-0 gap-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="font-medium text-foreground flex-1" numberOfLines={1}>
            {item.topic ?? 'Free conversation'}
          </Text>
          <Text className={`text-xs font-semibold ${CEFR_COLORS[item.cefrLevel] ?? 'text-muted-foreground'}`}>
            {item.cefrLevel}
          </Text>
        </View>
        <Text className="text-sm text-muted-foreground" numberOfLines={1}>
          {item.lastMessage ?? 'No messages yet'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => deleteConversation(item.id)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="p-2"
      >
        <Icon as={TrashIcon} className="size-4 text-muted-foreground" />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  // ── LIST VIEW ─────────────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-border">
          <View>
            <Text className="text-xl font-bold text-foreground">Practice</Text>
            <Text className="text-sm text-muted-foreground">AI Conversation</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowNewModal(true)}
            activeOpacity={0.7}
            className="flex-row items-center gap-2 bg-cyan-600 rounded-xl px-4 py-2"
          >
            <Icon as={PlusIcon} className="size-4 text-white" />
            <Text className="text-sm font-semibold text-white">New</Text>
          </TouchableOpacity>
        </View>

        {/* Error banner */}
        {error && (
          <Animated.View
            entering={FadeIn}
            exiting={FadeOut}
            className="mx-4 mt-3 px-4 py-3 bg-red-950 border border-red-800 rounded-xl"
          >
            <Text className="text-sm text-red-300">{error}</Text>
          </Animated.View>
        )}

        {/* Content */}
        {isLoadingList ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#06B6D4" />
          </View>
        ) : isLoadingChat ? (
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator size="large" color="#06B6D4" />
            <Text className="text-sm text-muted-foreground">Loading conversation...</Text>
          </View>
        ) : conversations.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-5 px-8">
            <View className="h-16 w-16 rounded-2xl bg-slate-800 border border-slate-700 items-center justify-center">
              <Icon as={MessageCircleIcon} className="size-8 text-cyan-400" />
            </View>
            <View className="gap-2">
              <Text className="text-center text-xl font-bold text-foreground">Start Practicing</Text>
              <Text className="text-center text-sm text-muted-foreground">
                Chat with an AI tutor to practice your Spanish conversation skills.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowNewModal(true)}
              activeOpacity={0.7}
              className="bg-cyan-600 rounded-xl px-8 py-3"
            >
              <Text className="text-white font-semibold">New Conversation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderConversationItem}
            showsVerticalScrollIndicator={false}
          />
        )}

        <NewConversationModal
          visible={showNewModal}
          onClose={() => setShowNewModal(false)}
          onStart={createConversation}
          isLoading={isCreating}
        />
      </View>
    )
  }

  // ── CHAT VIEW ─────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon as={ArrowLeftIcon} className="size-6 text-foreground" />
        </TouchableOpacity>
        <View className="flex-1 min-w-0">
          <Text className="font-semibold text-foreground" numberOfLines={1}>
            {activeConversation?.topic ?? 'Free conversation'}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {activeConversation?.languageName}
            {activeConversation?.cefrLevel ? (
              <Text className={` ${CEFR_COLORS[activeConversation.cefrLevel] ?? 'text-muted-foreground'}`}>
                {' '}• {activeConversation.cefrLevel}
              </Text>
            ) : null}
          </Text>
        </View>
        {/* TTS toggle */}
        <TouchableOpacity
          onPress={() => setTtsEnabled((v) => !v)}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <Icon
            as={ttsEnabled ? Volume2Icon : VolumeXIcon}
            className={`size-5 ${ttsEnabled ? 'text-cyan-400' : 'text-muted-foreground'}`}
          />
        </TouchableOpacity>

        {activeConversation && (
          <TouchableOpacity
            onPress={() => deleteConversation(activeConversation.id)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-1"
          >
            <Icon as={TrashIcon} className="size-5 text-muted-foreground" />
          </TouchableOpacity>
        )}
      </View>

      {/* Error banner */}
      {error && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          className="mx-4 mt-2 px-4 py-3 bg-red-950 border border-red-800 rounded-xl"
        >
          <TouchableOpacity onPress={() => setError(null)}>
            <Text className="text-sm text-red-300">{error} Tap to dismiss.</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Icon as={BotIcon} className="size-12 text-cyan-400" />
          <View className="gap-2">
            <Text className="text-center text-base font-semibold text-foreground">
              Start the conversation!
            </Text>
            <Text className="text-center text-sm text-muted-foreground">
              Say hello or ask a question in Spanish.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} onSendMessage={sendText} />}
          inverted
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input area */}
      <View className="flex-row items-end gap-2 px-4 py-3 border-t border-border">
        <TextInput
          value={isRecording ? inputText + interimTranscript : inputText}
          onChangeText={isRecording ? undefined : setInputText}
          editable={!isRecording}
          placeholder={isRecording ? 'Listening…' : 'Type a message in Spanish...'}
          placeholderTextColor="#64748B"
          multiline
          maxLength={1000}
          className="flex-1 bg-card border border-border rounded-2xl px-4 py-3"
          style={{ color: '#F1F5F9', maxHeight: 120 }}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={isRecording ? undefined : sendMessage}
        />

        {/* Hold-to-talk microphone button */}
        <Pressable
          onPressIn={handleMicPressIn}
          onPressOut={handleMicPressOut}
          disabled={isSending}
          style={{ height: 44, width: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
          className={isRecording ? 'bg-red-500' : 'bg-slate-800'}
        >
          {isRecording ? (
            <RecordingWaveform />
          ) : (
            <Icon as={MicIcon} className="size-5 text-slate-400" />
          )}
        </Pressable>

        {/* Send button */}
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!inputText.trim() || isSending || isRecording}
          activeOpacity={0.7}
          className={`h-11 w-11 rounded-full items-center justify-center ${
            inputText.trim() && !isSending && !isRecording ? 'bg-cyan-600' : 'bg-slate-800'
          }`}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#06B6D4" />
          ) : (
            <Icon
              as={SendIcon}
              className={`size-5 ${inputText.trim() && !isRecording ? 'text-white' : 'text-slate-500'}`}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
