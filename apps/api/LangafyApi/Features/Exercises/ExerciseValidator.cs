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
    /// Matches submitted pairs against config pairs using target/en string values.
    /// Config format: { "pairs": [{"target": "Hola", "en": "Hello"}, ...] }
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

            var configPairs = pairsElement.EnumerateArray().ToList();
            int totalPairs = configPairs.Count;

            if (totalPairs == 0)
            {
                return CreateErrorResult("Exercise configuration has no pairs.");
            }

            // Validate each submitted match against config pairs
            int correctMatches = 0;
            var matchedConfigIndices = new HashSet<int>();

            foreach (var match in submission.Matches)
            {
                string submittedTarget = match.Target.Trim();
                string submittedEn = match.En.Trim();

                // Find a config pair that matches both target and en values
                for (int i = 0; i < configPairs.Count; i++)
                {
                    if (matchedConfigIndices.Contains(i))
                    {
                        continue;
                    }

                    var pair = configPairs[i];
                    string configTarget = pair.TryGetProperty("target", out var t) ? t.GetString() ?? "" : "";
                    string configEn = pair.TryGetProperty("en", out var e) ? e.GetString() ?? "" : "";

                    if (string.Equals(submittedTarget, configTarget, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(submittedEn, configEn, StringComparison.OrdinalIgnoreCase))
                    {
                        correctMatches++;
                        matchedConfigIndices.Add(i);
                        break;
                    }
                }
            }

            bool allCorrect = correctMatches == totalPairs;

            // Calculate score based on correct matches
            int score = (correctMatches * 100) / totalPairs;

            // Time bonus for perfect matches (faster = more points, up to 20 bonus)
            if (allCorrect && submission.TimeSpentMs > 0)
            {
                int timeBonus = Math.Max(0, 20 - (submission.TimeSpentMs / 1000));
                score = Math.Min(100, score + timeBonus);
            }

            var result = new ExerciseResultDto
            {
                IsCorrect = allCorrect,
                Score = score,
                PointsEarned = allCorrect
                    ? exercise.Points
                    : Math.Max(1, (exercise.Points * correctMatches) / totalPairs),
                Feedback = allCorrect
                    ? $"Perfect! You matched all {totalPairs} pairs correctly."
                    : $"You matched {correctMatches} of {totalPairs} pairs correctly."
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
