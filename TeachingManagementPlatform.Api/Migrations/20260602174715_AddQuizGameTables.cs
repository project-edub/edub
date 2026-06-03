using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeachingManagementPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizGameTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "QuizGames",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    ConfigJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EcoinsSpent = table.Column<int>(type: "int", nullable: false),
                    SourceDocumentContent = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SourceDocumentExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ShowAnswersAfterSubmit = table.Column<bool>(type: "bit", nullable: false),
                    RequireStudentName = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizGames", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizGames_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuizGameQuestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuizGameId = table.Column<int>(type: "int", nullable: false),
                    Number = table.Column<int>(type: "int", nullable: false),
                    QuestionType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    QuestionText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OptionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CorrectAnswerIndex = table.Column<int>(type: "int", nullable: false),
                    CorrectAnswerText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Explanation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Difficulty = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizGameQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizGameQuestions_QuizGames_QuizGameId",
                        column: x => x.QuizGameId,
                        principalTable: "QuizGames",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "QuizSubmissions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuizGameId = table.Column<int>(type: "int", nullable: false),
                    StudentName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AnswersJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TotalQuestions = table.Column<int>(type: "int", nullable: false),
                    CorrectCount = table.Column<int>(type: "int", nullable: false),
                    ScorePercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_QuizSubmissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_QuizSubmissions_QuizGames_QuizGameId",
                        column: x => x.QuizGameId,
                        principalTable: "QuizGames",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_QuizGameQuestions_QuizGameId",
                table: "QuizGameQuestions",
                column: "QuizGameId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizGames_Slug",
                table: "QuizGames",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_QuizGames_UserId",
                table: "QuizGames",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_QuizSubmissions_QuizGameId",
                table: "QuizSubmissions",
                column: "QuizGameId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "QuizGameQuestions");

            migrationBuilder.DropTable(
                name: "QuizSubmissions");

            migrationBuilder.DropTable(
                name: "QuizGames");
        }
    }
}
