using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/quiz-play")]
public class QuizPlayerController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public QuizPlayerController(ApplicationDbContext context)
    {
        _context = context;
    }

    // GET /api/quiz-play/{slug}
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetQuiz(string slug)
    {
        var game = await _context.QuizGames
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Slug == slug && q.Status == "published");

        if (game == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy bài quiz." } });

        var dto = new QuizPlayerDto
        {
            Slug = game.Slug,
            Title = game.Title,
            ShowAnswersAfterSubmit = game.ShowAnswersAfterSubmit,
            RequireStudentName = game.RequireStudentName,
            Questions = game.Questions.OrderBy(q => q.Number).Select(q => new QuizPlayerQuestionDto
            {
                Id = q.Id,
                Number = q.Number,
                QuestionType = q.QuestionType,
                QuestionText = q.QuestionText,
                OptionsJson = q.OptionsJson,
            }).ToList(),
        };

        return Ok(dto);
    }

    // POST /api/quiz-play/{slug}/submit
    [HttpPost("{slug}/submit")]
    public async Task<IActionResult> Submit(string slug, [FromBody] QuizSubmitRequest request)
    {
        var game = await _context.QuizGames
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Slug == slug && q.Status == "published");

        if (game == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy bài quiz." } });

        if (game.RequireStudentName && string.IsNullOrWhiteSpace(request.StudentName))
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = "Vui lòng nhập tên trước khi nộp bài." } });

        // Grade the quiz
        var questions = game.Questions.ToDictionary(q => q.Id);
        int correctCount = 0;
        var results = new List<QuizQuestionResult>();

        foreach (var answer in request.Answers)
        {
            if (!questions.TryGetValue(answer.QuestionId, out var question))
                continue;

            bool isCorrect;
            if (question.QuestionType == "fill_in_blank")
            {
                isCorrect = !string.IsNullOrWhiteSpace(answer.AnswerText) &&
                    string.Equals(answer.AnswerText.Trim(), question.CorrectAnswerText?.Trim(), StringComparison.OrdinalIgnoreCase);
            }
            else
            {
                isCorrect = answer.AnswerIndex == question.CorrectAnswerIndex;
            }

            if (isCorrect) correctCount++;

            results.Add(new QuizQuestionResult
            {
                QuestionId = question.Id,
                IsCorrect = isCorrect,
                CorrectAnswerIndex = question.CorrectAnswerIndex,
                CorrectAnswerText = question.CorrectAnswerText,
                Explanation = question.Explanation,
            });
        }

        int totalQuestions = game.Questions.Count;
        decimal scorePercent = totalQuestions > 0 ? (decimal)correctCount / totalQuestions * 100 : 0;

        // Save submission
        var submission = new QuizSubmission
        {
            QuizGameId = game.Id,
            StudentName = request.StudentName?.Trim() ?? "Ẩn danh",
            AnswersJson = JsonSerializer.Serialize(request.Answers),
            TotalQuestions = totalQuestions,
            CorrectCount = correctCount,
            ScorePercent = Math.Round(scorePercent, 2),
            SubmittedAt = DateTime.UtcNow,
        };
        _context.QuizSubmissions.Add(submission);
        await _context.SaveChangesAsync();

        var response = new QuizSubmitResponse
        {
            TotalQuestions = totalQuestions,
            CorrectCount = correctCount,
            ScorePercent = Math.Round(scorePercent, 2),
            ShowAnswers = game.ShowAnswersAfterSubmit,
            Results = game.ShowAnswersAfterSubmit ? results : null,
        };

        return Ok(response);
    }
}
