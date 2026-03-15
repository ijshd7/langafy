using LangafyApi.Data;
using LangafyApi.Features.Auth;
using LangafyApi.Features.Exercises;
using LangafyApi.Features.Languages;
using LangafyApi.Features.Lessons;
using LangafyApi.Features.Progress;
using LangafyApi.Features.Vocabulary;
using LangafyApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Http.Resilience;
using Microsoft.IdentityModel.Tokens;
using Npgsql.EntityFrameworkCore.PostgreSQL;

var builder = WebApplication.CreateBuilder(args);

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

// Add Entity Framework Core with PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add database seeder for development
builder.Services.AddScoped<DbSeeder>();

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
    client.BaseAddress = new Uri(openRouterBaseUrl);
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

    // Circuit breaker (sampling-based, Polly v8):
    // Opens when >= 80% of requests fail within a 10s window, with at least 5 requests.
    // Stays open for 30s before transitioning to half-open.
    options.CircuitBreaker.BreakDuration = TimeSpan.FromSeconds(30);
    options.CircuitBreaker.SamplingDuration = TimeSpan.FromSeconds(10);
    options.CircuitBreaker.MinimumThroughput = 5;
    options.CircuitBreaker.FailureRatio = 0.8;

    // Per-attempt timeout and total timeout covering all retry attempts
    var timeoutSecs = builder.Configuration.GetValue("OpenRouter:TimeoutSeconds", 30);
    options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(timeoutSecs);
    options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(timeoutSecs * 4);
});

// Register the conversation AI service
builder.Services.AddScoped<IConversationAIService, OpenRouterConversationService>();

// Add Firebase JWT authentication
var firebaseProjectId = builder.Configuration["Firebase:ProjectId"]
    ?? throw new InvalidOperationException("Firebase ProjectId configuration is missing.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"https://securetoken.google.com/{firebaseProjectId}";
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

// Request logging middleware
app.Use(async (context, next) =>
{
    var startTime = DateTime.UtcNow;
    var path = context.Request.Path;
    var method = context.Request.Method;

    try
    {
        await next();
    }
    finally
    {
        var duration = DateTime.UtcNow - startTime;
        var statusCode = context.Response.StatusCode;

        var logLevel = statusCode >= 500 ? LogLevel.Error : statusCode >= 400 ? LogLevel.Warning : LogLevel.Information;
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();

        logger.Log(
            logLevel,
            "HTTP {Method} {Path} responded with {StatusCode} in {DurationMs}ms",
            method,
            path,
            statusCode,
            duration.TotalMilliseconds
        );
    }
});

// CORS middleware
app.UseCors("AllowFrontend");

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

// Map endpoint groups
app.MapAuthEndpoints();
app.MapLanguageEndpoints();
app.MapLessonEndpoints();
app.MapExerciseEndpoints();
app.MapProgressEndpoints();
app.MapVocabularyEndpoints();

app.Run();
