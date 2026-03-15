using LangafyApi.Data;
using LangafyApi.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace LangafyApi.Features.Auth;

/// <summary>
/// Endpoints for authentication and user synchronization.
/// </summary>
public static class AuthEndpoints
{
    /// <summary>
    /// Maps auth endpoints to the application.
    /// </summary>
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Auth");

        group.MapPost("/sync", SyncAuth)
            .WithName("SyncAuth")
            .WithOpenApi()
            .WithSummary("Sync Firebase user to database")
            .WithDescription("Extracts Firebase UID and email from JWT claims, creates/updates AppUser, and ensures user has at least one language. New users are assigned Spanish at A1 level.")
            .Produces<SyncAuthResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError)
            .RequireAuthorization();
    }

    /// <summary>
    /// Syncs a Firebase user to the local database.
    /// Extracts the Firebase UID from the JWT token claims and creates/updates an AppUser record.
    /// New users are automatically assigned Spanish as their default language at A1 level.
    /// </summary>
    private static async Task<IResult> SyncAuth(HttpContext context, AppDbContext dbContext)
    {
        try
        {
            // Extract Firebase UID from claims
            var firebaseUid = context.User.FindFirst("sub")?.Value;
            var email = context.User.FindFirst("email")?.Value;
            var displayName = context.User.FindFirst("name")?.Value ?? email?.Split('@')[0] ?? "User";

            if (string.IsNullOrEmpty(firebaseUid) || string.IsNullOrEmpty(email))
            {
                return Results.Unauthorized();
            }

            // Check if user exists
            var existingUser = await dbContext.Users
                .Include(u => u.UserLanguages)
                .FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);

            var isFirstSync = existingUser == null;
            AppUser appUser;

            if (isFirstSync)
            {
                // Create new user
                appUser = new AppUser
                {
                    FirebaseUid = firebaseUid,
                    Email = email,
                    DisplayName = displayName,
                    CreatedAt = DateTime.UtcNow,
                    LastActiveAt = DateTime.UtcNow
                };

                dbContext.Users.Add(appUser);
                await dbContext.SaveChangesAsync();

                // Assign default language (Spanish at A1)
                var spanishLanguage = await dbContext.Languages
                    .FirstOrDefaultAsync(l => l.Code == "es");

                if (spanishLanguage == null)
                {
                    return Results.BadRequest("Spanish language not found in database. Please ensure seed data is loaded.");
                }

                var a1Level = await dbContext.CefrLevels
                    .FirstOrDefaultAsync(c => c.Code == "A1");

                if (a1Level == null)
                {
                    return Results.BadRequest("A1 CEFR level not found in database. Please ensure seed data is loaded.");
                }

                var userLanguage = new UserLanguage
                {
                    UserId = appUser.Id,
                    LanguageId = spanishLanguage.Id,
                    CurrentCefrLevel = "A1",
                    IsPrimary = true,
                    StartedAt = DateTime.UtcNow
                };

                dbContext.UserLanguages.Add(userLanguage);
                await dbContext.SaveChangesAsync();
            }
            else
            {
                // Update existing user
                appUser = existingUser ?? throw new InvalidOperationException("User not found but isFirstSync is false");
                appUser.LastActiveAt = DateTime.UtcNow;
                appUser.Email = email;
                appUser.DisplayName = displayName;

                dbContext.Users.Update(appUser);
                await dbContext.SaveChangesAsync();
            }

            // Get user's active language info
            var activeLanguage = await dbContext.UserLanguages
                .Include(ul => ul.Language)
                .FirstOrDefaultAsync(ul => ul.UserId == appUser.Id && ul.IsPrimary);

            if (activeLanguage == null)
            {
                return Results.BadRequest("User has no active language. Please contact support.");
            }

            var response = new SyncAuthResponse
            {
                Id = appUser.Id,
                Email = appUser.Email,
                DisplayName = appUser.DisplayName,
                ActiveLanguageCode = activeLanguage.Language.Code,
                CurrentCefrLevel = activeLanguage.CurrentCefrLevel,
                IsFirstSync = isFirstSync
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            // Log the exception (logging not yet configured in this phase)
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while syncing user"
            );
        }
    }
}
