using LangafyApi.Data;
using LangafyApi.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace LangafyApi.Features.Vocabulary;

/// <summary>
/// Endpoints for managing user vocabulary and spaced repetition reviews.
/// </summary>
public static class VocabularyEndpoints
{
    /// <summary>
    /// Maps vocabulary endpoints to the application.
    /// </summary>
    public static void MapVocabularyEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/vocabulary")
            .WithTags("Vocabulary")
            .RequireAuthorization();

        group.MapGet("", GetVocabulary)
            .WithName("GetVocabulary")
            .WithOpenApi()
            .WithSummary("List vocabulary with pagination, filtering, and search")
            .WithDescription("Returns a paginated list of vocabulary items. Supports filtering by CEFR level and language, and searching by word.")
            .Produces<PaginatedVocabularyResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError);

        group.MapPost("/{id}/review", RecordVocabularyReview)
            .WithName("RecordVocabularyReview")
            .WithOpenApi()
            .WithSummary("Record a spaced repetition review")
            .WithDescription("Records a vocabulary review using the SM-2 (Supermemo 2) algorithm and updates the next review date.")
            .Accepts<VocabularyReviewRequest>("application/json")
            .Produces<VocabularyReviewResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);

        group.MapGet("/due", GetDueForReview)
            .WithName("GetVocabularyDueForReview")
            .WithOpenApi()
            .WithSummary("Get vocabulary items due for review")
            .WithDescription("Returns vocabulary items that are due for review for the user's active language.")
            .Produces<PaginatedVocabularyResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError);
    }

    /// <summary>
    /// Gets a paginated list of vocabulary items with optional filtering and search.
    /// </summary>
    private static async Task<IResult> GetVocabulary(
        HttpContext context,
        AppDbContext dbContext,
        int page = 1,
        int pageSize = 20,
        string? cefrLevel = null,
        string? search = null)
    {
        try
        {
            // Validate pagination parameters
            if (page < 1)
            {
                page = 1;
            }

            if (pageSize < 1 || pageSize > 100)
            {
                pageSize = 20;
            }

            // Get authenticated user
            var firebaseUid = context.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(firebaseUid))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .Include(u => u.UserLanguages)
                .FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);

            if (user == null)
            {
                return Results.BadRequest("User not found. Please sync user first via /api/auth/sync.");
            }

            // Get user's active/primary language
            var primaryLanguage = user.UserLanguages.FirstOrDefault(ul => ul.IsPrimary);
            if (primaryLanguage == null)
            {
                return Results.BadRequest("User has no primary language set.");
            }

            // Build query for vocabulary
            var query = dbContext.Vocabulary
                .Where(v => v.LanguageId == primaryLanguage.LanguageId)
                .Include(v => v.CefrLevel)
                .AsQueryable();

            // Filter by CEFR level if provided
            if (!string.IsNullOrEmpty(cefrLevel))
            {
                query = query.Where(v => v.CefrLevel.Code == cefrLevel);
            }

            // Search by word if provided
            if (!string.IsNullOrEmpty(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(v =>
                    v.WordTarget.ToLower().Contains(searchLower) ||
                    v.WordEn.ToLower().Contains(searchLower)
                );
            }

            // Get total count before pagination
            var totalCount = await query.CountAsync();

            // Apply pagination
            var skip = (page - 1) * pageSize;
            var vocabularyItems = await query
                .OrderBy(v => v.WordTarget)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            // Get user's vocabulary progress for these items
            var vocabularyIds = vocabularyItems.Select(v => v.Id).ToList();
            var userVocabProgress = await dbContext.UserVocabulary
                .Where(uv => uv.UserId == user.Id && vocabularyIds.Contains(uv.VocabularyId))
                .ToDictionaryAsync(uv => uv.VocabularyId);

            // Map to DTOs
            var items = vocabularyItems.Select(v =>
            {
                var userProgress = userVocabProgress.ContainsKey(v.Id) ? userVocabProgress[v.Id] : null;
                var isDueForReview = userProgress != null && userProgress.NextReviewAt <= DateTime.UtcNow;

                return new VocabularyDto
                {
                    Id = v.Id,
                    WordTarget = v.WordTarget,
                    WordEn = v.WordEn,
                    PartOfSpeech = v.PartOfSpeech,
                    ExampleSentenceTarget = v.ExampleSentenceTarget,
                    ExampleSentenceEn = v.ExampleSentenceEn,
                    CefrLevel = v.CefrLevel.Code,
                    EaseFactor = userProgress?.EaseFactor,
                    IntervalDays = userProgress?.IntervalDays ?? 0,
                    Repetitions = userProgress?.Repetitions ?? 0,
                    NextReviewAt = userProgress?.NextReviewAt,
                    IsDueForReview = isDueForReview
                };
            }).ToList();

            var response = new PaginatedVocabularyResponse
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while fetching vocabulary"
            );
        }
    }

    /// <summary>
    /// Records a vocabulary review using the SM-2 spaced repetition algorithm.
    /// </summary>
    private static async Task<IResult> RecordVocabularyReview(
        int id,
        VocabularyReviewRequest request,
        HttpContext context,
        AppDbContext dbContext)
    {
        try
        {
            // Validate quality rating (0-5)
            if (request.Quality < 0 || request.Quality > 5)
            {
                return Results.BadRequest("Quality rating must be between 0 and 5.");
            }

            // Get authenticated user
            var firebaseUid = context.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(firebaseUid))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users.FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);
            if (user == null)
            {
                return Results.BadRequest("User not found. Please sync user first via /api/auth/sync.");
            }

            // Get vocabulary item
            var vocabulary = await dbContext.Vocabulary
                .FirstOrDefaultAsync(v => v.Id == id);

            if (vocabulary == null)
            {
                return Results.NotFound($"Vocabulary item with ID {id} not found.");
            }

            // Get or create user vocabulary entry
            var userVocab = await dbContext.UserVocabulary
                .FirstOrDefaultAsync(uv => uv.UserId == user.Id && uv.VocabularyId == id);

            if (userVocab == null)
            {
                // First review: create the entry
                userVocab = new UserVocabulary
                {
                    UserId = user.Id,
                    VocabularyId = id,
                    EaseFactor = 2.5,
                    IntervalDays = 1,
                    Repetitions = 0,
                    NextReviewAt = DateTime.UtcNow
                };
                dbContext.UserVocabulary.Add(userVocab);
            }

            // Apply SM-2 algorithm
            var newEaseFactor = CalculateSM2EaseFactor(userVocab.EaseFactor, request.Quality);
            var newIntervalDays = CalculateSM2Interval(userVocab.Repetitions, request.Quality, newEaseFactor);
            var newRepetitions = request.Quality >= 3 ? userVocab.Repetitions + 1 : 0;

            // Update user vocabulary
            userVocab.EaseFactor = Math.Max(1.3, newEaseFactor); // Ease factor should not go below 1.3
            userVocab.IntervalDays = newIntervalDays;
            userVocab.Repetitions = newRepetitions;
            userVocab.NextReviewAt = DateTime.UtcNow.AddDays(newIntervalDays);

            dbContext.UserVocabulary.Update(userVocab);
            await dbContext.SaveChangesAsync();

            var response = new VocabularyReviewResponse
            {
                VocabularyId = id,
                EaseFactor = userVocab.EaseFactor,
                IntervalDays = userVocab.IntervalDays,
                Repetitions = userVocab.Repetitions,
                NextReviewAt = userVocab.NextReviewAt
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while recording vocabulary review"
            );
        }
    }

    /// <summary>
    /// Gets vocabulary items that are due for review for the user's active language.
    /// </summary>
    private static async Task<IResult> GetDueForReview(
        HttpContext context,
        AppDbContext dbContext,
        int page = 1,
        int pageSize = 20)
    {
        try
        {
            // Validate pagination parameters
            if (page < 1)
            {
                page = 1;
            }

            if (pageSize < 1 || pageSize > 100)
            {
                pageSize = 20;
            }

            // Get authenticated user
            var firebaseUid = context.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(firebaseUid))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .Include(u => u.UserLanguages)
                .FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);

            if (user == null)
            {
                return Results.BadRequest("User not found. Please sync user first via /api/auth/sync.");
            }

            // Get user's active/primary language
            var primaryLanguage = user.UserLanguages.FirstOrDefault(ul => ul.IsPrimary);
            if (primaryLanguage == null)
            {
                return Results.BadRequest("User has no primary language set.");
            }

            // Get vocabulary items due for review
            var now = DateTime.UtcNow;
            var query = dbContext.UserVocabulary
                .Where(uv => uv.UserId == user.Id && uv.NextReviewAt <= now)
                .Include(uv => uv.Vocabulary)
                .ThenInclude(v => v.CefrLevel)
                .Where(uv => uv.Vocabulary.LanguageId == primaryLanguage.LanguageId)
                .AsQueryable();

            // Get total count before pagination
            var totalCount = await query.CountAsync();

            // Apply pagination
            var skip = (page - 1) * pageSize;
            var dueItems = await query
                .OrderBy(uv => uv.NextReviewAt)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();

            // Map to DTOs
            var items = dueItems.Select(uv => new VocabularyDto
            {
                Id = uv.Vocabulary.Id,
                WordTarget = uv.Vocabulary.WordTarget,
                WordEn = uv.Vocabulary.WordEn,
                PartOfSpeech = uv.Vocabulary.PartOfSpeech,
                ExampleSentenceTarget = uv.Vocabulary.ExampleSentenceTarget,
                ExampleSentenceEn = uv.Vocabulary.ExampleSentenceEn,
                CefrLevel = uv.Vocabulary.CefrLevel.Code,
                EaseFactor = uv.EaseFactor,
                IntervalDays = uv.IntervalDays,
                Repetitions = uv.Repetitions,
                NextReviewAt = uv.NextReviewAt,
                IsDueForReview = true
            }).ToList();

            var response = new PaginatedVocabularyResponse
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while fetching due vocabulary"
            );
        }
    }

    /// <summary>
    /// Calculates the new ease factor using the SM-2 algorithm.
    /// </summary>
    /// <param name="currentEaseFactor">Current ease factor</param>
    /// <param name="quality">Quality rating (0-5)</param>
    /// <returns>New ease factor</returns>
    private static double CalculateSM2EaseFactor(double currentEaseFactor, int quality)
    {
        // SM-2 formula: EF := EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        // Where q is quality rating (0-5)
        return currentEaseFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    }

    /// <summary>
    /// Calculates the new interval using the SM-2 algorithm.
    /// </summary>
    /// <param name="currentRepetitions">Number of successful repetitions before this one</param>
    /// <param name="quality">Quality rating (0-5)</param>
    /// <param name="easeFactor">Current ease factor</param>
    /// <returns>New interval in days</returns>
    private static int CalculateSM2Interval(int currentRepetitions, int quality, double easeFactor)
    {
        // If quality < 3, restart from the beginning
        if (quality < 3)
        {
            return 1;
        }

        // SM-2 interval formula
        // I(1) := 1, I(2) := 6, I(n) := I(n-1) * EF
        return currentRepetitions switch
        {
            0 => 1,
            1 => 6,
            _ => (int)Math.Round(currentRepetitions * easeFactor)
        };
    }
}
