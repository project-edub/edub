using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Data;

/// <summary>
/// Dữ liệu mẫu Khung chương trình (PPCT) cho các môn học lớp 7.
/// Bộ sách: Kết nối tri thức với cuộc sống.
/// CreatedBy = null (template hệ thống), IsPublic = true.
/// </summary>
public static class CurriculumTemplateSeedData
{
    public static List<CurriculumTemplate> GetSeedTemplates()
    {
        var now = DateTime.UtcNow;

        return new List<CurriculumTemplate>
        {
            // ═══════════════════════════════════════════════════════════════
            // TOÁN LỚP 7 — Kết nối tri thức
            // ═══════════════════════════════════════════════════════════════
            new CurriculumTemplate
            {
                Subject = "Toán",
                Grade = 7,
                BookSet = "Kết nối tri thức",
                CreatedBy = null,
                IsPublic = true,
                SourceNote = "PPCT Toán 7 — Bộ Kết nối tri thức với cuộc sống (2024-2025)",
                UsageCount = 0,
                CreatedAt = now,
                UpdatedAt = now,
                Lessons = new List<CurriculumTemplateLesson>
                {
                    new() { OrderIndex = 1, ChapterName = "Chương 1: Số hữu tỉ", LessonName = "Tập hợp các số hữu tỉ", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 2, ChapterName = "Chương 1: Số hữu tỉ", LessonName = "Cộng, trừ, nhân, chia số hữu tỉ", SuggestedPeriods = 3, CreatedAt = now },
                    new() { OrderIndex = 3, ChapterName = "Chương 1: Số hữu tỉ", LessonName = "Lũy thừa của một số hữu tỉ", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 4, ChapterName = "Chương 1: Số hữu tỉ", LessonName = "Thứ tự thực hiện các phép tính. Quy tắc chuyển vế", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 5, ChapterName = "Chương 2: Số thực", LessonName = "Số vô tỉ. Căn bậc hai số học", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 6, ChapterName = "Chương 2: Số thực", LessonName = "Tập hợp các số thực", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 7, ChapterName = "Chương 3: Góc và đường thẳng song song", LessonName = "Các góc ở vị trí đặc biệt. Tia phân giác của một góc", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 8, ChapterName = "Chương 3: Góc và đường thẳng song song", LessonName = "Hai đường thẳng song song và dấu hiệu nhận biết", SuggestedPeriods = 3, CreatedAt = now },
                    new() { OrderIndex = 9, ChapterName = "Chương 3: Góc và đường thẳng song song", LessonName = "Tiên đề Euclid. Tính chất của hai đường thẳng song song", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 10, ChapterName = "Chương 4: Biểu thức đại số", LessonName = "Biểu thức đại số và giá trị của biểu thức đại số", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 11, ChapterName = "Chương 4: Biểu thức đại số", LessonName = "Đa thức một biến. Cộng, trừ đa thức", SuggestedPeriods = 3, CreatedAt = now },
                    new() { OrderIndex = 12, ChapterName = "Chương 4: Biểu thức đại số", LessonName = "Nghiệm của đa thức một biến", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 13, ChapterName = "Chương 5: Tam giác", LessonName = "Tổng các góc của một tam giác", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 14, ChapterName = "Chương 5: Tam giác", LessonName = "Hai tam giác bằng nhau. Trường hợp bằng nhau c.c.c", SuggestedPeriods = 3, CreatedAt = now },
                    new() { OrderIndex = 15, ChapterName = "Chương 5: Tam giác", LessonName = "Trường hợp bằng nhau c.g.c và g.c.g", SuggestedPeriods = 3, CreatedAt = now },
                }
            },

            // ═══════════════════════════════════════════════════════════════
            // NGỮ VĂN LỚP 7 — Kết nối tri thức
            // ═══════════════════════════════════════════════════════════════
            new CurriculumTemplate
            {
                Subject = "Ngữ văn",
                Grade = 7,
                BookSet = "Kết nối tri thức",
                CreatedBy = null,
                IsPublic = true,
                SourceNote = "PPCT Ngữ văn 7 — Bộ Kết nối tri thức với cuộc sống (2024-2025)",
                UsageCount = 0,
                CreatedAt = now,
                UpdatedAt = now,
                Lessons = new List<CurriculumTemplateLesson>
                {
                    new() { OrderIndex = 1, ChapterName = "Bài 1: Bầu trời tuổi thơ", LessonName = "Đọc: Bầy chim chìa vôi (Nguyễn Quang Thiều)", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 2, ChapterName = "Bài 1: Bầu trời tuổi thơ", LessonName = "Thực hành tiếng Việt: Phó từ", SuggestedPeriods = 1, CreatedAt = now },
                    new() { OrderIndex = 3, ChapterName = "Bài 1: Bầu trời tuổi thơ", LessonName = "Viết: Viết bài văn kể lại một sự việc có thật liên quan đến nhân vật", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 4, ChapterName = "Bài 2: Khúc nhạc tâm hồn", LessonName = "Đọc: Mẹ (Đỗ Trung Lai)", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 5, ChapterName = "Bài 2: Khúc nhạc tâm hồn", LessonName = "Đọc: Ông đồ (Vũ Đình Liên)", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 6, ChapterName = "Bài 2: Khúc nhạc tâm hồn", LessonName = "Thực hành tiếng Việt: Số từ, phó từ", SuggestedPeriods = 1, CreatedAt = now },
                    new() { OrderIndex = 7, ChapterName = "Bài 3: Cội nguồn yêu thương", LessonName = "Đọc: Gió lạnh đầu mùa (Thạch Lam)", SuggestedPeriods = 3, CreatedAt = now },
                    new() { OrderIndex = 8, ChapterName = "Bài 3: Cội nguồn yêu thương", LessonName = "Thực hành tiếng Việt: Trạng ngữ", SuggestedPeriods = 1, CreatedAt = now },
                    new() { OrderIndex = 9, ChapterName = "Bài 3: Cội nguồn yêu thương", LessonName = "Viết: Viết bài văn phân tích nhân vật trong tác phẩm văn học", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 10, ChapterName = "Bài 4: Giai điệu đất nước", LessonName = "Đọc: Mùa xuân nho nhỏ (Thanh Hải)", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 11, ChapterName = "Bài 4: Giai điệu đất nước", LessonName = "Đọc: Quê hương (Tế Hanh)", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 12, ChapterName = "Bài 4: Giai điệu đất nước", LessonName = "Thực hành tiếng Việt: Biện pháp tu từ so sánh, nhân hóa", SuggestedPeriods = 1, CreatedAt = now },
                    new() { OrderIndex = 13, ChapterName = "Bài 5: Màu sắc trăm miền", LessonName = "Đọc: Cây tre Việt Nam (Thép Mới)", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 14, ChapterName = "Bài 5: Màu sắc trăm miền", LessonName = "Viết: Viết bài văn biểu cảm về con người hoặc sự việc", SuggestedPeriods = 2, CreatedAt = now },
                }
            },

            // ═══════════════════════════════════════════════════════════════
            // TIẾNG ANH LỚP 7 — Kết nối tri thức (Global Success)
            // ═══════════════════════════════════════════════════════════════
            new CurriculumTemplate
            {
                Subject = "Tiếng Anh",
                Grade = 7,
                BookSet = "Kết nối tri thức",
                CreatedBy = null,
                IsPublic = true,
                SourceNote = "PPCT Tiếng Anh 7 Global Success — Bộ Kết nối tri thức với cuộc sống (2024-2025)",
                UsageCount = 0,
                CreatedAt = now,
                UpdatedAt = now,
                Lessons = new List<CurriculumTemplateLesson>
                {
                    new() { OrderIndex = 1, ChapterName = "Unit 1: Hobbies", LessonName = "Getting Started + A Closer Look 1", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 2, ChapterName = "Unit 1: Hobbies", LessonName = "A Closer Look 2 + Communication", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 3, ChapterName = "Unit 1: Hobbies", LessonName = "Skills 1 (Reading & Speaking) + Skills 2 (Listening & Writing)", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 4, ChapterName = "Unit 2: Healthy Living", LessonName = "Getting Started + A Closer Look 1", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 5, ChapterName = "Unit 2: Healthy Living", LessonName = "A Closer Look 2 + Communication", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 6, ChapterName = "Unit 2: Healthy Living", LessonName = "Skills 1 + Skills 2 + Looking Back & Project", SuggestedPeriods = 3, CreatedAt = now },
                    new() { OrderIndex = 7, ChapterName = "Unit 3: Community Service", LessonName = "Getting Started + A Closer Look 1", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 8, ChapterName = "Unit 3: Community Service", LessonName = "A Closer Look 2 + Communication", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 9, ChapterName = "Unit 3: Community Service", LessonName = "Skills 1 + Skills 2 + Looking Back & Project", SuggestedPeriods = 3, CreatedAt = now },
                    new() { OrderIndex = 10, ChapterName = "Review 1", LessonName = "Review 1: Language + Skills", SuggestedPeriods = 2, CreatedAt = now },
                    new() { OrderIndex = 11, ChapterName = "Unit 4: Music and Arts", LessonName = "Getting Started + A Closer Look 1 + A Closer Look 2", SuggestedPeriods = 3, CreatedAt = now },
                    new() { OrderIndex = 12, ChapterName = "Unit 4: Music and Arts", LessonName = "Communication + Skills 1 + Skills 2 + Looking Back & Project", SuggestedPeriods = 3, CreatedAt = now },
                }
            }
        };
    }
}
