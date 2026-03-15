namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents a vocabulary word in a specific language and CEFR level.
/// </summary>
public class Vocabulary
{
    /// <inheritdoc/>
    public int Id { get; set; }

    /// <inheritdoc/>
    public int LanguageId { get; set; }
    /// <inheritdoc/>
    public int CefrLevelId { get; set; }

    /// <summary>
    /// The word in the target language.
    /// </summary>
    public string WordTarget { get; set; } = string.Empty;

    /// <summary>
    /// English translation of the word.
    /// </summary>
    public string WordEn { get; set; } = string.Empty;

    /// <summary>
    /// Part of speech (noun, verb, adjective, etc.).
    /// </summary>
    public string PartOfSpeech { get; set; } = string.Empty;

    /// <summary>
    /// Example sentence in the target language.
    /// </summary>
    public string ExampleSentenceTarget { get; set; } = string.Empty;

    /// <summary>
    /// English translation of the example sentence.
    /// </summary>
    public string ExampleSentenceEn { get; set; } = string.Empty;

    // Navigation properties
    /// <inheritdoc/>
    public Language Language { get; set; } = null!;
    /// <inheritdoc/>
    public CefrLevel CefrLevel { get; set; } = null!;
    /// <inheritdoc/>
    public ICollection<UserVocabulary> UserVocabularyItems { get; set; } = new List<UserVocabulary>();
}
