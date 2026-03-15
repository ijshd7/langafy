using LangafyApi.Data;
using LangafyApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace LangafyApi.Services;

/// <summary>
/// Well-known endpoint keys for conversation rate limiting.
/// </summary>
public static class RateLimitKeys
{
    /// <summary>Key for the send-message endpoints (non-streaming and streaming share the same counter).</summary>
    public const string SendMessage = "send_message";

    /// <summary>Key for the start-conversation endpoint.</summary>
    public const string StartConversation = "start_conversation";
}

/// <summary>
/// Returned when a rate limit has been exceeded. Non-null means the request should be rejected with 429.
/// </summary>
public sealed class RateLimitResult
{
    /// <summary>Seconds until the current rate limit window resets.</summary>
    public int RetryAfterSeconds { get; init; }
}

/// <summary>
/// Database-backed rate limiting for AI conversation endpoints.
/// </summary>
public interface IConversationRateLimitService
{
    /// <summary>
    /// Checks whether the user has exceeded the rate limit for the given endpoint key.
    /// If under the limit, increments the counter atomically.
    /// Returns null if the request is allowed, or a <see cref="RateLimitResult"/> if rejected.
    /// </summary>
    Task<RateLimitResult?> CheckAndIncrementAsync(int userId, string endpointKey, CancellationToken ct = default);
}

/// <summary>
/// Fixed-window rate limiter backed by the application database.
/// Counters survive Cloud Run cold starts and horizontal scale-out because they
/// are stored in Postgres rather than in-memory.
///
/// Strategy: fixed window
///   - send_message:       30 requests per hour
///   - start_conversation: 10 requests per day
///
/// Race conditions at the window boundary may allow a small overage (~1–2 requests)
/// under high concurrency. This is acceptable for MVP; a SELECT … FOR UPDATE or
/// Postgres advisory lock can be added for stricter enforcement.
/// </summary>
public class DbConversationRateLimitService : IConversationRateLimitService
{
    // Maps endpoint key → (request limit, window size)
    private static readonly Dictionary<string, (int Limit, TimeSpan Window)> Policies = new()
    {
        [RateLimitKeys.SendMessage]       = (30, TimeSpan.FromHours(1)),
        [RateLimitKeys.StartConversation] = (10, TimeSpan.FromDays(1)),
    };

    private readonly AppDbContext _db;

    public DbConversationRateLimitService(AppDbContext db) => _db = db;

    /// <inheritdoc />
    public async Task<RateLimitResult?> CheckAndIncrementAsync(
        int userId, string endpointKey, CancellationToken ct = default)
    {
        if (!Policies.TryGetValue(endpointKey, out var policy))
            return null; // Unknown key — allow through

        var windowStart = TruncateToWindow(DateTime.UtcNow, policy.Window);
        var windowEnd   = windowStart + policy.Window;

        var entry = await _db.RateLimitEntries
            .FirstOrDefaultAsync(e =>
                e.UserId == userId &&
                e.EndpointKey == endpointKey &&
                e.WindowStart == windowStart, ct);

        if (entry is null)
        {
            _db.RateLimitEntries.Add(new RateLimitEntry
            {
                UserId      = userId,
                EndpointKey = endpointKey,
                WindowStart = windowStart,
                Count       = 1
            });
            await _db.SaveChangesAsync(ct);
            return null; // First request in window — allowed
        }

        if (entry.Count >= policy.Limit)
        {
            var secondsRemaining = (int)Math.Ceiling((windowEnd - DateTime.UtcNow).TotalSeconds);
            return new RateLimitResult { RetryAfterSeconds = Math.Max(1, secondsRemaining) };
        }

        entry.Count++;
        await _db.SaveChangesAsync(ct);
        return null; // Under limit — allowed
    }

    /// <summary>
    /// Truncates <paramref name="utcNow"/> to the start of the window.
    /// Works correctly for hourly and daily windows because the .NET ticks epoch
    /// (0001-01-01 00:00:00 UTC) starts at midnight, so integer division naturally
    /// aligns to hour and day boundaries.
    /// </summary>
    private static DateTime TruncateToWindow(DateTime utcNow, TimeSpan window)
    {
        var ticks = (utcNow.Ticks / window.Ticks) * window.Ticks;
        return new DateTime(ticks, DateTimeKind.Utc);
    }
}
