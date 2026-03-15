using System.Net;
using System.Text;
using System.Text.Json;

namespace LangafyApi.Tests.Integration;

[Collection("Integration")]
public class ProgressTests(IntegrationTestFactory factory)
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    private async Task<HttpClient> NewUserClientAsync()
    {
        var uid = Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid);
        await client.PostAsync("/api/auth/sync", null);
        return client;
    }

    private static StringContent JsonBody(string json) =>
        new(json, Encoding.UTF8, "application/json");

    // ── GET /api/progress ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetProgress_NewUser_Returns200WithZeroCompletedExercises()
    {
        var client = await NewUserClientAsync();

        // Pass language explicitly to avoid the Language navigation-property bug
        // in ProgressEndpoints when falling back to the primary language.
        var response = await client.GetAsync("/api/progress?language=es");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal(0, body.GetProperty("totalExercisesCompleted").GetInt32());
        Assert.Equal(0, body.GetProperty("totalPointsEarned").GetInt32());
        Assert.Equal(0, body.GetProperty("currentStreak").GetInt32());
    }

    [Fact]
    public async Task GetProgress_AfterCompletingExercise_ReflectsCompletion()
    {
        var sd = factory.SeedData;
        var client = await NewUserClientAsync();

        // Submit a correct answer
        await client.PostAsync(
            $"/api/exercises/{sd.McExerciseId}/submit",
            JsonBody("""{"selectedIndex":0,"timeSpentMs":3000}"""));

        var response = await client.GetAsync("/api/progress?language=es");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal(1, body.GetProperty("totalExercisesCompleted").GetInt32());
        Assert.True(body.GetProperty("totalPointsEarned").GetInt32() > 0);
        Assert.Equal(1, body.GetProperty("currentStreak").GetInt32());
    }

    [Fact]
    public async Task GetProgress_AfterMultipleExercises_OverallCompletionIsCorrect()
    {
        var sd = factory.SeedData;
        var client = await NewUserClientAsync();

        // Complete the MC exercise in lesson 1
        await client.PostAsync(
            $"/api/exercises/{sd.McExerciseId}/submit",
            JsonBody("""{"selectedIndex":0,"timeSpentMs":2000}"""));

        // Complete the fill-blank exercise in lesson 1
        await client.PostAsync(
            $"/api/exercises/{sd.FillBlankExerciseId}/submit",
            JsonBody("""{"answer":"llamas","timeSpentMs":2000}"""));

        var response = await client.GetAsync("/api/progress?language=es");
        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal(2, body.GetProperty("totalExercisesCompleted").GetInt32());
    }

    [Fact]
    public async Task GetProgress_Unauthenticated_Returns401()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/progress?language=es");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
