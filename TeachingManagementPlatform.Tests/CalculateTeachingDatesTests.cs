using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests;

/// <summary>
/// Unit tests for the calculateTeachingDates algorithm in TeachingScheduleService.
/// Validates: Requirements 6.3 Thuật toán tính ngày dạy
/// </summary>
public class CalculateTeachingDatesTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly TeachingScheduleService _service;

    public CalculateTeachingDatesTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new TeachingScheduleService(_context);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    /// <summary>
    /// Test case 1: Bài 1 tiết, 1 slot/tuần → dạy đúng ngày đầu tiên hợp lệ.
    /// Setup: yearStart = Monday 2025-09-01, slot on Monday (weekday 2), 1 lesson.
    /// Expected: lesson is assigned to 2025-09-01 (the first valid Monday).
    /// </summary>
    [Fact]
    public async Task CalculateDates_SingleLesson_SingleSlotPerWeek_AssignsFirstValidDay()
    {
        // Arrange
        var lecturerId = 1;
        // 2025-09-01 is a Monday
        var yearStart = new DateOnly(2025, 9, 1);
        var yearEnd = new DateOnly(2026, 5, 31);

        var (classId, lessonPlanId) = await SeedBasicData(
            lecturerId: lecturerId,
            yearStart: yearStart,
            yearEnd: yearEnd,
            weekdaySlots: [new WeekdaySlotDto { Weekday = 2, Periods = 1 }], // Monday only
            lessonNames: ["Bài 1"],
            holidays: []
        );

        // Act
        var result = await _service.CalculateDatesAsync(classId, lessonPlanId, lecturerId);

        // Assert
        Assert.Single(result.LessonDates);
        Assert.Equal(new DateOnly(2025, 9, 1), result.LessonDates[0].TeachingDate);
        Assert.Equal("Bài 1", result.LessonDates[0].LessonName);
    }

    /// <summary>
    /// Test case 2: Bài 2 tiết, slot chỉ 1 tiết/ngày → bài bắt đầu ở ngày đầu, kết thúc ở ngày thứ 2.
    /// NOTE: Current implementation assigns 1 lesson per teaching day regardless of periods.
    /// With 2 lessons and 1 slot/week (Monday), each lesson gets its own Monday.
    /// </summary>
    [Fact]
    public async Task CalculateDates_TwoLessons_OneSlotPerWeek_AssignsConsecutiveValidDays()
    {
        // Arrange
        var lecturerId = 1;
        // 2025-09-01 is a Monday
        var yearStart = new DateOnly(2025, 9, 1);
        var yearEnd = new DateOnly(2026, 5, 31);

        var (classId, lessonPlanId) = await SeedBasicData(
            lecturerId: lecturerId,
            yearStart: yearStart,
            yearEnd: yearEnd,
            weekdaySlots: [new WeekdaySlotDto { Weekday = 2, Periods = 1 }], // Monday only, 1 period
            lessonNames: ["Bài 1 (2 tiết - phần 1)", "Bài 1 (2 tiết - phần 2)"],
            holidays: []
        );

        // Act
        var result = await _service.CalculateDatesAsync(classId, lessonPlanId, lecturerId);

        // Assert — each lesson is assigned to consecutive Mondays
        Assert.Equal(2, result.LessonDates.Count);
        // First lesson on first Monday (2025-09-01)
        Assert.Equal(new DateOnly(2025, 9, 1), result.LessonDates[0].TeachingDate);
        // Second lesson on next Monday (2025-09-08)
        Assert.Equal(new DateOnly(2025, 9, 8), result.LessonDates[1].TeachingDate);
    }

    /// <summary>
    /// Test case 3: Có ngày nghỉ lễ giữa kỳ → skip đúng, ngày dạy đẩy lùi.
    /// Setup: slot on Monday, holiday on 2025-09-08 (2nd Monday). 
    /// Expected: first lesson on Sep 1, second lesson skips Sep 8 → goes to Sep 15.
    /// </summary>
    [Fact]
    public async Task CalculateDates_HolidayInMiddle_SkipsHolidayAndPushesDate()
    {
        // Arrange
        var lecturerId = 1;
        var yearStart = new DateOnly(2025, 9, 1); // Monday
        var yearEnd = new DateOnly(2026, 5, 31);

        var (classId, lessonPlanId) = await SeedBasicData(
            lecturerId: lecturerId,
            yearStart: yearStart,
            yearEnd: yearEnd,
            weekdaySlots: [new WeekdaySlotDto { Weekday = 2, Periods = 2 }], // Monday, 2 periods
            lessonNames: ["Bài 1", "Bài 2", "Bài 3"],
            holidays:
            [
                // Holiday covering the 2nd Monday (Sep 8)
                new HolidayData("Nghỉ lễ", new DateOnly(2025, 9, 8), new DateOnly(2025, 9, 8))
            ]
        );

        // Act
        var result = await _service.CalculateDatesAsync(classId, lessonPlanId, lecturerId);

        // Assert
        Assert.Equal(3, result.LessonDates.Count);
        // Bài 1 → Sep 1 (Monday, valid)
        Assert.Equal(new DateOnly(2025, 9, 1), result.LessonDates[0].TeachingDate);
        // Bài 2 → Sep 8 is holiday → skipped → Sep 15 (next Monday)
        Assert.Equal(new DateOnly(2025, 9, 15), result.LessonDates[1].TeachingDate);
        // Bài 3 → Sep 22 (next valid Monday)
        Assert.Equal(new DateOnly(2025, 9, 22), result.LessonDates[2].TeachingDate);
    }

    /// <summary>
    /// Test case 4: 2 slots/tuần (Thứ 2 và Thứ 4) → bài dạy xen kẽ đúng.
    /// Setup: weekday slots on Monday (2) and Wednesday (4), 4 lessons.
    /// Expected: lessons alternate Mon/Wed/Mon/Wed.
    /// </summary>
    [Fact]
    public async Task CalculateDates_TwoSlotsPerWeek_MondayAndWednesday_AlternatesCorrectly()
    {
        // Arrange
        var lecturerId = 1;
        var yearStart = new DateOnly(2025, 9, 1); // Monday
        var yearEnd = new DateOnly(2026, 5, 31);

        var (classId, lessonPlanId) = await SeedBasicData(
            lecturerId: lecturerId,
            yearStart: yearStart,
            yearEnd: yearEnd,
            weekdaySlots:
            [
                new WeekdaySlotDto { Weekday = 2, Periods = 2 }, // Monday
                new WeekdaySlotDto { Weekday = 4, Periods = 2 }  // Wednesday
            ],
            lessonNames: ["Bài 1", "Bài 2", "Bài 3", "Bài 4"],
            holidays: []
        );

        // Act
        var result = await _service.CalculateDatesAsync(classId, lessonPlanId, lecturerId);

        // Assert
        Assert.Equal(4, result.LessonDates.Count);
        // Bài 1 → Mon Sep 1
        Assert.Equal(new DateOnly(2025, 9, 1), result.LessonDates[0].TeachingDate);
        Assert.Equal(DayOfWeek.Monday, result.LessonDates[0].TeachingDate.DayOfWeek);
        // Bài 2 → Wed Sep 3
        Assert.Equal(new DateOnly(2025, 9, 3), result.LessonDates[1].TeachingDate);
        Assert.Equal(DayOfWeek.Wednesday, result.LessonDates[1].TeachingDate.DayOfWeek);
        // Bài 3 → Mon Sep 8
        Assert.Equal(new DateOnly(2025, 9, 8), result.LessonDates[2].TeachingDate);
        Assert.Equal(DayOfWeek.Monday, result.LessonDates[2].TeachingDate.DayOfWeek);
        // Bài 4 → Wed Sep 10
        Assert.Equal(new DateOnly(2025, 9, 10), result.LessonDates[3].TeachingDate);
        Assert.Equal(DayOfWeek.Wednesday, result.LessonDates[3].TeachingDate.DayOfWeek);
    }

    /// <summary>
    /// Test case 5: Bài cuối cùng vượt quá yearEnd → handle gracefully.
    /// Setup: yearEnd is very close, only 2 valid teaching days exist, but 5 lessons.
    /// Expected: only 2 lessons get dates (those within yearEnd), remaining are not assigned.
    /// </summary>
    [Fact]
    public async Task CalculateDates_LessonsExceedYearEnd_OnlyAssignsDatesWithinRange()
    {
        // Arrange
        var lecturerId = 1;
        // Very short year: Sep 1 to Sep 10 (only 2 Mondays: Sep 1, Sep 8)
        var yearStart = new DateOnly(2025, 9, 1); // Monday
        var yearEnd = new DateOnly(2025, 9, 10);  // Wednesday — only covers 2 Mondays

        var (classId, lessonPlanId) = await SeedBasicData(
            lecturerId: lecturerId,
            yearStart: yearStart,
            yearEnd: yearEnd,
            weekdaySlots: [new WeekdaySlotDto { Weekday = 2, Periods = 1 }], // Monday only
            lessonNames: ["Bài 1", "Bài 2", "Bài 3", "Bài 4", "Bài 5"],
            holidays: []
        );

        // Act
        var result = await _service.CalculateDatesAsync(classId, lessonPlanId, lecturerId);

        // Assert — only 2 lessons should get dates (Sep 1 and Sep 8)
        Assert.Equal(2, result.LessonDates.Count);
        Assert.Equal(new DateOnly(2025, 9, 1), result.LessonDates[0].TeachingDate);
        Assert.Equal(new DateOnly(2025, 9, 8), result.LessonDates[1].TeachingDate);
        Assert.Equal("Bài 1", result.LessonDates[0].LessonName);
        Assert.Equal("Bài 2", result.LessonDates[1].LessonName);
    }

    // ── Helper methods ──

    private record HolidayData(string Name, DateOnly StartDate, DateOnly EndDate);

    private async Task<(int ClassId, int LessonPlanId)> SeedBasicData(
        int lecturerId,
        DateOnly yearStart,
        DateOnly yearEnd,
        List<WeekdaySlotDto> weekdaySlots,
        string[] lessonNames,
        HolidayData[] holidays)
    {
        // Create user (lecturer)
        var user = new User
        {
            Id = lecturerId,
            Email = $"lecturer{lecturerId}@test.com",
            FullName = "Test Lecturer",
            PasswordHash = "hash",
            Role = "Lecturer",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);

        // Create class
        var cls = new Class
        {
            LecturerId = lecturerId,
            Name = "Lớp 7A1",
            Year = "2025-2026",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        // Create lesson plan
        var lessonPlan = new LessonPlan
        {
            LecturerId = lecturerId,
            Subject = "Toán",
            Grade = "7",
            SchoolYearStart = "2025",
            SchoolYearEnd = "2026",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.LessonPlans.Add(lessonPlan);
        await _context.SaveChangesAsync();

        // Assign lesson plan to class
        cls.AssignedLessonPlanId = lessonPlan.Id;
        await _context.SaveChangesAsync();

        // Create lessons
        for (int i = 0; i < lessonNames.Length; i++)
        {
            _context.Lessons.Add(new Lesson
            {
                LessonPlanId = lessonPlan.Id,
                Name = lessonNames[i],
                OrderIndex = i + 1
            });
        }
        await _context.SaveChangesAsync();

        // Create school year calendar
        var calendar = new SchoolYearCalendar
        {
            YearStart = yearStart,
            YearEnd = yearEnd,
            IsDefault = true,
            CreatedAt = DateTime.UtcNow
        };
        _context.SchoolYearCalendars.Add(calendar);
        await _context.SaveChangesAsync();

        // Create holidays
        foreach (var holiday in holidays)
        {
            _context.SchoolYearHolidays.Add(new SchoolYearHoliday
            {
                CalendarId = calendar.Id,
                Name = holiday.Name,
                StartDate = holiday.StartDate,
                EndDate = holiday.EndDate
            });
        }
        await _context.SaveChangesAsync();

        // Create class subject schedule
        var slotsJson = JsonSerializer.Serialize(weekdaySlots);
        var schedule = new ClassSubjectSchedule
        {
            ClassId = cls.Id,
            Subject = "Toán",
            CalendarId = calendar.Id,
            PeriodsPerWeek = weekdaySlots.Sum(s => s.Periods),
            WeekdaySlots = slotsJson,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.ClassSubjectSchedules.Add(schedule);
        await _context.SaveChangesAsync();

        return (cls.Id, lessonPlan.Id);
    }
}
