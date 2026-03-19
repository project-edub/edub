namespace TeachingManagementPlatform.Api.Models;

public class StudentListColumn
{
    public int Id { get; set; }
    public int StudentListId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public StudentList StudentList { get; set; } = null!;
}
