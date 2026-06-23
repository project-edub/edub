using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface ITeachingScheduleService
{
    Task<ClassSubjectScheduleResponse?> GetScheduleAsync(int classId, string subject, int lecturerId);
    Task<ClassSubjectScheduleResponse> UpsertScheduleAsync(int classId, string subject, int lecturerId, UpsertScheduleRequest request);
    Task<CalculateDatesResponse> CalculateDatesAsync(int classId, int lessonPlanId, int lecturerId);
    Task<bool> ApplyDatesAsync(int classId, int lessonPlanId, int lecturerId, ApplyDatesRequest request);
    Task<List<SchoolYearCalendarResponse>> GetCalendarsAsync();
    Task<List<SchoolYearHolidayResponse>> GetCalendarHolidaysAsync(int calendarId);
}
