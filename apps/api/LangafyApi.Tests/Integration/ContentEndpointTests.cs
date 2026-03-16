using System.Net;
using System.Text.Json;

namespace LangafyApi.Tests.Integration;

[Collection("Integration")]
public class ContentEndpointTests(IntegrationTestFactory factory)
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    // ── GET /api/levels ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetLevels_Returns200WithAllSeededLevels()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/levels");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement[]>(
            await response.Content.ReadAsStringAsync(), Json)!;

        var codes = body.Select(l => l.GetProperty("code").GetString()).ToList();
        Assert.Contains("A1", codes);
        Assert.Contains("A2", codes);
    }

    // ── GET /api/languages/{code}/levels/{levelId}/units ─────────────────────

    [Fact]
    public async Task GetUnits_ValidLanguageAndLevel_Returns200WithUnits()
    {
        var sd = factory.SeedData;
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/languages/es/levels/{sd.A1LevelId}/units");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement[]>(
            await response.Content.ReadAsStringAsync(), Json)!;

        Assert.NotEmpty(body);
        var unitTitles = body.Select(u => u.GetProperty("title").GetString()).ToList();
        Assert.Contains("Greetings & Introductions", unitTitles);
    }

    [Fact]
    public async Task GetUnits_UnknownLanguage_Returns404()
    {
        var sd = factory.SeedData;
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/languages/xx/levels/{sd.A1LevelId}/units");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── GET /api/languages/{code}/levels/by-code/{cefrCode}/units ─────────────

    [Fact]
    public async Task GetUnitsByCode_ValidLanguageAndCefrCode_Returns200WithUnits()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/languages/es/levels/by-code/A1/units");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement[]>(
            await response.Content.ReadAsStringAsync(), Json)!;

        Assert.NotEmpty(body);
        var unitTitles = body.Select(u => u.GetProperty("title").GetString()).ToList();
        Assert.Contains("Greetings & Introductions", unitTitles);
    }

    [Fact]
    public async Task GetUnitsByCode_CaseInsensitive_Returns200()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/languages/es/levels/by-code/a1/units");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement[]>(
            await response.Content.ReadAsStringAsync(), Json)!;
        Assert.NotEmpty(body);
    }

    [Fact]
    public async Task GetUnitsByCode_UnknownCefrCode_Returns404()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/languages/es/levels/by-code/Z9/units");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── GET /api/units/{id}/lessons ───────────────────────────────────────────

    [Fact]
    public async Task GetLessons_ValidUnit_Returns200WithLessons()
    {
        var sd = factory.SeedData;
        var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/units/{sd.Unit1Id}/lessons");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement[]>(
            await response.Content.ReadAsStringAsync(), Json)!;

        Assert.Equal(2, body.Length); // Lesson 1 + Lesson 2
        var titles = body.Select(l => l.GetProperty("title").GetString()).ToList();
        Assert.Contains("Basic Greetings", titles);
        Assert.Contains("Introducing Yourself", titles);
    }

    // ── GET /api/lessons/{id} ─────────────────────────────────────────────────

    [Fact]
    public async Task GetLesson_Unauthenticated_Returns200WithExercisesButNoProgress()
    {
        var sd = factory.SeedData;
        var client = factory.CreateClient(); // no auth

        var response = await client.GetAsync($"/api/lessons/{sd.Lesson1Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal("Basic Greetings", body.GetProperty("title").GetString());

        var exercises = body.GetProperty("exercises").EnumerateArray().ToList();
        Assert.Equal(4, exercises.Count);

        // Without auth, progress should be null on every exercise
        foreach (var ex in exercises)
        {
            Assert.Equal(JsonValueKind.Null, ex.GetProperty("progress").ValueKind);
        }
    }

    [Fact]
    public async Task GetLesson_Authenticated_ReturnsProgressPerExercise()
    {
        var sd = factory.SeedData;
        var uid = Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid);

        // Sync user so the DB has an AppUser row
        await client.PostAsync("/api/auth/sync", null);

        // Submit a correct answer to the MC exercise
        var submission = new StringContent(
            """{"selectedIndex":0,"timeSpentMs":3000}""",
            System.Text.Encoding.UTF8, "application/json");
        await client.PostAsync($"/api/exercises/{sd.McExerciseId}/submit", submission);

        // Now fetch the lesson — progress should reflect the submission
        var response = await client.GetAsync($"/api/lessons/{sd.Lesson1Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);
        var exercises = body.GetProperty("exercises").EnumerateArray().ToList();

        var mcEx = exercises.First(e => e.GetProperty("id").GetInt32() == sd.McExerciseId);
        var progress = mcEx.GetProperty("progress");
        Assert.NotEqual(JsonValueKind.Null, progress.ValueKind);
        Assert.True(progress.GetProperty("completed").GetBoolean());
        Assert.Equal(1, progress.GetProperty("attempts").GetInt32());
    }
}
