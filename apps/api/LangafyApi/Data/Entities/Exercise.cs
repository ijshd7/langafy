using System.Text.Json;

namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents an exercise within a lesson.
/// Configuration details are stored as JSONB to support different exercise types.
/// </summary>
public class Exercise
{
    public int Id { get; set; }

    public int LessonId { get; set; }

    /// <summary>
    /// Type of exercise (MultipleChoice, FillBlank, etc.).
    /// </summary>
    public ExerciseType Type { get; set; }

    /// <summary>
    /// Exercise-specific configuration stored as JSON.
    /// Structure depends on the exercise type.
    /// </summary>
    public JsonDocument Config { get; set; } = JsonDocument.Parse("{}");

    /// <summary>
    /// Order in which exercises should be displayed within a lesson.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Points awarded for completing this exercise.
    /// </summary>
    public int Points { get; set; }

    // Navigation properties
    public Lesson Lesson { get; set; } = null!;
}
