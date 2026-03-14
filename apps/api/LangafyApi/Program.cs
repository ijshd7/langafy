using LangafyApi.Data;
using LangafyApi.Features.Auth;
using LangafyApi.Features.Exercises;
using LangafyApi.Features.Languages;
using LangafyApi.Features.Lessons;
using LangafyApi.Features.Progress;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
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

app.Run();
