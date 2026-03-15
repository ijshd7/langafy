using LangafyApi.Data.Entities;
using LangafyApi.Features.Progress;

namespace LangafyApi.Tests.Progress;

public class ProgressCalculatorTests
{
    // Fixed reference date at noon keeps tests deterministic.
    // Noon avoids off-by-one: AddHours(-1) stays on the same calendar day.
    private static readonly DateTime Today = new(2024, 1, 15, 12, 0, 0);

    private static UserProgress MakeProgress(DateTime? completedAt) =>
        new() { Id = 1, UserId = 1, ExerciseId = 1, Completed = completedAt.HasValue, CompletedAt = completedAt };

    // ── CalculateStreak ───────────────────────────────────────────────────────

    [Fact]
    public void CalculateStreak_EmptyList_ReturnsZero()
    {
        Assert.Equal(0, ProgressCalculator.CalculateStreak([], Today));
    }

    [Fact]
    public void CalculateStreak_OnlyToday_ReturnsOne()
    {
        var progress = new List<UserProgress> { MakeProgress(Today) };
        Assert.Equal(1, ProgressCalculator.CalculateStreak(progress, Today));
    }

    [Fact]
    public void CalculateStreak_ThreeConsecutiveDaysEndingToday_ReturnsThree()
    {
        var progress = new List<UserProgress>
        {
            MakeProgress(Today),
            MakeProgress(Today.AddDays(-1)),
            MakeProgress(Today.AddDays(-2)),
        };

        Assert.Equal(3, ProgressCalculator.CalculateStreak(progress, Today));
    }

    [Fact]
    public void CalculateStreak_GapInDays_StreakBreaksAtGap()
    {
        var progress = new List<UserProgress>
        {
            MakeProgress(Today),
            // Today-1 missing
            MakeProgress(Today.AddDays(-2)),
        };

        // Streak = 1: only today is consecutive
        Assert.Equal(1, ProgressCalculator.CalculateStreak(progress, Today));
    }

    [Fact]
    public void CalculateStreak_NoActivityToday_ReturnsZero()
    {
        var progress = new List<UserProgress>
        {
            MakeProgress(Today.AddDays(-1)),
            MakeProgress(Today.AddDays(-2)),
        };

        // Current streak requires activity on today
        Assert.Equal(0, ProgressCalculator.CalculateStreak(progress, Today));
    }

    [Fact]
    public void CalculateStreak_MultipleExercisesPerDay_EachDayCountedOnce()
    {
        var progress = new List<UserProgress>
        {
            MakeProgress(Today.AddHours(-1)),    // today
            MakeProgress(Today.AddHours(-3)),    // today (duplicate day)
            MakeProgress(Today.AddDays(-1)),     // yesterday
        };

        // Should be 2 (today + yesterday), not 3 (3 entries)
        Assert.Equal(2, ProgressCalculator.CalculateStreak(progress, Today));
    }

    [Fact]
    public void CalculateStreak_NullCompletedAt_IgnoredInCalculation()
    {
        var progress = new List<UserProgress>
        {
            MakeProgress(Today),
            MakeProgress(null),   // incomplete exercise
        };

        Assert.Equal(1, ProgressCalculator.CalculateStreak(progress, Today));
    }

    // ── CalculateLongestStreak ────────────────────────────────────────────────

    [Fact]
    public void CalculateLongestStreak_EmptyList_ReturnsZero()
    {
        Assert.Equal(0, ProgressCalculator.CalculateLongestStreak([]));
    }

    [Fact]
    public void CalculateLongestStreak_SingleEntry_ReturnsOne()
    {
        var progress = new List<UserProgress> { MakeProgress(Today) };
        Assert.Equal(1, ProgressCalculator.CalculateLongestStreak(progress));
    }

    [Fact]
    public void CalculateLongestStreak_FiveConsecutiveDays_ReturnsFive()
    {
        var progress = Enumerable.Range(0, 5)
            .Select(i => MakeProgress(Today.AddDays(-i)))
            .ToList();

        Assert.Equal(5, ProgressCalculator.CalculateLongestStreak(progress));
    }

    [Fact]
    public void CalculateLongestStreak_TwoRuns_ReturnsLonger()
    {
        var progress = new List<UserProgress>
        {
            // Run 1: 3 days
            MakeProgress(Today),
            MakeProgress(Today.AddDays(-1)),
            MakeProgress(Today.AddDays(-2)),
            // gap
            // Run 2: 2 days
            MakeProgress(Today.AddDays(-5)),
            MakeProgress(Today.AddDays(-6)),
        };

        Assert.Equal(3, ProgressCalculator.CalculateLongestStreak(progress));
    }

    [Fact]
    public void CalculateLongestStreak_MultipleExercisesPerDay_CountsEachDayOnce()
    {
        // 3 exercises on Jan 15 + 1 on Jan 14 + 1 on Jan 13 → longest run = 3 days
        var progress = new List<UserProgress>
        {
            MakeProgress(Today.AddHours(-1)),   // Jan 15
            MakeProgress(Today.AddHours(-3)),   // Jan 15
            MakeProgress(Today.AddHours(-5)),   // Jan 15
            MakeProgress(Today.AddDays(-1)),    // Jan 14
            MakeProgress(Today.AddDays(-2)),    // Jan 13
        };

        Assert.Equal(3, ProgressCalculator.CalculateLongestStreak(progress));
    }

    [Fact]
    public void CalculateLongestStreak_NullCompletedAt_IgnoredInCalculation()
    {
        var progress = new List<UserProgress>
        {
            MakeProgress(Today),
            MakeProgress(Today.AddDays(-1)),
            MakeProgress(null),
        };

        Assert.Equal(2, ProgressCalculator.CalculateLongestStreak(progress));
    }
}
