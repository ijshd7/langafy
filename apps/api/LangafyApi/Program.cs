using System.Threading.RateLimiting;
using LangafyApi.Data;
using LangafyApi.Features.Auth;
using LangafyApi.Features.Conversations;
using LangafyApi.Features.Exercises;
using LangafyApi.Features.Languages;
using LangafyApi.Features.Lessons;
using LangafyApi.Features.Progress;
using LangafyApi.Features.Vocabulary;
using LangafyApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using Serilog;
using Serilog.Events;

// Bootstrap logger captures startup errors before the full pipeline is configured.
// It is replaced by the fully configured logger once UseSerilog() runs below.
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .WriteTo.Console()
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(args);

// Replace the built-in logging pipeline with Serilog.
// - CompactJsonFormatter outputs one JSON object per log line — the format Cloud Logging
//   expects for structured log parsing (severity, labels, trace fields parsed automatically).
// - ReadFrom.Configuration() allows overriding levels via appsettings.json or env vars at runtime.
// - Level overrides silence verbose EF Core + Microsoft framework noise in production.
builder.Host.UseSerilog((ctx, services, config) => config
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.Hosting.Lifetime", LogEventLevel.Information)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database.Command", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .Enrich.WithProperty("Application", "LangafyApi")
    .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName)
    .WriteTo.Console(new Serilog.Formatting.Compact.CompactJsonFormatter())
    .ReadFrom.Configuration(ctx.Configuration)
    .ReadFrom.Services(services));

// Startup configuration validation — fail fast before DI container is built.
// Collecting all missing keys at once gives a single comprehensive error message
// rather than requiring multiple restarts to discover each gap.
// AllowedOrigin is production-only; all others are required in every environment.
{
    var missing = new List<string>();

    if (string.IsNullOrWhiteSpace(builder.Configuration.GetConnectionString("DefaultConnection")))
    {
        missing.Add("ConnectionStrings:DefaultConnection  (env var: ConnectionStrings__DefaultConnection)");
    }

    if (string.IsNullOrWhiteSpace(builder.Configuration["Firebase:ProjectId"]))
    {
        missing.Add("Firebase:ProjectId  (env var: Firebase__ProjectId)");
    }

    if (string.IsNullOrWhiteSpace(builder.Configuration["OpenRouter:ApiKey"]))
    {
        missing.Add("OpenRouter:ApiKey  (env var: OpenRouter__ApiKey)");
    }

    // AllowedOrigin is intentionally NOT checked here. Its validation happens lazily inside
    // the AddCors delegate below (which runs post-Build() when IOptions<CorsOptions> is
    // first resolved). This avoids a false-positive fatal exit when WebApplicationFactory
    // injects AllowedOrigin via ConfigureAppConfiguration — those overrides are only
    // available after Build(), not during this pre-Build() startup block.

    if (missing.Count > 0)
    {
        foreach (var key in missing)
        {
            Log.Fatal("Missing required configuration: {Key}", key);
        }

        Log.Fatal("Application cannot start. See apps/web/.env.example and apps/api docs for setup.");
        Log.CloseAndFlush();
        return;
    }
}

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Add XML comments from the API assembly
    var xmlFilename = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    // Add JWT Bearer authentication to Swagger UI
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        Description = "JWT authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\""
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Add Entity Framework Core with PostgreSQL.
// Configure Npgsql connection pool size for Cloud Run horizontal scaling:
// MaxPoolSize=20 per instance prevents exhausting PostgreSQL's connection limit
// when Cloud Run scales out (e.g., 10 instances × 20 = 200 max connections).
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty;
var npgsqlConnBuilder = new NpgsqlConnectionStringBuilder(connectionString);
// Set MaxPoolSize for Cloud Run: cap at 20 per instance to avoid exhausting
// PostgreSQL's max_connections when the service scales out horizontally.
// Override via Database:MaxPoolSize in appsettings or environment.
npgsqlConnBuilder.MaxPoolSize = builder.Configuration.GetValue("Database:MaxPoolSize", 20);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(npgsqlConnBuilder.ConnectionString));

