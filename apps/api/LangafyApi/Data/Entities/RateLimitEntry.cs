namespace LangafyApi.Data.Entities;

/// <summary>
/// Tracks API rate limit usage per user, per endpoint, per time window.
/// Persisted in the database so counters survive Cloud Run cold starts and horizontal scale-out.
/// </summary>
public class RateLimitEntry
{
    /// <inheritdoc/>
    public int Id { get; set; }

    /// <summary>The user whose request is being counted.</summary>
    public int UserId { get; set; }

    /// <summary>Short identifier for the endpoint being rate-limited (e.g., "send_message").</summary>
    public string EndpointKey { get; set; } = string.Empty;

    /// <summary>
    /// UTC start of the rate limit window, truncated to the window boundary.
    /// For hourly limits: truncated to the current hour.
    /// For daily limits: truncated to UTC midnight of the current day.
    /// </summary>
    public DateTime WindowStart { get; set; }

    /// <summary>Number of requests made in this window.</summary>
    public int Count { get; set; }

    // Navigation
    /// <inheritdoc/>
    public AppUser User { get; set; } = null!;
}
