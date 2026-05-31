using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeachingManagementPlatform.Api.Migrations
{
    public partial class AddSubscriptionPackageSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxFilesPerQuizGeneration",
                table: "SubscriptionPackages",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "MaxQuestionsPerQuiz",
                table: "SubscriptionPackages",
                type: "int",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddColumn<bool>(
                name: "IsDefault",
                table: "SubscriptionPackages",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxFilesPerQuizGeneration",
                table: "SubscriptionPackages");

            migrationBuilder.DropColumn(
                name: "MaxQuestionsPerQuiz",
                table: "SubscriptionPackages");

            migrationBuilder.DropColumn(
                name: "IsDefault",
                table: "SubscriptionPackages");
        }
    }
}