// Add database seeder for development
builder.Services.AddScoped<DbSeeder>();

// Add in-process memory cache for static content (CEFR levels, languages).
// Endpoints invalidate their own entries on write; 5-minute expiry ensures
// eventual consistency without requiring a distributed cache for MVP.
builder.Services.AddMemoryCache();

// Bind OpenRouter configuration
builder.Services.Configure<OpenRouterOptions>(
    builder.Configuration.GetSection(OpenRouterOptions.SectionName));

// Register the OpenRouter HttpClient with base address, auth header, and resilience pipeline.
//
// Resilience pipeline (Polly v8 via Microsoft.Extensions.Http.Resilience):
//   - Retry: up to 3 attempts with exponential backoff on transient HTTP errors (5xx, timeouts)
//   - Circuit breaker: opens after 5 consecutive failures; half-open after 30 seconds
//
// If the primary model exhausts retries, OpenRouterConversationService falls back to the
// configured fallback model by catching the final exception and retrying the request.
var openRouterApiKey = builder.Configuration["OpenRouter:ApiKey"] ?? string.Empty;
var openRouterBaseUrl = builder.Configuration["OpenRouter:BaseUrl"] ?? "https://openrouter.ai/api/v1";

builder.Services.AddHttpClient("OpenRouter", client =>
{
    client.BaseAddress = new Uri(openRouterBaseUrl.TrimEnd('/') + "/");
    client.DefaultRequestHeaders.Add("Authorization", $"Bearer {openRouterApiKey}");
    client.DefaultRequestHeaders.Add("HTTP-Referer", "https://langafy.app");
    client.DefaultRequestHeaders.Add("X-Title", "Langafy Language Learning");
    client.Timeout = TimeSpan.FromSeconds(
        builder.Configuration.GetValue("OpenRouter:TimeoutSeconds", 30));
})
.AddStandardResilienceHandler(options =>
{
    // Retry: up to 3 attempts with exponential backoff on transient HTTP errors (5xx)
    options.Retry.MaxRetryAttempts = 3;
    options.Retry.Delay = TimeSpan.FromSeconds(1);
    options.Retry.BackoffType = Polly.DelayBackoffType.Exponential;

    // Per-attempt timeout and total timeout covering all retry attempts
    var timeoutSecs = builder.Configuration.GetValue("OpenRouter:TimeoutSeconds", 30);
    options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(timeoutSecs);
    options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(timeoutSecs * 4);

    // Circuit breaker (sampling-based, Polly v8):
    // Opens when >= 80% of requests fail, with at least 5 requests in the window.
    // Stays open for 30s before transitioning to half-open.
    // SamplingDuration must be >= 2× AttemptTimeout (Microsoft.Extensions.Http.Resilience rule).
    options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
    options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(timeoutSecs * 2);
    options.CircuitBreaker.MinimumThroughput = 5;
    options.CircuitBreaker.FailureRatio = 0.8;
});

// Register the conversation AI service
builder.Services.AddScoped<IConversationAIService, OpenRouterConversationService>();

// Register the database-backed conversation rate limiter
builder.Services.AddScoped<IConversationRateLimitService, DbConversationRateLimitService>();

// Add Firebase JWT authentication (Firebase:ProjectId validated at startup above)
var firebaseProjectId = builder.Configuration["Firebase:ProjectId"]!;

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://securetoken.google.com/{firebaseProjectId}";
        // Preserve JWT claim names as-is (e.g. "sub", "email") instead of
        // remapping them to XML-namespace URIs like ClaimTypes.NameIdentifier.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://securetoken.google.com/{firebaseProjectId}",
            ValidateAudience = true,
            ValidAudience = firebaseProjectId,
            ValidateLifetime = true
        };
    });

builder.Services.AddAuthorization();

