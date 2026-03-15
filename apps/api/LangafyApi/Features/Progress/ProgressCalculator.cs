using LangafyApi.Data.Entities;

namespace LangafyApi.Features.Progress;

/// <summary>
/// Pure functions for calculating learning progress metrics and streaks.
/// Extracted from ProgressEndpoints for testability.
/// </summary>
public static class ProgressCalculator
{
    /// <summary>
    /// Calculates the current consecutive-day streak ending on or before <paramref name="today"/>.
    /// Multiple exercises completed on the same day count as one streak day.
    /// </summary>
    public static int CalculateStreak(IEnumerable<UserProgress> progressList, DateTime today)
    {
        int streak = 0;
        DateTime? expectedDate = today.Date;

        foreach (var progress in progressList
            .Where(p => p.CompletedAt.HasValue)
            .OrderByDescending(p => p.CompletedAt))
        {
            var completedDate = progress.CompletedAt!.Value.Date;

            if (completedDate == expectedDate)
            {
                streak++;
                expectedDate = expectedDate.Value.AddDays(-1);
            }
            else if (completedDate < expectedDate)
            {
                break;
            }
            // completedDate > expectedDate: duplicate on same day, skip
        }

        return streak;
    }

    /// <summary>
    /// Calculates the longest consecutive-day streak across all progress records.
    /// </summary>
    public static int CalculateLongestStreak(IEnumerable<UserProgress> progressList)
    {
        // Deduplicate by date so multiple exercises on the same day don't break the streak count.
        var uniqueDates = progressList
            .Where(p => p.CompletedAt.HasValue)
            .Select(p => p.CompletedAt!.Value.Date)
            .Distinct()
            .OrderByDescending(d => d)
            .ToList();

        if (uniqueDates.Count == 0)
        {
            return 0;
        }

        int longestStreak = 0;
        int currentStreak = 0;
        DateTime? previousDate = null;

        foreach (var date in uniqueDates)
        {
            if (previousDate == null)
            {
                currentStreak = 1;
            }
            else if (previousDate.Value.AddDays(-1) == date)
            {
                currentStreak++;
            }
            else
            {
                longestStreak = Math.Max(longestStreak, currentStreak);
                currentStreak = 1;
            }

            previousDate = date;
        }

        return Math.Max(longestStreak, currentStreak);
    }
}
