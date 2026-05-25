using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class QuizMappingService : IQuizMappingService
{
    public (List<GeneratedQuizQuestion> Questions, List<string> Warnings) ValidateAndMap(QuizContent content, int requestedQuestionCount)
    {
        var warnings = new List<string>();
        var mapped = new List<GeneratedQuizQuestion>();

        if (content == null || content.Questions == null || content.Questions.Count == 0)
        {
            warnings.Add("AI trả về không có câu hỏi.");
            return (mapped, warnings);
        }

        int index = 0;
        foreach (var q in content.Questions)
        {
            index++;
            if (string.IsNullOrWhiteSpace(q.Question))
            {
                warnings.Add($"Câu {index} trống. Bỏ qua.");
                continue;
            }

            var options = (q.Options ?? new List<string>()).Select(o => o?.Trim() ?? string.Empty).Where(s => !string.IsNullOrEmpty(s)).ToList();

            if (options.Count != 4)
            {
                warnings.Add($"Câu {index} có {options.Count} lựa chọn (không phải 4). Sẽ cố gắng điều chỉnh.");
                // attempt to pad or trim to 4
                if (options.Count > 4)
                    options = options.Take(4).ToList();
                else
                {
                    while (options.Count < 4)
                        options.Add("(Thiếu đáp án)");
                }
            }

            var correct = q.CorrectAnswerIndex;
            if (correct < 0 || correct >= options.Count)
            {
                warnings.Add($"Câu {index} có chỉ số đáp án đúng không hợp lệ ({q.CorrectAnswerIndex}). Đặt về 0.");
                correct = 0;
            }

            mapped.Add(new GeneratedQuizQuestion
            {
                Question = q.Question.Trim(),
                Options = options.Select(o => new GeneratedQuizOption { Text = o }).ToList(),
                CorrectAnswerIndex = correct
            });

            if (mapped.Count >= requestedQuestionCount)
                break;
        }

        if (mapped.Count < requestedQuestionCount)
            warnings.Add($"Yêu cầu {requestedQuestionCount} câu nhưng chỉ tạo được {mapped.Count} câu.");

        return (mapped, warnings);
    }
}
