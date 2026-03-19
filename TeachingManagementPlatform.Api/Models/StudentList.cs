namespace TeachingManagementPlatform.Api.Models;

public class StudentList
{
    public int Id { get; set; }
    public int ClassId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsMain { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public Class Class { get; set; } = null!;
    public ICollection<StudentListColumn> Columns { get; set; } = new List<StudentListColumn>();
    public ICollection<StudentEntry> Entries { get; set; } = new List<StudentEntry>();
}
