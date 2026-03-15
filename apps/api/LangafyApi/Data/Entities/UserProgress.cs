namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents a user's progress and performance on an exercise.
/// </summary>
public class UserProgress
{
    /// <inheritdoc/>
    public int Id { get; set; }

    /// <inheritdoc/>
    public int UserId { get; set; }
    /// <inheritdoc/>
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
    /// <inheritdoc/>
    public AppUser User { get; set; } = null!;
    /// <inheritdoc/>
    public Exercise Exercise { get; set; } = null!;
}
