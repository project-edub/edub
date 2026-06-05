using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<LecturerProfile> LecturerProfiles => Set<LecturerProfile>();
    public DbSet<ProfileOccupation> ProfileOccupations => Set<ProfileOccupation>();
    public DbSet<ProfileTeachingLocation> ProfileTeachingLocations => Set<ProfileTeachingLocation>();
    public DbSet<ProfileExpertise> ProfileExpertises => Set<ProfileExpertise>();
    public DbSet<ProfileExperience> ProfileExperiences => Set<ProfileExperience>();
    public DbSet<ProfileTeachingSkill> ProfileTeachingSkills => Set<ProfileTeachingSkill>();
    public DbSet<ProfileTuitionFee> ProfileTuitionFees => Set<ProfileTuitionFee>();
    public DbSet<ProfileNote> ProfileNotes => Set<ProfileNote>();
    public DbSet<SubscriptionPackage> SubscriptionPackages => Set<SubscriptionPackage>();
    public DbSet<CoinPackage> CoinPackages => Set<CoinPackage>();
    public DbSet<CoinPurchaseTransaction> CoinPurchaseTransactions => Set<CoinPurchaseTransaction>();
    public DbSet<Class> Classes => Set<Class>();
    public DbSet<StudentList> StudentLists => Set<StudentList>();
    public DbSet<StudentListColumn> StudentListColumns => Set<StudentListColumn>();
    public DbSet<StudentEntry> StudentEntries => Set<StudentEntry>();
    public DbSet<LessonPlan> LessonPlans => Set<LessonPlan>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<LessonDocument> LessonDocuments => Set<LessonDocument>();
    public DbSet<LessonAttachment> LessonAttachments => Set<LessonAttachment>();
    public DbSet<MiniGame> MiniGames => Set<MiniGame>();
    public DbSet<StorageItem> StorageItems => Set<StorageItem>();
    public DbSet<ClassLessonSchedule> ClassLessonSchedules => Set<ClassLessonSchedule>();
    public DbSet<CrosswordGame> CrosswordGames => Set<CrosswordGame>();
    public DbSet<CrosswordWord> CrosswordWords => Set<CrosswordWord>();
    public DbSet<CrosswordEcoinTransaction> CrosswordEcoinTransactions => Set<CrosswordEcoinTransaction>();
    public DbSet<QuizGame> QuizGames => Set<QuizGame>();
    public DbSet<QuizGameQuestion> QuizGameQuestions => Set<QuizGameQuestion>();
    public DbSet<QuizSubmission> QuizSubmissions => Set<QuizSubmission>();
    public DbSet<ScoreColumnMetadata> ScoreColumnMetadatas => Set<ScoreColumnMetadata>();
    public DbSet<ClassificationRange> ClassificationRanges => Set<ClassificationRange>();
    public DbSet<ScoreEditHistory> ScoreEditHistories => Set<ScoreEditHistory>();
    public DbSet<ScoreTemplate> ScoreTemplates => Set<ScoreTemplate>();
    public DbSet<ScoreTemplateColumn> ScoreTemplateColumns => Set<ScoreTemplateColumn>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User ──
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.HasIndex(u => u.GoogleId).IsUnique().HasFilter("[GoogleId] IS NOT NULL");
            entity.Property(u => u.Role).HasMaxLength(20);
            entity.Property(u => u.Status).HasMaxLength(20);
        });

        // ── LecturerProfile ──
        modelBuilder.Entity<LecturerProfile>(entity =>
        {
            entity.HasOne(lp => lp.User)
                .WithOne(u => u.LecturerProfile)
                .HasForeignKey<LecturerProfile>(lp => lp.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(lp => lp.UserId).IsUnique();
        });

        // ── Profile child entities (cascade from LecturerProfile) ──
        modelBuilder.Entity<ProfileOccupation>(entity =>
        {
            entity.HasOne(po => po.Profile)
                .WithMany(lp => lp.Occupations)
                .HasForeignKey(po => po.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfileTeachingLocation>(entity =>
        {
            entity.HasOne(pt => pt.Profile)
                .WithMany(lp => lp.TeachingLocations)
                .HasForeignKey(pt => pt.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfileExpertise>(entity =>
        {
            entity.HasOne(pe => pe.Profile)
                .WithMany(lp => lp.Expertises)
                .HasForeignKey(pe => pe.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfileExperience>(entity =>
        {
            entity.HasOne(pe => pe.Profile)
                .WithMany(lp => lp.Experiences)
                .HasForeignKey(pe => pe.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfileTeachingSkill>(entity =>
        {
            entity.HasOne(ps => ps.Profile)
                .WithMany(lp => lp.TeachingSkills)
                .HasForeignKey(ps => ps.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfileTuitionFee>(entity =>
        {
            entity.HasOne(pf => pf.Profile)
                .WithMany(lp => lp.TuitionFees)
                .HasForeignKey(pf => pf.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProfileNote>(entity =>
        {
            entity.HasOne(pn => pn.Profile)
                .WithMany(lp => lp.Notes)
                .HasForeignKey(pn => pn.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── SubscriptionPackage (JSON column) ──
        modelBuilder.Entity<SubscriptionPackage>(entity =>
        {
            entity.Property(sp => sp.Price).HasColumnType("decimal(18,2)");
            entity.Property(sp => sp.IsDefault).HasDefaultValue(false);
            entity.Property(sp => sp.UnlockedFeatures)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
                .HasColumnType("nvarchar(max)");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasOne(u => u.SubscriptionPackage)
                .WithMany()
                .HasForeignKey(u => u.SubscriptionPackageId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ── CoinPackage ──
        modelBuilder.Entity<CoinPackage>(entity =>
        {
            entity.Property(cp => cp.Price).HasColumnType("decimal(18,2)");
            entity.Property(cp => cp.Description).HasColumnType("nvarchar(max)");
            entity.Property(cp => cp.IsActive).HasDefaultValue(true);
        });

        // ── CoinPurchaseTransaction ──
        modelBuilder.Entity<CoinPurchaseTransaction>(entity =>
        {
            entity.ToTable("CoinPurchaseTransactions");
            entity.HasIndex(item => item.OrderCode).IsUnique();
            entity.Property(item => item.Amount).HasColumnType("decimal(18,2)");
            entity.Property(item => item.Status).HasMaxLength(30);
            entity.Property(item => item.CheckoutUrl).HasColumnType("nvarchar(max)");
            entity.Property(item => item.ErrorMessage).HasColumnType("nvarchar(max)");

            entity.HasOne(item => item.User)
                .WithMany()
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(item => item.CoinPackage)
                .WithMany()
                .HasForeignKey(item => item.CoinPackageId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Class ──
        modelBuilder.Entity<Class>(entity =>
        {
            entity.HasOne(c => c.Lecturer)
                .WithMany(u => u.Classes)
                .HasForeignKey(c => c.LecturerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(c => c.AssignedLessonPlan)
                .WithMany(lp => lp.AssignedClasses)
                .HasForeignKey(c => c.AssignedLessonPlanId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // ── StudentList ──
        modelBuilder.Entity<StudentList>(entity =>
        {
            entity.HasOne(sl => sl.Class)
                .WithMany(c => c.StudentLists)
                .HasForeignKey(sl => sl.ClassId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── StudentListColumn ──
        modelBuilder.Entity<StudentListColumn>(entity =>
        {
            entity.HasOne(sc => sc.StudentList)
                .WithMany(sl => sl.Columns)
                .HasForeignKey(sc => sc.StudentListId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── StudentEntry (JSON column) ──
        modelBuilder.Entity<StudentEntry>(entity =>
        {
            entity.HasOne(se => se.StudentList)
                .WithMany(sl => sl.Entries)
                .HasForeignKey(se => se.StudentListId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.Property(se => se.Data)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, (JsonSerializerOptions?)null) ?? new Dictionary<string, string>())
                .HasColumnType("nvarchar(max)");
        });

        // ── LessonPlan ──
        modelBuilder.Entity<LessonPlan>(entity =>
        {
            entity.HasOne(lp => lp.Lecturer)
                .WithMany(u => u.LessonPlans)
                .HasForeignKey(lp => lp.LecturerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Lesson ──
        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.HasOne(l => l.LessonPlan)
                .WithMany(lp => lp.Lessons)
                .HasForeignKey(l => l.LessonPlanId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── LessonDocument ──
        modelBuilder.Entity<LessonDocument>(entity =>
        {
            entity.HasOne(ld => ld.Lesson)
                .WithMany(l => l.Documents)
                .HasForeignKey(ld => ld.LessonId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── LessonAttachment ──
        modelBuilder.Entity<LessonAttachment>(entity =>
        {
            entity.HasOne(la => la.Lesson)
                .WithMany(l => l.Attachments)
                .HasForeignKey(la => la.LessonId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── MiniGame (JSON column) ──
        modelBuilder.Entity<MiniGame>(entity =>
        {
            entity.HasOne(mg => mg.Lesson)
                .WithMany(l => l.MiniGames)
                .HasForeignKey(mg => mg.LessonId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.Property(mg => mg.Content)
                .HasConversion(
                    v => v == null ? null : v.RootElement.GetRawText(),
                    v => v == null ? null : JsonDocument.Parse(v, default))
                .HasColumnType("nvarchar(max)");
        });

        // ── StorageItem (self-referencing) ──
        modelBuilder.Entity<StorageItem>(entity =>
        {
            entity.HasOne(si => si.Lecturer)
                .WithMany(u => u.StorageItems)
                .HasForeignKey(si => si.LecturerId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(si => si.ParentFolder)
                .WithMany(si => si.Children)
                .HasForeignKey(si => si.ParentFolderId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.Property(si => si.ItemType).HasMaxLength(20);
        });

        // ── ClassLessonSchedule ──
        modelBuilder.Entity<ClassLessonSchedule>(entity =>
        {
            entity.Property(cls => cls.LessonStatus)
                .HasMaxLength(20)
                .HasDefaultValue(ClassLessonSchedule.PendingStatus);

            entity.HasOne(cls => cls.Class)
                .WithMany(c => c.LessonSchedules)
                .HasForeignKey(cls => cls.ClassId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(cls => cls.Lesson)
                .WithMany(l => l.ClassSchedules)
                .HasForeignKey(cls => cls.LessonId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasIndex(cls => new { cls.ClassId, cls.LessonId }).IsUnique();
        });

        // ── CrosswordGame ──
        modelBuilder.Entity<CrosswordGame>(entity =>
        {
            entity.HasIndex(cg => cg.Slug).IsUnique();
            entity.Property(cg => cg.Status).HasMaxLength(20);
            entity.Property(cg => cg.ConfigJson).HasColumnType("nvarchar(max)");
            entity.Property(cg => cg.GridJson).HasColumnType("nvarchar(max)");

            entity.HasOne(cg => cg.User)
                .WithMany()
                .HasForeignKey(cg => cg.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── CrosswordWord ──
        modelBuilder.Entity<CrosswordWord>(entity =>
        {
            entity.Property(cw => cw.Word).HasMaxLength(50);
            entity.Property(cw => cw.DisplayWord).HasMaxLength(100);
            entity.Property(cw => cw.Clue).HasMaxLength(500);
            entity.Property(cw => cw.Direction).HasMaxLength(10);
            entity.Property(cw => cw.Difficulty).HasMaxLength(20);
            entity.Property(cw => cw.SourceContext).HasMaxLength(200);

            entity.HasOne(cw => cw.Game)
                .WithMany(cg => cg.Words)
                .HasForeignKey(cw => cw.GameId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── CrosswordEcoinTransaction ──
        modelBuilder.Entity<CrosswordEcoinTransaction>(entity =>
        {
            entity.Property(ct => ct.Action).HasMaxLength(20);

            entity.HasOne(ct => ct.User)
                .WithMany()
                .HasForeignKey(ct => ct.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(ct => ct.Game)
                .WithMany()
                .HasForeignKey(ct => ct.GameId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ── QuizGame ──
        modelBuilder.Entity<QuizGame>(entity =>
        {
            entity.ToTable("QuizGames");
            entity.HasIndex(q => q.Slug).IsUnique();
            entity.Property(q => q.Status).HasMaxLength(20);
            entity.Property(q => q.Slug).HasMaxLength(450);

            entity.HasOne(q => q.User)
                .WithMany()
                .HasForeignKey(q => q.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(q => q.Questions)
                .WithOne(qq => qq.QuizGame)
                .HasForeignKey(qq => qq.QuizGameId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasMany(q => q.Submissions)
                .WithOne(s => s.QuizGame)
                .HasForeignKey(s => s.QuizGameId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── QuizGameQuestion ──
        modelBuilder.Entity<QuizGameQuestion>(entity =>
        {
            entity.ToTable("QuizGameQuestions");
            entity.Property(q => q.QuestionType).HasMaxLength(30);
            entity.Property(q => q.Difficulty).HasMaxLength(20);
        });

        // ── QuizSubmission ──
        modelBuilder.Entity<QuizSubmission>(entity =>
        {
            entity.ToTable("QuizSubmissions");
            entity.Property(s => s.ScorePercent).HasColumnType("decimal(5,2)");
        });

        // ── ScoreColumnMetadata (one-to-one with StudentListColumn, JSON column) ──
        modelBuilder.Entity<ScoreColumnMetadata>(entity =>
        {
            entity.HasOne(scm => scm.Column)
                .WithOne()
                .HasForeignKey<ScoreColumnMetadata>(scm => scm.StudentListColumnId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(scm => scm.StudentListColumnId).IsUnique();

            entity.Property(scm => scm.SourceColumnIds)
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<int>>(v, (JsonSerializerOptions?)null) ?? new List<int>())
                .HasColumnType("nvarchar(max)");
        });

        // ── ClassificationRange (many-to-one with StudentListColumn) ──
        modelBuilder.Entity<ClassificationRange>(entity =>
        {
            entity.HasOne(cr => cr.StudentListColumn)
                .WithMany()
                .HasForeignKey(cr => cr.StudentListColumnId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.Property(cr => cr.MinScore).HasColumnType("decimal(5,2)");
            entity.Property(cr => cr.MaxScore).HasColumnType("decimal(5,2)");
        });

        // ── ScoreEditHistory (many-to-one with StudentEntry) ──
        modelBuilder.Entity<ScoreEditHistory>(entity =>
        {
            entity.HasOne(seh => seh.StudentEntry)
                .WithMany()
                .HasForeignKey(seh => seh.StudentEntryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ScoreTemplate / ScoreTemplateColumn (one-to-many) ──
        modelBuilder.Entity<ScoreTemplate>(entity =>
        {
            entity.HasMany(st => st.Columns)
                .WithOne(stc => stc.ScoreTemplate)
                .HasForeignKey(stc => stc.ScoreTemplateId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
