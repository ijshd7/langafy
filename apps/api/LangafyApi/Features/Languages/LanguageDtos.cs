namespace LangafyApi.Features.Languages;

/// <summary>
/// Response DTO for a language.
/// </summary>
public class LanguageDto
{
    /// <summary>
    /// Unique language code (e.g., "es" for Spanish).
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Language name in English (e.g., "Spanish").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Language name in its native language (e.g., "Español").
    /// </summary>
    public string NativeName { get; set; } = string.Empty;

    /// <summary>
    /// Whether this language is currently available for study.
    /// </summary>
    public bool IsActive { get; set; }
}

/// <summary>
/// Request DTO to add a language to user's study list.
/// </summary>
public class AddUserLanguageRequest
{
    /// <summary>
    /// Language code to add (e.g., "es").
    /// </summary>
    public string LanguageCode { get; set; } = string.Empty;

    /// <summary>
    /// Optional CEFR level to start at (defaults to "A1").
    /// </summary>
    public string? StartingCefrLevel { get; set; }
}

/// <summary>
/// Request DTO to set a language as primary/active.
/// </summary>
public class SetPrimaryLanguageRequest
{
    /// <summary>
    /// Language code to set as primary (e.g., "es").
    /// </summary>
    public string LanguageCode { get; set; } = string.Empty;
}

/// <summary>
/// Response DTO for user language assignment operations.
/// </summary>
public class UserLanguageDto
{
    /// <summary>
    /// Language code.
    /// </summary>
    public string LanguageCode { get; set; } = string.Empty;

    /// <summary>
    /// Language name in English.
    /// </summary>
    public string LanguageName { get; set; } = string.Empty;

    /// <summary>
    /// Current CEFR level in this language.
    /// </summary>
    public string CurrentCefrLevel { get; set; } = string.Empty;

    /// <summary>
    /// Whether this is the user's primary/active language.
    /// </summary>
    public bool IsPrimary { get; set; }

    /// <summary>
    /// When the user started studying this language.
    /// </summary>
    public DateTime StartedAt { get; set; }
}
