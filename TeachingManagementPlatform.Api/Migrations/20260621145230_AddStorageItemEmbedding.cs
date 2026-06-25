using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeachingManagementPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddStorageItemEmbedding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LessonSuggestionCaches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LessonId = table.Column<int>(type: "int", nullable: false),
                    LessonNameHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SuggestedAttachments = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SuggestedKeywords = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SuggestedQuizTopic = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SuggestedCrosswordTopic = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LessonSuggestionCaches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LessonSuggestionCaches_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "Lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StorageItemEmbeddings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StorageItemId = table.Column<int>(type: "int", nullable: false),
                    Embedding = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ComputedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StorageItemEmbeddings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StorageItemEmbeddings_StorageItems_StorageItemId",
                        column: x => x.StorageItemId,
                        principalTable: "StorageItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LessonSuggestionCaches_LessonId_LessonNameHash",
                table: "LessonSuggestionCaches",
                columns: new[] { "LessonId", "LessonNameHash" });

            migrationBuilder.CreateIndex(
                name: "IX_StorageItemEmbeddings_StorageItemId",
                table: "StorageItemEmbeddings",
                column: "StorageItemId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LessonSuggestionCaches");

            migrationBuilder.DropTable(
                name: "StorageItemEmbeddings");
        }
    }
}
