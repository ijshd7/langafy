using System.Net;
using System.Text;
using System.Text.Json;
using LangafyApi.Data;
using Microsoft.Extensions.DependencyInjection;

namespace LangafyApi.Tests.Integration;

[Collection("Integration")]
public class ExerciseSubmissionTests(IntegrationTestFactory factory)
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    // Helper: sync a new user and return an authenticated client for them.
    private async Task<(HttpClient client, string uid)> NewUserClientAsync()
    {
        var uid = Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid);
        await client.PostAsync("/api/auth/sync", null);
        return (client, uid);
    }

    private static StringContent JsonBody(string json) =>
        new(json, Encoding.UTF8, "application/json");

    // ── MultipleChoice ────────────────────────────────────────────────────────

    [Fact]
    public async Task SubmitMultipleChoice_CorrectAnswer_ReturnsIsCorrectTrueWithPoints()
    {
        var sd = factory.SeedData;
        var (client, _) = await NewUserClientAsync();

        var response = await client.PostAsync(
            $"/api/exercises/{sd.McExerciseId}/submit",
            JsonBody("""{"selectedIndex":0,"timeSpentMs":3000}"""));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.True(body.GetProperty("isCorrect").GetBoolean());
        Assert.True(body.GetProperty("pointsEarned").GetInt32() > 0);
    }

    [Fact]
    public async Task SubmitMultipleChoice_WrongAnswer_ReturnsIsCorrectFalseWithCorrectAnswer()
    {
        var sd = factory.SeedData;
        var (client, _) = await NewUserClientAsync();

        var response = await client.PostAsync(
            $"/api/exercises/{sd.McExerciseId}/submit",
            JsonBody("""{"selectedIndex":2,"timeSpentMs":3000}"""));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.False(body.GetProperty("isCorrect").GetBoolean());
        Assert.Equal(0, body.GetProperty("pointsEarned").GetInt32());
    }

    // ── FillBlank ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task SubmitFillBlank_CorrectAnswerCaseInsensitive_ReturnsIsCorrectTrue()
    {
        var sd = factory.SeedData;
        var (client, _) = await NewUserClientAsync();

        var response = await client.PostAsync(
            $"/api/exercises/{sd.FillBlankExerciseId}/submit",
            JsonBody("""{"answer":"LLAMAS","timeSpentMs":4000}"""));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.True(body.GetProperty("isCorrect").GetBoolean());
    }

    [Fact]
    public async Task SubmitFillBlank_WrongAnswer_ReturnsIsCorrectFalse()
    {
        var sd = factory.SeedData;
        var (client, _) = await NewUserClientAsync();

        var response = await client.PostAsync(
            $"/api/exercises/{sd.FillBlankExerciseId}/submit",
            JsonBody("""{"answer":"nosotros","timeSpentMs":4000}"""));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.False(body.GetProperty("isCorrect").GetBoolean());
    }

    // ── WordScramble ──────────────────────────────────────────────────────────

    [Fact]
    public async Task SubmitWordScramble_CorrectAnswer_ReturnsIsCorrectTrue()
    {
        var sd = factory.SeedData;
        var (client, _) = await NewUserClientAsync();

        var response = await client.PostAsync(
            $"/api/exercises/{sd.WordScrambleExerciseId}/submit",
            JsonBody("""{"answer":"hola","timeSpentMs":5000}"""));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.True(body.GetProperty("isCorrect").GetBoolean());
    }

    // ── Attempt tracking ──────────────────────────────────────────────────────

    [Fact]
    public async Task SubmitExercise_SecondAttempt_IncrementsAttemptCount()
    {
        var sd = factory.SeedData;
        var (client, uid) = await NewUserClientAsync();

        // First attempt — wrong answer
        await client.PostAsync(
            $"/api/exercises/{sd.McExerciseId}/submit",
            JsonBody("""{"selectedIndex":3,"timeSpentMs":2000}"""));

        // Second attempt — correct answer
        await client.PostAsync(
            $"/api/exercises/{sd.McExerciseId}/submit",
            JsonBody("""{"selectedIndex":0,"timeSpentMs":2000}"""));

        // Verify the progress record in the database
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = db.Users.Single(u => u.FirebaseUid == uid);
        var progress = db.UserProgress.Single(p => p.UserId == user.Id && p.ExerciseId == sd.McExerciseId);

        Assert.Equal(2, progress.Attempts);
        Assert.True(progress.Completed);
    }

    // ── Auth guard ────────────────────────────────────────────────────────────

    [Fact]
    public async Task SubmitExercise_Unauthenticated_Returns401()
    {
        var sd = factory.SeedData;
        var client = factory.CreateClient();

        var response = await client.PostAsync(
            $"/api/exercises/{sd.McExerciseId}/submit",
            JsonBody("""{"selectedIndex":0,"timeSpentMs":1000}"""));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task SubmitExercise_NonExistentExercise_Returns404()
    {
        var (client, _) = await NewUserClientAsync();

        var response = await client.PostAsync(
            "/api/exercises/99999/submit",
            JsonBody("""{"selectedIndex":0,"timeSpentMs":1000}"""));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
