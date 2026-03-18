namespace LangafyApi.Features.Auth;

/// <summary>
/// Request DTO for auth sync endpoint.
/// Accepts optional first/last name for new user registration.
/// </summary>
public class SyncAuthRequest
{
    /// <summary>
    /// User's first name (optional, used during initial registration).
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// User's last name (optional, used during initial registration).
    /// </summary>
    public string? LastName { get; set; }
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
    /// User's first name.
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// User's last name.
    /// </summary>
    public string? LastName { get; set; }

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

/// <summary>
/// Request DTO for updating user profile.
/// </summary>
public class UpdateProfileRequest
{
    /// <summary>
    /// User's first name (required, max 100 characters).
    /// </summary>
    public required string FirstName { get; set; }

    /// <summary>
    /// User's last name (required, max 100 characters).
    /// </summary>
    public required string LastName { get; set; }
}

/// <summary>
/// Response DTO for profile operations.
/// </summary>
public class ProfileResponse
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
    /// User's first name.
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// User's last name.
    /// </summary>
    public string? LastName { get; set; }
}
