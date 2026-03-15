namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents an AI conversation session for language practice.
/// </summary>
public class Conversation
{
    /// <inheritdoc/>
    public int Id { get; set; }

    /// <inheritdoc/>
    public int UserId { get; set; }
    /// <inheritdoc/>
    public int LanguageId { get; set; }
    /// <inheritdoc/>
    public int? LessonId { get; set; }

    /// <summary>
    /// The CEFR level context for this conversation.
    /// Stored as the level code (e.g., "A1", "B2").
    /// </summary>
    public string CefrLevel { get; set; } = string.Empty;

    /// <summary>
    /// Topic or theme of the conversation.
    /// </summary>
    public string Topic { get; set; } = string.Empty;

    /// <summary>
    /// When the conversation was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    /// <inheritdoc/>
    public AppUser User { get; set; } = null!;
    /// <inheritdoc/>
    public Language Language { get; set; } = null!;
    /// <inheritdoc/>
    public Lesson? Lesson { get; set; }
    /// <inheritdoc/>
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
