using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeachingManagementPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class SyncPendingChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop tables that were removed from the model
            migrationBuilder.Sql(@"
                IF OBJECT_ID('ProfileOccupations', 'U') IS NOT NULL DROP TABLE [ProfileOccupations];
                IF OBJECT_ID('ProfileTuitionFees', 'U') IS NOT NULL DROP TABLE [ProfileTuitionFees];
            ");

            // Add columns only if they don't already exist
            migrationBuilder.Sql(@"
                IF COL_LENGTH('LessonSuggestionCaches', 'SuggestedLinks') IS NULL
                    ALTER TABLE [LessonSuggestionCaches] ADD [SuggestedLinks] nvarchar(max) NULL;
            ");

            migrationBuilder.Sql(@"
                IF COL_LENGTH('Lessons', 'SuggestedPeriods') IS NULL
                    ALTER TABLE [Lessons] ADD [SuggestedPeriods] int NOT NULL DEFAULT 0;
            ");

            migrationBuilder.Sql(@"
                IF COL_LENGTH('LessonPlans', 'IsShared') IS NULL
                    ALTER TABLE [LessonPlans] ADD [IsShared] bit NOT NULL DEFAULT 0;
            ");

            migrationBuilder.Sql(@"
                IF COL_LENGTH('LessonPlans', 'ShareCode') IS NULL
                    ALTER TABLE [LessonPlans] ADD [ShareCode] nvarchar(max) NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SuggestedLinks",
                table: "LessonSuggestionCaches");

            migrationBuilder.DropColumn(
                name: "SuggestedPeriods",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "IsShared",
                table: "LessonPlans");

            migrationBuilder.DropColumn(
                name: "ShareCode",
                table: "LessonPlans");

            migrationBuilder.CreateTable(
                name: "ProfileOccupations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProfileId = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileOccupations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileOccupations_LecturerProfiles_ProfileId",
                        column: x => x.ProfileId,
                        principalTable: "LecturerProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProfileTuitionFees",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProfileId = table.Column<int>(type: "int", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileTuitionFees", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfileTuitionFees_LecturerProfiles_ProfileId",
                        column: x => x.ProfileId,
                        principalTable: "LecturerProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProfileOccupations_ProfileId",
                table: "ProfileOccupations",
                column: "ProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_ProfileTuitionFees_ProfileId",
                table: "ProfileTuitionFees",
                column: "ProfileId");
        }
    }
}
