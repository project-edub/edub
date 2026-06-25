namespace TeachingManagementPlatform.Api.Models;

public class SchoolYearCalendar
{
    public int Id { get; set; }
    public DateOnly YearStart { get; set; }
    public DateOnly YearEnd { get; set; }
    public int? CreatedBy { get; set; }
    public bool IsDefault { get; set; } = false;
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public User? Creator { get; set; }
    public ICollection<SchoolYearHoliday> Holidays { get; set; } = new List<SchoolYearHoliday>();
}
