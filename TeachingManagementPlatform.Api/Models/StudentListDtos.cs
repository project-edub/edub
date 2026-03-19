namespace TeachingManagementPlatform.Api.Models;

// --- Request DTOs ---

public class CreateStudentListRequest
{
    public string Name { get; set; } = string.Empty;
}

public class UpdateStudentListRequest
{
    public string? Name { get; set; }
}

public class CreateColumnRequest
{
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class UpdateColumnRequest
{
    public string? Name { get; set; }
    public int? SortOrder { get; set; }
}

public class CreateEntryRequest
{
    public Dictionary<string, string> Data { get; set; } = new();
    public int SortOrder { get; set; }
}

public class UpdateEntryRequest
{
    public Dictionary<string, string>? Data { get; set; }
    public int? SortOrder { get; set; }
}

// --- Response DTOs ---

public class StudentListColumnResponse
{
    public int Id { get; set; }
    public int StudentListId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class StudentEntryResponse
{
    public int Id { get; set; }
    public int StudentListId { get; set; }
    public Dictionary<string, string> Data { get; set; } = new();
    public int SortOrder { get; set; }
}

public class StudentListResponse
{
    public int Id { get; set; }
    public int ClassId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsMain { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<StudentListColumnResponse> Columns { get; set; } = new();
    public List<StudentEntryResponse> Entries { get; set; } = new();
}
