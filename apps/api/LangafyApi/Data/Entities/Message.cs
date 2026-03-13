namespace LangafyApi.Data.Entities;

/// <summary>
/// Enum for message roles in a conversation.
/// </summary>
public enum MessageRole
{
    System,
    User,
    Assistant
}

/// <summary>
/// Represents a single message within an AI conversation.
/// </summary>
public class Message
{
    public int Id { get; set; }

    public int ConversationId { get; set; }

    /// <summary>
    /// Role of the message sender (system, user, or assistant).
    /// </summary>
    public MessageRole Role { get; set; }

    /// <summary>
    /// Content of the message.
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// When the message was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Conversation Conversation { get; set; } = null!;
}
