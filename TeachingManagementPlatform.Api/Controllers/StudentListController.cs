using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Authorize(Roles = "Lecturer")]
public class StudentListController : ControllerBase
{
    private readonly IStudentListService _studentListService;
    private readonly IExcelService _excelService;

    public StudentListController(IStudentListService studentListService, IExcelService excelService)
    {
        _studentListService = studentListService;
        _excelService = excelService;
    }

    // --- Student List endpoints ---

    [HttpGet("api/classes/{classId}/student-lists")]
    public async Task<IActionResult> GetAll(int classId)
    {
        try
        {
            var lists = await _studentListService.GetAllByClassAsync(classId, GetUserId());
            return Ok(lists);
        }
        catch (ClassNotFoundException ex)
        {
            return NotFound(new { error = new { code = "CLASS_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("api/classes/{classId}/student-lists")]
    public async Task<IActionResult> Create(int classId, [FromBody] CreateStudentListRequest request)
    {
        try
        {
            var list = await _studentListService.CreateAsync(classId, GetUserId(), request);
            return CreatedAtAction(nameof(GetAll), new { classId }, list);
        }
        catch (ClassNotFoundException ex)
        {
            return NotFound(new { error = new { code = "CLASS_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("api/student-lists/{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateStudentListRequest request)
    {
        try
        {
            var list = await _studentListService.UpdateAsync(id, GetUserId(), request);
            return Ok(list);
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STUDENT_LIST_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("api/student-lists/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _studentListService.DeleteAsync(id, GetUserId());
            return NoContent();
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STUDENT_LIST_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("api/student-lists/{id}/set-main")]
    public async Task<IActionResult> SetMain(int id)
    {
        try
        {
            var list = await _studentListService.SetMainAsync(id, GetUserId());
            return Ok(list);
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STUDENT_LIST_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("api/student-lists/{id}/clone")]
    public async Task<IActionResult> Clone(int id)
    {
        try
        {
            var list = await _studentListService.CloneAsync(id, GetUserId());
            return CreatedAtAction(nameof(GetAll), new { classId = list.ClassId }, list);
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STUDENT_LIST_NOT_FOUND", message = ex.Message } });
        }
    }

    // --- Column endpoints ---

    [HttpPost("api/student-lists/{id}/columns")]
    public async Task<IActionResult> AddColumn(int id, [FromBody] CreateColumnRequest request)
    {
        try
        {
            var column = await _studentListService.AddColumnAsync(id, GetUserId(), request);
            return Created($"api/student-list-columns/{column.Id}", column);
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STUDENT_LIST_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("api/student-list-columns/{id}")]
    public async Task<IActionResult> UpdateColumn(int id, [FromBody] UpdateColumnRequest request)
    {
        try
        {
            var column = await _studentListService.UpdateColumnAsync(id, GetUserId(), request);
            return Ok(column);
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "COLUMN_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("api/student-list-columns/{id}")]
    public async Task<IActionResult> DeleteColumn(int id)
    {
        try
        {
            await _studentListService.DeleteColumnAsync(id, GetUserId());
            return NoContent();
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "COLUMN_NOT_FOUND", message = ex.Message } });
        }
    }

    // --- Entry endpoints ---

    [HttpPost("api/student-lists/{id}/entries")]
    public async Task<IActionResult> AddEntry(int id, [FromBody] CreateEntryRequest request)
    {
        try
        {
            var entry = await _studentListService.AddEntryAsync(id, GetUserId(), request);
            return Created($"api/student-entries/{entry.Id}", entry);
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STUDENT_LIST_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("api/student-entries/{id}")]
    public async Task<IActionResult> UpdateEntry(int id, [FromBody] UpdateEntryRequest request)
    {
        try
        {
            var entry = await _studentListService.UpdateEntryAsync(id, GetUserId(), request);
            return Ok(entry);
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ENTRY_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("api/student-entries/{id}")]
    public async Task<IActionResult> DeleteEntry(int id)
    {
        try
        {
            await _studentListService.DeleteEntryAsync(id, GetUserId());
            return NoContent();
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ENTRY_NOT_FOUND", message = ex.Message } });
        }
    }

    // --- Import/Export endpoints ---

    [HttpPost("api/student-lists/{id}/import-excel")]
    public async Task<IActionResult> ImportExcel(int id, IFormFile file)
    {
        try
        {
            var lecturerId = GetUserId();
            var studentList = await _studentListService.GetByIdAsync(id, lecturerId);

            using var stream = file.OpenReadStream();

            // Import data from any Excel file (no header validation)
            var importedRows = _excelService.ImportData(stream);

            if (importedRows.Count == 0)
            {
                return BadRequest(new
                {
                    error = new
                    {
                        code = "EMPTY_FILE",
                        message = "File Excel không có dữ liệu"
                    }
                });
            }

            // Auto-create columns that don't exist yet
            var existingColumns = studentList.Columns.Select(c => c.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var allHeaders = importedRows.SelectMany(r => r.Keys).Distinct().ToList();
            var columnSortOrder = studentList.Columns.Count;

            foreach (var header in allHeaders)
            {
                if (!existingColumns.Contains(header))
                {
                    await _studentListService.AddColumnAsync(id, lecturerId, new CreateColumnRequest
                    {
                        Name = header,
                        SortOrder = columnSortOrder++
                    });
                    existingColumns.Add(header);
                }
            }

            // Create student entries from imported data
            var sortOrder = studentList.Entries.Count;
            foreach (var row in importedRows)
            {
                await _studentListService.AddEntryAsync(id, lecturerId, new CreateEntryRequest
                {
                    Data = row,
                    SortOrder = sortOrder++
                });
            }

            // Return the updated student list
            var updatedList = await _studentListService.GetByIdAsync(id, lecturerId);
            return Ok(updatedList);
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STUDENT_LIST_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpGet("api/student-lists/{id}/export-excel")]
    public async Task<IActionResult> ExportExcel(int id)
    {
        try
        {
            var lecturerId = GetUserId();
            var studentList = await _studentListService.GetByIdAsync(id, lecturerId);

            var columnNames = studentList.Columns.Select(c => c.Name).ToList();
            var rows = studentList.Entries.Select(e => e.Data).ToList();

            var bytes = _excelService.ExportData(columnNames, rows);

            var fileName = $"{studentList.Name}.xlsx";
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
        catch (StudentListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STUDENT_LIST_NOT_FOUND", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
