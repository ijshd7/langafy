namespace LangafyApi.Features.Vocabulary;

/// <summary>
/// Response DTO for a vocabulary word with user's learning progress.
/// </summary>
public class VocabularyDto
{
    /// <summary>
    /// Unique vocabulary ID.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// The word in the target language.
    /// </summary>
    public string WordTarget { get; set; } = string.Empty;

    /// <summary>
    /// English translation of the word.
    /// </summary>
    public string WordEn { get; set; } = string.Empty;

    /// <summary>
    /// Part of speech (noun, verb, adjective, etc.).
    /// </summary>
    public string PartOfSpeech { get; set; } = string.Empty;

    /// <summary>
    /// Example sentence in the target language.
    /// </summary>
    public string ExampleSentenceTarget { get; set; } = string.Empty;

    /// <summary>
    /// English translation of the example sentence.
    /// </summary>
    public string ExampleSentenceEn { get; set; } = string.Empty;

    /// <summary>
    /// CEFR level for this vocabulary word.
    /// </summary>
    public string CefrLevel { get; set; } = string.Empty;

    /// <summary>
    /// User's ease factor for spaced repetition (if user has reviewed this word).
    /// Null if user hasn't reviewed yet.
    /// </summary>
    public double? EaseFactor { get; set; }

    /// <summary>
    /// Interval in days until next review (if user has reviewed this word).
    /// </summary>
    public int IntervalDays { get; set; }

    /// <summary>
    /// Number of successful repetitions (if user has reviewed this word).
    /// </summary>
    public int Repetitions { get; set; }

    /// <summary>
    /// When the user's next review is due.
    /// Null if user hasn't reviewed yet.
    /// </summary>
    public DateTime? NextReviewAt { get; set; }

    /// <summary>
    /// Whether this vocabulary item is due for review.
    /// </summary>
    public bool IsDueForReview { get; set; }
}

/// <summary>
/// Paginated response for vocabulary list.
/// </summary>
public class PaginatedVocabularyResponse
{
    /// <summary>
    /// List of vocabulary items on this page.
    /// </summary>
    public List<VocabularyDto> Items { get; set; } = new();

    /// <summary>
    /// Total number of vocabulary items matching the filters.
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Current page number (1-indexed).
    /// </summary>
    public int Page { get; set; }

    /// <summary>
    /// Number of items per page.
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// Total number of pages.
    /// </summary>
    public int TotalPages => (TotalCount + PageSize - 1) / PageSize;
}

/// <summary>
/// Request DTO for recording a vocabulary review.
/// </summary>
public class VocabularyReviewRequest
{
    /// <summary>
    /// User's quality rating (0-5):
    /// 0 = complete blackout, incorrect with serious error
    /// 1 = incorrect with minor error
    /// 2 = correct, but required serious mental effort
    /// 3 = correct, after some hesitation
    /// 4 = correct and hesitation briefly
    /// 5 = correct and without any hesitation
    /// </summary>
    public int Quality { get; set; }
}

/// <summary>
/// Response DTO after recording a vocabulary review.
/// </summary>
public class VocabularyReviewResponse
{
    /// <summary>
    /// Unique vocabulary ID.
    /// </summary>
    public int VocabularyId { get; set; }

    /// <summary>
    /// Updated ease factor after applying SM-2 algorithm.
    /// </summary>
    public double EaseFactor { get; set; }

    /// <summary>
    /// Updated interval until next review (in days).
    /// </summary>
    public int IntervalDays { get; set; }

    /// <summary>
    /// Total number of successful repetitions.
    /// </summary>
    public int Repetitions { get; set; }

    /// <summary>
    /// When the next review is scheduled.
    /// </summary>
    public DateTime NextReviewAt { get; set; }
}
