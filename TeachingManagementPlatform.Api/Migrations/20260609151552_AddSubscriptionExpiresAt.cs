using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeachingManagementPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSubscriptionExpiresAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SubscriptionExpiresAt",
                table: "Users",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SubscriptionExpiresAt",
                table: "Users");
        }
    }
}
