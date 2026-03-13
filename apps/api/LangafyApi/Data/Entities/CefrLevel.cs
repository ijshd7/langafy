namespace LangafyApi.Data.Entities;

/// <summary>
/// Represents a Common European Framework of Reference (CEFR) proficiency level.
/// </summary>
public class CefrLevel
{
    public int Id { get; set; }

    /// <summary>
    /// CEFR code (e.g., "A1", "A2", "B1", "B2", "C1", "C2").
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable name of the level.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Description of what learners can do at this level.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Order in which levels should be displayed (A1=1, A2=2, ..., C2=6).
    /// </summary>
    public int SortOrder { get; set; }

    // Navigation properties
    public ICollection<Unit> Units { get; set; } = new List<Unit>();
}
