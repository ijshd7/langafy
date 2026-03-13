using LangafyApi.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace LangafyApi.Data;

/// <summary>
/// Application database context for Entity Framework Core.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // CEFR Content Hierarchy
    public DbSet<Language> Languages => Set<Language>();
    public DbSet<CefrLevel> CefrLevels => Set<CefrLevel>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Exercise> Exercises => Set<Exercise>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Language configuration
        modelBuilder.Entity<Language>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.NativeName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        // CefrLevel configuration
        modelBuilder.Entity<CefrLevel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique();
            entity.Property(e => e.Code).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.SortOrder).IsRequired();
        });

        // Unit configuration
        modelBuilder.Entity<Unit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.LanguageId, e.CefrLevelId });
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.SortOrder).IsRequired();

            entity.HasOne(e => e.Language)
                .WithMany(l => l.Units)
                .HasForeignKey(e => e.LanguageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CefrLevel)
                .WithMany(l => l.Units)
                .HasForeignKey(e => e.CefrLevelId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Lesson configuration
        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UnitId);
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Objective).HasMaxLength(500);
            entity.Property(e => e.SortOrder).IsRequired();

            entity.HasOne(e => e.Unit)
                .WithMany(u => u.Lessons)
                .HasForeignKey(e => e.UnitId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Exercise configuration
        modelBuilder.Entity<Exercise>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.LessonId);
            entity.Property(e => e.Type).IsRequired();
            entity.Property(e => e.Config).HasColumnType("jsonb");
            entity.Property(e => e.SortOrder).IsRequired();
            entity.Property(e => e.Points).IsRequired().HasDefaultValue(10);

            entity.HasOne(e => e.Lesson)
                .WithMany(l => l.Exercises)
                .HasForeignKey(e => e.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
