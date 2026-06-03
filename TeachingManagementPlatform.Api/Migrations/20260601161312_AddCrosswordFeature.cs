using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeachingManagementPlatform.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCrosswordFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // -- Idempotent column additions (handle partial prior application) --

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Users') AND name = 'CoinBalance')
                    ALTER TABLE [Users] ADD [CoinBalance] int NOT NULL DEFAULT 0;
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Users') AND name = 'SubscriptionPackageId')
                    ALTER TABLE [Users] ADD [SubscriptionPackageId] int NULL;
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'SubscriptionPackages') AND name = 'MaxCrosswordFilesPerGeneration')
                    ALTER TABLE [SubscriptionPackages] ADD [MaxCrosswordFilesPerGeneration] int NOT NULL DEFAULT 0;
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'SubscriptionPackages') AND name = 'MaxCrosswordGenerationsPerDay')
                    ALTER TABLE [SubscriptionPackages] ADD [MaxCrosswordGenerationsPerDay] int NOT NULL DEFAULT 0;
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'SubscriptionPackages') AND name = 'MaxCrosswordWordsPerGeneration')
                    ALTER TABLE [SubscriptionPackages] ADD [MaxCrosswordWordsPerGeneration] int NOT NULL DEFAULT 0;
            ");

            // -- Idempotent table creations --

            migrationBuilder.Sql(@"
                IF OBJECT_ID(N'CoinPackages', N'U') IS NULL
                BEGIN
                    CREATE TABLE [CoinPackages] (
                        [Id] int NOT NULL IDENTITY,
                        [Name] nvarchar(max) NOT NULL,
                        [Price] decimal(18,2) NOT NULL,
                        [CoinAmount] int NOT NULL,
                        [Description] nvarchar(max) NULL,
                        [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
                        [CreatedAt] datetime2 NOT NULL,
                        [UpdatedAt] datetime2 NOT NULL,
                        CONSTRAINT [PK_CoinPackages] PRIMARY KEY ([Id])
                    );
                END
            ");

            migrationBuilder.Sql(@"
                IF OBJECT_ID(N'CrosswordGames', N'U') IS NULL
                BEGIN
                    CREATE TABLE [CrosswordGames] (
                        [Id] int NOT NULL IDENTITY,
                        [UserId] int NOT NULL,
                        [Title] nvarchar(max) NOT NULL,
                        [Status] nvarchar(20) NOT NULL,
                        [Slug] nvarchar(450) NOT NULL,
                        [ConfigJson] nvarchar(max) NOT NULL,
                        [GridJson] nvarchar(max) NOT NULL,
                        [EcoinsSpent] int NOT NULL,
                        [SourceDocumentContent] nvarchar(max) NULL,
                        [SourceDocumentExpiresAt] datetime2 NULL,
                        [Deadline] datetime2 NULL,
                        [ShowAnswerAfterExpiry] bit NOT NULL,
                        [MaxAttempts] int NULL,
                        [CreatedAt] datetime2 NOT NULL,
                        [UpdatedAt] datetime2 NOT NULL,
                        [PublishedAt] datetime2 NULL,
                        CONSTRAINT [PK_CrosswordGames] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_CrosswordGames_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
                    );
                END
            ");

            migrationBuilder.Sql(@"
                IF OBJECT_ID(N'CoinPurchaseTransactions', N'U') IS NULL
                BEGIN
                    CREATE TABLE [CoinPurchaseTransactions] (
                        [Id] int NOT NULL IDENTITY,
                        [OrderCode] bigint NOT NULL,
                        [UserId] int NOT NULL,
                        [CoinPackageId] int NOT NULL,
                        [Amount] decimal(18,2) NOT NULL,
                        [CoinAmount] int NOT NULL,
                        [Status] nvarchar(30) NOT NULL,
                        [CheckoutUrl] nvarchar(max) NULL,
                        [PaymentLinkId] nvarchar(max) NULL,
                        [ErrorMessage] nvarchar(max) NULL,
                        [PaidAt] datetime2 NULL,
                        [CreatedAt] datetime2 NOT NULL,
                        [UpdatedAt] datetime2 NOT NULL,
                        CONSTRAINT [PK_CoinPurchaseTransactions] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_CoinPurchaseTransactions_CoinPackages_CoinPackageId] FOREIGN KEY ([CoinPackageId]) REFERENCES [CoinPackages] ([Id]) ON DELETE NO ACTION,
                        CONSTRAINT [FK_CoinPurchaseTransactions_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
                    );
                END
            ");

            migrationBuilder.Sql(@"
                IF OBJECT_ID(N'CrosswordEcoinTransactions', N'U') IS NULL
                BEGIN
                    CREATE TABLE [CrosswordEcoinTransactions] (
                        [Id] int NOT NULL IDENTITY,
                        [UserId] int NOT NULL,
                        [GameId] int NOT NULL,
                        [EcoinsSpent] int NOT NULL,
                        [Action] nvarchar(20) NOT NULL,
                        [CreatedAt] datetime2 NOT NULL,
                        CONSTRAINT [PK_CrosswordEcoinTransactions] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_CrosswordEcoinTransactions_CrosswordGames_GameId] FOREIGN KEY ([GameId]) REFERENCES [CrosswordGames] ([Id]) ON DELETE NO ACTION,
                        CONSTRAINT [FK_CrosswordEcoinTransactions_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
                    );
                END
            ");

            migrationBuilder.Sql(@"
                IF OBJECT_ID(N'CrosswordWords', N'U') IS NULL
                BEGIN
                    CREATE TABLE [CrosswordWords] (
                        [Id] int NOT NULL IDENTITY,
                        [GameId] int NOT NULL,
                        [Word] nvarchar(50) NOT NULL,
                        [DisplayWord] nvarchar(100) NOT NULL,
                        [Clue] nvarchar(500) NOT NULL,
                        [Direction] nvarchar(10) NOT NULL,
                        [StartRow] int NOT NULL,
                        [StartCol] int NOT NULL,
                        [Number] int NOT NULL,
                        [Difficulty] nvarchar(20) NOT NULL,
                        [SourceContext] nvarchar(200) NULL,
                        CONSTRAINT [PK_CrosswordWords] PRIMARY KEY ([Id]),
                        CONSTRAINT [FK_CrosswordWords_CrosswordGames_GameId] FOREIGN KEY ([GameId]) REFERENCES [CrosswordGames] ([Id]) ON DELETE CASCADE
                    );
                END
            ");

            // -- Idempotent index creations --

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_SubscriptionPackageId' AND object_id = OBJECT_ID(N'Users'))
                    CREATE INDEX [IX_Users_SubscriptionPackageId] ON [Users] ([SubscriptionPackageId]);
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CoinPurchaseTransactions_CoinPackageId' AND object_id = OBJECT_ID(N'CoinPurchaseTransactions'))
                    CREATE INDEX [IX_CoinPurchaseTransactions_CoinPackageId] ON [CoinPurchaseTransactions] ([CoinPackageId]);
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CoinPurchaseTransactions_OrderCode' AND object_id = OBJECT_ID(N'CoinPurchaseTransactions'))
                    CREATE UNIQUE INDEX [IX_CoinPurchaseTransactions_OrderCode] ON [CoinPurchaseTransactions] ([OrderCode]);
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CoinPurchaseTransactions_UserId' AND object_id = OBJECT_ID(N'CoinPurchaseTransactions'))
                    CREATE INDEX [IX_CoinPurchaseTransactions_UserId] ON [CoinPurchaseTransactions] ([UserId]);
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CrosswordEcoinTransactions_GameId' AND object_id = OBJECT_ID(N'CrosswordEcoinTransactions'))
                    CREATE INDEX [IX_CrosswordEcoinTransactions_GameId] ON [CrosswordEcoinTransactions] ([GameId]);
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CrosswordEcoinTransactions_UserId' AND object_id = OBJECT_ID(N'CrosswordEcoinTransactions'))
                    CREATE INDEX [IX_CrosswordEcoinTransactions_UserId] ON [CrosswordEcoinTransactions] ([UserId]);
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CrosswordGames_Slug' AND object_id = OBJECT_ID(N'CrosswordGames'))
                    CREATE UNIQUE INDEX [IX_CrosswordGames_Slug] ON [CrosswordGames] ([Slug]);
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CrosswordGames_UserId' AND object_id = OBJECT_ID(N'CrosswordGames'))
                    CREATE INDEX [IX_CrosswordGames_UserId] ON [CrosswordGames] ([UserId]);
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_CrosswordWords_GameId' AND object_id = OBJECT_ID(N'CrosswordWords'))
                    CREATE INDEX [IX_CrosswordWords_GameId] ON [CrosswordWords] ([GameId]);
            ");

            // -- Idempotent FK addition --

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Users_SubscriptionPackages_SubscriptionPackageId')
                    ALTER TABLE [Users] ADD CONSTRAINT [FK_Users_SubscriptionPackages_SubscriptionPackageId]
                        FOREIGN KEY ([SubscriptionPackageId]) REFERENCES [SubscriptionPackages] ([Id]) ON DELETE SET NULL;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_SubscriptionPackages_SubscriptionPackageId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "CoinPurchaseTransactions");

            migrationBuilder.DropTable(
                name: "CrosswordEcoinTransactions");

            migrationBuilder.DropTable(
                name: "CrosswordWords");

            migrationBuilder.DropTable(
                name: "CoinPackages");

            migrationBuilder.DropTable(
                name: "CrosswordGames");

            migrationBuilder.DropIndex(
                name: "IX_Users_SubscriptionPackageId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CoinBalance",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SubscriptionPackageId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "MaxCrosswordFilesPerGeneration",
                table: "SubscriptionPackages");

            migrationBuilder.DropColumn(
                name: "MaxCrosswordGenerationsPerDay",
                table: "SubscriptionPackages");

            migrationBuilder.DropColumn(
                name: "MaxCrosswordWordsPerGeneration",
                table: "SubscriptionPackages");
        }
    }
}
