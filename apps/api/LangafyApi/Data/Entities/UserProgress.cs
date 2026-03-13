namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents a user's progress and performance on an exercise.
/// </summary>
public class UserProgress
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public int ExerciseId { get; set; }

    /// <summary>
    /// Whether the user has completed this exercise.
    /// </summary>
    public bool Completed { get; set; }

    /// <summary>
    /// Score achieved on this exercise (0-100).
    /// </summary>
    public int Score { get; set; }

    /// <summary>
    /// Number of attempts made on this exercise.
    /// </summary>
    public int Attempts { get; set; }

    /// <summary>
    /// When the exercise was completed (null if not yet completed).
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    // Navigation properties
    public AppUser User { get; set; } = null!;
    public Exercise Exercise { get; set; } = null!;
}
