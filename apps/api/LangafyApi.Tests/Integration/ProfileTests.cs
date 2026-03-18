using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LangafyApi.Data;
using Microsoft.Extensions.DependencyInjection;

namespace LangafyApi.Tests.Integration;

[Collection("Integration")]
public class ProfileTests(IntegrationTestFactory factory)
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    /// <summary>
    /// Helper to create an authenticated user by syncing first.
    /// </summary>
    private async Task<HttpClient> CreateSyncedClient(string? uid = null, string email = "profile@example.com")
    {
        uid ??= Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid, email);
        await client.PostAsync("/api/auth/sync", null);
        return client;
    }

    // ── GET /api/auth/profile ─────────────────────────────────────────────────

    [Fact]
    public async Task GetProfile_ReturnsCurrentUserProfile()
    {
        var uid = Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid, "getprofile@example.com");

        // Sync with names
        var syncBody = new { firstName = "Bob", lastName = "Jones" };
        await client.PostAsJsonAsync("/api/auth/sync", syncBody);

        var response = await client.GetAsync("/api/auth/profile");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal("getprofile@example.com", body.GetProperty("email").GetString());
        Assert.Equal("Bob", body.GetProperty("firstName").GetString());
        Assert.Equal("Jones", body.GetProperty("lastName").GetString());
        Assert.Equal("Bob Jones", body.GetProperty("displayName").GetString());
    }

    [Fact]
    public async Task GetProfile_Unauthenticated_Returns401()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/profile");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── PUT /api/auth/profile ─────────────────────────────────────────────────

    [Fact]
    public async Task UpdateProfile_ValidNames_Returns200AndUpdatesDb()
    {
        var uid = Guid.NewGuid().ToString();
        var client = await CreateSyncedClient(uid, "update@example.com");

        var updateBody = new { firstName = "Updated", lastName = "Name" };
        var response = await client.PutAsJsonAsync("/api/auth/profile", updateBody);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal("Updated", body.GetProperty("firstName").GetString());
        Assert.Equal("Name", body.GetProperty("lastName").GetString());
        Assert.Equal("Updated Name", body.GetProperty("displayName").GetString());

        // Verify persistence in database
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = db.Users.FirstOrDefault(u => u.FirebaseUid == uid);

        Assert.NotNull(user);
        Assert.Equal("Updated", user.FirstName);
        Assert.Equal("Name", user.LastName);
        Assert.Equal("Updated Name", user.DisplayName);
    }

    [Fact]
    public async Task UpdateProfile_Unauthenticated_Returns401()
    {
        var client = factory.CreateClient();

        var updateBody = new { firstName = "Test", lastName = "User" };
        var response = await client.PutAsJsonAsync("/api/auth/profile", updateBody);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProfile_EmptyFirstName_Returns400()
    {
        var client = await CreateSyncedClient(email: "emptyname@example.com");

        var updateBody = new { firstName = "  ", lastName = "Name" };
        var response = await client.PutAsJsonAsync("/api/auth/profile", updateBody);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProfile_EmptyLastName_Returns400()
    {
        var client = await CreateSyncedClient(email: "emptylast@example.com");

        var updateBody = new { firstName = "Test", lastName = "" };
        var response = await client.PutAsJsonAsync("/api/auth/profile", updateBody);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProfile_TrimsWhitespace()
    {
        var uid = Guid.NewGuid().ToString();
        var client = await CreateSyncedClient(uid, "trim@example.com");

        var updateBody = new { firstName = "  Trimmed  ", lastName = "  Name  " };
        var response = await client.PutAsJsonAsync("/api/auth/profile", updateBody);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal("Trimmed", body.GetProperty("firstName").GetString());
        Assert.Equal("Name", body.GetProperty("lastName").GetString());
    }
}
