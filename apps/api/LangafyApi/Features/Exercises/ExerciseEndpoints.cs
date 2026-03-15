using LangafyApi.Data;
using LangafyApi.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace LangafyApi.Features.Exercises;

/// <summary>
/// Endpoints for managing exercise submissions and validation.
/// </summary>
public static class ExerciseEndpoints
{
    /// <summary>
    /// Maps exercise endpoints to the application.
    /// </summary>
    public static void MapExerciseEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/exercises")
            .WithTags("Exercises")
            .RequireAuthorization();

        group.MapPost("/{id}/submit", SubmitExercise)
            .WithName("SubmitExercise")
            .WithSummary("Submit an exercise answer")
            .WithDescription("Submits an exercise answer, validates it, records progress, and returns feedback with score.")
            .Accepts<MultipleChoiceSubmission>("application/json")
            .Produces<ExerciseResultDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);
    }

    // Clients send camelCase JSON (web/mobile); use case-insensitive options for deserialization.
    private static readonly System.Text.Json.JsonSerializerOptions _jsonOptions =
        new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Submits and validates an exercise answer, records user progress.
    /// </summary>
    private static async Task<IResult> SubmitExercise(
        int id,
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
                .FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);

            if (user == null)
            {
                return Results.BadRequest("User not found. Please sync user first via /api/auth/sync.");
            }

            // Get the exercise
            var exercise = await dbContext.Exercises
                .Include(e => e.Lesson)
                .FirstOrDefaultAsync(e => e.Id == id);

            if (exercise == null)
            {
                return Results.NotFound($"Exercise with ID {id} not found.");
            }

            // Parse the request body to determine exercise type
            var body = "";
            using (var reader = new StreamReader(context.Request.Body))
            {
                body = await reader.ReadToEndAsync();
            }

            ExerciseResultDto result;
            var validator = new ExerciseValidator();

            try
            {
                switch (exercise.Type)
                {
                    case ExerciseType.MultipleChoice:
                        {
                            var submission = System.Text.Json.JsonSerializer.Deserialize<MultipleChoiceSubmission>(body, _jsonOptions)
                                ?? throw new InvalidOperationException("Invalid submission format.");
                            result = validator.ValidateMultipleChoice(exercise, submission);
                            break;
                        }
                    case ExerciseType.FillBlank:
                        {
                            var submission = System.Text.Json.JsonSerializer.Deserialize<FillBlankSubmission>(body, _jsonOptions)
                                ?? throw new InvalidOperationException("Invalid submission format.");
                            result = validator.ValidateFillBlank(exercise, submission);
                            break;
                        }
                    case ExerciseType.WordScramble:
                        {
                            var submission = System.Text.Json.JsonSerializer.Deserialize<WordScrambleSubmission>(body, _jsonOptions)
                                ?? throw new InvalidOperationException("Invalid submission format.");
                            result = validator.ValidateWordScramble(exercise, submission);
                            break;
                        }
                    case ExerciseType.FlashcardMatch:
                        {
                            var submission = System.Text.Json.JsonSerializer.Deserialize<FlashcardMatchSubmission>(body, _jsonOptions)
                                ?? throw new InvalidOperationException("Invalid submission format.");
                            result = validator.ValidateFlashcardMatch(exercise, submission);
                            break;
                        }
                    case ExerciseType.FreeResponse:
                        {
                            var submission = System.Text.Json.JsonSerializer.Deserialize<FreeResponseSubmission>(body, _jsonOptions)
                                ?? throw new InvalidOperationException("Invalid submission format.");
                            result = validator.ValidateFreeResponse(exercise, submission);
                            break;
                        }
                    default:
                        return Results.BadRequest($"Unknown exercise type: {exercise.Type}");
                }
            }
            catch (System.Text.Json.JsonException ex)
            {
                return Results.BadRequest($"Invalid submission format: {ex.Message}");
            }

            // Check for existing progress on this exercise
            var existingProgress = await dbContext.UserProgress
                .FirstOrDefaultAsync(p => p.UserId == user.Id && p.ExerciseId == id);

            if (existingProgress != null)
            {
                // Update existing progress
                existingProgress.Attempts += 1;
                existingProgress.Score = Math.Max(existingProgress.Score, result.Score);
                existingProgress.Completed = result.IsCorrect || existingProgress.Completed;
                if (result.IsCorrect && !existingProgress.CompletedAt.HasValue)
                {
                    existingProgress.CompletedAt = DateTime.UtcNow;
                }

                dbContext.UserProgress.Update(existingProgress);
            }
            else
            {
                // Create new progress record
                var progress = new UserProgress
                {
                    UserId = user.Id,
                    ExerciseId = id,
                    Attempts = 1,
                    Score = result.Score,
                    Completed = result.IsCorrect,
                    CompletedAt = result.IsCorrect ? DateTime.UtcNow : null
                };

                dbContext.UserProgress.Add(progress);
            }

            await dbContext.SaveChangesAsync();

            return Results.Ok(result);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while submitting exercise"
            );
        }
    }
}
