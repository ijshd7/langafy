using System;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LangafyApi.Migrations;

/// <inheritdoc />
public partial class InitialCreate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "CefrLevels",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                Name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                SortOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_CefrLevels", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Languages",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                Code = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                NativeName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Languages", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                FirebaseUid = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                Email = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                DisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                LastActiveAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Users", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "Units",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                LanguageId = table.Column<int>(type: "integer", nullable: false),
                CefrLevelId = table.Column<int>(type: "integer", nullable: false),
                Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                SortOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Units", x => x.Id);
                table.ForeignKey(
                    name: "FK_Units_CefrLevels_CefrLevelId",
                    column: x => x.CefrLevelId,
                    principalTable: "CefrLevels",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_Units_Languages_LanguageId",
                    column: x => x.LanguageId,
                    principalTable: "Languages",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Vocabulary",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                LanguageId = table.Column<int>(type: "integer", nullable: false),
                CefrLevelId = table.Column<int>(type: "integer", nullable: false),
                WordTarget = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                WordEn = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                PartOfSpeech = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                ExampleSentenceTarget = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                ExampleSentenceEn = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Vocabulary", x => x.Id);
                table.ForeignKey(
                    name: "FK_Vocabulary_CefrLevels_CefrLevelId",
                    column: x => x.CefrLevelId,
                    principalTable: "CefrLevels",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_Vocabulary_Languages_LanguageId",
                    column: x => x.LanguageId,
                    principalTable: "Languages",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "UserLanguages",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                UserId = table.Column<int>(type: "integer", nullable: false),
                LanguageId = table.Column<int>(type: "integer", nullable: false),
                CurrentCefrLevel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                IsPrimary = table.Column<bool>(type: "boolean", nullable: false),
                StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserLanguages", x => x.Id);
                table.ForeignKey(
                    name: "FK_UserLanguages_Languages_LanguageId",
                    column: x => x.LanguageId,
                    principalTable: "Languages",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_UserLanguages_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Lessons",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                UnitId = table.Column<int>(type: "integer", nullable: false),
                Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                Objective = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                SortOrder = table.Column<int>(type: "integer", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Lessons", x => x.Id);
                table.ForeignKey(
                    name: "FK_Lessons_Units_UnitId",
                    column: x => x.UnitId,
                    principalTable: "Units",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "UserVocabulary",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                UserId = table.Column<int>(type: "integer", nullable: false),
                VocabularyId = table.Column<int>(type: "integer", nullable: false),
                EaseFactor = table.Column<double>(type: "double precision", nullable: false, defaultValue: 2.5),
                IntervalDays = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                Repetitions = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                NextReviewAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserVocabulary", x => x.Id);
                table.ForeignKey(
                    name: "FK_UserVocabulary_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_UserVocabulary_Vocabulary_VocabularyId",
                    column: x => x.VocabularyId,
                    principalTable: "Vocabulary",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Conversations",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                UserId = table.Column<int>(type: "integer", nullable: false),
                LanguageId = table.Column<int>(type: "integer", nullable: false),
                LessonId = table.Column<int>(type: "integer", nullable: true),
                CefrLevel = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                Topic = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Conversations", x => x.Id);
                table.ForeignKey(
                    name: "FK_Conversations_Languages_LanguageId",
                    column: x => x.LanguageId,
                    principalTable: "Languages",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_Conversations_Lessons_LessonId",
                    column: x => x.LessonId,
                    principalTable: "Lessons",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.SetNull);
                table.ForeignKey(
                    name: "FK_Conversations_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Exercises",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                LessonId = table.Column<int>(type: "integer", nullable: false),
                Type = table.Column<int>(type: "integer", nullable: false),
                Config = table.Column<JsonDocument>(type: "jsonb", nullable: false),
                SortOrder = table.Column<int>(type: "integer", nullable: false),
                Points = table.Column<int>(type: "integer", nullable: false, defaultValue: 10)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Exercises", x => x.Id);
                table.ForeignKey(
                    name: "FK_Exercises_Lessons_LessonId",
                    column: x => x.LessonId,
                    principalTable: "Lessons",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "Messages",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                ConversationId = table.Column<int>(type: "integer", nullable: false),
                Role = table.Column<int>(type: "integer", nullable: false),
                Content = table.Column<string>(type: "text", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Messages", x => x.Id);
                table.ForeignKey(
                    name: "FK_Messages_Conversations_ConversationId",
                    column: x => x.ConversationId,
                    principalTable: "Conversations",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateTable(
            name: "UserProgress",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                UserId = table.Column<int>(type: "integer", nullable: false),
                ExerciseId = table.Column<int>(type: "integer", nullable: false),
                Completed = table.Column<bool>(type: "boolean", nullable: false),
                Score = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                Attempts = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_UserProgress", x => x.Id);
                table.ForeignKey(
                    name: "FK_UserProgress_Exercises_ExerciseId",
                    column: x => x.ExerciseId,
                    principalTable: "Exercises",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
                table.ForeignKey(
                    name: "FK_UserProgress_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_CefrLevels_Code",
            table: "CefrLevels",
            column: "Code",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Conversations_LanguageId",
            table: "Conversations",
            column: "LanguageId");

        migrationBuilder.CreateIndex(
            name: "IX_Conversations_LessonId",
            table: "Conversations",
            column: "LessonId");

        migrationBuilder.CreateIndex(
            name: "IX_Conversations_UserId",
            table: "Conversations",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_Conversations_UserId_LanguageId",
            table: "Conversations",
            columns: new[] { "UserId", "LanguageId" });

        migrationBuilder.CreateIndex(
            name: "IX_Exercises_LessonId",
            table: "Exercises",
            column: "LessonId");

        migrationBuilder.CreateIndex(
            name: "IX_Languages_Code",
            table: "Languages",
            column: "Code",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Lessons_UnitId",
            table: "Lessons",
            column: "UnitId");

        migrationBuilder.CreateIndex(
            name: "IX_Messages_ConversationId",
            table: "Messages",
            column: "ConversationId");

        migrationBuilder.CreateIndex(
            name: "IX_Units_CefrLevelId",
            table: "Units",
            column: "CefrLevelId");

        migrationBuilder.CreateIndex(
            name: "IX_Units_LanguageId_CefrLevelId",
            table: "Units",
            columns: new[] { "LanguageId", "CefrLevelId" });

        migrationBuilder.CreateIndex(
            name: "IX_UserLanguages_LanguageId",
            table: "UserLanguages",
            column: "LanguageId");

        migrationBuilder.CreateIndex(
            name: "IX_UserLanguages_UserId_LanguageId",
            table: "UserLanguages",
            columns: new[] { "UserId", "LanguageId" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_UserProgress_ExerciseId",
            table: "UserProgress",
            column: "ExerciseId");

        migrationBuilder.CreateIndex(
            name: "IX_UserProgress_UserId_ExerciseId",
            table: "UserProgress",
            columns: new[] { "UserId", "ExerciseId" });

        migrationBuilder.CreateIndex(
            name: "IX_Users_FirebaseUid",
            table: "Users",
            column: "FirebaseUid",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_UserVocabulary_UserId_VocabularyId",
            table: "UserVocabulary",
            columns: new[] { "UserId", "VocabularyId" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_UserVocabulary_VocabularyId",
            table: "UserVocabulary",
            column: "VocabularyId");

        migrationBuilder.CreateIndex(
            name: "IX_Vocabulary_CefrLevelId",
            table: "Vocabulary",
            column: "CefrLevelId");

        migrationBuilder.CreateIndex(
            name: "IX_Vocabulary_LanguageId_CefrLevelId",
            table: "Vocabulary",
            columns: new[] { "LanguageId", "CefrLevelId" });
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "Messages");

        migrationBuilder.DropTable(
            name: "UserLanguages");

        migrationBuilder.DropTable(
            name: "UserProgress");

        migrationBuilder.DropTable(
            name: "UserVocabulary");

        migrationBuilder.DropTable(
            name: "Conversations");

        migrationBuilder.DropTable(
            name: "Exercises");

        migrationBuilder.DropTable(
            name: "Vocabulary");

        migrationBuilder.DropTable(
            name: "Users");

        migrationBuilder.DropTable(
            name: "Lessons");

        migrationBuilder.DropTable(
            name: "Units");

        migrationBuilder.DropTable(
            name: "CefrLevels");

        migrationBuilder.DropTable(
            name: "Languages");
    }
}
