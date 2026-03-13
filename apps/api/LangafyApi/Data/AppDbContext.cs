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

    // User and Progress
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<UserLanguage> UserLanguages => Set<UserLanguage>();
    public DbSet<UserProgress> UserProgress => Set<UserProgress>();
    public DbSet<UserVocabulary> UserVocabulary => Set<UserVocabulary>();
    public DbSet<Vocabulary> Vocabulary => Set<Vocabulary>();

    // Conversations
    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();

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

        // AppUser configuration
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.FirebaseUid).IsUnique();
            entity.Property(e => e.FirebaseUid).HasMaxLength(128).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(256).IsRequired();
            entity.Property(e => e.DisplayName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.LastActiveAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // Vocabulary configuration
        modelBuilder.Entity<Vocabulary>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.LanguageId, e.CefrLevelId });
            entity.Property(e => e.WordTarget).HasMaxLength(255).IsRequired();
            entity.Property(e => e.WordEn).HasMaxLength(255).IsRequired();
            entity.Property(e => e.PartOfSpeech).HasMaxLength(50);
            entity.Property(e => e.ExampleSentenceTarget).HasMaxLength(1000);
            entity.Property(e => e.ExampleSentenceEn).HasMaxLength(1000);

            entity.HasOne(e => e.Language)
                .WithMany(l => l.VocabularyItems)
                .HasForeignKey(e => e.LanguageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CefrLevel)
                .WithMany()
                .HasForeignKey(e => e.CefrLevelId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // UserLanguage configuration
        modelBuilder.Entity<UserLanguage>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UserId, e.LanguageId }).IsUnique();
            entity.Property(e => e.CurrentCefrLevel).HasMaxLength(10).IsRequired();
            entity.Property(e => e.StartedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.User)
                .WithMany(u => u.UserLanguages)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Language)
                .WithMany()
                .HasForeignKey(e => e.LanguageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // UserProgress configuration
        modelBuilder.Entity<UserProgress>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UserId, e.ExerciseId });
            entity.Property(e => e.Score).IsRequired().HasDefaultValue(0);
            entity.Property(e => e.Attempts).IsRequired().HasDefaultValue(0);

            entity.HasOne(e => e.User)
                .WithMany(u => u.UserProgress)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Exercise)
                .WithMany()
                .HasForeignKey(e => e.ExerciseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // UserVocabulary configuration
        modelBuilder.Entity<UserVocabulary>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.UserId, e.VocabularyId }).IsUnique();
            entity.Property(e => e.EaseFactor).IsRequired().HasDefaultValue(2.5);
            entity.Property(e => e.IntervalDays).IsRequired().HasDefaultValue(1);
            entity.Property(e => e.Repetitions).IsRequired().HasDefaultValue(0);
            entity.Property(e => e.NextReviewAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.User)
                .WithMany(u => u.UserVocabulary)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Vocabulary)
                .WithMany(v => v.UserVocabularyItems)
                .HasForeignKey(e => e.VocabularyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Conversation configuration
        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.LanguageId });
            entity.Property(e => e.CefrLevel).HasMaxLength(10).IsRequired();
            entity.Property(e => e.Topic).HasMaxLength(500).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.User)
                .WithMany(u => u.Conversations)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Language)
                .WithMany()
                .HasForeignKey(e => e.LanguageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Lesson)
                .WithMany()
                .HasForeignKey(e => e.LessonId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasMany(e => e.Messages)
                .WithOne(m => m.Conversation)
                .HasForeignKey(m => m.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Message configuration
        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ConversationId);
            entity.Property(e => e.Role).IsRequired();
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired().HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
