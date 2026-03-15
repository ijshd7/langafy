using LangafyApi.Data.Entities;

namespace LangafyApi.Services;

/// <summary>
/// Service for generating AI responses in language learning conversations.
/// </summary>
public interface IConversationAIService
{
    /// <summary>
    /// Generates a complete AI response for the given conversation and user message.
    /// The conversation's Messages collection must be loaded before calling.
    /// </summary>
    /// <param name="conversation">The conversation context, including language, CEFR level, topic, and message history.</param>
    /// <param name="userMessage">The new message from the user.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The AI's response as a complete string.</returns>
    Task<string> GenerateResponseAsync(Conversation conversation, string userMessage, CancellationToken ct = default);

    /// <summary>
    /// Streams an AI response token-by-token for the given conversation and user message.
    /// Used for Server-Sent Events (SSE) endpoints to deliver real-time streaming UX,
    /// avoiding the 3-5 second loading spinner of non-streaming responses.
    /// </summary>
    /// <param name="conversation">The conversation context, including language, CEFR level, topic, and message history.</param>
    /// <param name="userMessage">The new message from the user.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>An async sequence of text tokens as they arrive from the model.</returns>
    IAsyncEnumerable<string> StreamResponseAsync(Conversation conversation, string userMessage, CancellationToken ct = default);
}
