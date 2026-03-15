namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents a user's interaction with a vocabulary word using spaced repetition.
/// Tracks learning metrics for the SM-2 (Supermemo 2) algorithm.
/// </summary>
public class UserVocabulary
{
    /// <inheritdoc/>
    public int Id { get; set; }

    /// <inheritdoc/>
    public int UserId { get; set; }
    /// <inheritdoc/>
    public int VocabularyId { get; set; }

    /// <summary>
    /// Ease factor for spaced repetition (SM-2 algorithm).
    /// Starts at 2.5 and adjusts based on performance.
    /// </summary>
    public double EaseFactor { get; set; } = 2.5;

    /// <summary>
    /// Interval (in days) until the next review is due.
    /// </summary>
    public int IntervalDays { get; set; } = 1;

    /// <summary>
    /// Number of successful repetitions of this vocabulary item.
    /// </summary>
    public int Repetitions { get; set; } = 0;

    /// <summary>
    /// When this vocabulary item is next due for review.
    /// </summary>
    public DateTime NextReviewAt { get; set; }

    // Navigation properties
    /// <inheritdoc/>
    public AppUser User { get; set; } = null!;
    /// <inheritdoc/>
    public Vocabulary Vocabulary { get; set; } = null!;
}