// Add IP-based rate limiting for auth endpoint brute-force protection.
// Fixed window: 10 requests per minute per IP on POST /api/auth/sync.
// Uses built-in ASP.NET Core rate limiting (no extra NuGet required in .NET 8+).
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("AuthSyncPolicy", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 0
            }));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, ct) =>
    {
        context.HttpContext.Response.Headers["Retry-After"] = "60";
        await context.HttpContext.Response.WriteAsync(
            "Too many requests. Please try again in 60 seconds.", ct);
    };
});

// Add CORS configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policyBuilder =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // Development: allow localhost:3000 (web) and common Expo dev ports
            policyBuilder
                .WithOrigins("http://localhost:3000", "http://localhost:19000", "http://localhost:19001")
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }
        else
        {
            // Production: use environment variable for allowed origin
            var allowedOrigin = builder.Configuration["AllowedOrigin"]
                ?? throw new InvalidOperationException("AllowedOrigin configuration is missing in production.");
            policyBuilder
                .WithOrigins(allowedOrigin)
                .AllowAnyMethod()
                .AllowAnyHeader()
                .AllowCredentials();
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.

// Global exception handler middleware
app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;

        var problemDetails = new
        {
            type = "https://langafy.example.com/errors/internal-server-error",
            title = "An unexpected error occurred",
            status = StatusCodes.Status500InternalServerError,
            detail = app.Environment.IsDevelopment() ? exception?.Message : "Please try again later.",
            instance = context.Request.Path
        };

        await context.Response.WriteAsJsonAsync(problemDetails);
    });
});

// Correlation ID middleware: propagate or generate a request-scoped ID, echo it back in
// the response header, and push it into the Serilog LogContext so every log entry emitted
// during this request automatically carries "CorrelationId" as a structured property.
app.Use(async (context, next) =>
{
    var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault()
        ?? Guid.NewGuid().ToString("N");

    context.Response.Headers["X-Correlation-ID"] = correlationId;

    using (Serilog.Context.LogContext.PushProperty("CorrelationId", correlationId))
    {
        await next();
    }
});

// Serilog request logging — replaces the hand-written request middleware from Step 8.13.
// Logs one structured message per request with Method, Path, StatusCode, and Elapsed fields.
// Custom GetLevel maps 4xx → Warning and 5xx (or exceptions) → Error, matching the plan spec.
// EnrichDiagnosticContext adds CorrelationId to the per-request log entry.
app.UseSerilogRequestLogging(options =>
{
    options.GetLevel = (ctx, _, ex) =>
        ex != null || ctx.Response.StatusCode >= 500 ? LogEventLevel.Error :
        ctx.Response.StatusCode >= 400 ? LogEventLevel.Warning :
        LogEventLevel.Information;

    options.EnrichDiagnosticContext = (diagnosticContext, httpContext) =>
    {
        diagnosticContext.Set("CorrelationId",
            httpContext.Response.Headers["X-Correlation-ID"].FirstOrDefault() ?? string.Empty);
    };
});

// CORS middleware
app.UseCors("AllowFrontend");

// Rate limiting middleware (must come before auth so IP limits apply to unauthenticated requests)
app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    // Apply migrations and seed database on startup in development
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var seeder = scope.ServiceProvider.GetRequiredService<DbSeeder>();
        await seeder.SeedAsync();
    }
}

app.UseHttpsRedirection();

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint — used by Cloud Run readiness probes and uptime monitors
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithTags("Health")
    .WithSummary("API health check")
    .AllowAnonymous();

// Map endpoint groups
app.MapAuthEndpoints();
app.MapLanguageEndpoints();
app.MapLessonEndpoints();
app.MapExerciseEndpoints();
app.MapProgressEndpoints();
app.MapVocabularyEndpoints();
app.MapConversationEndpoints();

app.Run();

// Expose Program to the test assembly for WebApplicationFactory<Program>
/// <inheritdoc/>
public partial class Program { }
