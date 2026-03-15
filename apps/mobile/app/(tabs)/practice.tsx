import { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import {
  MessageSquareIcon,
  SendIcon,
  PlusIcon,
  ArrowLeftIcon,
  XIcon,
  TrashIcon,
  BotIcon,
  MessageCircleIcon,
} from 'lucide-react-native'
import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import { apiClient } from '@/lib/api'

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

function MessageBubble({ message }: { message: LocalMessage }) {
  const isUser = message.role === 'user'

  if (message.isTyping) {
    return <TypingIndicator />
  }

  return (
    <View className={`flex-row items-end gap-2 px-4 py-1 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <View className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 items-center justify-center shrink-0">
          <Icon as={BotIcon} className="size-4 text-cyan-400" />
        </View>
      )}
      <View
        className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-cyan-600 rounded-br-sm'
            : 'bg-slate-800 border border-slate-700 rounded-bl-sm'
        }`}
        style={{ maxWidth: '78%' }}
      >
        <Text className={`text-sm leading-5 ${isUser ? 'text-white' : 'text-slate-100'}`}>
          {message.content}
        </Text>
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

  const sendMessage = async () => {
    if (!inputText.trim() || !activeConversation || isSending) return

    const text = inputText.trim()
    setInputText('')
    setError(null)

    // Optimistically add user message + typing indicator
    const userMsg: LocalMessage = { id: `user-${Date.now()}`, role: 'user', content: text }
    const typingMsg: LocalMessage = {
      id: 'typing',
      role: 'assistant',
      content: '',
      isTyping: true,
    }
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
          renderItem={({ item }) => <MessageBubble message={item} />}
          inverted
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input area */}
      <View className="flex-row items-end gap-2 px-4 py-3 border-t border-border">
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message in Spanish..."
          placeholderTextColor="#64748B"
          multiline
          maxLength={1000}
          className="flex-1 bg-card border border-border rounded-2xl px-4 py-3"
          style={{ color: '#F1F5F9', maxHeight: 120 }}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          onPress={sendMessage}
          disabled={!inputText.trim() || isSending}
          activeOpacity={0.7}
          className={`h-11 w-11 rounded-full items-center justify-center ${
            inputText.trim() && !isSending ? 'bg-cyan-600' : 'bg-slate-800'
          }`}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#06B6D4" />
          ) : (
            <Icon
              as={SendIcon}
              className={`size-5 ${inputText.trim() ? 'text-white' : 'text-slate-500'}`}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
