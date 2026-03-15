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
            .WithOpenApi()
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

            // Get all CEFR levels with units and lessons for this language
            var levels = await dbContext.CefrLevels
                .Include(l => l.Units.Where(u => u.LanguageId == targetLanguage.Id))
                .ThenInclude(u => u.Lessons)
                .ThenInclude(l => l.Exercises)
                .OrderBy(l => l.SortOrder)
                .ToListAsync();

            // Get all user progress for this language
            var userProgress = await dbContext.UserProgress
                .Where(p => p.UserId == user.Id)
                .ToListAsync();

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

                            var progress = userProgress.FirstOrDefault(p => p.ExerciseId == exercise.Id);
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

                    unitProgress.CompletionPercentage = unitProgress.TotalLessons > 0
                        ? (unitProgress.CompletedLessons * 100) / unitProgress.TotalLessons
                        : 0;

                    levelProgress.Units.Add(unitProgress);
                    levelProgress.PointsEarned += unitProgress.PointsEarned;
                    levelProgress.MaxPoints += unitProgress.MaxPoints;

                    if (unitProgress.CompletionPercentage == 100)
                    {
                        levelProgress.CompletedUnits++;
                    }
                }

                levelProgress.CompletionPercentage = levelProgress.TotalUnits > 0
                    ? (levelProgress.CompletedUnits * 100) / levelProgress.TotalUnits
                    : 0;

                levelProgressList.Add(levelProgress);
            }

            // Calculate streaks
            var userProgressOrdered = userProgress.OrderByDescending(p => p.CompletedAt).ToList();
            int currentStreak = CalculateStreak(userProgressOrdered, DateTime.UtcNow, true);
            int longestStreak = CalculateLongestStreak(userProgressOrdered);

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
                LastActivityAt = userProgressOrdered.FirstOrDefault()?.CompletedAt
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

    /// <summary>
    /// Calculates the current streak in days.
    /// </summary>
    private static int CalculateStreak(List<Data.Entities.UserProgress> progressList, DateTime today, bool isCurrent)
    {
        if (progressList.Count == 0)
        {
            return 0;
        }

        int streak = 0;
        DateTime? expectedDate = today.Date;

        foreach (var progress in progressList.Where(p => p.CompletedAt.HasValue))
        {
            var completedDate = progress.CompletedAt!.Value.Date;

            if (expectedDate == null)
            {
                break;
            }

            if (completedDate == expectedDate.Value)
            {
                streak++;
                expectedDate = expectedDate.Value.AddDays(-1);
            }
            else if (completedDate < expectedDate.Value)
            {
                // Gap in streak
                break;
            }
        }

        return streak;
    }

    /// <summary>
    /// Calculates the longest streak ever achieved.
    /// </summary>
    private static int CalculateLongestStreak(List<Data.Entities.UserProgress> progressList)
    {
        if (progressList.Count == 0)
        {
            return 0;
        }

        var sortedProgress = progressList
            .Where(p => p.CompletedAt.HasValue)
            .OrderByDescending(p => p.CompletedAt)
            .ToList();

        int longestStreak = 0;
        int currentStreak = 0;
        DateTime? previousDate = null;

        foreach (var progress in sortedProgress)
        {
            var completedDate = progress.CompletedAt!.Value.Date;

            if (previousDate == null)
            {
                currentStreak = 1;
            }
            else if (previousDate?.AddDays(-1) == completedDate)
            {
                currentStreak++;
            }
            else
            {
                longestStreak = Math.Max(longestStreak, currentStreak);
                currentStreak = 1;
            }

            previousDate = completedDate;
        }

        longestStreak = Math.Max(longestStreak, currentStreak);
        return longestStreak;
    }
}
