using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LangafyApi.Data;
using Microsoft.Extensions.DependencyInjection;

namespace LangafyApi.Tests.Integration;

[Collection("Integration")]
public class AuthSyncTests(IntegrationTestFactory factory)
{
    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true };

    // ── POST /api/auth/sync ───────────────────────────────────────────────────

    [Fact]
    public async Task Sync_NewUser_Returns200WithSpanishA1AndIsFirstSyncTrue()
    {
        var uid = Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid, "newuser@example.com");

        var response = await client.PostAsync("/api/auth/sync", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal("es",   body.GetProperty("activeLanguageCode").GetString());
        Assert.Equal("A1",   body.GetProperty("currentCefrLevel").GetString());
        Assert.True(         body.GetProperty("isFirstSync").GetBoolean());
        Assert.Equal("newuser@example.com", body.GetProperty("email").GetString());
    }

    [Fact]
    public async Task Sync_ExistingUser_Returns200WithIsFirstSyncFalse()
    {
        var uid = Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid, "existing@example.com");

        // First sync — creates the user
        await client.PostAsync("/api/auth/sync", null);

        // Second sync — should update, not recreate
        var response = await client.PostAsync("/api/auth/sync", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.False(body.GetProperty("isFirstSync").GetBoolean());
    }

    [Fact]
    public async Task Sync_NewUser_CreatesUserRecordInDatabase()
    {
        var uid = Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid, "dbcheck@example.com");

        await client.PostAsync("/api/auth/sync", null);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = db.Users.FirstOrDefault(u => u.FirebaseUid == uid);

        Assert.NotNull(user);
        Assert.Equal("dbcheck@example.com", user.Email);
    }

    [Fact]
    public async Task Sync_Unauthenticated_Returns401()
    {
        var client = factory.CreateClient(); // no X-Test-Auth header

        var response = await client.PostAsync("/api/auth/sync", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Sync_NewUser_WithNames_StoresFirstAndLastName()
    {
        var uid = Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid, "names@example.com");

        var syncBody = new { firstName = "Jane", lastName = "Smith" };
        var response = await client.PostAsJsonAsync("/api/auth/sync", syncBody);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = db.Users.FirstOrDefault(u => u.FirebaseUid == uid);

        Assert.NotNull(user);
        Assert.Equal("Jane", user.FirstName);
        Assert.Equal("Smith", user.LastName);
        Assert.Equal("Jane Smith", user.DisplayName);
    }

    [Fact]
    public async Task Sync_NewUser_WithNames_ReturnsNamesInResponse()
    {
        var uid = Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid, "namesresponse@example.com");

        var syncBody = new { firstName = "Alice", lastName = "Johnson" };
        var response = await client.PostAsJsonAsync("/api/auth/sync", syncBody);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = JsonSerializer.Deserialize<JsonElement>(
            await response.Content.ReadAsStringAsync(), Json);

        Assert.Equal("Alice", body.GetProperty("firstName").GetString());
        Assert.Equal("Johnson", body.GetProperty("lastName").GetString());
        Assert.Equal("Alice Johnson", body.GetProperty("displayName").GetString());
        Assert.True(body.GetProperty("isFirstSync").GetBoolean());
    }

    [Fact]
    public async Task Sync_NewUser_WithoutNames_HasNullNames()
    {
        var uid = Guid.NewGuid().ToString();
        var client = factory.CreateAuthenticatedClient(uid, "nonames@example.com");

        var response = await client.PostAsync("/api/auth/sync", null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = db.Users.FirstOrDefault(u => u.FirebaseUid == uid);

        Assert.NotNull(user);
        Assert.Null(user.FirstName);
        Assert.Null(user.LastName);
    }
}
