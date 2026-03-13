using System.Text.Json;
using LangafyApi.Data.Entities;

namespace LangafyApi.Features.Exercises;

/// <summary>
/// Validates exercise submissions and calculates scores.
/// </summary>
public class ExerciseValidator
{
    /// <summary>
    /// Validates a multiple choice submission.
    /// </summary>
    public ExerciseResultDto ValidateMultipleChoice(
        Exercise exercise,
        MultipleChoiceSubmission submission)
    {
        try
        {
            var config = exercise.Config.RootElement;

            // Get the correct index from config
            if (!config.TryGetProperty("correct_index", out var correctIndexElement))
            {
                return CreateErrorResult("Exercise configuration is invalid.");
            }

            int correctIndex = correctIndexElement.GetInt32();
            bool isCorrect = submission.SelectedIndex == correctIndex;
            int score = isCorrect ? 100 : 0;

            var result = new ExerciseResultDto
            {
                IsCorrect = isCorrect,
                Score = score,
                PointsEarned = isCorrect ? exercise.Points : 0,
                Feedback = isCorrect
                    ? "Correct! Well done."
                    : $"Incorrect. The correct answer is option {correctIndex + 1}."
            };

            // Include the correct answer for review
            if (!isCorrect && config.TryGetProperty("options", out var optionsElement))
            {
                var options = optionsElement.EnumerateArray().ToList();
                if (correctIndex < options.Count && options[correctIndex].TryGetProperty("text", out var answerText))
                {
                    result.CorrectAnswer = answerText.GetString();
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            return CreateErrorResult($"Error validating exercise: {ex.Message}");
        }
    }

    /// <summary>
    /// Validates a fill-in-the-blank submission.
    /// </summary>
    public ExerciseResultDto ValidateFillBlank(
        Exercise exercise,
        FillBlankSubmission submission)
    {
        try
        {
            var config = exercise.Config.RootElement;

            // Get the correct answer and alternatives from config
            if (!config.TryGetProperty("correct_answer", out var correctAnswerElement))
            {
                return CreateErrorResult("Exercise configuration is invalid.");
            }

            string correctAnswer = correctAnswerElement.GetString() ?? "";
            string userAnswer = submission.Answer.Trim();

            // Case-insensitive comparison
            bool isCorrect = string.Equals(userAnswer, correctAnswer, StringComparison.OrdinalIgnoreCase);

            // Check alternatives if provided
            if (!isCorrect && config.TryGetProperty("alternatives", out var alternativesElement))
            {
                var alternatives = alternativesElement.EnumerateArray();
                foreach (var alt in alternatives)
                {
                    if (string.Equals(userAnswer, alt.GetString() ?? "", StringComparison.OrdinalIgnoreCase))
                    {
                        isCorrect = true;
                        break;
                    }
                }
            }

            int score = isCorrect ? 100 : 0;

            var result = new ExerciseResultDto
            {
                IsCorrect = isCorrect,
                Score = score,
                PointsEarned = isCorrect ? exercise.Points : 0,
                Feedback = isCorrect
                    ? "Correct! Well done."
                    : $"Incorrect. The correct answer is: {correctAnswer}",
                CorrectAnswer = correctAnswer
            };

            return result;
        }
        catch (Exception ex)
        {
            return CreateErrorResult($"Error validating exercise: {ex.Message}");
        }
    }

    /// <summary>
    /// Validates a word scramble submission.
    /// </summary>
    public ExerciseResultDto ValidateWordScramble(
        Exercise exercise,
        WordScrambleSubmission submission)
    {
        try
        {
            var config = exercise.Config.RootElement;

            // Get the target word from config
            if (!config.TryGetProperty("target_word", out var targetWordElement))
            {
                return CreateErrorResult("Exercise configuration is invalid.");
            }

            string targetWord = targetWordElement.GetString() ?? "";
            string userAnswer = submission.Answer.Trim();

            // Case-insensitive comparison
            bool isCorrect = string.Equals(userAnswer, targetWord, StringComparison.OrdinalIgnoreCase);

            int score = isCorrect ? 100 : 0;

            var result = new ExerciseResultDto
            {
                IsCorrect = isCorrect,
                Score = score,
                PointsEarned = isCorrect ? exercise.Points : 0,
                Feedback = isCorrect
                    ? "Correct! You unscrambled the word."
                    : $"Incorrect. The word is: {targetWord}",
                CorrectAnswer = targetWord
            };

            // Add hint if available
            if (config.TryGetProperty("hint", out var hintElement))
            {
                result.Explanation = $"Hint: {hintElement.GetString()}";
            }

            return result;
        }
        catch (Exception ex)
        {
            return CreateErrorResult($"Error validating exercise: {ex.Message}");
        }
    }

    /// <summary>
    /// Validates a flashcard matching submission.
    /// </summary>
    public ExerciseResultDto ValidateFlashcardMatch(
        Exercise exercise,
        FlashcardMatchSubmission submission)
    {
        try
        {
            var config = exercise.Config.RootElement;

            // Get the pairs from config
            if (!config.TryGetProperty("pairs", out var pairsElement))
            {
                return CreateErrorResult("Exercise configuration is invalid.");
            }

            var pairs = pairsElement.EnumerateArray().ToList();

            // Validate all pairs are matched correctly
            bool allCorrect = true;
            int correctMatches = 0;

            foreach (var match in submission.Matches)
            {
                if (match.Length != 2)
                {
                    allCorrect = false;
                    break;
                }

                int leftIndex = match[0];
                int rightIndex = match[1];

                // Check if this match exists in the pairs
                bool matchFound = false;
                foreach (var pair in pairs)
                {
                    if (pair.TryGetProperty("left", out var leftProp) &&
                        pair.TryGetProperty("right", out var rightProp))
                    {
                        // Check if indices match any pair in either direction
                        // (left-right or right-left for some games)
                        if ((pair.TryGetProperty("left_index", out var liProp) && liProp.GetInt32() == leftIndex &&
                             pair.TryGetProperty("right_index", out var riProp) && riProp.GetInt32() == rightIndex))
                        {
                            matchFound = true;
                            correctMatches++;
                            break;
                        }
                    }
                }

                if (!matchFound)
                {
                    allCorrect = false;
                }
            }

            // Check if all pairs were matched
            if (correctMatches != pairs.Count)
            {
                allCorrect = false;
            }

            // Calculate score based on correct matches
            int score = Math.Min(100, (correctMatches * 100) / pairs.Count);

            // Optionally factor in time for bonus (faster = more points)
            if (allCorrect && submission.TimeSpentMs > 0)
            {
                int timeBonus = Math.Max(0, 20 - (submission.TimeSpentMs / 1000)); // Up to 20 bonus points for < 20 seconds
                score = Math.Min(100, score + timeBonus);
            }

            var result = new ExerciseResultDto
            {
                IsCorrect = allCorrect,
                Score = score,
                PointsEarned = allCorrect ? exercise.Points : Math.Max(1, (exercise.Points * correctMatches) / pairs.Count),
                Feedback = allCorrect
                    ? $"Perfect! You matched all {pairs.Count} pairs correctly."
                    : $"You matched {correctMatches} of {pairs.Count} pairs correctly."
            };

            return result;
        }
        catch (Exception ex)
        {
            return CreateErrorResult($"Error validating exercise: {ex.Message}");
        }
    }

    /// <summary>
    /// Validates a free response submission (placeholder - requires human review).
    /// </summary>
    public ExerciseResultDto ValidateFreeResponse(
        Exercise exercise,
        FreeResponseSubmission submission)
    {
        // Free response exercises require human review
        // For now, we record the response but don't score it automatically
        var result = new ExerciseResultDto
        {
            IsCorrect = false, // Marked as "pending review"
            Score = 0,
            PointsEarned = 0,
            Feedback = "Your response has been recorded and will be reviewed by an instructor.",
            CorrectAnswer = null
        };

        return result;
    }

    /// <summary>
    /// Creates an error result for invalid submissions.
    /// </summary>
    private static ExerciseResultDto CreateErrorResult(string message)
    {
        return new ExerciseResultDto
        {
            IsCorrect = false,
            Score = 0,
            PointsEarned = 0,
            Feedback = message
        };
    }
}
