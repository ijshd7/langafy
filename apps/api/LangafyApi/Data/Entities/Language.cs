namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents a language that can be studied on the platform.
/// </summary>
public class Language
{
    public int Id { get; set; }

    /// <summary>
    /// Unique language code (e.g., "es" for Spanish, "fr" for French).
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Display name in English (e.g., "Spanish").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Display name in the native language (e.g., "Español").
    /// </summary>
    public string NativeName { get; set; } = string.Empty;

    /// <summary>
    /// Whether this language is currently available for study.
    /// </summary>
    public bool IsActive { get; set; }

    // Navigation properties
    public ICollection<Unit> Units { get; set; } = new List<Unit>();
}
