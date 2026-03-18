using LangafyApi.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace LangafyApi.Features.Progress;

/// <summary>
/// Endpoints for retrieving user learning progress.
/// </summary>
public static class ProgressEndpoints
{
    /// <summary>
    /// Maps progress endpoints to the application.
    /// </summary>
    public static void MapProgressEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/progress")
            .WithTags("Progress")
            .RequireAuthorization();

        group.MapGet("", GetProgress)
            .WithName("GetProgress")
            .WithSummary("Get user's learning progress")
            .WithDescription("Returns completion percentages per level, per unit, per lesson for the authenticated user's active language or a specified language. Includes total points and current streak.")
            .Produces<ProgressSummaryDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError);
    }

    /// <summary>
    /// Gets progress for the user's active language or a specified language.
    /// </summary>
    private static async Task<IResult> GetProgress(
        string? language,
        HttpContext context,
        AppDbContext dbContext)
    {
        try
        {
            // Get authenticated user
            var firebaseUid = context.User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(firebaseUid))
            {
                return Results.Unauthorized();
            }

            var user = await dbContext.Users
                .Include(u => u.UserLanguages)
                .ThenInclude(ul => ul.Language) // Eagerly load Language to avoid lazy-load trap
                .FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);

            if (user == null)
            {
                return Results.BadRequest("User not found. Please sync user first via /api/auth/sync.");
            }

            // Determine which language to get progress for
            string targetLanguageCode = language ?? "";
            if (string.IsNullOrEmpty(targetLanguageCode))
            {
                // Use active language
                var activeLanguage = user.UserLanguages.FirstOrDefault(ul => ul.IsPrimary);
                if (activeLanguage == null)
                {
                    return Results.BadRequest("User has no active language set.");
                }
                targetLanguageCode = activeLanguage.Language.Code;
            }

            // Get the language
            var targetLanguage = await dbContext.Languages
                .FirstOrDefaultAsync(l => l.Code == targetLanguageCode);

            if (targetLanguage == null)
            {
                return Results.NotFound($"Language '{targetLanguageCode}' not found.");
            }

            // Get user's language info
            var userLanguage = user.UserLanguages.FirstOrDefault(ul => ul.LanguageId == targetLanguage.Id);
            if (userLanguage == null)
            {
                return Results.BadRequest($"User is not studying language '{targetLanguageCode}'.");
            }

            // Get all CEFR levels with units and lessons for this language.
            // AsSplitQuery prevents the cartesian explosion that results from JOINing
            // 3 levels of navigation properties (levels × units × lessons × exercises).
            var levels = await dbContext.CefrLevels
                .Include(l => l.Units.Where(u => u.LanguageId == targetLanguage.Id))
                .ThenInclude(u => u.Lessons)
                .ThenInclude(l => l.Exercises)
                .OrderBy(l => l.SortOrder)
                .AsSplitQuery()
                .ToListAsync();

            // Scope progress query to only exercises in the target language.
            // Extract IDs from already-loaded data to avoid an extra DB round-trip.
            var languageExerciseIds = levels
                .SelectMany(l => l.Units)
                .SelectMany(u => u.Lessons)
                .SelectMany(l => l.Exercises)
                .Select(e => e.Id)
                .ToList();

            var userProgressList = await dbContext.UserProgress
                .Where(p => p.UserId == user.Id && languageExerciseIds.Contains(p.ExerciseId))
                .ToListAsync();

            // Dictionary for O(1) lookups in the nested exercise loop below
            var progressByExerciseId = userProgressList.ToDictionary(p => p.ExerciseId);

            // Build progress summary
            var levelProgressList = new List<LevelProgressDto>();
            int totalCompletedExercises = 0;
            int totalAttemptedExercises = 0;
            int totalPointsEarned = 0;
            int totalMaxPoints = 0;

            foreach (var level in levels)
            {
                var levelProgress = new LevelProgressDto
                {
                    Id = level.Id,
                    Code = level.Code,
                    Name = level.Name,
                    TotalUnits = level.Units.Count,
                    CompletedUnits = 0,
                    PointsEarned = 0,
                    MaxPoints = 0,
                    Units = new()
                };

                foreach (var unit in level.Units.OrderBy(u => u.SortOrder))
                {
                    var unitProgress = new UnitProgressDto
                    {
                        Id = unit.Id,
                        Title = unit.Title,
                        Description = unit.Description,
                        TotalLessons = unit.Lessons.Count,
                        CompletedLessons = 0,
                        PointsEarned = 0,
                        MaxPoints = 0,
                        Lessons = new()
                    };

                    foreach (var lesson in unit.Lessons.OrderBy(l => l.SortOrder))
                    {
                        var lessonProgress = new LessonProgressDto
                        {
                            Id = lesson.Id,
                            Title = lesson.Title,
                            TotalExercises = lesson.Exercises.Count,
                            CompletedExercises = 0,
                            PointsEarned = 0,
                            MaxPoints = 0
                        };

                        // Calculate exercise progress for this lesson
                        bool lessonCompleted = true;
                        foreach (var exercise in lesson.Exercises)
                        {
                            lessonProgress.MaxPoints += exercise.Points;
                            totalMaxPoints += exercise.Points;

                            progressByExerciseId.TryGetValue(exercise.Id, out var progress);
                            if (progress != null)
                            {
                                totalAttemptedExercises++;
                                if (progress.Completed)
                                {
                                    lessonProgress.CompletedExercises++;
                                    lessonProgress.PointsEarned += progress.Score > 0 ? exercise.Points : 0;
                                    totalPointsEarned += progress.Score > 0 ? exercise.Points : 0;
                                    totalCompletedExercises++;
                                }
                                else
                                {
                                    lessonCompleted = false;
                                }
                            }
                            else
                            {
                                lessonCompleted = false;
                            }
                        }

                        lessonProgress.CompletionPercentage = lesson.Exercises.Count > 0
                            ? (lessonProgress.CompletedExercises * 100) / lesson.Exercises.Count
                            : 0;

                        unitProgress.Lessons.Add(lessonProgress);
                        unitProgress.PointsEarned += lessonProgress.PointsEarned;
                        unitProgress.MaxPoints += lessonProgress.MaxPoints;

                        if (lessonCompleted && lesson.Exercises.Count > 0)
                        {
                            unitProgress.CompletedLessons++;
                        }
                    }

                    // Use exercise-level progress for a smoother, more accurate
                    // completion percentage (avoids showing 0% when a lesson is
                    // partially finished).
                    int unitTotalExercises = unitProgress.Lessons.Sum(l => l.TotalExercises);
                    int unitCompletedExercises = unitProgress.Lessons.Sum(l => l.CompletedExercises);
                    unitProgress.CompletionPercentage = unitTotalExercises > 0
                        ? (unitCompletedExercises * 100) / unitTotalExercises
                        : 0;

                    levelProgress.Units.Add(unitProgress);
                    levelProgress.PointsEarned += unitProgress.PointsEarned;
                    levelProgress.MaxPoints += unitProgress.MaxPoints;

                    if (unitProgress.CompletionPercentage == 100)
                    {
                        levelProgress.CompletedUnits++;
                    }
                }

                // Use exercise-level progress across all units in this level.
                int levelTotalExercises = levelProgress.Units.SelectMany(u => u.Lessons).Sum(l => l.TotalExercises);
                int levelCompletedExercises = levelProgress.Units.SelectMany(u => u.Lessons).Sum(l => l.CompletedExercises);
                levelProgress.CompletionPercentage = levelTotalExercises > 0
                    ? (levelCompletedExercises * 100) / levelTotalExercises
                    : 0;

                levelProgressList.Add(levelProgress);
            }

            // Calculate streaks
            int currentStreak = ProgressCalculator.CalculateStreak(userProgressList, DateTime.UtcNow);
            int longestStreak = ProgressCalculator.CalculateLongestStreak(userProgressList);

            // Calculate overall completion percentage
            int overallCompletionPercentage = totalMaxPoints > 0
                ? (totalPointsEarned * 100) / totalMaxPoints
                : 0;

            var progressSummary = new ProgressSummaryDto
            {
                LanguageCode = targetLanguage.Code,
                LanguageName = targetLanguage.Name,
                CurrentCefrLevel = userLanguage.CurrentCefrLevel,
                TotalExercisesCompleted = totalCompletedExercises,
                TotalExercisesAttempted = totalAttemptedExercises,
                TotalPointsEarned = totalPointsEarned,
                CurrentStreak = currentStreak,
                LongestStreak = longestStreak,
                OverallCompletionPercentage = overallCompletionPercentage,
                Levels = levelProgressList,
                LastActivityAt = userProgressList.OrderByDescending(p => p.CompletedAt).FirstOrDefault()?.CompletedAt
            };

            return Results.Ok(progressSummary);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while fetching progress"
            );
        }
    }

}
