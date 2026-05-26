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
    }
}
