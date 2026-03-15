namespace LangafyApi.Features.Conversations;

/// <summary>
/// Request to start a new AI conversation.
/// </summary>
public class StartConversationRequest
{
    /// <summary>
    /// Language code for the conversation (e.g., "es" for Spanish).
    /// </summary>
    public string LanguageCode { get; set; } = string.Empty;

    /// <summary>
    /// Optional lesson ID to tie this conversation to a lesson context.
    /// When provided, the AI tutor's system prompt includes the lesson objective.
    /// </summary>
    public int? LessonId { get; set; }

    /// <summary>
    /// Optional topic or theme for the conversation.
    /// Defaults to "General conversation" if not provided.
    /// </summary>
    public string? Topic { get; set; }
}

/// <summary>
/// Request to send a message in an existing conversation.
/// </summary>
public class SendMessageRequest
{
    /// <summary>
    /// The user's message content.
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Response after successfully starting a new conversation.
/// </summary>
public class StartConversationResponse
{
    /// <summary>Unique conversation identifier.</summary>
    public int Id { get; set; }

    /// <summary>Language code (e.g., "es").</summary>
    public string LanguageCode { get; set; } = string.Empty;

    /// <summary>CEFR level active at conversation start (e.g., "A1").</summary>
    public string CefrLevel { get; set; } = string.Empty;

    /// <summary>Conversation topic or theme.</summary>
    public string Topic { get; set; } = string.Empty;

    /// <summary>When the conversation was created.</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Summary of a conversation for list views.
/// </summary>
public class ConversationSummaryDto
{
    /// <summary>Unique conversation identifier.</summary>
    public int Id { get; set; }

    /// <summary>Language code (e.g., "es").</summary>
    public string LanguageCode { get; set; } = string.Empty;

    /// <summary>Full language name (e.g., "Spanish").</summary>
    public string LanguageName { get; set; } = string.Empty;

    /// <summary>CEFR level at the time the conversation was started.</summary>
    public string CefrLevel { get; set; } = string.Empty;

    /// <summary>Conversation topic or theme.</summary>
    public string Topic { get; set; } = string.Empty;

    /// <summary>Optional lesson ID if the conversation is tied to a lesson.</summary>
    public int? LessonId { get; set; }

    /// <summary>When the conversation was created.</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>Number of user + assistant messages (system messages excluded).</summary>
    public int MessageCount { get; set; }
}

/// <summary>
/// Full conversation detail including the complete message history.
/// </summary>
public class ConversationDetailDto
{
    /// <summary>Unique conversation identifier.</summary>
    public int Id { get; set; }

    /// <summary>Language code (e.g., "es").</summary>
    public string LanguageCode { get; set; } = string.Empty;

    /// <summary>Full language name (e.g., "Spanish").</summary>
    public string LanguageName { get; set; } = string.Empty;

    /// <summary>CEFR level at the time the conversation was started.</summary>
    public string CefrLevel { get; set; } = string.Empty;

    /// <summary>Conversation topic or theme.</summary>
    public string Topic { get; set; } = string.Empty;

    /// <summary>Optional lesson ID if tied to a lesson.</summary>
    public int? LessonId { get; set; }

    /// <summary>When the conversation was created.</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>All user and assistant messages in chronological order.</summary>
    public List<MessageDto> Messages { get; set; } = new();
}

/// <summary>
/// A single message in a conversation.
/// </summary>
public class MessageDto
{
    /// <summary>Unique message identifier.</summary>
    public int Id { get; set; }

    /// <summary>Message role: "user" or "assistant".</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>Message content, may include inline [CORRECTION] tags from the AI tutor.</summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>When the message was created.</summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Response after sending a message (non-streaming).
/// Contains both the persisted user message and the AI's response.
/// </summary>
public class SendMessageResponse
{
    /// <summary>The user's message as persisted.</summary>
    public MessageDto UserMessage { get; set; } = new();

    /// <summary>The AI tutor's response message.</summary>
    public MessageDto AssistantMessage { get; set; } = new();
}

/// <summary>
/// Paginated list of the user's conversations.
/// </summary>
public class ConversationListResponse
{
    /// <summary>Conversations on the current page, ordered newest first.</summary>
    public List<ConversationSummaryDto> Items { get; set; } = new();

    /// <summary>Total number of conversations matching the current filter.</summary>
    public int Total { get; set; }

    /// <summary>Current page number (1-based).</summary>
    public int Page { get; set; }

    /// <summary>Number of items per page.</summary>
    public int PageSize { get; set; }
}
