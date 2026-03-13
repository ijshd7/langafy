using LangafyApi.Data;
using Microsoft.EntityFrameworkCore;

namespace LangafyApi.Features.Lessons;

/// <summary>
/// Endpoints for browsing CEFR content (levels, units, lessons, exercises).
/// </summary>
public static class LessonEndpoints
{
    /// <summary>
    /// Maps lesson endpoints to the application.
    /// </summary>
    public static void MapLessonEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api")
            .WithTags("Content");

        group.MapGet("/levels", GetLevels)
            .WithName("GetLevels")
            .WithOpenApi()
            .WithSummary("List all CEFR levels")
            .WithDescription("Returns all CEFR proficiency levels (A1 through C2) available on the platform.")
            .Produces<List<CefrLevelDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status500InternalServerError);

        group.MapGet("/languages/{code}/levels/{levelId}/units", GetUnitsByLanguageAndLevel)
            .WithName("GetUnitsByLanguageAndLevel")
            .WithOpenApi()
            .WithSummary("List units for a language and CEFR level")
            .WithDescription("Returns all units for a specified language and CEFR level.")
            .Produces<List<UnitDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);

        group.MapGet("/units/{id}/lessons", GetLessonsByUnit)
            .WithName("GetLessonsByUnit")
            .WithOpenApi()
            .WithSummary("List lessons within a unit")
            .WithDescription("Returns all lessons in a specified unit, ordered by display sequence.")
            .Produces<List<LessonDto>>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);

        group.MapGet("/lessons/{id}", GetLessonDetail)
            .WithName("GetLessonDetail")
            .WithOpenApi()
            .WithSummary("Get lesson detail with exercises")
            .WithDescription("Returns full lesson details including all exercises in sequence.")
            .Produces<LessonDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);
    }

    /// <summary>
    /// Gets all CEFR levels ordered by sort order.
    /// </summary>
    private static async Task<IResult> GetLevels(AppDbContext dbContext)
    {
        try
        {
            var levels = await dbContext.CefrLevels
                .OrderBy(l => l.SortOrder)
                .Select(l => new CefrLevelDto
                {
                    Id = l.Id,
                    Code = l.Code,
                    Name = l.Name,
                    Description = l.Description,
                    SortOrder = l.SortOrder
                })
                .ToListAsync();

            return Results.Ok(levels);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while fetching CEFR levels"
            );
        }
    }

    /// <summary>
    /// Gets all units for a specific language and CEFR level.
    /// </summary>
    private static async Task<IResult> GetUnitsByLanguageAndLevel(
        string code,
        int levelId,
        AppDbContext dbContext)
    {
        try
        {
            // Verify language exists
            var language = await dbContext.Languages
                .FirstOrDefaultAsync(l => l.Code == code);

            if (language == null)
            {
                return Results.NotFound($"Language '{code}' not found.");
            }

            // Verify CEFR level exists
            var cefrLevel = await dbContext.CefrLevels
                .FirstOrDefaultAsync(c => c.Id == levelId);

            if (cefrLevel == null)
            {
                return Results.NotFound($"CEFR level with ID {levelId} not found.");
            }

            // Get units for this language and level
            var units = await dbContext.Units
                .Where(u => u.LanguageId == language.Id && u.CefrLevelId == levelId)
                .OrderBy(u => u.SortOrder)
                .Select(u => new UnitDto
                {
                    Id = u.Id,
                    Title = u.Title,
                    Description = u.Description,
                    CefrLevel = new CefrLevelDto
                    {
                        Id = u.CefrLevel.Id,
                        Code = u.CefrLevel.Code,
                        Name = u.CefrLevel.Name,
                        Description = u.CefrLevel.Description,
                        SortOrder = u.CefrLevel.SortOrder
                    },
                    SortOrder = u.SortOrder
                })
                .ToListAsync();

            return Results.Ok(units);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while fetching units"
            );
        }
    }

    /// <summary>
    /// Gets all lessons within a unit, ordered by sort order.
    /// </summary>
    private static async Task<IResult> GetLessonsByUnit(int id, AppDbContext dbContext)
    {
        try
        {
            // Verify unit exists
            var unit = await dbContext.Units
                .FirstOrDefaultAsync(u => u.Id == id);

            if (unit == null)
            {
                return Results.NotFound($"Unit with ID {id} not found.");
            }

            var lessons = await dbContext.Lessons
                .Where(l => l.UnitId == id)
                .OrderBy(l => l.SortOrder)
                .Select(l => new LessonDto
                {
                    Id = l.Id,
                    Title = l.Title,
                    Description = l.Description,
                    Objective = l.Objective,
                    SortOrder = l.SortOrder
                })
                .ToListAsync();

            return Results.Ok(lessons);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while fetching lessons"
            );
        }
    }

    /// <summary>
    /// Gets full lesson details including all exercises in sequence.
    /// </summary>
    private static async Task<IResult> GetLessonDetail(int id, AppDbContext dbContext)
    {
        try
        {
            var lesson = await dbContext.Lessons
                .Include(l => l.Unit)
                .ThenInclude(u => u.CefrLevel)
                .Include(l => l.Exercises)
                .FirstOrDefaultAsync(l => l.Id == id);

            if (lesson == null)
            {
                return Results.NotFound($"Lesson with ID {id} not found.");
            }

            var lessonDetail = new LessonDetailDto
            {
                Id = lesson.Id,
                Title = lesson.Title,
                Description = lesson.Description,
                Objective = lesson.Objective,
                Unit = new UnitDto
                {
                    Id = lesson.Unit.Id,
                    Title = lesson.Unit.Title,
                    Description = lesson.Unit.Description,
                    CefrLevel = new CefrLevelDto
                    {
                        Id = lesson.Unit.CefrLevel.Id,
                        Code = lesson.Unit.CefrLevel.Code,
                        Name = lesson.Unit.CefrLevel.Name,
                        Description = lesson.Unit.CefrLevel.Description,
                        SortOrder = lesson.Unit.CefrLevel.SortOrder
                    },
                    SortOrder = lesson.Unit.SortOrder
                },
                Exercises = lesson.Exercises
                    .OrderBy(e => e.SortOrder)
                    .Select(e => new ExerciseDto
                    {
                        Id = e.Id,
                        Type = e.Type.ToString(),
                        Config = e.Config,
                        Points = e.Points,
                        SortOrder = e.SortOrder
                    })
                    .ToList()
            };

            return Results.Ok(lessonDetail);
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while fetching lesson details"
            );
        }
    }
}
