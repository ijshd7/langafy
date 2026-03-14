using System.Text.Json;
using System.Text.Json.Serialization;
using LangafyApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace LangafyApi.Data;

/// <summary>
/// Seeder for populating the database with language content during development.
/// Reads JSON files from Data/SeedData/ directory and upserts entities.
/// Designed to support multiple languages: just add a new language code directory with seed files.
/// </summary>
public class DbSeeder
{
    private readonly AppDbContext _context;
    private readonly ILogger<DbSeeder> _logger;
    private readonly string _seedDataPath;
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public DbSeeder(AppDbContext context, ILogger<DbSeeder> logger, IWebHostEnvironment env)
    {
        _context = context;
        _logger = logger;
        _seedDataPath = Path.Combine(env.ContentRootPath, "Data", "SeedData");
    }

    /// <summary>
    /// Seeds the database if it's empty. Called during application startup in development.
    /// </summary>
    public async Task SeedAsync()
    {
        try
        {
            // Skip if data already exists
            if (await _context.Languages.AnyAsync())
            {
                _logger.LogInformation("Database already seeded, skipping.");
                return;
            }

            _logger.LogInformation("Starting database seeding...");

            await SeedLanguagesAsync();
            await SeedCefrLevelsAsync();
            await _context.SaveChangesAsync();

            await SeedLanguageContentAsync();
            await _context.SaveChangesAsync();
            _logger.LogInformation("Database seeding completed successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred during database seeding.");
            throw;
        }
    }

    /// <summary>
    /// Seeds languages from languages.json.
    /// </summary>
    private async Task SeedLanguagesAsync()
    {
        var filePath = Path.Combine(_seedDataPath, "languages.json");
        if (!File.Exists(filePath))
        {
            _logger.LogWarning("Languages seed file not found: {FilePath}", filePath);
            return;
        }

        var json = await File.ReadAllTextAsync(filePath);
        var languageSeedData = JsonSerializer.Deserialize<List<LanguageSeedDto>>(json, _jsonOptions)
            ?? throw new InvalidOperationException("Failed to deserialize languages.json");

        foreach (var lang in languageSeedData)
        {
            var existing = await _context.Languages.FirstOrDefaultAsync(l => l.Code == lang.Code);
            if (existing != null)
            {
                existing.Name = lang.Name;
                existing.NativeName = lang.NativeName;
                existing.IsActive = lang.IsActive;
                _context.Languages.Update(existing);
            }
            else
            {
                _context.Languages.Add(new Language
                {
                    Code = lang.Code,
                    Name = lang.Name,
                    NativeName = lang.NativeName,
                    IsActive = lang.IsActive
                });
            }
        }

        _logger.LogInformation("Seeded {Count} languages.", languageSeedData.Count);
    }

    /// <summary>
    /// Seeds CEFR levels from cefr-levels.json.
    /// </summary>
    private async Task SeedCefrLevelsAsync()
    {
        var filePath = Path.Combine(_seedDataPath, "cefr-levels.json");
        if (!File.Exists(filePath))
        {
            _logger.LogWarning("CEFR levels seed file not found: {FilePath}", filePath);
            return;
        }

        var json = await File.ReadAllTextAsync(filePath);
        var cefrSeedData = JsonSerializer.Deserialize<List<CefrLevelSeedDto>>(json, _jsonOptions)
            ?? throw new InvalidOperationException("Failed to deserialize cefr-levels.json");

        foreach (var cefr in cefrSeedData)
        {
            var existing = await _context.CefrLevels.FirstOrDefaultAsync(c => c.Code == cefr.Code);
            if (existing != null)
            {
                existing.Name = cefr.Name;
                existing.Description = cefr.Description;
                existing.SortOrder = cefr.SortOrder;
                _context.CefrLevels.Update(existing);
            }
            else
            {
                _context.CefrLevels.Add(new CefrLevel
                {
                    Code = cefr.Code,
                    Name = cefr.Name,
                    Description = cefr.Description,
                    SortOrder = cefr.SortOrder
                });
            }
        }

        _logger.LogInformation("Seeded {Count} CEFR levels.", cefrSeedData.Count);
    }

