using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeachingManagementPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class RemoveOccupationsAndTuitionFees : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ProfileOccupations");
            migrationBuilder.DropTable(name: "ProfileTuitionFees");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
