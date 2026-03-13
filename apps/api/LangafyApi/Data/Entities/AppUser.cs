namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents a user account in the application.
/// </summary>
public class AppUser
{
    public int Id { get; set; }

    /// <summary>
    /// Unique Firebase UID for authentication.
    /// </summary>
    public string FirebaseUid { get; set; } = string.Empty;

    /// <summary>
    /// User's email address.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's display name.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// When the user account was created.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// When the user was last active.
    /// </summary>
    public DateTime LastActiveAt { get; set; }

    // Navigation properties
    public ICollection<UserLanguage> UserLanguages { get; set; } = new List<UserLanguage>();
    public ICollection<UserProgress> UserProgress { get; set; } = new List<UserProgress>();
    public ICollection<UserVocabulary> UserVocabulary { get; set; } = new List<UserVocabulary>();
}