    /// <summary>
    /// Seeds language-specific content (units, lessons, exercises, vocabulary) from language directories.
    /// Automatically discovers language directories and loads their seed files.
    /// </summary>
    private async Task SeedLanguageContentAsync()
    {
        var languageDir = new DirectoryInfo(_seedDataPath);
        var languageCodeDirs = languageDir.GetDirectories()
            .Where(d => !d.Name.StartsWith("."))
            .ToList();

        foreach (var langCodeDir in languageCodeDirs)
        {
            var languageCode = langCodeDir.Name;
            _logger.LogInformation("Seeding content for language: {LanguageCode}", languageCode);

            var language = await _context.Languages
                .FirstOrDefaultAsync(l => l.Code == languageCode);
            if (language == null)
            {
                _logger.LogWarning("Language {LanguageCode} not found, skipping content seed.", languageCode);
                continue;
            }

            await SeedUnitsAsync(language, langCodeDir);
            await _context.SaveChangesAsync();

            await SeedLessonsAsync(language, langCodeDir);
            await _context.SaveChangesAsync();

            await SeedExercisesAsync(language, langCodeDir);
            await SeedVocabularyAsync(language, langCodeDir);
        }
    }

    /// <summary>
    /// Seeds units for a specific language from units.json.
    /// </summary>
    private async Task SeedUnitsAsync(Language language, DirectoryInfo langCodeDir)
    {
        var filePath = Path.Combine(langCodeDir.FullName, "units.json");
        if (!File.Exists(filePath))
            return;

        var json = await File.ReadAllTextAsync(filePath);
        var unitSeedData = JsonSerializer.Deserialize<List<UnitSeedDto>>(json, _jsonOptions)
            ?? throw new InvalidOperationException($"Failed to deserialize units.json for {language.Code}");

        var cefrLevels = await _context.CefrLevels.ToListAsync();

        foreach (var unit in unitSeedData)
        {
            var cefrLevel = cefrLevels.FirstOrDefault(c => c.Code == unit.CefrLevel);
            if (cefrLevel == null)
            {
                _logger.LogWarning("CEFR level {Level} not found for unit {Code}", unit.CefrLevel, unit.Code);
                continue;
            }

            var existing = await _context.Units
                .FirstOrDefaultAsync(u => u.Language.Code == language.Code && u.Title == unit.Title);
            if (existing == null)
            {
                _context.Units.Add(new Unit
                {
                    LanguageId = language.Id,
                    CefrLevelId = cefrLevel.Id,
                    Title = unit.Title,
                    Description = unit.Description,
                    SortOrder = unit.SortOrder
                });
            }
        }

        _logger.LogInformation("Seeded {Count} units for {LanguageCode}.", unitSeedData.Count, language.Code);
    }

    /// <summary>
    /// Seeds lessons for a specific language from lessons.json.
    /// </summary>
    private async Task SeedLessonsAsync(Language language, DirectoryInfo langCodeDir)
    {
        var filePath = Path.Combine(langCodeDir.FullName, "lessons.json");
        if (!File.Exists(filePath))
            return;

        var json = await File.ReadAllTextAsync(filePath);
        var lessonSeedData = JsonSerializer.Deserialize<List<LessonSeedDto>>(json, _jsonOptions)
            ?? throw new InvalidOperationException($"Failed to deserialize lessons.json for {language.Code}");

        var units = await _context.Units
            .Where(u => u.Language.Code == language.Code)
            .ToListAsync();

        foreach (var lesson in lessonSeedData)
        {
            var unit = units.FirstOrDefault(u => u.Title.Contains(lesson.UnitCode.Split("_").Last()));
            if (unit == null)
            {
                _logger.LogWarning("Unit {UnitCode} not found for lesson {Code}", lesson.UnitCode, lesson.Code);
                continue;
            }

            var existing = await _context.Lessons
                .FirstOrDefaultAsync(l => l.UnitId == unit.Id && l.Title == lesson.Title);
            if (existing == null)
            {
                _context.Lessons.Add(new Lesson
                {
                    UnitId = unit.Id,
                    Title = lesson.Title,
                    Description = lesson.Description,
                    Objective = lesson.Objective,
                    SortOrder = lesson.SortOrder
                });
            }
        }

        _logger.LogInformation("Seeded {Count} lessons for {LanguageCode}.", lessonSeedData.Count, language.Code);
    }

