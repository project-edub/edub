using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeachingManagementPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddScoreListModels : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClassificationRanges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentListColumnId = table.Column<int>(type: "int", nullable: false),
                    MinScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    MaxScore = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Color = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassificationRanges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassificationRanges_StudentListColumns_StudentListColumnId",
                        column: x => x.StudentListColumnId,
                        principalTable: "StudentListColumns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScoreColumnMetadatas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentListColumnId = table.Column<int>(type: "int", nullable: false),
                    Coefficient = table.Column<int>(type: "int", nullable: true),
                    IsAverageColumn = table.Column<bool>(type: "bit", nullable: false),
                    SourceColumnIds = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScoreColumnMetadatas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScoreColumnMetadatas_StudentListColumns_StudentListColumnId",
                        column: x => x.StudentListColumnId,
                        principalTable: "StudentListColumns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScoreEditHistories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentEntryId = table.Column<int>(type: "int", nullable: false),
                    ColumnName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OldValue = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewValue = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EditedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EditedByUserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScoreEditHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScoreEditHistories_StudentEntries_StudentEntryId",
                        column: x => x.StudentEntryId,
                        principalTable: "StudentEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ScoreTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScoreTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ScoreTemplateColumns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ScoreTemplateId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Coefficient = table.Column<int>(type: "int", nullable: true),
                    IsAverageColumn = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScoreTemplateColumns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScoreTemplateColumns_ScoreTemplates_ScoreTemplateId",
                        column: x => x.ScoreTemplateId,
                        principalTable: "ScoreTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClassificationRanges_StudentListColumnId",
                table: "ClassificationRanges",
                column: "StudentListColumnId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoreColumnMetadatas_StudentListColumnId",
                table: "ScoreColumnMetadatas",
                column: "StudentListColumnId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScoreEditHistories_StudentEntryId",
                table: "ScoreEditHistories",
                column: "StudentEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_ScoreTemplateColumns_ScoreTemplateId",
                table: "ScoreTemplateColumns",
                column: "ScoreTemplateId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClassificationRanges");

            migrationBuilder.DropTable(
                name: "ScoreColumnMetadatas");

            migrationBuilder.DropTable(
                name: "ScoreEditHistories");

            migrationBuilder.DropTable(
                name: "ScoreTemplateColumns");

            migrationBuilder.DropTable(
                name: "ScoreTemplates");
        }
    }
}
