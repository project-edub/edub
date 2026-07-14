using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class ClassSubjectScheduleResponse
{
    public int Id { get; set; }
    public int ClassId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public int CalendarId { get; set; }
    public int PeriodsPerWeek { get; set; }
    public List<WeekdaySlotDto> WeekdaySlots { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class WeekdaySlotDto
{
    /// <summary>
    /// Day of week: 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday
    /// </summary>
    public int Weekday { get; set; }

    /// <summary>
    /// Number of periods on this weekday
    /// </summary>
    public int Periods { get; set; }
}

public class UpsertScheduleRequest
{
    [Required]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [Range(1, 20)]
    public int PeriodsPerWeek { get; set; }

    [Required]
    public List<WeekdaySlotDto> WeekdaySlots { get; set; } = new();

    [Required]
    public int CalendarId { get; set; }
}

public class CalculateDatesResponse
{
    public List<LessonDateDto> LessonDates { get; set; } = new();
}

public class LessonDateDto
{
    public int LessonId { get; set; }
    public string LessonName { get; set; } = string.Empty;
    public DateOnly TeachingDate { get; set; }
}

public class ApplyDatesRequest
{
    [Required]
    public List<LessonDateDto> Dates { get; set; } = new();
}

public class SchoolYearCalendarResponse
{
    public int Id { get; set; }
    public DateOnly YearStart { get; set; }
    public DateOnly YearEnd { get; set; }
    public int? CreatedBy { get; set; }
    public bool IsDefault { get; set; }
    public int HolidayCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SchoolYearHolidayResponse
{
    public int Id { get; set; }
    public int CalendarId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Name { get; set; } = string.Empty;
}
