using LangafyApi.Data;
using LangafyApi.Data.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace LangafyApi.Features.Languages;

/// <summary>
/// Endpoints for managing languages and user language preferences.
/// </summary>
public static class LanguageEndpoints
{
    /// <summary>
    /// Maps language endpoints to the application.
    /// </summary>
    public static void MapLanguageEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api")
            .WithTags("Languages");

        group.MapGet("/languages", GetLanguages)
            .WithName("GetLanguages")
            .WithOpenApi()
            .WithSummary("List all active languages")
            .WithDescription("Returns a list of all languages currently available for study.")
            .Produces<List<LanguageDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status500InternalServerError);

        var userGroup = group.MapGroup("/user/languages")
            .RequireAuthorization();

        userGroup.MapPost("", AddUserLanguage)
            .WithName("AddUserLanguage")
            .WithOpenApi()
            .WithSummary("Add a language to user's study list")
            .WithDescription("Adds a new language to the authenticated user's list of languages being studied.")
            .Accepts<AddUserLanguageRequest>("application/json")
            .Produces<UserLanguageDto>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status500InternalServerError);

        userGroup.MapPut("/{code}/primary", SetPrimaryLanguage)
            .WithName("SetPrimaryLanguage")
            .WithOpenApi()
            .WithSummary("Set active/primary language")
            .WithDescription("Sets the specified language as the user's primary/active language.")
            .Produces<UserLanguageDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);
    }

    /// <summary>
    /// Gets all active languages.
    /// </summary>
    private static async Task<IResult> GetLanguages(AppDbContext dbContext)
    {
        try
        {
            var languages = await dbContext.Languages
                .Where(l => l.IsActive)
                .OrderBy(l => l.Code)
                .Select(l => new LanguageDto
                {
                    Code = l.Code,
                    Name = l.Name,
                    NativeName = l.NativeName,
                    IsActive = l.IsActive
                })
                .ToListAsync();

            return Results.Ok(languages);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while fetching languages"
            );
        }
    }

    /// <summary>
    /// Adds a language to the authenticated user's study list.
    /// </summary>
    private static async Task<IResult> AddUserLanguage(
        AddUserLanguageRequest request,
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

            // Verify language exists and is active
            var language = await dbContext.Languages
                .FirstOrDefaultAsync(l => l.Code == request.LanguageCode && l.IsActive);

            if (language == null)
            {
                return Results.BadRequest($"Language '{request.LanguageCode}' not found or is not active.");
            }

            // Check if user already studies this language
            var existingUserLanguage = user.UserLanguages
                .FirstOrDefault(ul => ul.LanguageId == language.Id);

            if (existingUserLanguage != null)
            {
                return Results.Conflict("User is already studying this language.");
            }

            // Determine starting CEFR level
            var startingLevel = request.StartingCefrLevel ?? "A1";
            var cefrLevel = await dbContext.CefrLevels
                .FirstOrDefaultAsync(c => c.Code == startingLevel);

            if (cefrLevel == null)
            {
                return Results.BadRequest($"CEFR level '{startingLevel}' not found.");
            }

            // Create user language entry
            var userLanguage = new UserLanguage
            {
                UserId = user.Id,
                LanguageId = language.Id,
                CurrentCefrLevel = startingLevel,
                IsPrimary = false, // New languages are not primary by default
                StartedAt = DateTime.UtcNow
            };

            dbContext.UserLanguages.Add(userLanguage);
            await dbContext.SaveChangesAsync();

            var response = new UserLanguageDto
            {
                LanguageCode = language.Code,
                LanguageName = language.Name,
                CurrentCefrLevel = userLanguage.CurrentCefrLevel,
                IsPrimary = userLanguage.IsPrimary,
                StartedAt = userLanguage.StartedAt
            };

            return Results.Created($"/api/user/languages/{language.Code}", response);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while adding language to user"
            );
        }
    }

    /// <summary>
    /// Sets the specified language as the user's primary/active language.
    /// </summary>
    private static async Task<IResult> SetPrimaryLanguage(
        string code,
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
                .ThenInclude(ul => ul.Language)
                .FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);

            if (user == null)
            {
                return Results.BadRequest("User not found. Please sync user first via /api/auth/sync.");
            }

            // Find the language to set as primary
            var language = await dbContext.Languages
                .FirstOrDefaultAsync(l => l.Code == code);

            if (language == null)
            {
                return Results.BadRequest($"Language '{code}' not found.");
            }

            // Find user's entry for this language
            var userLanguage = user.UserLanguages
                .FirstOrDefault(ul => ul.LanguageId == language.Id);

            if (userLanguage == null)
            {
                return Results.NotFound($"User is not studying language '{code}'.");
            }

            // Unset any existing primary language
            var currentPrimary = user.UserLanguages
                .FirstOrDefault(ul => ul.IsPrimary);

            if (currentPrimary != null && currentPrimary.Id != userLanguage.Id)
            {
                currentPrimary.IsPrimary = false;
                dbContext.UserLanguages.Update(currentPrimary);
            }

            // Set the new primary language
            userLanguage.IsPrimary = true;
            dbContext.UserLanguages.Update(userLanguage);
            await dbContext.SaveChangesAsync();

            var response = new UserLanguageDto
            {
                LanguageCode = language.Code,
                LanguageName = language.Name,
                CurrentCefrLevel = userLanguage.CurrentCefrLevel,
                IsPrimary = userLanguage.IsPrimary,
                StartedAt = userLanguage.StartedAt
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while setting primary language"
            );
        }
    }
}
