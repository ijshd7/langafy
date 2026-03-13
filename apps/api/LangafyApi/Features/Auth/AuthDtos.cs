namespace LangafyApi.Features.Auth;

/// <summary>
/// Request DTO for auth sync endpoint (no body required - uses JWT claims).
/// </summary>
public class SyncAuthRequest
{
}

/// <summary>
/// Response DTO for auth sync endpoint.
/// </summary>
public class SyncAuthResponse
{
    /// <summary>
    /// User's unique ID in the system.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// User's email address.
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's display name.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// User's currently active language code (e.g., "es" for Spanish).
    /// </summary>
    public string ActiveLanguageCode { get; set; } = string.Empty;

    /// <summary>
    /// User's current CEFR level in their active language.
    /// </summary>
    public string CurrentCefrLevel { get; set; } = string.Empty;

    /// <summary>
    /// Whether this is the user's first sync.
    /// </summary>
    public bool IsFirstSync { get; set; }
}
