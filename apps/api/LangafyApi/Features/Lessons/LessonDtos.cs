using System.Text.Json;

namespace LangafyApi.Features.Lessons;

/// <summary>
/// Response DTO for a CEFR level.
/// </summary>
public class CefrLevelDto
{
    /// <summary>
    /// Unique ID of the CEFR level.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// CEFR code (e.g., "A1", "A2", "B1").
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable name of the level.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Description of what learners can do at this level.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Display order for the level.
    /// </summary>
    public int SortOrder { get; set; }
}

/// <summary>
/// Response DTO for a unit.
/// </summary>
public class UnitDto
{
    /// <summary>
    /// Unique ID of the unit.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Title of the unit (e.g., "Greetings & Introductions").
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Description of what the unit covers.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// CEFR level of this unit.
    /// </summary>
    public CefrLevelDto CefrLevel { get; set; } = new();

    /// <summary>
    /// Display order within the level.
    /// </summary>
    public int SortOrder { get; set; }
}

/// <summary>
/// Response DTO for a lesson.
/// </summary>
public class LessonDto
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
    /// Description of what the lesson covers.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Learning objective for this lesson.
    /// </summary>
    public string Objective { get; set; } = string.Empty;

    /// <summary>
    /// Display order within the unit.
    /// </summary>
    public int SortOrder { get; set; }
}

/// <summary>
/// Response DTO for exercise within a lesson detail.
/// </summary>
public class ExerciseDto
{
    /// <summary>
    /// Unique ID of the exercise.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Type of exercise (MultipleChoice, FillBlank, WordScramble, FlashcardMatch, FreeResponse).
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Exercise-specific configuration as JSON.
    /// </summary>
    public JsonDocument Config { get; set; } = JsonDocument.Parse("{}");

    /// <summary>
    /// Points awarded for completing this exercise.
    /// </summary>
    public int Points { get; set; }

    /// <summary>
    /// Display order within the lesson.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// User's progress on this exercise. Null if not authenticated or no progress recorded.
    /// </summary>
    public ExerciseProgressDto? Progress { get; set; }
}

/// <summary>
/// User's progress on a specific exercise.
/// </summary>
public class ExerciseProgressDto
{
    /// <summary>
    /// Whether the user has completed this exercise successfully.
    /// </summary>
    public bool Completed { get; set; }

    /// <summary>
    /// Best score achieved (0-100).
    /// </summary>
    public int Score { get; set; }

    /// <summary>
    /// Number of attempts made.
    /// </summary>
    public int Attempts { get; set; }
}

/// <summary>
/// Response DTO for lesson detail including exercises.
/// </summary>
public class LessonDetailDto
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
    /// Description of what the lesson covers.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Learning objective for this lesson.
    /// </summary>
    public string Objective { get; set; } = string.Empty;

    /// <summary>
    /// Unit containing this lesson.
    /// </summary>
    public UnitDto Unit { get; set; } = new();

    /// <summary>
    /// Exercises in this lesson, ordered by SortOrder.
    /// </summary>
    public List<ExerciseDto> Exercises { get; set; } = new();
}
