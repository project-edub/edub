using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Data;

/// <summary>
/// Dữ liệu mặc định Lịch năm học 2025-2026 với các ngày nghỉ lễ Việt Nam.
/// CreatedBy = null (hệ thống), IsDefault = true.
/// </summary>
public static class SchoolYearCalendarSeedData
{
    public static SchoolYearCalendar GetDefaultCalendar()
    {
        var now = DateTime.UtcNow;

        return new SchoolYearCalendar
        {
            YearStart = new DateOnly(2025, 9, 5),   // Ngày khai giảng
            YearEnd = new DateOnly(2026, 5, 31),    // Ngày kết thúc năm học
            CreatedBy = null,
            IsDefault = true,
            CreatedAt = now,
            Holidays = new List<SchoolYearHoliday>
            {
                // Quốc khánh 2/9 (nghỉ 1/9 - 2/9/2025)
                new SchoolYearHoliday
                {
                    StartDate = new DateOnly(2025, 9, 1),
                    EndDate = new DateOnly(2025, 9, 2),
                    Name = "Quốc khánh 2/9"
                },

                // Tết Dương lịch (01/01/2026)
                new SchoolYearHoliday
                {
                    StartDate = new DateOnly(2026, 1, 1),
                    EndDate = new DateOnly(2026, 1, 1),
                    Name = "Tết Dương lịch"
                },

                // Tết Nguyên Đán 2026 (Năm Bính Ngọ, ~16/02 - 22/02/2026)
                new SchoolYearHoliday
                {
                    StartDate = new DateOnly(2026, 2, 16),
                    EndDate = new DateOnly(2026, 2, 22),
                    Name = "Tết Nguyên Đán 2026"
                },

                // Giỗ Tổ Hùng Vương (10/3 âm lịch ~ 06/04/2026)
                new SchoolYearHoliday
                {
                    StartDate = new DateOnly(2026, 4, 6),
                    EndDate = new DateOnly(2026, 4, 6),
                    Name = "Giỗ Tổ Hùng Vương (10/3 âm lịch)"
                },

                // Ngày Giải phóng miền Nam + Quốc tế Lao động (30/04 - 01/05/2026)
                new SchoolYearHoliday
                {
                    StartDate = new DateOnly(2026, 4, 30),
                    EndDate = new DateOnly(2026, 5, 1),
                    Name = "Giải phóng miền Nam & Quốc tế Lao động"
                }
            }
        };
    }
}
