using System.Text.Json;

namespace LangafyApi.Features.Exercises;

/// <summary>
/// Base request DTO for exercise submission.
/// </summary>
public abstract class ExerciseSubmissionRequest
{
    /// <summary>
    /// Time in milliseconds spent on this exercise.
    /// </summary>
    public int TimeSpentMs { get; set; }
}

/// <summary>
/// Submission for a multiple choice exercise.
/// </summary>
public class MultipleChoiceSubmission : ExerciseSubmissionRequest
{
    /// <summary>
    /// Index of the selected answer option (0-based).
    /// </summary>
    public int SelectedIndex { get; set; }
}

/// <summary>
/// Submission for a fill-in-the-blank exercise.
/// </summary>
public class FillBlankSubmission : ExerciseSubmissionRequest
{
    /// <summary>
    /// The answer provided by the user.
    /// </summary>
    public string Answer { get; set; } = string.Empty;
}

/// <summary>
/// Submission for a word scramble exercise.
/// </summary>
public class WordScrambleSubmission : ExerciseSubmissionRequest
{
    /// <summary>
    /// The word the user arranged from the scrambled letters.
    /// </summary>
    public string Answer { get; set; } = string.Empty;
}

/// <summary>
/// Submission for a flashcard matching exercise.
/// </summary>
public class FlashcardMatchSubmission : ExerciseSubmissionRequest
{
    /// <summary>
    /// Array of matched pairs, each containing [leftIndex, rightIndex].
    /// </summary>
    public int[][] Matches { get; set; } = [];
}

/// <summary>
/// Submission for a free response exercise.
/// </summary>
public class FreeResponseSubmission : ExerciseSubmissionRequest
{
    /// <summary>
    /// The text response provided by the user.
    /// </summary>
    public string Response { get; set; } = string.Empty;
}

/// <summary>
/// Result of an exercise submission.
/// </summary>
public class ExerciseResultDto
{
    /// <summary>
    /// Whether the answer was correct.
    /// </summary>
    public bool IsCorrect { get; set; }

    /// <summary>
    /// Score achieved (0-100).
    /// </summary>
    public int Score { get; set; }

    /// <summary>
    /// Points awarded for this exercise.
    /// </summary>
    public int PointsEarned { get; set; }

    /// <summary>
    /// The correct answer (shown on failure or review).
    /// </summary>
    public string? CorrectAnswer { get; set; }

    /// <summary>
    /// Feedback message for the user.
    /// </summary>
    public string Feedback { get; set; } = string.Empty;

    /// <summary>
    /// Exercise-specific explanation or hint.
    /// </summary>
    public string? Explanation { get; set; }
}
