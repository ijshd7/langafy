using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using LangafyApi.Data.Entities;
using LangafyApi.Services.Prompts;
using Microsoft.Extensions.Options;

namespace LangafyApi.Services;

/// <summary>
/// AI conversation service backed by OpenRouter, using the OpenAI-compatible chat completions API.
///
/// Resilience strategy (configured via IHttpClientFactory + Microsoft.Extensions.Http.Resilience):
/// - Retry: up to 3 attempts with exponential backoff on transient HTTP failures (5xx, timeouts)
/// - Circuit breaker: opens after 5 consecutive failures, half-open after 30 seconds
/// - Fallback model: if the primary model exhausts retries, automatically retries with the fallback model
/// </summary>
public class OpenRouterConversationService : IConversationAIService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly OpenRouterOptions _options;
    private readonly ILogger<OpenRouterConversationService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public OpenRouterConversationService(
        IHttpClientFactory httpClientFactory,
        IOptions<OpenRouterOptions> options,
        ILogger<OpenRouterConversationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<string> GenerateResponseAsync(
        Conversation conversation,
        string userMessage,
        CancellationToken ct = default)
    {
        var messages = BuildMessageHistory(conversation, userMessage);

        try
        {
            return await CallCompletionsAsync(messages, _options.PrimaryModel, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex,
                "Primary model {PrimaryModel} failed. Retrying with fallback model {FallbackModel}",
                _options.PrimaryModel, _options.FallbackModel);

            return await CallCompletionsAsync(messages, _options.FallbackModel, ct);
        }
    }

    /// <inheritdoc />
    public async IAsyncEnumerable<string> StreamResponseAsync(
        Conversation conversation,
        string userMessage,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var messages = BuildMessageHistory(conversation, userMessage);

        // Acquire the streaming HTTP response first (try primary, fall back on failure).
        // This separation is required because yield return cannot live inside a try/catch.
        var response = await AcquireStreamResponseAsync(messages, ct);

        using (response)
        {
            await foreach (var token in ParseSseResponseAsync(response, ct))
            {
                yield return token;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /// <summary>
    /// Builds the ordered message list to send to the model:
    /// system prompt → conversation history (last N) → current user message.
    /// </summary>
    private List<OpenRouterMessage> BuildMessageHistory(Conversation conversation, string userMessage)
    {
        var messages = new List<OpenRouterMessage>();

        // System prompt — constructed from conversation context
        var systemPrompt = SystemPromptTemplate.Build(
            languageName: conversation.Language?.Name ?? "Spanish",
            cefrLevel: conversation.CefrLevel,
            cefrLevelDescription: GetCefrDescription(conversation.CefrLevel),
            topic: string.IsNullOrWhiteSpace(conversation.Topic) ? "General conversation" : conversation.Topic,
            lessonObjective: conversation.Lesson?.Description);

        messages.Add(new OpenRouterMessage("system", systemPrompt));

        // Conversation history: exclude system messages, keep only the last N
        var history = conversation.Messages
            .Where(m => m.Role != MessageRole.System)
            .OrderBy(m => m.CreatedAt)
            .TakeLast(_options.ConversationHistoryWindowSize)
            .Select(m => new OpenRouterMessage(
                m.Role == MessageRole.User ? "user" : "assistant",
                m.Content));

        messages.AddRange(history);

        // Current user message (not yet persisted)
        messages.Add(new OpenRouterMessage("user", userMessage));

        return messages;
    }

    /// <summary>
    /// Calls the OpenRouter completions endpoint (non-streaming) and returns the response text.
    /// </summary>
    private async Task<string> CallCompletionsAsync(
        List<OpenRouterMessage> messages,
        string model,
        CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("OpenRouter");
        var requestBody = new OpenRouterRequest(model, messages, Stream: false);

        var response = await client.PostAsJsonAsync("/chat/completions", requestBody, JsonOptions, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<OpenRouterResponse>(JsonOptions, ct);
        return result?.Choices?.FirstOrDefault()?.Message?.Content
            ?? throw new InvalidOperationException("OpenRouter returned an empty response.");
    }

    /// <summary>
    /// Acquires a streaming HTTP response. Tries the primary model first;
    /// falls back to the fallback model on any non-cancellation exception.
    /// </summary>
    private async Task<HttpResponseMessage> AcquireStreamResponseAsync(
        List<OpenRouterMessage> messages,
        CancellationToken ct)
    {
        try
        {
            return await SendStreamRequestAsync(messages, _options.PrimaryModel, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex,
                "Primary model {PrimaryModel} failed for streaming. Retrying with {FallbackModel}",
                _options.PrimaryModel, _options.FallbackModel);

            return await SendStreamRequestAsync(messages, _options.FallbackModel, ct);
        }
    }

    /// <summary>
    /// Sends a streaming request to OpenRouter.
    /// Uses HttpCompletionOption.ResponseHeadersRead so the response body is not buffered —
    /// tokens can be yielded as they arrive.
    /// </summary>
    private async Task<HttpResponseMessage> SendStreamRequestAsync(
        List<OpenRouterMessage> messages,
        string model,
        CancellationToken ct)
    {
        var client = _httpClientFactory.CreateClient("OpenRouter");
        var requestBody = new OpenRouterRequest(model, messages, Stream: true);

        var request = new HttpRequestMessage(HttpMethod.Post, "/chat/completions")
        {
            Content = JsonContent.Create(requestBody, options: JsonOptions)
        };

        var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();
        return response;
    }

    /// <summary>
    /// Parses an OpenAI-compatible Server-Sent Events stream and yields content tokens.
    /// Each SSE line is: "data: {json}" or "data: [DONE]".
    /// </summary>
    private async IAsyncEnumerable<string> ParseSseResponseAsync(
        HttpResponseMessage response,
        [EnumeratorCancellation] CancellationToken ct)
    {
        using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);
            if (string.IsNullOrWhiteSpace(line)) continue;
            if (!line.StartsWith("data: ", StringComparison.Ordinal)) continue;

            var data = line["data: ".Length..];
            if (data == "[DONE]") break;

            string? content = null;
            try
            {
                using var doc = JsonDocument.Parse(data);
                // OpenAI SSE format: choices[0].delta.content
                var delta = doc.RootElement
                    .GetProperty("choices")[0]
                    .GetProperty("delta");

                if (delta.TryGetProperty("content", out var contentProp))
                {
                    content = contentProp.GetString();
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to parse SSE chunk: {Data}", data);
                continue;
            }

            if (content is not null)
            {
                yield return content;
            }
        }
    }

    private static string GetCefrDescription(string cefrLevel) => cefrLevel switch
    {
        "A1" => "Beginner",
        "A2" => "Elementary",
        "B1" => "Intermediate",
        "B2" => "Upper-Intermediate",
        "C1" => "Advanced",
        "C2" => "Proficient",
        _ => cefrLevel
    };

    // -------------------------------------------------------------------------
    // Request / Response DTOs (OpenAI-compatible format)
    // -------------------------------------------------------------------------

    private record OpenRouterMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content);

    private record OpenRouterRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("messages")] List<OpenRouterMessage> Messages,
        [property: JsonPropertyName("stream")] bool Stream);

    private record OpenRouterResponse(
        [property: JsonPropertyName("choices")] List<OpenRouterChoice>? Choices);

    private record OpenRouterChoice(
        [property: JsonPropertyName("message")] OpenRouterMessage? Message);
}
