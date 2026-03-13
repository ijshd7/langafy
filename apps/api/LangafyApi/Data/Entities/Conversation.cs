namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents an AI conversation session for language practice.
/// </summary>
public class Conversation
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public int LanguageId { get; set; }
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
    public AppUser User { get; set; } = null!;
    public Language Language { get; set; } = null!;
    public Lesson? Lesson { get; set; }
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
