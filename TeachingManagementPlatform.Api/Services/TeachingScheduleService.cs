using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class TeachingScheduleService : ITeachingScheduleService
{
    private readonly ApplicationDbContext _context;

    public TeachingScheduleService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ClassSubjectScheduleResponse?> GetScheduleAsync(int classId, string subject, int lecturerId)
    {
        var cls = await _context.Classes
            .FirstOrDefaultAsync(c => c.Id == classId && c.LecturerId == lecturerId)
            ?? throw new TeachingScheduleNotFoundException("Không tìm thấy lớp học");

        var schedule = await _context.ClassSubjectSchedules
            .FirstOrDefaultAsync(css => css.ClassId == classId && css.Subject == subject);

        if (schedule == null)
            return null;

        return MapToScheduleResponse(schedule);
    }

    public async Task<ClassSubjectScheduleResponse> UpsertScheduleAsync(int classId, string subject, int lecturerId, UpsertScheduleRequest request)
    {
        var cls = await _context.Classes
            .FirstOrDefaultAsync(c => c.Id == classId && c.LecturerId == lecturerId)
            ?? throw new TeachingScheduleNotFoundException("Không tìm thấy lớp học");

        var calendar = await _context.SchoolYearCalendars
            .AnyAsync(c => c.Id == request.CalendarId);
        if (!calendar)
            throw new TeachingScheduleNotFoundException("Không tìm thấy lịch năm học");

        var schedule = await _context.ClassSubjectSchedules
            .FirstOrDefaultAsync(css => css.ClassId == classId && css.Subject == subject);

        var slotsJson = JsonSerializer.Serialize(request.WeekdaySlots);

        if (schedule == null)
        {
            schedule = new ClassSubjectSchedule
            {
                ClassId = classId,
                Subject = subject,
                CalendarId = request.CalendarId,
                PeriodsPerWeek = request.PeriodsPerWeek,
                WeekdaySlots = slotsJson,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.ClassSubjectSchedules.Add(schedule);
        }
        else
        {
            schedule.CalendarId = request.CalendarId;
            schedule.PeriodsPerWeek = request.PeriodsPerWeek;
            schedule.WeekdaySlots = slotsJson;
            schedule.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return MapToScheduleResponse(schedule);
    }

    /// <summary>
    /// Calculates teaching dates for all lessons of a lesson plan assigned to a class.
    /// Algorithm:
    ///   1. Get the schedule's weekday slots (which days of week have lessons)
    ///   2. Get holidays from the calendar
    ///   3. Starting from yearStart, iterate day by day
    ///   4. For each day: check if it's a valid teaching day (weekday matches a slot AND not a holiday)
    ///   5. If valid: assign the next unassigned lesson to that date
    ///   6. Continue until all lessons have dates or yearEnd is reached
    ///   7. Return the mapping lessonId → teachingDate (NOT saved to DB)
    /// </summary>
    public async Task<CalculateDatesResponse> CalculateDatesAsync(int classId, int lessonPlanId, int lecturerId)
    {
        // Verify class ownership
        var cls = await _context.Classes
            .FirstOrDefaultAsync(c => c.Id == classId && c.LecturerId == lecturerId)
            ?? throw new TeachingScheduleNotFoundException("Không tìm thấy lớp học");

        // Load the lesson plan and verify it belongs to the lecturer
        var lessonPlan = await _context.LessonPlans
            .Include(lp => lp.Lessons.OrderBy(l => l.OrderIndex))
            .FirstOrDefaultAsync(lp => lp.Id == lessonPlanId && lp.LecturerId == lecturerId)
            ?? throw new TeachingScheduleNotFoundException("Không tìm thấy giáo án");

        if (!lessonPlan.Lessons.Any())
            return new CalculateDatesResponse();

        // Get the subject from the lesson plan to find the schedule
        var subject = lessonPlan.Subject;

        // Get the class subject schedule
        var schedule = await _context.ClassSubjectSchedules
            .Include(css => css.Calendar)
                .ThenInclude(cal => cal.Holidays)
            .FirstOrDefaultAsync(css => css.ClassId == classId && css.Subject == subject)
            ?? throw new TeachingScheduleNotFoundException("Chưa thiết lập lịch dạy cho lớp này. Vui lòng thiết lập lịch dạy trước.");

        // Parse weekday slots
        var weekdaySlots = ParseWeekdaySlots(schedule.WeekdaySlots);
        if (!weekdaySlots.Any())
            throw new TeachingScheduleNotFoundException("Lịch dạy không có ngày nào được thiết lập.");

        // Build a set of valid teaching weekdays (DayOfWeek mapped from Vietnamese weekday convention)
        // Vietnamese convention: 2=Monday, 3=Tuesday, ..., 7=Saturday
        var validWeekdays = weekdaySlots
            .ToDictionary(s => MapWeekdayToDayOfWeek(s.Weekday), s => s.Periods);

        // Get calendar info
        var calendar = schedule.Calendar;
        var yearStart = calendar.YearStart;
        var yearEnd = calendar.YearEnd;

        // Build a HashSet of holiday dates for O(1) lookup
        var holidayDates = new HashSet<DateOnly>();
        foreach (var holiday in calendar.Holidays)
        {
            for (var date = holiday.StartDate; date <= holiday.EndDate; date = date.AddDays(1))
            {
                holidayDates.Add(date);
            }
        }

        // Iterate through lessons and assign dates
        var lessons = lessonPlan.Lessons.OrderBy(l => l.OrderIndex).ToList();
        var result = new List<LessonDateDto>();
        var lessonIndex = 0;
        var currentDate = yearStart;

        while (lessonIndex < lessons.Count && currentDate <= yearEnd)
        {
            // Check if this day is a valid teaching day
            if (IsValidTeachingDay(currentDate, validWeekdays, holidayDates))
            {
                // Assign lesson to this date
                var lesson = lessons[lessonIndex];
                result.Add(new LessonDateDto
                {
                    LessonId = lesson.Id,
                    LessonName = lesson.Name,
                    TeachingDate = currentDate
                });
                lessonIndex++;
            }

            currentDate = currentDate.AddDays(1);
        }

        return new CalculateDatesResponse { LessonDates = result };
    }

    public async Task<bool> ApplyDatesAsync(int classId, int lessonPlanId, int lecturerId, ApplyDatesRequest request)
    {
        // Verify class ownership
        var cls = await _context.Classes
            .FirstOrDefaultAsync(c => c.Id == classId && c.LecturerId == lecturerId)
            ?? throw new TeachingScheduleNotFoundException("Không tìm thấy lớp học");

        // Verify lesson plan belongs to lecturer
        var lessonPlan = await _context.LessonPlans
            .FirstOrDefaultAsync(lp => lp.Id == lessonPlanId && lp.LecturerId == lecturerId)
            ?? throw new TeachingScheduleNotFoundException("Không tìm thấy giáo án");

        // Verify the lesson plan is assigned to this class
        if (cls.AssignedLessonPlanId != lessonPlanId)
            throw new TeachingScheduleNotFoundException("Giáo án chưa được gán cho lớp học này");

        if (request.Dates == null || !request.Dates.Any())
            return true;

        // Batch-load existing schedules for this class to avoid N+1 queries
        var lessonIds = request.Dates.Select(d => d.LessonId).ToList();
        var existingSchedules = await _context.ClassLessonSchedules
            .Where(s => s.ClassId == classId && lessonIds.Contains(s.LessonId))
            .ToDictionaryAsync(s => s.LessonId);

        // Verify all requested lessons belong to the assigned lesson plan
        var validLessonIds = await _context.Lessons
            .Where(l => l.LessonPlanId == lessonPlanId && lessonIds.Contains(l.Id))
            .Select(l => l.Id)
            .ToListAsync();
        var validLessonIdSet = new HashSet<int>(validLessonIds);

        foreach (var dateEntry in request.Dates)
        {
            // Skip lesson IDs that don't belong to this lesson plan
            if (!validLessonIdSet.Contains(dateEntry.LessonId))
                continue;

            if (existingSchedules.TryGetValue(dateEntry.LessonId, out var schedule))
            {
                schedule.ScheduledDate = dateEntry.TeachingDate.ToDateTime(TimeOnly.MinValue);
            }
            else
            {
                _context.ClassLessonSchedules.Add(new ClassLessonSchedule
                {
                    ClassId = classId,
                    LessonId = dateEntry.LessonId,
                    ScheduledDate = dateEntry.TeachingDate.ToDateTime(TimeOnly.MinValue),
                    LessonStatus = ClassLessonSchedule.PendingStatus
                });
            }
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<SchoolYearCalendarResponse>> GetCalendarsAsync()
    {
        return await _context.SchoolYearCalendars
            .Select(c => new SchoolYearCalendarResponse
            {
                Id = c.Id,
                YearStart = c.YearStart,
                YearEnd = c.YearEnd,
                CreatedBy = c.CreatedBy,
                IsDefault = c.IsDefault,
                HolidayCount = c.Holidays.Count,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<List<SchoolYearHolidayResponse>> GetCalendarHolidaysAsync(int calendarId)
    {
        var exists = await _context.SchoolYearCalendars.AnyAsync(c => c.Id == calendarId);
        if (!exists)
            throw new TeachingScheduleNotFoundException("Không tìm thấy lịch năm học");

        return await _context.SchoolYearHolidays
            .Where(h => h.CalendarId == calendarId)
            .OrderBy(h => h.StartDate)
            .Select(h => new SchoolYearHolidayResponse
            {
                Id = h.Id,
                CalendarId = h.CalendarId,
                StartDate = h.StartDate,
                EndDate = h.EndDate,
                Name = h.Name
            })
            .ToListAsync();
    }

    // ── Private helper methods ──

    private static bool IsValidTeachingDay(DateOnly date, Dictionary<DayOfWeek, int> validWeekdays, HashSet<DateOnly> holidayDates)
    {
        // Not a holiday
        if (holidayDates.Contains(date))
            return false;

        // Must be on a scheduled weekday
        return validWeekdays.ContainsKey(date.DayOfWeek);
    }

    /// <summary>
    /// Maps Vietnamese weekday convention (2=Monday, 3=Tuesday, ..., 7=Saturday) to .NET DayOfWeek.
    /// </summary>
    private static DayOfWeek MapWeekdayToDayOfWeek(int weekday)
    {
        return weekday switch
        {
            2 => DayOfWeek.Monday,
            3 => DayOfWeek.Tuesday,
            4 => DayOfWeek.Wednesday,
            5 => DayOfWeek.Thursday,
            6 => DayOfWeek.Friday,
            7 => DayOfWeek.Saturday,
            _ => throw new ArgumentOutOfRangeException(nameof(weekday), $"Ngày trong tuần không hợp lệ: {weekday}. Giá trị hợp lệ: 2-7")
        };
    }

    private static List<WeekdaySlotDto> ParseWeekdaySlots(string? weekdaySlotsJson)
    {
        if (string.IsNullOrWhiteSpace(weekdaySlotsJson))
            return new List<WeekdaySlotDto>();

        try
        {
            return JsonSerializer.Deserialize<List<WeekdaySlotDto>>(weekdaySlotsJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new List<WeekdaySlotDto>();
        }
        catch (JsonException)
        {
            return new List<WeekdaySlotDto>();
        }
    }

    private static ClassSubjectScheduleResponse MapToScheduleResponse(ClassSubjectSchedule schedule)
    {
        var slots = new List<WeekdaySlotDto>();
        if (!string.IsNullOrWhiteSpace(schedule.WeekdaySlots))
        {
            try
            {
                slots = JsonSerializer.Deserialize<List<WeekdaySlotDto>>(schedule.WeekdaySlots, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }) ?? new List<WeekdaySlotDto>();
            }
            catch (JsonException)
            {
                // If JSON is malformed, return empty slots
            }
        }

        return new ClassSubjectScheduleResponse
        {
            Id = schedule.Id,
            ClassId = schedule.ClassId,
            Subject = schedule.Subject,
            CalendarId = schedule.CalendarId,
            PeriodsPerWeek = schedule.PeriodsPerWeek,
            WeekdaySlots = slots,
            CreatedAt = schedule.CreatedAt,
            UpdatedAt = schedule.UpdatedAt
        };
    }
}

public class TeachingScheduleNotFoundException : Exception
{
    public TeachingScheduleNotFoundException(string message) : base(message) { }
}
