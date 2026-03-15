using System.Text.Json;

namespace LangafyApi.Tests.Data;

/// <summary>
/// Verifies that seed JSON files have no duplicate codes and that all cross-file references
/// (exercise → lesson → unit) are valid. These run against the actual files copied to the
/// test output directory via the Content ItemGroup in the .csproj.
/// </summary>
public class SeedDataIntegrityTests
{
    private static readonly string SeedDataPath = Path.Combine(AppContext.BaseDirectory, "SeedData");

    private static JsonElement[] Load(string relativePath)
    {
        var fullPath = Path.GetFullPath(Path.Combine(SeedDataPath, relativePath));
        var json = File.ReadAllText(fullPath);
        return JsonSerializer.Deserialize<JsonElement[]>(json)!;
    }

    // ── Uniqueness ────────────────────────────────────────────────────────────

    [Fact]
    public void Units_CodesAreUnique()
    {
        var codes = Load("es/units.json").Select(u => u.GetProperty("code").GetString()!).ToList();
        Assert.Equal(codes.Count, codes.Distinct().Count());
    }

    [Fact]
    public void Lessons_CodesAreUnique()
    {
        var codes = Load("es/lessons.json").Select(l => l.GetProperty("code").GetString()!).ToList();
        Assert.Equal(codes.Count, codes.Distinct().Count());
    }

    [Fact]
    public void Exercises_CodesAreUnique()
    {
        var codes = Load("es/exercises.json").Select(e => e.GetProperty("code").GetString()!).ToList();
        Assert.Equal(codes.Count, codes.Distinct().Count());
    }

    // ── Referential integrity ─────────────────────────────────────────────────

    [Fact]
    public void Lessons_UnitCodeReferencesAreValid()
    {
        var validUnitCodes = Load("es/units.json")
            .Select(u => u.GetProperty("code").GetString()!)
            .ToHashSet();

        var badRefs = Load("es/lessons.json")
            .Select(l => l.GetProperty("unitCode").GetString()!)
            .Where(code => !validUnitCodes.Contains(code))
            .Distinct()
            .ToList();

        Assert.Empty(badRefs);
    }

    [Fact]
    public void Exercises_LessonCodeReferencesAreValid()
    {
        var validLessonCodes = Load("es/lessons.json")
            .Select(l => l.GetProperty("code").GetString()!)
            .ToHashSet();

        var badRefs = Load("es/exercises.json")
            .Select(e => e.GetProperty("lessonCode").GetString()!)
            .Where(code => !validLessonCodes.Contains(code))
            .Distinct()
            .ToList();

        Assert.Empty(badRefs);
    }

    // ── Schema validity ───────────────────────────────────────────────────────

    [Fact]
    public void Exercises_TypesAreValidExerciseTypes()
    {
        var validTypes = new HashSet<string>
        {
            "MultipleChoice", "FillBlank", "WordScramble", "FlashcardMatch", "FreeResponse"
        };

        var invalidTypes = Load("es/exercises.json")
            .Select(e => e.GetProperty("type").GetString()!)
            .Where(t => !validTypes.Contains(t))
            .Distinct()
            .ToList();

        Assert.Empty(invalidTypes);
    }

    [Fact]
    public void Exercises_AllHavePositivePoints()
    {
        var badCodes = Load("es/exercises.json")
            .Where(e => e.GetProperty("points").GetInt32() <= 0)
            .Select(e => e.GetProperty("code").GetString()!)
            .ToList();

        Assert.Empty(badCodes);
    }

    [Fact]
    public void MultipleChoiceExercises_HaveCorrectIndexAndOptions()
    {
        var mcExercises = Load("es/exercises.json")
            .Where(e => e.GetProperty("type").GetString() == "MultipleChoice");

        foreach (var exercise in mcExercises)
        {
            string code = exercise.GetProperty("code").GetString()!;
            var config = exercise.GetProperty("config");

            Assert.True(
                config.TryGetProperty("correct_index", out _),
                $"{code}: missing 'correct_index'");

            Assert.True(
                config.TryGetProperty("options", out _),
                $"{code}: missing 'options'");
        }
    }

    [Fact]
    public void FlashcardMatchExercises_HaveNonEmptyPairsWithTargetAndEn()
    {
        var flashcardExercises = Load("es/exercises.json")
            .Where(e => e.GetProperty("type").GetString() == "FlashcardMatch");

        foreach (var exercise in flashcardExercises)
        {
            string code = exercise.GetProperty("code").GetString()!;
            var config = exercise.GetProperty("config");

            Assert.True(config.TryGetProperty("pairs", out var pairs), $"{code}: missing 'pairs'");
            Assert.True(pairs.GetArrayLength() > 0, $"{code}: 'pairs' is empty");

            foreach (var pair in pairs.EnumerateArray())
            {
                Assert.True(pair.TryGetProperty("target", out _), $"{code}: pair missing 'target'");
                Assert.True(pair.TryGetProperty("en", out _), $"{code}: pair missing 'en'");
            }
        }
    }

    [Fact]
    public void FillBlankExercises_HaveCorrectAnswer()
    {
        var fillBlankExercises = Load("es/exercises.json")
            .Where(e => e.GetProperty("type").GetString() == "FillBlank");

        foreach (var exercise in fillBlankExercises)
        {
            string code = exercise.GetProperty("code").GetString()!;
            var config = exercise.GetProperty("config");

            Assert.True(
                config.TryGetProperty("correct_answer", out _),
                $"{code}: missing 'correct_answer'");
        }
    }

    [Fact]
    public void WordScrambleExercises_HaveTargetWord()
    {
        var scrambleExercises = Load("es/exercises.json")
            .Where(e => e.GetProperty("type").GetString() == "WordScramble");

        foreach (var exercise in scrambleExercises)
        {
            string code = exercise.GetProperty("code").GetString()!;
            var config = exercise.GetProperty("config");

            Assert.True(
                config.TryGetProperty("target_word", out _),
                $"{code}: missing 'target_word'");
        }
    }
}
