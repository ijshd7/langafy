using LangafyApi.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Threading.RateLimiting;
using Testcontainers.PostgreSql;

namespace LangafyApi.Tests.Integration;

/// <summary>
/// Shared WebApplicationFactory that spins up a real PostgreSQL container via
/// Testcontainers, applies EF Core migrations, and seeds minimal test data.
/// Registered as a collection fixture so the container is created once for all
/// integration test classes, rather than once per class.
/// </summary>
public class IntegrationTestFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("langafy_test")
        .WithUsername("test")
        .WithPassword("test")
        .Build();

    public SeedData SeedData { get; private set; } = null!;

    // ── IAsyncLifetime ────────────────────────────────────────────────────────

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        // Accessing Services triggers WebApplicationFactory to build the app,
        // which calls ConfigureWebHost below. The container is already running,
        // so GetConnectionString() is valid at that point.
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
        SeedData = await TestDataSeeder.SeedAsync(db);
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    // ── WebApplicationFactory ─────────────────────────────────────────────────

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // "Testing" environment skips the Development-only seeder + migration
        // block in Program.cs and the production-only AllowedOrigin check.
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // Prevent the Firebase:ProjectId null-throw in Program.cs.
                // Auth is replaced by TestAuthHandler so this value is unused.
                ["Firebase:ProjectId"] = "test-project-id",
                // Satisfy the production CORS policy (not used in Testing env).
                ["AllowedOrigin"] = "http://localhost:3000",
            });
        });

        builder.ConfigureServices(services =>
        {
            // ── Replace real DbContext with one pointing at the container ─────
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(_postgres.GetConnectionString()));

            // ── Disable rate limiting (all test requests share "unknown" IP) ───
            // WebApplicationFactory TestServer sets RemoteIpAddress = null, so
            // every call to /api/auth/sync shares the same "unknown" partition,
            // exhausting the 10 req/min bucket across the entire test suite.
            // Replace the registered IConfigureOptions<RateLimiterOptions> with
            // a no-op limiter so tests never receive 429 responses.
            var rateLimiterConfigs = services
                .Where(d => d.ServiceType == typeof(IConfigureOptions<RateLimiterOptions>))
                .ToList();
            foreach (var d in rateLimiterConfigs)
                services.Remove(d);

            services.Configure<RateLimiterOptions>(options =>
                options.AddPolicy("AuthSyncPolicy", _ =>
                    RateLimitPartition.GetNoLimiter("no-limit")));

            // ── Replace Firebase JWT auth with a simple test scheme ───────────
            // PostConfigure changes the default scheme so our handler is invoked
            // instead of JwtBearerHandler. The JwtBearer registration stays in
            // the DI graph but is never reached.
            services.Configure<AuthenticationOptions>(opts =>
            {
                opts.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                opts.DefaultChallengeScheme    = TestAuthHandler.SchemeName;
                opts.DefaultScheme             = TestAuthHandler.SchemeName;
            });
            services.AddAuthentication()
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                    TestAuthHandler.SchemeName, _ => { });
        });
    }

    // ── Helpers for test classes ──────────────────────────────────────────────

    /// <summary>
    /// Creates an <see cref="HttpClient"/> pre-configured with test auth claims.
    /// Claims format: <c>sub=uid;email=user@example.com;name=Test User</c>
    /// </summary>
    public HttpClient CreateAuthenticatedClient(string firebaseUid, string email = "test@example.com", string name = "Test User")
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add(
            TestAuthHandler.HeaderName,
            $"sub={firebaseUid};email={email};name={name}");
        return client;
    }
}

/// <summary>xUnit collection definition — shares one factory across all integration tests.</summary>
[CollectionDefinition("Integration")]
public class IntegrationCollection : ICollectionFixture<IntegrationTestFactory> { }
