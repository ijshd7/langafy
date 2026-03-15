namespace LangafyApi.Services;

/// <summary>
/// Configuration options for the OpenRouter AI service.
/// Bound from the "OpenRouter" section in appsettings.json.
/// </summary>
public class OpenRouterOptions
{
    public const string SectionName = "OpenRouter";

    /// <summary>
    /// OpenRouter API key. Store in Secret Manager in production.
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// OpenRouter API base URL.
    /// </summary>
    public string BaseUrl { get; set; } = "https://openrouter.ai/api/v1";

    /// <summary>
    /// Primary model to use for conversation responses.
    /// OpenRouter model ID format: "provider/model-name".
    /// </summary>
    public string PrimaryModel { get; set; } = "anthropic/claude-sonnet-4-5";

    /// <summary>
    /// Fallback model used if the primary model returns a 5xx error or times out.
    /// </summary>
    public string FallbackModel { get; set; } = "mistralai/mistral-large-latest";

    /// <summary>
    /// Number of most recent messages to include in the conversation history sent to the model.
    /// Controls token costs — older messages are dropped when the window is exceeded.
    /// </summary>
    public int ConversationHistoryWindowSize { get; set; } = 20;

    /// <summary>
    /// HTTP request timeout in seconds for non-streaming calls.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}
