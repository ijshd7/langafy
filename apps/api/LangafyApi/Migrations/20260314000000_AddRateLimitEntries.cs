using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace LangafyApi.Migrations;

/// <inheritdoc />
public partial class AddRateLimitEntries : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "RateLimitEntries",
            columns: table => new
            {
                Id = table.Column<int>(type: "integer", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                UserId = table.Column<int>(type: "integer", nullable: false),
                EndpointKey = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                WindowStart = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                Count = table.Column<int>(type: "integer", nullable: false, defaultValue: 0)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_RateLimitEntries", x => x.Id);
                table.ForeignKey(
                    name: "FK_RateLimitEntries_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_RateLimitEntries_UserId_EndpointKey_WindowStart",
            table: "RateLimitEntries",
            columns: new[] { "UserId", "EndpointKey", "WindowStart" },
            unique: true);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(
            name: "RateLimitEntries");
    }
}
