# Tracking Task: Tạo câu hỏi trắc nghiệm từ tài liệu và xuất Google Form

## Mục tiêu
Cho phép giáo viên upload tài liệu Word, Excel hoặc PDF; hệ thống trích xuất nội dung, gửi kèm prompt và giới hạn số câu hỏi lên API ChatGPT; nhận lại danh sách câu hỏi trắc nghiệm; sau đó tạo Google Form từ dữ liệu trả về.

## Hiện trạng codebase liên quan
- Đã có luồng upload file tài liệu ở kho tài liệu giảng dạy.
- Backend hiện có `StorageController` và `StorageService` để lưu file.
- Frontend hiện có trang kho tài liệu ở khu vực giáo viên.

## Hướng triển khai
1. Mở rộng luồng upload hiện có để giáo viên chọn file tài liệu và nhập cấu hình tạo câu hỏi.
2. Backend nhận file, kiểm tra định dạng hợp lệ, trích xuất text theo loại file:
   - Word: đọc nội dung từ `.doc` / `.docx`
   - Excel: đọc dữ liệu từ `.xls` / `.xlsx`
   - PDF: trích text từ file PDF
3. Tạo một service AI để xây dựng prompt chuẩn, gửi nội dung tài liệu + yêu cầu giáo viên + giới hạn web lên ChatGPT API.
4. Chuẩn hóa response từ AI thành JSON có cấu trúc ổn định cho từng câu hỏi:
   - câu hỏi
   - 4 phương án trả lời
   - đáp án đúng
   - giải thích nếu cần
5. Tạo lớp mapping để chuyển JSON câu hỏi sang định dạng có thể tạo Google Form.
6. Tích hợp cách tạo Google Form:
   - Dùng Service Account gọi Google Forms API + Drive API
   - Share form cho email Google của GV (role: writer)
7. Frontend thêm UI cấu hình:
   - số câu hỏi mong muốn
   - mức độ khó
   - chủ đề / phạm vi
   - ngôn ngữ câu hỏi
   - nút xem trước và tạo Google Form
   - email Google của GV để nhận form
8. Thêm phản hồi trạng thái và xử lý lỗi:
   - file không hợp lệ
   - nội dung quá lớn
   - AI trả về sai cấu trúc
   - lỗi tạo Google Form

## Checklist thực thi
- [ ] Setup Google Cloud Project: tạo Service Account, bật Forms API + Drive API, lưu credentials vào env
- [x] Xác định điểm vào UI phù hợp để giáo viên upload và tạo quiz
- [ ] Thiết kế DTO cho request/response tạo câu hỏi
- [ ] Implement service trích xuất nội dung từ Word/Excel/PDF
- [ ] Implement service gọi ChatGPT API
- [ ] Chuẩn hóa schema câu hỏi trắc nghiệm
- [ ] Implement tạo Google Form hoặc export trung gian
- [ ] Thêm UI nhập prompt và số lượng câu hỏi
- [ ] Hiển thị preview câu hỏi trước khi xuất form
- [ ] Viết test cho parsing, AI mapping, và flow chính
- [ ] Kiểm tra giới hạn kích thước file và giới hạn số câu hỏi tối đa
  
## Tiêu chí hoàn thành
- Giáo viên upload file thành công.
- Hệ thống trả về danh sách câu hỏi trắc nghiệm theo yêu cầu.
- Giáo viên có thể tạo Google Form từ kết quả trả về.
- Có xử lý lỗi rõ ràng khi file hoặc response AI không hợp lệ.

## Rủi ro / điểm cần chốt trước khi code
- Cần setup Google Cloud Project và cấp đúng quyền cho Service Account (Forms API + Drive API)
- Cần xử lý trường hợp GV nhập sai email Google → form share thất bại
- Cần chốt format JSON đầu ra của ChatGPT để tránh response lệch schema.

## Ghi chú
Khi bắt đầu implement, nên đi theo thứ tự: upload -> extract text -> AI generate quiz -> preview -> Google Form export.

## Quyết định kỹ thuật cần chốt trước khi code
- Chọn hướng export Google Form: Forms API
- Dùng Service Account của hệ thống để tạo Google Form
- Sau khi tạo form: share cho email Google của GV (role: writer)
- GV nhận email thông báo + thấy form trong Google Drive
- Không cần OAuth2 verification vì không đăng nhập thay user
- Setup: Google Cloud Project → bật Forms API + Drive API → tạo Service Account → lưu credentials vào env
- GV cần cung cấp: email Google khi dùng tính năng này
- Giới hạn file: tối đa 20 MB, định dạng hợp lệ: .docx, .xlsx, .pdf (bỏ .doc cũ)
- Giới hạn số câu hỏi: tối đa 30 câu/lần
- Giới hạn nội dung gửi AI: tối đa 50000 ký tự / token; chiến lược nếu vượt: cảnh báo GV + truncate hoặc cho chọn phạm vi
- Model ChatGPT sử dụng: gpt-4o
- Luồng async khi gọi AI