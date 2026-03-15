using System.Net;
using System.Text;
using System.Text.Json;

namespace LangafyApi.Tests.Integration;

[Collection("Integration")]
public class LanguageEndpointTests(IntegrationTestFactory factory)
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

    // ── GET /api/languages ────────────────────────────────────────────────────

    [Fact]
    public async Task GetLanguages_Returns200WithSeededLanguages()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/languages");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement[]>(
            await response.Content.ReadAsStringAsync(), Json)!;

        var codes = body.Select(l => l.GetProperty("code").GetString()).ToList();
        Assert.Contains("es", codes);
        Assert.Contains("fr", codes);
        Assert.All(body, l => Assert.True(l.GetProperty("isActive").GetBoolean()));
    }

    // ── POST /api/user/languages ──────────────────────────────────────────────

    [Fact]
    public async Task AddLanguage_ValidLanguage_Returns201WithUserLanguageDto()
    {
        var client = await NewUserClientAsync();

        var response = await client.PostAsync(
            "/api/user/languages",
            JsonBody("""{"languageCode":"fr","startingCefrLevel":"A1"}"""));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal("fr",   body.GetProperty("languageCode").GetString());
        Assert.Equal("A1",   body.GetProperty("currentCefrLevel").GetString());
        Assert.False(        body.GetProperty("isPrimary").GetBoolean()); // new languages are not primary
    }

    [Fact]
    public async Task AddLanguage_Duplicate_Returns409Conflict()
    {
        var client = await NewUserClientAsync();

        // Spanish was already added on sync
        var response = await client.PostAsync(
            "/api/user/languages",
            JsonBody("""{"languageCode":"es"}"""));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task AddLanguage_UnknownLanguageCode_Returns400()
    {
        var client = await NewUserClientAsync();

        var response = await client.PostAsync(
            "/api/user/languages",
            JsonBody("""{"languageCode":"xx"}"""));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── PUT /api/user/languages/{code}/primary ────────────────────────────────

    [Fact]
    public async Task SetPrimary_ExistingLanguage_Returns200WithIsPrimaryTrue()
    {
        var client = await NewUserClientAsync();

        // Add French first
        await client.PostAsync(
            "/api/user/languages",
            JsonBody("""{"languageCode":"fr"}"""));

        // Set French as primary
        var response = await client.PutAsync("/api/user/languages/fr/primary", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal("fr", body.GetProperty("languageCode").GetString());
        Assert.True(body.GetProperty("isPrimary").GetBoolean());
    }

    [Fact]
    public async Task SetPrimary_LanguageNotStudied_Returns404()
    {
        var client = await NewUserClientAsync();
        // User only studies Spanish (added on sync). French hasn't been added.

        var response = await client.PutAsync("/api/user/languages/fr/primary", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
