namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents a user's enrollment in studying a language.
/// Users can study multiple languages simultaneously.
/// </summary>
public class UserLanguage
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public int LanguageId { get; set; }

    /// <summary>
    /// The current CEFR level the user is at for this language.
    /// Stored as the level code (e.g., "A1", "B2").
    /// </summary>
    public string CurrentCefrLevel { get; set; } = string.Empty;

    /// <summary>
    /// Whether this is the user's primary/active language.
    /// Only one language can be primary for a user at a time.
    /// </summary>
    public bool IsPrimary { get; set; }

    /// <summary>
    /// When the user started studying this language.
    /// </summary>
    public DateTime StartedAt { get; set; }

    // Navigation properties
    public AppUser User { get; set; } = null!;
    public Language Language { get; set; } = null!;
}
