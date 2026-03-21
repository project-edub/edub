using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Data;

public static class SampleData
{
    public static (List<User>, List<LecturerProfile>) GetSampleUsersAndProfiles()
    {
        var users = new List<User>
        {
            new User { FullName = "Nguyễn Thị Mai Anh", Email = "nguyenthimaianh@example.com", Role = "Lecturer", Status = "Active" },
            new User { FullName = "Trần Văn Minh", Email = "tranvanminh@example.com", Role = "Lecturer", Status = "Active" },
            new User { FullName = "Lê Thị Hoa", Email = "lethihoa@example.com", Role = "Lecturer", Status = "Active" },
            new User { FullName = "Phạm Đức Anh", Email = "phamducanh@example.com", Role = "Lecturer", Status = "Active" },
            new User { FullName = "Hoàng Minh Tuấn", Email = "hoangminhtuan@example.com", Role = "Lecturer", Status = "Active" },
            new User { FullName = "Đỗ Thị Lan", Email = "dothilan@example.com", Role = "Lecturer", Status = "Active" },
            new User { FullName = "Vũ Quang Vinh", Email = "vuquangvinh@example.com", Role = "Lecturer", Status = "Active" },
            new User { FullName = "Ngô Thanh Tùng", Email = "ngothanhtung@example.com", Role = "Lecturer", Status = "Active" }
        };

        var profiles = new List<LecturerProfile>
        {
            new LecturerProfile
            {
                UserId = 1,
                FullName = "Nguyễn Thị Mai Anh",
                Introduction = "Gia sư Toán học với hơn 8 năm kinh nghiệm dạy học sinh THPT và THCS. Chuyên gia trong việc giúp học sinh yếu kém cải thiện điểm số và đạt kết quả cao trong các kỳ thi.",
                AvatarUrl = "/avatars/nguyen-thi-mai-anh.jpg",
                Occupations = new List<ProfileOccupation>
                {
                    new() { Value = "Gia sư Toán học", SortOrder = 1 },
                    new() { Value = "Giảng viên Đại học", SortOrder = 2 }
                },
                TeachingLocations = new List<ProfileTeachingLocation>
                {
                    new() { Value = "Hà Nội", SortOrder = 1 },
                    new() { Value = "Hồ Chí Minh", SortOrder = 2 }
                },
                Expertises = new List<ProfileExpertise>
                {
                    new() { Specialty = "Toán học", Degree = "Thạc sĩ Toán học", SortOrder = 1 },
                    new() { Specialty = "Giáo dục", Degree = "Chứng chỉ sư phạm", SortOrder = 2 }
                },
                Experiences = new List<ProfileExperience>
                {
                    new() { Description = "Giảng viên Đại học Bách khoa Hà Nội (2018-nay)", SortOrder = 1 },
                    new() { Description = "Gia sư trung tâm Anh ngữ ABC (2016-2018)", SortOrder = 2 },
                    new() { Description = "Tốt nghiệp Đại học Sư phạm Hà Nội (2015)", SortOrder = 3 }
                }
            },
            new LecturerProfile
            {
                UserId = 2,
                FullName = "Trần Văn Minh",
                Introduction = "Gia sư Tiếng Anh chuyên nghiệp với chứng chỉ TESOL. Phương pháp giảng dạy hiện đại, tập trung vào giao tiếp thực tế và ngữ pháp. Đã giúp hàng trăm học sinh đạt điểm cao IELTS/TOEIC.",
                AvatarUrl = "/avatars/tran-van-minh.jpg",
                Occupations = new List<ProfileOccupation>
                {
                    new() { Value = "Gia sư Tiếng Anh", SortOrder = 1 },
                    new() { Value = "Dịch giả", SortOrder = 2 }
                },
                TeachingLocations = new List<ProfileTeachingLocation>
                {
                    new() { Value = "Đà Nẵng", SortOrder = 1 },
                    new() { Value = "Hội An", SortOrder = 2 }
                },
                Expertises = new List<ProfileExpertise>
                {
                    new() { Specialty = "Tiếng Anh", Degree = "Cử nhân Ngôn ngữ Anh", SortOrder = 1 },
                    new() { Specialty = "TESOL", Degree = "Chứng chỉ TESOL", SortOrder = 2 }
                },
                Experiences = new List<ProfileExperience>
                {
                    new() { Description = "Gia sư tại trung tâm Anh ngữ Wall Street (2020-nay)", SortOrder = 1 },
                    new() { Description = "Dịch viên cho công ty phần mềm FPT (2019-2020)", SortOrder = 2 },
                    new() { Description = "IELTS 8.5, TOEIC 950", SortOrder = 3 }
                }
            },
            new LecturerProfile
            {
                UserId = 3,
                FullName = "Lê Thị Hoa",
                Introduction = "Gia sư Ngữ văn và Lịch sử với 10 năm kinh nghiệm. Giáo viên THPT với phương pháp dạy học sáng tạo, giúp học sinh yêu thích môn học và đạt điểm cao trong các kỳ thi.",
                AvatarUrl = "/avatars/le-thi-hoa.jpg",
                Occupations = new List<ProfileOccupation>
                {
                    new() { Value = "Giáo viên THPT", SortOrder = 1 },
                    new() { Value = "Gia sư Ngữ văn", SortOrder = 2 }
                },
                TeachingLocations = new List<ProfileTeachingLocation>
                {
                    new() { Value = "Cần Thơ", SortOrder = 1 },
                    new() { Value = "Vĩnh Long", SortOrder = 2 }
                },
                Expertises = new List<ProfileExpertise>
                {
                    new() { Specialty = "Ngữ văn", Degree = "Giáo viên Ngữ văn", SortOrder = 1 },
                    new() { Specialty = "Lịch sử", Degree = "Giáo viên Lịch sử", SortOrder = 2 }
                },
                Experiences = new List<ProfileExperience>
                {
                    new() { Description = "Giáo viên THPT Nguyễn Trung Trực (2015-nay)", SortOrder = 1 },
                    new() { Description = "Tốt nghiệp Đại học Sư phạm Cần Thơ (2014)", SortOrder = 2 },
                    new() { Description = "Tham gia nhiều cuộc thi giáo viên giỏi cấp tỉnh", SortOrder = 3 }
                }
            },
            new LecturerProfile
            {
                UserId = 4,
                FullName = "Phạm Đức Anh",
                Introduction = "Gia sư Vật lý và Hóa học, kỹ sư cơ khí với 12 năm kinh nghiệm. Chuyên giảng dạy các môn khoa học tự nhiên với phương pháp thực hành và thí nghiệm.",
                AvatarUrl = "/avatars/pham-duc-anh.jpg",
                Occupations = new List<ProfileOccupation>
                {
                    new() { Value = "Gia sư Khoa học", SortOrder = 1 },
                    new() { Value = "Kỹ sư", SortOrder = 2 }
                },
                TeachingLocations = new List<ProfileTeachingLocation>
                {
                    new() { Value = "Hải Phòng", SortOrder = 1 },
                    new() { Value = "Quảng Ninh", SortOrder = 2 }
                },
                Expertises = new List<ProfileExpertise>
                {
                    new() { Specialty = "Vật lý", Degree = "Kỹ sư Vật lý", SortOrder = 1 },
                    new() { Specialty = "Hóa học", Degree = "Kỹ sư Hóa học", SortOrder = 2 }
                },
                Experiences = new List<ProfileExperience>
                {
                    new() { Description = "Kỹ sư tại nhà máy cơ khí Hải Phòng (2018-nay)", SortOrder = 1 },
                    new() { Description = "Gia sư trung tâm Khoa học ABC (2016-2018)", SortOrder = 2 },
                    new() { Description = "Tốt nghiệp Đại học Bách khoa Hà Nội (2015)", SortOrder = 3 }
                }
            },
            new LecturerProfile
            {
                UserId = 5,
                FullName = "Hoàng Minh Tuấn",
                Introduction = "Gia sư Tin học và Lập trình với 15 năm kinh nghiệm. Phát triển phần mềm chuyên nghiệp, giảng dạy từ cơ bản đến nâng cao với các dự án thực tế.",
                AvatarUrl = "/avatars/hoang-minh-tuan.jpg",
                Occupations = new List<ProfileOccupation>
                {
                    new() { Value = "Gia sư CNTT", SortOrder = 1 },
                    new() { Value = "Lập trình viên", SortOrder = 2 }
                },
                TeachingLocations = new List<ProfileTeachingLocation>
                {
                    new() { Value = "TP.HCM", SortOrder = 1 },
                    new() { Value = "Bình Dương", SortOrder = 2 }
                },
                Expertises = new List<ProfileExpertise>
                {
                    new() { Specialty = "Lập trình", Degree = "Kỹ sư CNTT", SortOrder = 1 },
                    new() { Specialty = "Tin học", Degree = "Chứng chỉ Microsoft", SortOrder = 2 }
                },
                Experiences = new List<ProfileExperience>
                {
                    new() { Description = "Senior Developer tại công ty phần mềm VNPT (2020-nay)", SortOrder = 1 },
                    new() { Description = "Giảng viên Đại học Công nghệ (2018-2020)", SortOrder = 2 },
                    new() { Description = "Tốt nghiệp Đại học FPT (2015)", SortOrder = 3 }
                }
            },
            new LecturerProfile
            {
                UserId = 6,
                FullName = "Đỗ Thị Lan",
                Introduction = "Gia sư Tiếng Pháp và Tiếng Đức với chứng chỉ DELF/DALF và Goethe-Zertifikat. Phương pháp giảng dạy chú trọng văn hóa và giao tiếp thực tế.",
                AvatarUrl = "/avatars/do-thi-lan.jpg",
                Occupations = new List<ProfileOccupation>
                {
                    new() { Value = "Gia sư Ngoại ngữ", SortOrder = 1 },
                    new() { Value = "Dịch giả", SortOrder = 2 }
                },
                TeachingLocations = new List<ProfileTeachingLocation>
                {
                    new() { Value = "Hà Nội", SortOrder = 1 },
                    new() { Value = "Nam Định", SortOrder = 2 }
                },
                Expertises = new List<ProfileExpertise>
                {
                    new() { Specialty = "Tiếng Pháp", Degree = "DELF B2, DALF C1", SortOrder = 1 },
                    new() { Specialty = "Tiếng Đức", Degree = "Goethe-Zertifikat C1", SortOrder = 2 }
                },
                Experiences = new List<ProfileExperience>
                {
                    new() { Description = "Gia sư tại trung tâm ngoại ngữ Alliance Française (2019-nay)", SortOrder = 1 },
                    new() { Description = "Dịch viên cho công ty Đức tại Việt Nam (2017-2019)", SortOrder = 2 },
                    new() { Description = "Du học Pháp và Đức (2015-2017)", SortOrder = 3 }
                }
            },
            new LecturerProfile
            {
                UserId = 7,
                FullName = "Vũ Quang Vinh",
                Introduction = "Gia sư Địa lý và Sinh học với 7 năm kinh nghiệm. Giáo viên tận tâm, sử dụng công nghệ và hình ảnh để giảng dạy sinh động và dễ hiểu.",
                AvatarUrl = "/avatars/vu-quang-vinh.jpg",
                Occupations = new List<ProfileOccupation>
                {
                    new() { Value = "Gia sư Khoa học xã hội", SortOrder = 1 },
                    new() { Value = "Giáo viên THCS", SortOrder = 2 }
                },
                TeachingLocations = new List<ProfileTeachingLocation>
                {
                    new() { Value = "Thanh Hóa", SortOrder = 1 },
                    new() { Value = "Nghệ An", SortOrder = 2 }
                },
                Expertises = new List<ProfileExpertise>
                {
                    new() { Specialty = "Địa lý", Degree = "Giáo viên Địa lý", SortOrder = 1 },
                    new() { Specialty = "Sinh học", Degree = "Giáo viên Sinh học", SortOrder = 2 }
                },
                Experiences = new List<ProfileExperience>
                {
                    new() { Description = "Giáo viên THCS Lê Quý Đôn (2018-nay)", SortOrder = 1 },
                    new() { Description = "Tốt nghiệp Đại học Sư phạm Vinh (2017)", SortOrder = 2 },
                    new() { Description = "Tham gia các chuyến thực tế địa lý", SortOrder = 3 }
                }
            },
            new LecturerProfile
            {
                UserId = 8,
                FullName = "Ngô Thanh Tùng",
                Introduction = "Gia sư Hóa học và Sinh học với bằng Thạc sĩ Hóa học. Chuyên gia trong việc giảng dạy thí nghiệm và nghiên cứu khoa học cho học sinh.",
                AvatarUrl = "/avatars/ngo-thanh-tung.jpg",
                Occupations = new List<ProfileOccupation>
                {
                    new() { Value = "Gia sư Hóa học", SortOrder = 1 },
                    new() { Value = "Nghiên cứu viên", SortOrder = 2 }
                },
                TeachingLocations = new List<ProfileTeachingLocation>
                {
                    new() { Value = "Hà Nội", SortOrder = 1 },
                    new() { Value = "Bắc Ninh", SortOrder = 2 }
                },
                Expertises = new List<ProfileExpertise>
                {
                    new() { Specialty = "Hóa học", Degree = "Thạc sĩ Hóa học", SortOrder = 1 },
                    new() { Specialty = "Sinh học", Degree = "Cử nhân Sinh học", SortOrder = 2 }
                },
                Experiences = new List<ProfileExperience>
                {
                    new() { Description = "Nghiên cứu viên tại Viện Hóa học (2020-nay)", SortOrder = 1 },
                    new() { Description = "Gia sư trung tâm Khoa học Tự nhiên (2018-2020)", SortOrder = 2 },
                    new() { Description = "Tốt nghiệp Đại học Khoa học Tự nhiên (2016)", SortOrder = 3 }
                }
            }
        };

        return (users, profiles);
    }
}