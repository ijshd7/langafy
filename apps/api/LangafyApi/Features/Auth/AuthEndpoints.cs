using LangafyApi.Data;
using LangafyApi.Data.Entities;
using Microsoft.AspNetCore.RateLimiting;
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
            .WithSummary("Sync Firebase user to database")
            .WithDescription("Extracts Firebase UID and email from JWT claims, creates/updates AppUser, and ensures user has at least one language. New users are assigned Spanish at A1 level. Optionally accepts firstName/lastName in the request body for new user registration.")
            .Produces<SyncAuthResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status429TooManyRequests)
            .Produces(StatusCodes.Status500InternalServerError)
            .RequireRateLimiting("AuthSyncPolicy")
            .RequireAuthorization();

        group.MapGet("/profile", GetProfile)
            .WithName("GetProfile")
            .WithSummary("Get current user profile")
            .WithDescription("Returns the authenticated user's profile information including first name and last name.")
            .Produces<ProfileResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .RequireAuthorization();

        group.MapPut("/profile", UpdateProfile)
            .WithName("UpdateProfile")
            .WithSummary("Update user profile")
            .WithDescription("Updates the authenticated user's first name and last name.")
            .Produces<ProfileResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .RequireAuthorization();
    }

    /// <summary>
    /// Syncs a Firebase user to the local database.
    /// Extracts the Firebase UID from the JWT token claims and creates/updates an AppUser record.
    /// New users are automatically assigned Spanish as their default language at A1 level.
    /// Unhandled exceptions propagate to the global exception handler in Program.cs, which
    /// suppresses internal details in production.
    /// </summary>
    private static async Task<IResult> SyncAuth(HttpContext context, AppDbContext dbContext, SyncAuthRequest? request)
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
            // Compute display name from first/last name if provided
            var firstName = request?.FirstName?.Trim();
            var lastName = request?.LastName?.Trim();
            if (!string.IsNullOrEmpty(firstName) && !string.IsNullOrEmpty(lastName))
            {
                displayName = $"{firstName} {lastName}";
            }

            // Create new user
            appUser = new AppUser
            {
                FirebaseUid = firebaseUid,
                Email = email,
                DisplayName = displayName,
                FirstName = firstName,
                LastName = lastName,
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
            FirstName = appUser.FirstName,
            LastName = appUser.LastName,
            ActiveLanguageCode = activeLanguage.Language.Code,
            CurrentCefrLevel = activeLanguage.CurrentCefrLevel,
            IsFirstSync = isFirstSync
        };

        return Results.Ok(response);
    }

    /// <summary>
    /// Returns the authenticated user's profile information.
    /// </summary>
    private static async Task<IResult> GetProfile(HttpContext context, AppDbContext dbContext)
    {
        var firebaseUid = context.User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(firebaseUid))
        {
            return Results.Unauthorized();
        }

        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);

        if (user == null)
        {
            return Results.NotFound();
        }

        return Results.Ok(new ProfileResponse
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            FirstName = user.FirstName,
            LastName = user.LastName
        });
    }

    /// <summary>
    /// Updates the authenticated user's first name and last name.
    /// </summary>
    private static async Task<IResult> UpdateProfile(HttpContext context, AppDbContext dbContext, UpdateProfileRequest request)
    {
        var firebaseUid = context.User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(firebaseUid))
        {
            return Results.Unauthorized();
        }

        // Validate
        var firstName = request.FirstName?.Trim() ?? string.Empty;
        var lastName = request.LastName?.Trim() ?? string.Empty;

        if (string.IsNullOrEmpty(firstName) || string.IsNullOrEmpty(lastName))
        {
            return Results.BadRequest("First name and last name are required.");
        }

        if (firstName.Length > 100 || lastName.Length > 100)
        {
            return Results.BadRequest("First name and last name must be 100 characters or fewer.");
        }

        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);

        if (user == null)
        {
            return Results.NotFound();
        }

        user.FirstName = firstName;
        user.LastName = lastName;
        user.DisplayName = $"{firstName} {lastName}";

        dbContext.Users.Update(user);
        await dbContext.SaveChangesAsync();

        return Results.Ok(new ProfileResponse
        {
            Id = user.Id,
            Email = user.Email,
            DisplayName = user.DisplayName,
            FirstName = user.FirstName,
            LastName = user.LastName
        });
    }
}
