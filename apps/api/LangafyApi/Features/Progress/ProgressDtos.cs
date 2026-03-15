namespace LangafyApi.Features.Progress;

/// <summary>
/// Response DTO for lesson-level progress.
/// </summary>
public class LessonProgressDto
{
    /// <summary>
    /// Unique ID of the lesson.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Title of the lesson.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Number of exercises in this lesson.
    /// </summary>
    public int TotalExercises { get; set; }

    /// <summary>
    /// Number of completed exercises.
    /// </summary>
    public int CompletedExercises { get; set; }

    /// <summary>
    /// Percentage of exercises completed (0-100).
    /// </summary>
    public int CompletionPercentage { get; set; }

    /// <summary>
    /// Total points earned in this lesson.
    /// </summary>
    public int PointsEarned { get; set; }

    /// <summary>
    /// Maximum possible points in this lesson.
    /// </summary>
    public int MaxPoints { get; set; }
}

/// <summary>
/// Response DTO for unit-level progress.
/// </summary>
public class UnitProgressDto
{
    /// <summary>
    /// Unique ID of the unit.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Title of the unit.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Description of the unit.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Number of lessons in this unit.
    /// </summary>
    public int TotalLessons { get; set; }

    /// <summary>
    /// Number of completed lessons.
    /// </summary>
    public int CompletedLessons { get; set; }

    /// <summary>
    /// Percentage of unit completed (0-100).
    /// </summary>
    public int CompletionPercentage { get; set; }

    /// <summary>
    /// Total points earned in this unit.
    /// </summary>
    public int PointsEarned { get; set; }

    /// <summary>
    /// Maximum possible points in this unit.
    /// </summary>
    public int MaxPoints { get; set; }

    /// <summary>
    /// Progress for each lesson in this unit.
    /// </summary>
    public List<LessonProgressDto> Lessons { get; set; } = new();
}

/// <summary>
/// Response DTO for CEFR level-level progress.
/// </summary>
public class LevelProgressDto
{
    /// <summary>
    /// Unique ID of the CEFR level.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// CEFR code (e.g., "A1", "A2").
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Name of the level.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Number of units in this level for the user's active language.
    /// </summary>
    public int TotalUnits { get; set; }

    /// <summary>
    /// Number of completed units.
    /// </summary>
    public int CompletedUnits { get; set; }

    /// <summary>
    /// Percentage of level completed (0-100).
    /// </summary>
    public int CompletionPercentage { get; set; }

    /// <summary>
    /// Total points earned in this level.
    /// </summary>
    public int PointsEarned { get; set; }

    /// <summary>
    /// Maximum possible points in this level.
    /// </summary>
    public int MaxPoints { get; set; }

    /// <summary>
    /// Progress for each unit in this level.
    /// </summary>
    public List<UnitProgressDto> Units { get; set; } = new();
}

/// <summary>
/// Overall progress summary for a user.
/// </summary>
public class ProgressSummaryDto
{
    /// <summary>
    /// Language code for this progress (e.g., "es" for Spanish).
    /// </summary>
    public string LanguageCode { get; set; } = string.Empty;

    /// <summary>
    /// Language name in English.
    /// </summary>
    public string LanguageName { get; set; } = string.Empty;

    /// <summary>
    /// User's current CEFR level in this language.
    /// </summary>
    public string CurrentCefrLevel { get; set; } = string.Empty;

    /// <summary>
    /// Total number of exercises completed across all levels.
    /// </summary>
    public int TotalExercisesCompleted { get; set; }

    /// <summary>
    /// Total number of exercises attempted.
    /// </summary>
    public int TotalExercisesAttempted { get; set; }

    /// <summary>
    /// Total points earned in this language.
    /// </summary>
    public int TotalPointsEarned { get; set; }

    /// <summary>
    /// Current learning streak (days in a row with at least one exercise completed).
    /// </summary>
    public int CurrentStreak { get; set; }

    /// <summary>
    /// Longest streak achieved.
    /// </summary>
    public int LongestStreak { get; set; }

    /// <summary>
    /// Overall completion percentage across all levels.
    /// </summary>
    public int OverallCompletionPercentage { get; set; }

    /// <summary>
    /// Progress for each CEFR level.
    /// </summary>
    public List<LevelProgressDto> Levels { get; set; } = new();

    /// <summary>
    /// When the user last completed an exercise (for streak calculation).
    /// </summary>
    public DateTime? LastActivityAt { get; set; }
}
