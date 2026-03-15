using System.Text.Json;
using LangafyApi.Data.Entities;
using LangafyApi.Features.Exercises;

namespace LangafyApi.Tests.Exercises;

public class ExerciseValidatorTests
{
    private readonly ExerciseValidator _sut = new();

    private static Exercise MakeExercise(string configJson, int points = 10, ExerciseType type = ExerciseType.MultipleChoice) =>
        new()
        {
            Id = 1,
            LessonId = 1,
            Points = points,
            Config = JsonDocument.Parse(configJson),
            Type = type,
            Lesson = null!
        };

    // ── Multiple Choice ───────────────────────────────────────────────────────

    [Fact]
    public void MultipleChoice_CorrectIndex_ReturnsCorrectResult()
    {
        var exercise = MakeExercise("""{"correct_index":1,"options":[{"text":"Adiós"},{"text":"Hola"}]}""");
        var submission = new MultipleChoiceSubmission { SelectedIndex = 1 };

        var result = _sut.ValidateMultipleChoice(exercise, submission);

        Assert.True(result.IsCorrect);
        Assert.Equal(100, result.Score);
        Assert.Equal(10, result.PointsEarned);
    }

    [Fact]
    public void MultipleChoice_WrongIndex_ReturnsIncorrectWithCorrectAnswer()
    {
        var exercise = MakeExercise("""{"correct_index":1,"options":[{"text":"Adiós"},{"text":"Hola"}]}""");
        var submission = new MultipleChoiceSubmission { SelectedIndex = 0 };

        var result = _sut.ValidateMultipleChoice(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Equal(0, result.Score);
        Assert.Equal(0, result.PointsEarned);
        Assert.Equal("Hola", result.CorrectAnswer);
    }

    [Fact]
    public void MultipleChoice_WrongIndex_PlainStringOptions_CorrectAnswerIsNull()
    {
        // Seed data uses plain string arrays for options, not objects with a "text" property.
        // TryGetProperty("text") returns false on a JSON string element, so CorrectAnswer stays null.
        var exercise = MakeExercise("""{"correct_index":1,"options":["Adiós","Hola","Buenas noches"]}""");
        var submission = new MultipleChoiceSubmission { SelectedIndex = 0 };

        var result = _sut.ValidateMultipleChoice(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Null(result.CorrectAnswer);
    }

    [Fact]
    public void MultipleChoice_IndexZeroIsCorrect()
    {
        var exercise = MakeExercise("""{"correct_index":0,"options":[{"text":"Hola"},{"text":"Adiós"}]}""");
        var submission = new MultipleChoiceSubmission { SelectedIndex = 0 };

        var result = _sut.ValidateMultipleChoice(exercise, submission);

        Assert.True(result.IsCorrect);
    }

    [Fact]
    public void MultipleChoice_MissingCorrectIndex_ReturnsErrorResult()
    {
        var exercise = MakeExercise("""{"options":["A","B"]}""");
        var submission = new MultipleChoiceSubmission { SelectedIndex = 0 };

        var result = _sut.ValidateMultipleChoice(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Equal(0, result.Score);
        Assert.Equal(0, result.PointsEarned);
        Assert.Contains("invalid", result.Feedback, StringComparison.OrdinalIgnoreCase);
    }

    // ── Fill In The Blank ─────────────────────────────────────────────────────

    [Fact]
    public void FillBlank_ExactMatch_ReturnsCorrectResult()
    {
        var exercise = MakeExercise("""{"correct_answer":"Juan"}""", type: ExerciseType.FillBlank);
        var submission = new FillBlankSubmission { Answer = "Juan" };

        var result = _sut.ValidateFillBlank(exercise, submission);

        Assert.True(result.IsCorrect);
        Assert.Equal(100, result.Score);
        Assert.Equal(10, result.PointsEarned);
    }

    [Fact]
    public void FillBlank_CaseInsensitiveMatch_ReturnsCorrectResult()
    {
        var exercise = MakeExercise("""{"correct_answer":"Juan"}""", type: ExerciseType.FillBlank);
        var submission = new FillBlankSubmission { Answer = "JUAN" };

        var result = _sut.ValidateFillBlank(exercise, submission);

        Assert.True(result.IsCorrect);
    }

    [Fact]
    public void FillBlank_TrimsWhitespace_ReturnsCorrectResult()
    {
        var exercise = MakeExercise("""{"correct_answer":"Juan"}""", type: ExerciseType.FillBlank);
        var submission = new FillBlankSubmission { Answer = "  Juan  " };

        var result = _sut.ValidateFillBlank(exercise, submission);

        Assert.True(result.IsCorrect);
    }

    [Fact]
    public void FillBlank_AlternativeMatch_ReturnsCorrectResult()
    {
        var exercise = MakeExercise(
            """{"correct_answer":"nombre","alternatives":["Nombre","NOMBRE"]}""",
            type: ExerciseType.FillBlank);
        var submission = new FillBlankSubmission { Answer = "Nombre" };

        var result = _sut.ValidateFillBlank(exercise, submission);

        Assert.True(result.IsCorrect);
    }

    [Fact]
    public void FillBlank_WrongAnswer_ReturnsIncorrectWithCorrectAnswer()
    {
        var exercise = MakeExercise("""{"correct_answer":"Juan"}""", type: ExerciseType.FillBlank);
        var submission = new FillBlankSubmission { Answer = "Pedro" };

        var result = _sut.ValidateFillBlank(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Equal(0, result.Score);
        Assert.Equal(0, result.PointsEarned);
        Assert.Equal("Juan", result.CorrectAnswer);
    }

    [Fact]
    public void FillBlank_MissingCorrectAnswer_ReturnsErrorResult()
    {
        var exercise = MakeExercise("""{"sentence":"Mi nombre es ______"}""", type: ExerciseType.FillBlank);
        var submission = new FillBlankSubmission { Answer = "anything" };

        var result = _sut.ValidateFillBlank(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Contains("invalid", result.Feedback, StringComparison.OrdinalIgnoreCase);
    }

    // ── Word Scramble ─────────────────────────────────────────────────────────

    [Fact]
    public void WordScramble_CorrectAnswer_ReturnsCorrectResultWithHint()
    {
        var exercise = MakeExercise(
            """{"target_word":"Buenos","hint":"Good (masculine plural)","scrambled_letters":["s","o","n","u","e","B"]}""",
            type: ExerciseType.WordScramble);
        var submission = new WordScrambleSubmission { Answer = "Buenos" };

        var result = _sut.ValidateWordScramble(exercise, submission);

        Assert.True(result.IsCorrect);
        Assert.Equal(100, result.Score);
        Assert.Equal(10, result.PointsEarned);
        Assert.Contains("Good (masculine plural)", result.Explanation!);
    }

    [Fact]
    public void WordScramble_CaseInsensitiveMatch_ReturnsCorrectResult()
    {
        var exercise = MakeExercise("""{"target_word":"Buenos"}""", type: ExerciseType.WordScramble);
        var submission = new WordScrambleSubmission { Answer = "buenos" };

        var result = _sut.ValidateWordScramble(exercise, submission);

        Assert.True(result.IsCorrect);
    }

    [Fact]
    public void WordScramble_WrongAnswer_ReturnsIncorrectWithCorrectAnswer()
    {
        var exercise = MakeExercise("""{"target_word":"Buenos"}""", type: ExerciseType.WordScramble);
        var submission = new WordScrambleSubmission { Answer = "Malos" };

        var result = _sut.ValidateWordScramble(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Equal(0, result.Score);
        Assert.Equal("Buenos", result.CorrectAnswer);
    }

    [Fact]
    public void WordScramble_NoHint_ExplanationIsNull()
    {
        var exercise = MakeExercise("""{"target_word":"Hola"}""", type: ExerciseType.WordScramble);
        var submission = new WordScrambleSubmission { Answer = "Hola" };

        var result = _sut.ValidateWordScramble(exercise, submission);

        Assert.Null(result.Explanation);
    }

    [Fact]
    public void WordScramble_MissingTargetWord_ReturnsErrorResult()
    {
        var exercise = MakeExercise("""{"hint":"something"}""", type: ExerciseType.WordScramble);
        var submission = new WordScrambleSubmission { Answer = "anything" };

        var result = _sut.ValidateWordScramble(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Contains("invalid", result.Feedback, StringComparison.OrdinalIgnoreCase);
    }

    // ── Flashcard Match ───────────────────────────────────────────────────────

    [Theory]
    [InlineData(5000)]  // 5 s — fast (time bonus applies but is capped to 100)
    [InlineData(25000)] // 25 s — slow (time bonus is 0; score stays 100)
    public void FlashcardMatch_AllPairsCorrect_ScoreIs100(int timeSpentMs)
    {
        var exercise = MakeExercise(
            """{"pairs":[{"target":"Hola","en":"Hello"},{"target":"Adiós","en":"Goodbye"}]}""",
            points: 20,
            type: ExerciseType.FlashcardMatch);
        var submission = new FlashcardMatchSubmission
        {
            Matches = [new() { Target = "Hola", En = "Hello" }, new() { Target = "Adiós", En = "Goodbye" }],
            TimeSpentMs = timeSpentMs
        };

        var result = _sut.ValidateFlashcardMatch(exercise, submission);

        Assert.True(result.IsCorrect);
        Assert.Equal(100, result.Score);
        Assert.Equal(20, result.PointsEarned);
    }

    [Fact]
    public void FlashcardMatch_CaseInsensitiveMatching_ReturnsCorrectResult()
    {
        var exercise = MakeExercise(
            """{"pairs":[{"target":"Hola","en":"Hello"}]}""",
            type: ExerciseType.FlashcardMatch);
        var submission = new FlashcardMatchSubmission
        {
            Matches = [new() { Target = "hola", En = "hello" }]
        };

        var result = _sut.ValidateFlashcardMatch(exercise, submission);

        Assert.True(result.IsCorrect);
    }

    [Fact]
    public void FlashcardMatch_PartialMatch_ReturnsPartialScoreAndCredit()
    {
        var exercise = MakeExercise(
            """{"pairs":[{"target":"Hola","en":"Hello"},{"target":"Adiós","en":"Goodbye"},{"target":"Gracias","en":"Thank you"},{"target":"Por favor","en":"Please"}]}""",
            points: 20,
            type: ExerciseType.FlashcardMatch);
        var submission = new FlashcardMatchSubmission
        {
            Matches =
            [
                new() { Target = "Hola", En = "Hello" },
                new() { Target = "Adiós", En = "Goodbye" }
            ]
        };

        var result = _sut.ValidateFlashcardMatch(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Equal(50, result.Score);          // 2/4 = 50%
        Assert.True(result.PointsEarned > 0);    // partial credit awarded
        Assert.True(result.PointsEarned < 20);   // not full points
    }

    [Fact]
    public void FlashcardMatch_WrongEnglishForRightTarget_NotCounted()
    {
        var exercise = MakeExercise(
            """{"pairs":[{"target":"Hola","en":"Hello"}]}""",
            type: ExerciseType.FlashcardMatch);
        var submission = new FlashcardMatchSubmission
        {
            Matches = [new() { Target = "Hola", En = "Goodbye" }]
        };

        var result = _sut.ValidateFlashcardMatch(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Equal(0, result.Score);
    }

    [Fact]
    public void FlashcardMatch_DuplicatePairSubmission_OnlyCountedOnce()
    {
        var exercise = MakeExercise(
            """{"pairs":[{"target":"Hola","en":"Hello"},{"target":"Adiós","en":"Goodbye"}]}""",
            points: 20,
            type: ExerciseType.FlashcardMatch);
        var submission = new FlashcardMatchSubmission
        {
            Matches =
            [
                new() { Target = "Hola", En = "Hello" },
                new() { Target = "Hola", En = "Hello" }  // same pair twice
            ]
        };

        var result = _sut.ValidateFlashcardMatch(exercise, submission);

        // Only 1 of 2 config pairs matched — the duplicate doesn't count twice
        Assert.False(result.IsCorrect);
        Assert.Equal(50, result.Score);
    }

    [Fact]
    public void FlashcardMatch_EmptySubmission_ReturnsZeroScore()
    {
        var exercise = MakeExercise(
            """{"pairs":[{"target":"Hola","en":"Hello"}]}""",
            type: ExerciseType.FlashcardMatch);
        var submission = new FlashcardMatchSubmission { Matches = [] };

        var result = _sut.ValidateFlashcardMatch(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Equal(0, result.Score);
    }

    [Fact]
    public void FlashcardMatch_MissingPairsKey_ReturnsErrorResult()
    {
        var exercise = MakeExercise("""{"time_limit_seconds":60}""", type: ExerciseType.FlashcardMatch);
        var submission = new FlashcardMatchSubmission { Matches = [] };

        var result = _sut.ValidateFlashcardMatch(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Contains("invalid", result.Feedback, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void FlashcardMatch_EmptyPairsArray_ReturnsErrorResult()
    {
        var exercise = MakeExercise("""{"pairs":[]}""", type: ExerciseType.FlashcardMatch);
        var submission = new FlashcardMatchSubmission { Matches = [] };

        var result = _sut.ValidateFlashcardMatch(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Contains("no pairs", result.Feedback, StringComparison.OrdinalIgnoreCase);
    }

    // ── Free Response ─────────────────────────────────────────────────────────

    [Fact]
    public void FreeResponse_AnyInput_ReturnsPendingReviewResult()
    {
        var exercise = MakeExercise("""{}""", type: ExerciseType.FreeResponse);
        var submission = new FreeResponseSubmission { Response = "Esta es mi respuesta." };

        var result = _sut.ValidateFreeResponse(exercise, submission);

        Assert.False(result.IsCorrect);
        Assert.Equal(0, result.Score);
        Assert.Equal(0, result.PointsEarned);
        Assert.Contains("review", result.Feedback, StringComparison.OrdinalIgnoreCase);
    }
}
