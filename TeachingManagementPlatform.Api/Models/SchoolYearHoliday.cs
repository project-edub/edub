namespace TeachingManagementPlatform.Api.Models;

public class SchoolYearHoliday
{
    public int Id { get; set; }
    public int CalendarId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Name { get; set; } = string.Empty;

    // Navigation property
    public SchoolYearCalendar Calendar { get; set; } = null!;
}
