namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents a unit within a CEFR level for a specific language.
/// A unit groups related lessons around a common topic.
/// </summary>
public class Unit
{
    /// <inheritdoc/>
    public int Id { get; set; }

    /// <inheritdoc/>
    public int LanguageId { get; set; }
    /// <inheritdoc/>
    public int CefrLevelId { get; set; }

    /// <summary>
    /// Title of the unit (e.g., "Greetings &amp; Introductions").
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Description of what the unit covers.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Order in which units should be displayed within a level.
    /// </summary>
    public int SortOrder { get; set; }

    // Navigation properties
    /// <inheritdoc/>
    public Language Language { get; set; } = null!;
    /// <inheritdoc/>
    public CefrLevel CefrLevel { get; set; } = null!;
    /// <inheritdoc/>
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}
