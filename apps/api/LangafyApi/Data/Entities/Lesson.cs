namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents a lesson within a unit.
/// A lesson contains multiple exercises.
/// </summary>
public class Lesson
{
    public int Id { get; set; }

    public int UnitId { get; set; }

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
    /// Order in which lessons should be displayed within a unit.
    /// </summary>
    public int SortOrder { get; set; }

    // Navigation properties
    public Unit Unit { get; set; } = null!;
    public ICollection<Exercise> Exercises { get; set; } = new List<Exercise>();
}
