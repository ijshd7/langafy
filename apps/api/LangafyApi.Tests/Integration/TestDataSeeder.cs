using System.Text.Json;
using LangafyApi.Data;
using LangafyApi.Data.Entities;

namespace LangafyApi.Tests.Integration;

/// <summary>
/// Holds IDs of entities created by <see cref="TestDataSeeder.SeedAsync"/>.
/// Tests reference these to build valid request URLs and payloads.
/// </summary>
public class SeedData
{
    public int SpanishId { get; set; }
    public int FrenchId { get; set; }
    public int A1LevelId { get; set; }
    public int A2LevelId { get; set; }
    public int Unit1Id { get; set; }
    public int Lesson1Id { get; set; }
    public int Lesson2Id { get; set; }
    public int McExerciseId { get; set; }       // MultipleChoice in Lesson 1
    public int FillBlankExerciseId { get; set; } // FillBlank in Lesson 1
    public int WordScrambleExerciseId { get; set; }
    public int FlashcardMatchExerciseId { get; set; }
    public int Lesson2ExerciseId { get; set; }  // MultipleChoice in Lesson 2
}

/// <summary>
/// Seeds a minimal but complete content graph into the test database.
/// Uses EF Core directly — no dependency on file paths.
/// </summary>
public static class TestDataSeeder
{
    public static async Task<SeedData> SeedAsync(AppDbContext db)
    {
        var sd = new SeedData();

        // ── Languages ─────────────────────────────────────────────────────────
        var spanish = new Language { Code = "es", Name = "Spanish", NativeName = "Español", IsActive = true };
        var french  = new Language { Code = "fr", Name = "French",  NativeName = "Français", IsActive = true };
        db.Languages.AddRange(spanish, french);

        // ── CEFR levels ───────────────────────────────────────────────────────
        var a1 = new CefrLevel { Code = "A1", Name = "Beginner",     Description = "Basic phrases and introductions", SortOrder = 1 };
        var a2 = new CefrLevel { Code = "A2", Name = "Elementary",   Description = "Familiar topics and routine tasks", SortOrder = 2 };
        db.CefrLevels.AddRange(a1, a2);

        await db.SaveChangesAsync();
        sd.SpanishId = spanish.Id;
        sd.FrenchId  = french.Id;
        sd.A1LevelId = a1.Id;
        sd.A2LevelId = a2.Id;

        // ── Units ─────────────────────────────────────────────────────────────
        var unit1 = new Unit
        {
            LanguageId  = spanish.Id,
            CefrLevelId = a1.Id,
            Title       = "Greetings & Introductions",
            Description = "Learn how to greet people and introduce yourself",
            SortOrder   = 1
        };
        db.Units.Add(unit1);
        await db.SaveChangesAsync();
        sd.Unit1Id = unit1.Id;

        // ── Lessons ───────────────────────────────────────────────────────────
        var lesson1 = new Lesson
        {
            UnitId      = unit1.Id,
            Title       = "Basic Greetings",
            Description = "Learn the most common Spanish greetings",
            Objective   = "Say hello and goodbye in Spanish",
            SortOrder   = 1
        };
        var lesson2 = new Lesson
        {
            UnitId      = unit1.Id,
            Title       = "Introducing Yourself",
            Description = "Tell people your name and where you are from",
            Objective   = "Introduce yourself in Spanish",
            SortOrder   = 2
        };
        db.Lessons.AddRange(lesson1, lesson2);
        await db.SaveChangesAsync();
        sd.Lesson1Id = lesson1.Id;
        sd.Lesson2Id = lesson2.Id;

        // ── Exercises ─────────────────────────────────────────────────────────
        var mcEx = new Exercise
        {
            LessonId  = lesson1.Id,
            Type      = ExerciseType.MultipleChoice,
            Config    = JsonDocument.Parse("""{"question":"How do you say 'hello' in Spanish?","options":["Hola","Adiós","Gracias","Por favor"],"correct_index":0}"""),
            SortOrder = 1,
            Points    = 10
        };
        var fillBlankEx = new Exercise
        {
            LessonId  = lesson1.Id,
            Type      = ExerciseType.FillBlank,
            Config    = JsonDocument.Parse("""{"sentence":"¿Cómo te ___?","correct_answer":"llamas","alternatives":["llamas"],"translation":"What is your name?"}"""),
            SortOrder = 2,
            Points    = 10
        };
        var scrambleEx = new Exercise
        {
            LessonId  = lesson1.Id,
            Type      = ExerciseType.WordScramble,
            Config    = JsonDocument.Parse("""{"target_word":"hola","scrambled":"aloh","translation":"hello","hint":"A common Spanish greeting"}"""),
            SortOrder = 3,
            Points    = 10
        };
        var flashcardEx = new Exercise
        {
            LessonId  = lesson1.Id,
            Type      = ExerciseType.FlashcardMatch,
            Config    = JsonDocument.Parse("""{"pairs":[{"target":"Hola","en":"Hello"},{"target":"Adiós","en":"Goodbye"},{"target":"Gracias","en":"Thank you"}]}"""),
            SortOrder = 4,
            Points    = 15
        };
        var lesson2Ex = new Exercise
        {
            LessonId  = lesson2.Id,
            Type      = ExerciseType.MultipleChoice,
            Config    = JsonDocument.Parse("""{"question":"How do you say 'my name is' in Spanish?","options":["Me llamo","Tengo","Soy de","Vivo en"],"correct_index":0}"""),
            SortOrder = 1,
            Points    = 10
        };
        db.Exercises.AddRange(mcEx, fillBlankEx, scrambleEx, flashcardEx, lesson2Ex);
        await db.SaveChangesAsync();

        sd.McExerciseId           = mcEx.Id;
        sd.FillBlankExerciseId    = fillBlankEx.Id;
        sd.WordScrambleExerciseId = scrambleEx.Id;
        sd.FlashcardMatchExerciseId = flashcardEx.Id;
        sd.Lesson2ExerciseId      = lesson2Ex.Id;

        return sd;
    }
}
