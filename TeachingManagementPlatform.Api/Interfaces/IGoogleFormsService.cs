using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IGoogleFormsService
{
    /// <summary>
    /// Create a Google Form from quiz questions and share it with the provided teacher email.
    /// Returns tuple (formId, formEditUrl, driveWebViewLink)
    /// </summary>
    Task<(string FormId, string FormEditUrl, string DriveWebViewLink)> CreateFormAsync(string title, List<GeneratedQuizQuestion> questions, string teacherEmail);
}
