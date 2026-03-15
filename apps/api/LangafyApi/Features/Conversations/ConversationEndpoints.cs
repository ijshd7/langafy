using System.Text;
using LangafyApi.Data;
using LangafyApi.Data.Entities;
using LangafyApi.Services;
using Microsoft.EntityFrameworkCore;

namespace LangafyApi.Features.Conversations;

/// <summary>
/// Endpoints for managing AI tutor conversations.
///
/// Supports two message-sending modes:
/// - Non-streaming: POST /api/conversations/{id}/messages
///   Waits for the full AI response then returns a JSON object with both messages.
/// - Streaming (SSE): POST /api/conversations/{id}/messages/stream
///   Delivers the AI response token-by-token via Server-Sent Events (text/event-stream).
///   Both messages are persisted after the stream completes successfully.
/// </summary>
public static class ConversationEndpoints
{
    /// <summary>
    /// Maps conversation endpoints to the application.
    /// </summary>
    public static void MapConversationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/conversations")
            .WithTags("Conversations")
            .RequireAuthorization();

        group.MapPost("/", StartConversation)
            .WithName("StartConversation")
            .WithSummary("Start a new AI conversation")
            .WithDescription("Creates a new conversation for the authenticated user, scoped to a language and optionally tied to a lesson context.")
            .Produces<StartConversationResponse>(StatusCodes.Status201Created)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError);

        group.MapPost("/{id:int}/messages", SendMessage)
            .WithName("SendMessage")
            .WithSummary("Send a message and receive a complete AI response")
            .WithDescription("Sends a user message, generates the full AI response, persists both, and returns them as a JSON object.")
            .Produces<SendMessageResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);

        group.MapPost("/{id:int}/messages/stream", StreamMessage)
            .WithName("StreamMessage")
            .WithSummary("Send a message and stream the AI response via SSE")
            .WithDescription(
                "Sends a user message and streams the AI response token-by-token as Server-Sent Events (Content-Type: text/event-stream). " +
                "Each SSE event carries a raw text token. The stream ends with a 'data: [DONE]' event. " +
                "Both messages are persisted only after the stream completes — partial responses from disconnected clients are discarded.");

        group.MapGet("/{id:int}", GetConversation)
            .WithName("GetConversation")
            .WithSummary("Get conversation with full message history")
            .WithDescription("Returns conversation details and all user/assistant messages in chronological order.")
            .Produces<ConversationDetailDto>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);

        group.MapGet("/", ListConversations)
            .WithName("ListConversations")
            .WithSummary("List the authenticated user's conversations")
            .WithDescription("Returns a paginated list of conversations ordered newest first, optionally filtered by language code.")
            .Produces<ConversationListResponse>(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status500InternalServerError);

        group.MapDelete("/{id:int}", DeleteConversation)
            .WithName("DeleteConversation")
            .WithSummary("Delete a conversation")
            .WithDescription("Permanently deletes a conversation and all its messages.")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status404NotFound)
            .Produces(StatusCodes.Status500InternalServerError);
    }

    // -------------------------------------------------------------------------
    // Endpoint handlers
    // -------------------------------------------------------------------------

    /// <summary>
    /// Creates a new conversation for the authenticated user.
    /// </summary>
    private static async Task<IResult> StartConversation(
        StartConversationRequest request,
        HttpContext context,
        AppDbContext dbContext,
        IConversationRateLimitService rateLimitService)
    {
        try
        {
            var user = await ResolveUserAsync(context, dbContext);
            if (user == null)
            {
                return Results.Unauthorized();
            }

            var rateLimit = await rateLimitService.CheckAndIncrementAsync(
                user.Id, RateLimitKeys.StartConversation, context.RequestAborted);
            if (rateLimit != null)
            {
                context.Response.Headers["Retry-After"] = rateLimit.RetryAfterSeconds.ToString();
                return Results.Problem(
                    statusCode: StatusCodes.Status429TooManyRequests,
                    title: "Rate limit exceeded",
                    detail: $"You can start at most 10 conversations per day. Try again in {rateLimit.RetryAfterSeconds} seconds."
                );
            }

            if (string.IsNullOrWhiteSpace(request.LanguageCode))
            {
                return Results.BadRequest("LanguageCode is required.");
            }

            var language = await dbContext.Languages
                .FirstOrDefaultAsync(l => l.Code == request.LanguageCode && l.IsActive);
            if (language == null)
            {
                return Results.BadRequest($"Language '{request.LanguageCode}' not found or not active.");
            }

            if (request.LessonId.HasValue)
            {
                var lessonExists = await dbContext.Lessons.AnyAsync(l => l.Id == request.LessonId.Value);
                if (!lessonExists)
                {
                    return Results.BadRequest($"Lesson {request.LessonId} not found.");
                }
            }

            // Use the user's current CEFR level for this language, defaulting to A1
            var cefrLevel = await dbContext.UserLanguages
                .Where(ul => ul.UserId == user.Id && ul.LanguageId == language.Id)
                .Select(ul => ul.CurrentCefrLevel)
                .FirstOrDefaultAsync() ?? "A1";

            var conversation = new Conversation
            {
                UserId = user.Id,
                LanguageId = language.Id,
                LessonId = request.LessonId,
                CefrLevel = cefrLevel,
                Topic = string.IsNullOrWhiteSpace(request.Topic) ? "General conversation" : request.Topic.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            dbContext.Conversations.Add(conversation);
            await dbContext.SaveChangesAsync();

            return Results.Created($"/api/conversations/{conversation.Id}", new StartConversationResponse
            {
                Id = conversation.Id,
                LanguageCode = language.Code,
                CefrLevel = cefrLevel,
                Topic = conversation.Topic,
                CreatedAt = conversation.CreatedAt
            });
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while starting the conversation"
            );
        }
    }

    /// <summary>
    /// Sends a user message and returns the complete AI response (non-streaming).
    /// </summary>
    private static async Task<IResult> SendMessage(
        int id,
        SendMessageRequest request,
        HttpContext context,
        AppDbContext dbContext,
        IConversationAIService aiService,
        IConversationRateLimitService rateLimitService)
    {
        try
        {
            var user = await ResolveUserAsync(context, dbContext);
            if (user == null)
            {
                return Results.Unauthorized();
            }

            var rateLimit = await rateLimitService.CheckAndIncrementAsync(
                user.Id, RateLimitKeys.SendMessage, context.RequestAborted);
            if (rateLimit != null)
            {
                context.Response.Headers["Retry-After"] = rateLimit.RetryAfterSeconds.ToString();
                return Results.Problem(
                    statusCode: StatusCodes.Status429TooManyRequests,
                    title: "Rate limit exceeded",
                    detail: $"You can send at most 30 messages per hour. Try again in {rateLimit.RetryAfterSeconds} seconds."
                );
            }

            if (string.IsNullOrWhiteSpace(request.Message))
            {
                return Results.BadRequest("Message cannot be empty.");
            }

            var conversation = await LoadConversationForUserAsync(dbContext, id, user.Id);
            if (conversation == null)
            {
                return Results.NotFound($"Conversation {id} not found.");
            }

            var aiResponse = await aiService.GenerateResponseAsync(
                conversation, request.Message, context.RequestAborted);

            var now = DateTime.UtcNow;
            var userMessage = new Message
            {
                ConversationId = conversation.Id,
                Role = MessageRole.User,
                Content = request.Message,
                CreatedAt = now
            };
            var assistantMessage = new Message
            {
                ConversationId = conversation.Id,
                Role = MessageRole.Assistant,
                Content = aiResponse,
                CreatedAt = now.AddMilliseconds(1) // ensure deterministic ordering
            };
            dbContext.Messages.AddRange(userMessage, assistantMessage);
            await dbContext.SaveChangesAsync();

            return Results.Ok(new SendMessageResponse
            {
                UserMessage = ToMessageDto(userMessage),
                AssistantMessage = ToMessageDto(assistantMessage)
            });
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while sending the message"
            );
        }
    }

    /// <summary>
    /// Sends a user message and streams the AI response via Server-Sent Events.
    ///
    /// This handler writes directly to HttpResponse (no IResult) because SSE requires
    /// full control of the response body. Messages are persisted after streaming completes;
    /// if the client disconnects mid-stream the response is discarded.
    ///
    /// SSE event format: each token is sent as one or more "data: {line}" lines followed
    /// by a blank line. Multi-line tokens use multiple "data:" lines (standard SSE encoding).
    /// The stream ends with "data: [DONE]".
    /// </summary>
    private static async Task StreamMessage(
        int id,
        SendMessageRequest request,
        HttpContext context,
        AppDbContext dbContext,
        IConversationAIService aiService,
        IConversationRateLimitService rateLimitService)
    {
        var user = await ResolveUserAsync(context, dbContext);
        if (user == null)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        // Rate limit check — streaming and non-streaming share the same counter
        var ct = context.RequestAborted;
        var rateLimit = await rateLimitService.CheckAndIncrementAsync(user.Id, RateLimitKeys.SendMessage, ct);
        if (rateLimit != null)
        {
            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.Headers["Retry-After"] = rateLimit.RetryAfterSeconds.ToString();
            await context.Response.WriteAsync(
                $"Rate limit exceeded. You can send at most 30 messages per hour. Try again in {rateLimit.RetryAfterSeconds} seconds.", ct);
            return;
        }

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            context.Response.StatusCode = StatusCodes.Status400BadRequest;
            await context.Response.WriteAsync("Message cannot be empty.", ct);
            return;
        }

        var conversation = await LoadConversationForUserAsync(dbContext, id, user.Id);
        if (conversation == null)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        // SSE headers must be set before writing any body bytes
        context.Response.ContentType = "text/event-stream";
        context.Response.Headers["Cache-Control"] = "no-cache";
        context.Response.Headers["X-Accel-Buffering"] = "no"; // disable nginx response buffering

        var responseBuffer = new StringBuilder();

        try
        {
            await foreach (var token in aiService.StreamResponseAsync(conversation, request.Message, ct))
            {
                responseBuffer.Append(token);
                await WriteSseTokenAsync(context.Response, token, ct);
            }

            await context.Response.WriteAsync("data: [DONE]\n\n", ct);
            await context.Response.Body.FlushAsync(ct);
        }
        catch (OperationCanceledException)
        {
            // Client disconnected — discard incomplete response, do not persist
            return;
        }

        // Persist both messages after the stream completes successfully.
        // Use CancellationToken.None since the HTTP request is already done.
        var now = DateTime.UtcNow;
        var userMessage = new Message
        {
            ConversationId = conversation.Id,
            Role = MessageRole.User,
            Content = request.Message,
            CreatedAt = now
        };
        var assistantMessage = new Message
        {
            ConversationId = conversation.Id,
            Role = MessageRole.Assistant,
            Content = responseBuffer.ToString(),
            CreatedAt = now.AddMilliseconds(1)
        };
        dbContext.Messages.AddRange(userMessage, assistantMessage);
        await dbContext.SaveChangesAsync(CancellationToken.None);
    }

    /// <summary>
    /// Returns a conversation with its full message history.
    /// </summary>
    private static async Task<IResult> GetConversation(
        int id,
        HttpContext context,
        AppDbContext dbContext)
    {
        try
        {
            var user = await ResolveUserAsync(context, dbContext);
            if (user == null)
            {
                return Results.Unauthorized();
            }

            var conversation = await dbContext.Conversations
                .Include(c => c.Language)
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == user.Id);

            if (conversation == null)
            {
                return Results.NotFound($"Conversation {id} not found.");
            }

            var messages = await dbContext.Messages
                .Where(m => m.ConversationId == id && m.Role != MessageRole.System)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    Role = m.Role == MessageRole.User ? "user" : "assistant",
                    Content = m.Content,
                    CreatedAt = m.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new ConversationDetailDto
            {
                Id = conversation.Id,
                LanguageCode = conversation.Language.Code,
                LanguageName = conversation.Language.Name,
                CefrLevel = conversation.CefrLevel,
                Topic = conversation.Topic,
                LessonId = conversation.LessonId,
                CreatedAt = conversation.CreatedAt,
                Messages = messages
            });
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while retrieving the conversation"
            );
        }
    }

    /// <summary>
    /// Returns a paginated list of the authenticated user's conversations.
    /// </summary>
    private static async Task<IResult> ListConversations(
        HttpContext context,
        AppDbContext dbContext,
        string? language = null,
        int page = 1,
        int pageSize = 20)
    {
        try
        {
            var user = await ResolveUserAsync(context, dbContext);
            if (user == null)
            {
                return Results.Unauthorized();
            }

            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = dbContext.Conversations
                .Include(c => c.Language)
                .Where(c => c.UserId == user.Id);

            if (!string.IsNullOrWhiteSpace(language))
            {
                query = query.Where(c => c.Language.Code == language);
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(c => c.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(c => new ConversationSummaryDto
                {
                    Id = c.Id,
                    LanguageCode = c.Language.Code,
                    LanguageName = c.Language.Name,
                    CefrLevel = c.CefrLevel,
                    Topic = c.Topic,
                    LessonId = c.LessonId,
                    CreatedAt = c.CreatedAt,
                    MessageCount = c.Messages.Count(m => m.Role != MessageRole.System)
                })
                .ToListAsync();

            return Results.Ok(new ConversationListResponse
            {
                Items = items,
                Total = total,
                Page = page,
                PageSize = pageSize
            });
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while listing conversations"
            );
        }
    }

    /// <summary>
    /// Permanently deletes a conversation and all its messages.
    /// </summary>
    private static async Task<IResult> DeleteConversation(
        int id,
        HttpContext context,
        AppDbContext dbContext)
    {
        try
        {
            var user = await ResolveUserAsync(context, dbContext);
            if (user == null)
            {
                return Results.Unauthorized();
            }

            var conversation = await dbContext.Conversations
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == user.Id);

            if (conversation == null)
            {
                return Results.NotFound($"Conversation {id} not found.");
            }

            dbContext.Conversations.Remove(conversation);
            await dbContext.SaveChangesAsync();

            return Results.NoContent();
        }
        catch (Exception ex)
        {
            return Results.Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "An error occurred while deleting the conversation"
            );
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /// <summary>
    /// Resolves the authenticated user from the Firebase UID claim.
    /// Returns null if the claim is missing or the user is not found in the database.
    /// </summary>
    private static async Task<AppUser?> ResolveUserAsync(HttpContext context, AppDbContext dbContext)
    {
        var firebaseUid = context.User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(firebaseUid))
        {
            return null;
        }

        return await dbContext.Users.FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);
    }

    /// <summary>
    /// Loads a conversation with its language, optional lesson, and message history.
    /// Returns null if not found or if it belongs to a different user.
    /// </summary>
    private static async Task<Conversation?> LoadConversationForUserAsync(
        AppDbContext dbContext, int conversationId, int userId) =>
        await dbContext.Conversations
            .Include(c => c.Language)
            .Include(c => c.Lesson)
            .Include(c => c.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);

    private static MessageDto ToMessageDto(Message message) => new()
    {
        Id = message.Id,
        Role = message.Role == MessageRole.User ? "user" : "assistant",
        Content = message.Content,
        CreatedAt = message.CreatedAt
    };

    /// <summary>
    /// Writes a single SSE event for a text token.
    /// Handles multi-line tokens by emitting one "data:" line per line of content,
    /// which the client's SSE parser will rejoin with newlines per the SSE spec.
    /// </summary>
    private static async Task WriteSseTokenAsync(HttpResponse response, string token, CancellationToken ct)
    {
        var lines = token.Split('\n');
        foreach (var line in lines)
        {
            await response.WriteAsync($"data: {line}\n", ct);
        }
        await response.WriteAsync("\n", ct); // blank line terminates the SSE event
        await response.Body.FlushAsync(ct);
    }
}
