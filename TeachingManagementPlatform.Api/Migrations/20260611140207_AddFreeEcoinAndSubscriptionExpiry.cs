using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeachingManagementPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFreeEcoinAndSubscriptionExpiry : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Users') AND name = 'FreeEcoinBalance')
                    ALTER TABLE [Users] ADD [FreeEcoinBalance] int NOT NULL DEFAULT 0;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Users') AND name = 'SubscriptionExpiresAt')
                    ALTER TABLE [Users] ADD [SubscriptionExpiresAt] datetime2 NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'SubscriptionPackages') AND name = 'UpgradeDiscounts')
                    ALTER TABLE [SubscriptionPackages] ADD [UpgradeDiscounts] nvarchar(max) NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FreeEcoinBalance",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SubscriptionExpiresAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UpgradeDiscounts",
                table: "SubscriptionPackages");
        }
    }
}