    /// <summary>
    /// Seeds exercises for a specific language from exercises.json.
    /// </summary>
    private async Task SeedExercisesAsync(Language language, DirectoryInfo langCodeDir)
    {
        var filePath = Path.Combine(langCodeDir.FullName, "exercises.json");
        if (!File.Exists(filePath))
            return;

        var json = await File.ReadAllTextAsync(filePath);
        var exerciseSeedData = JsonSerializer.Deserialize<List<ExerciseSeedDto>>(json, _jsonOptions)
            ?? throw new InvalidOperationException($"Failed to deserialize exercises.json for {language.Code}");

        var lessons = await _context.Lessons
            .Include(l => l.Unit)
            .Where(l => l.Unit.Language.Code == language.Code)
            .ToListAsync();

        foreach (var exercise in exerciseSeedData)
        {
            var lesson = lessons.FirstOrDefault(l => l.Title.Contains(exercise.LessonCode.Split("_").Last()));
            if (lesson == null)
            {
                _logger.LogWarning("Lesson {LessonCode} not found for exercise {Code}", exercise.LessonCode, exercise.Code);
                continue;
            }

            var existing = await _context.Exercises
                .FirstOrDefaultAsync(e => e.LessonId == lesson.Id && e.Type == exercise.Type && e.SortOrder == exercise.SortOrder);
            if (existing == null)
            {
                _context.Exercises.Add(new Exercise
                {
                    LessonId = lesson.Id,
                    Type = exercise.Type,
                    Config = exercise.Config ?? JsonDocument.Parse("{}"),
                    SortOrder = exercise.SortOrder,
                    Points = exercise.Points
                });
            }
        }

        _logger.LogInformation("Seeded {Count} exercises for {LanguageCode}.", exerciseSeedData.Count, language.Code);
    }

    /// <summary>
    /// Seeds vocabulary for a specific language from vocabulary.json.
    /// </summary>
    private async Task SeedVocabularyAsync(Language language, DirectoryInfo langCodeDir)
    {
        var filePath = Path.Combine(langCodeDir.FullName, "vocabulary.json");
        if (!File.Exists(filePath))
            return;

        var json = await File.ReadAllTextAsync(filePath);
        var vocabSeedData = JsonSerializer.Deserialize<List<VocabularySeedDto>>(json, _jsonOptions)
            ?? throw new InvalidOperationException($"Failed to deserialize vocabulary.json for {language.Code}");

        var cefrLevels = await _context.CefrLevels.ToListAsync();

        foreach (var vocab in vocabSeedData)
        {
            var cefrLevel = cefrLevels.FirstOrDefault(c => c.Code == vocab.CefrLevel);
            if (cefrLevel == null)
            {
                _logger.LogWarning("CEFR level {Level} not found for vocabulary {Word}", vocab.CefrLevel, vocab.WordTarget);
                continue;
            }

            var existing = await _context.Vocabulary
                .FirstOrDefaultAsync(v =>
                    v.LanguageId == language.Id &&
                    v.WordTarget == vocab.WordTarget);
            if (existing == null)
            {
                _context.Vocabulary.Add(new Vocabulary
                {
                    LanguageId = language.Id,
                    CefrLevelId = cefrLevel.Id,
                    WordTarget = vocab.WordTarget,
                    WordEn = vocab.WordEn,
                    PartOfSpeech = vocab.PartOfSpeech,
                    ExampleSentenceTarget = vocab.ExampleSentenceTarget,
                    ExampleSentenceEn = vocab.ExampleSentenceEn
                });
            }
        }

        _logger.LogInformation("Seeded {Count} vocabulary items for {LanguageCode}.", vocabSeedData.Count, language.Code);
    }

    // DTOs for deserializing seed data
    private class LanguageSeedDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NativeName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    private class CefrLevelSeedDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int SortOrder { get; set; }
    }

    private class UnitSeedDto
    {
        public string Code { get; set; } = string.Empty;
        public string CefrLevel { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int SortOrder { get; set; }
    }

    private class LessonSeedDto
    {
        public string Code { get; set; } = string.Empty;
        public string UnitCode { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Objective { get; set; } = string.Empty;
        public int SortOrder { get; set; }
    }

    private class ExerciseSeedDto
    {
        public string Code { get; set; } = string.Empty;
        public string LessonCode { get; set; } = string.Empty;
        public ExerciseType Type { get; set; }
        public int SortOrder { get; set; }
        public int Points { get; set; }
        public JsonDocument? Config { get; set; }
    }

    private class VocabularySeedDto
    {
        public string CefrLevel { get; set; } = string.Empty;
        public string WordTarget { get; set; } = string.Empty;
        public string WordEn { get; set; } = string.Empty;
        public string PartOfSpeech { get; set; } = string.Empty;
        public string ExampleSentenceTarget { get; set; } = string.Empty;
        public string ExampleSentenceEn { get; set; } = string.Empty;
    }
}
