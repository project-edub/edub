using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeachingManagementPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTeachingSchedule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SchoolYearCalendars",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    YearStart = table.Column<DateOnly>(type: "date", nullable: false),
                    YearEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedBy = table.Column<int>(type: "int", nullable: true),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolYearCalendars", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolYearCalendars_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ClassSubjectSchedules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ClassId = table.Column<int>(type: "int", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CalendarId = table.Column<int>(type: "int", nullable: false),
                    PeriodsPerWeek = table.Column<int>(type: "int", nullable: false),
                    WeekdaySlots = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClassSubjectSchedules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClassSubjectSchedules_Classes_ClassId",
                        column: x => x.ClassId,
                        principalTable: "Classes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ClassSubjectSchedules_SchoolYearCalendars_CalendarId",
                        column: x => x.CalendarId,
                        principalTable: "SchoolYearCalendars",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "SchoolYearHolidays",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CalendarId = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SchoolYearHolidays", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SchoolYearHolidays_SchoolYearCalendars_CalendarId",
                        column: x => x.CalendarId,
                        principalTable: "SchoolYearCalendars",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClassSubjectSchedules_CalendarId",
                table: "ClassSubjectSchedules",
                column: "CalendarId");

            migrationBuilder.CreateIndex(
                name: "IX_ClassSubjectSchedules_ClassId_Subject",
                table: "ClassSubjectSchedules",
                columns: new[] { "ClassId", "Subject" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SchoolYearCalendars_CreatedBy",
                table: "SchoolYearCalendars",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_SchoolYearHolidays_CalendarId",
                table: "SchoolYearHolidays",
                column: "CalendarId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClassSubjectSchedules");

            migrationBuilder.DropTable(
                name: "SchoolYearHolidays");

            migrationBuilder.DropTable(
                name: "SchoolYearCalendars");
        }
    }
}
