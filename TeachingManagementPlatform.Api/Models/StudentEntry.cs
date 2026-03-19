using System.Text.Json;

namespace TeachingManagementPlatform.Api.Models;

public class StudentEntry
{
    public int Id { get; set; }
    public int StudentListId { get; set; }
    public Dictionary<string, string> Data { get; set; } = new();
    public int SortOrder { get; set; }

    public StudentList StudentList { get; set; } = null!;
}
