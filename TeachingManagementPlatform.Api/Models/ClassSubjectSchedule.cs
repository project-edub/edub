namespace TeachingManagementPlatform.Api.Models;

/// <summary>
/// Helper class representing a weekday slot for teaching schedule.
/// </summary>
public class WeekdaySlot
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

/// <summary>
/// Represents the teaching schedule for a specific subject in a class.
/// Links a class + subject to a school year calendar with weekday/period configuration.
/// </summary>
public class ClassSubjectSchedule
{
    public int Id { get; set; }
    public int ClassId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public int CalendarId { get; set; }
    public int PeriodsPerWeek { get; set; }
    public string? WeekdaySlots { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public Class Class { get; set; } = null!;
    public SchoolYearCalendar Calendar { get; set; } = null!;
}
