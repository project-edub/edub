# Requirements: Tính Năng Tạo Trò Chơi Ô Chữ (Crossword Generator)

## 1. Tổng Quan

Tính năng cho phép giáo viên tải lên tài liệu (Word, Excel, PowerPoint, PDF), cấu hình các tham số trò chơi, gửi dữ liệu tới OpenAI API để tự động sinh câu đố ô chữ, hiển thị trò chơi tương tác và cho phép chỉnh sửa nội dung trước khi giao cho học sinh. Mỗi lần tạo tiêu tốn một lượng **ECoin** tương ứng với cấu hình đã chọn.

---

## 2. Người Dùng & Vai Trò

| Vai trò | Quyền hạn |
|---|---|
| **Giáo viên** | Upload tài liệu, cấu hình, tạo, chỉnh sửa và xuất ô chữ |
| **Học sinh** | Chơi ô chữ đã được giáo viên phát hành |
| **Quản trị viên** | Quản lý quota API, cấu hình gói subscription, kiểm duyệt nội dung |

---

## 3. Gói Subscription & Giới Hạn

Các giới hạn sau áp dụng dựa theo gói subscription của tài khoản giáo viên:

| Giới hạn | Gói Free | Gói Basic | Gói Pro |
|---|---|---|---|
| Số file tối đa mỗi lần tạo | 1 | 3 | 5 |
| Kích thước file tối đa | 5 MB | 20 MB | 50 MB |
| Số từ tối đa có thể chọn | 15 | 30 | 60 |
| Số lần tạo mới mỗi ngày | 3 | 10 | Không giới hạn |
| Lưu nháp tự động | ✗ | ✓ | ✓ |
| Xuất PDF để in | ✗ | ✓ | ✓ |
| Kiểu gợi ý nâng cao (`fill-in-blank`, `multiple-choice`) | ✗ | ✗ | ✓ |

> **Lưu ý triển khai:** Khi giáo viên vượt giới hạn gói, hiển thị thông báo rõ ràng kèm link nâng cấp. Không chặn thầm lặng.

---

## 4. ECoin — Chi Phí Thực Hiện Tác Vụ AI

Mỗi lần gọi OpenAI API để tạo hoặc tạo lại ô chữ đều tiêu ECoin từ tài khoản giáo viên.

### 4.1 Bảng Tính ECoin

Chi phí được tính tại thời điểm giáo viên nhấn **"Tạo ô chữ"** hoặc **"Tạo lại"**, dựa theo công thức:

```
ECoin = ECoin_cơ_bản(số từ) + ECoin_kiểu_gợi_ý + ECoin_ngôn_ngữ
```

| Thành phần | Giá trị | ECoin |
|---|---|---|
| **Số từ** | 5–15 từ | 5 ECoin |
| | 16–30 từ | 10 ECoin |
| | 31–60 từ | 20 ECoin |
| **Kiểu gợi ý** | Định nghĩa (`definition`) | +0 |
| | Điền vào chỗ trống (`fill-in-blank`) | +3 |
| | Trắc nghiệm (`multiple-choice`) | +5 |
| **Ngôn ngữ** | Tiếng Việt hoặc Tiếng Anh | +0 |
| | Song ngữ (`bilingual`) | +5 |

**Tính năng Tạo lại (Regenerate):** tính phí bằng **50% chi phí ban đầu** (làm tròn lên), vì không cần xử lý lại file.

### 4.2 Quy Tắc Xử Lý ECoin

- **FR-EC-01** — Hiển thị số ECoin dự kiến tiêu tốn trên màn hình cấu hình, cập nhật realtime khi giáo viên thay đổi thông số. Yêu cầu xác nhận trước khi trừ.
- **FR-EC-02** — Chỉ trừ ECoin **sau khi** API trả về kết quả thành công. Nếu API lỗi hoặc timeout, không trừ.
- **FR-EC-03** — Nếu tài khoản không đủ ECoin, vô hiệu hóa nút "Tạo ô chữ" và hiển thị thông báo kèm link nạp thêm.
- **FR-EC-04** — Ghi log mỗi giao dịch ECoin: `userId`, `gameId`, `ecoinsSpent`, `action` (`generate` | `regenerate`), `timestamp`.

---

## 5. Luồng Chức Năng Chính

```
[Giáo viên upload tài liệu]
         ↓
[Cấu hình thông số trò chơi]
         ↓
[Hiển thị ECoin dự kiến → Giáo viên xác nhận]
         ↓
[Gửi tới OpenAI API → nhận danh sách từ + gợi ý]
         ↓
[Trừ ECoin — Hệ thống xây dựng lưới ô chữ]
         ↓
[Hiển thị preview & trình soạn thảo]
         ↓
[Giáo viên xem xét / chỉnh sửa]
         ↓
[Xuất bản cho học sinh]
```

---

## 6. Yêu Cầu Chức Năng

### 6.1 Upload & Xử Lý Tài Liệu

**FR-01** — Hỗ trợ upload các định dạng:
- `.docx`, `.doc` (Microsoft Word)
- `.xlsx`, `.xls` (Microsoft Excel)
- `.pptx`, `.ppt` (Microsoft PowerPoint)
- `.pdf`

**FR-02** — Giới hạn số file và kích thước mỗi file áp dụng theo gói subscription (xem Mục 3).

**FR-03** — Hệ thống trích xuất văn bản từ tài liệu phía server trước khi gửi tới OpenAI:
- Word/PowerPoint: dùng `python-docx`, `python-pptx` để lấy toàn bộ text
- Excel: đọc từng sheet, từng cell; ưu tiên các cột dạng "Từ / Định nghĩa" nếu có
- PDF: text extraction với `pdfplumber`; fallback sang OCR (`pytesseract`) nếu là PDF scan

**FR-04** — Hiển thị xem trước văn bản đã trích xuất để giáo viên xác nhận trước khi gửi API.

**FR-05** — Không lưu trữ nội dung tài liệu quá **24 giờ** sau khi trò chơi được tạo.

---

### 6.2 Cấu Hình Thông Số Trò Chơi

Giáo viên điều chỉnh các thông số sau. Các tùy chọn bị giới hạn bởi gói subscription được disable kèm tooltip giải thích.

| Tên hiển thị | Tên nội bộ | Kiểu dữ liệu | Mặc định | Mô tả |
|---|---|---|---|---|
| **Độ khó** | `difficulty` | enum | `medium` | `Dễ` / `Trung bình` / `Khó` — ảnh hưởng độ dài từ và độ phức tạp gợi ý |
| **Số từ mong muốn** | `wordCount` | integer | `15` | Tối thiểu 5; tối đa theo gói subscription |
| **Ngôn ngữ** | `language` | enum | `vi` | `Tiếng Việt` / `Tiếng Anh` / `Song ngữ` |
| **Kiểu gợi ý** | `clueStyle` | enum | `definition` | `Định nghĩa` / `Điền vào chỗ trống` / `Trắc nghiệm` |
| **Chủ đề bổ sung** | `topic` | string | _(từ tài liệu)_ | Từ khóa định hướng AI chọn từ phù hợp hơn |
| **Từ loại trừ** | `excludeWords` | string[] | `[]` | Danh sách từ không đưa vào ô chữ |
| **Kích thước lưới** | `gridSize` | enum | `auto` | `Tự động` / `Nhỏ (10×10)` / `Vừa (15×15)` / `Lớn (20×20)` |

---

### 6.3 Tích Hợp OpenAI API

**FR-06** — Gọi `POST /v1/chat/completions` với model `gpt-4o` (cấu hình được trong admin).

**FR-07** — Prompt yêu cầu trả về JSON có cấu trúc:

```json
{
  "words": [
    {
      "word": "QUANG_HOP",
      "displayWord": "Quang hợp",
      "clue": "Quá trình cây xanh chuyển hóa ánh sáng thành năng lượng",
      "difficulty": "medium",
      "sourceContext": "Trang 3, đoạn 2"
    }
  ]
}
```

**FR-08** — Validate response: kiểm tra định dạng JSON, loại bỏ ký tự đặc biệt, chuẩn hóa `word` sang chữ hoa không dấu.

**FR-09** — Timeout: **30 giây**; hiển thị lỗi rõ ràng, không trừ ECoin.

**FR-10** — Tự động retry tối đa **2 lần** nếu API trả lỗi 5xx; nếu vẫn lỗi sau 2 lần thì dừng, không trừ ECoin.

**FR-11** — Nút **"Tạo lại"**: giáo viên yêu cầu AI sinh danh sách từ khác từ cùng tài liệu; phí = 50% ban đầu.

---

### 6.4 Thuật Toán Xây Dựng Lưới Ô Chữ

**FR-12** — Dùng thuật toán backtracking để xếp từ lên lưới 2D sau khi có danh sách từ từ API.

**FR-13** — Tiêu chí xếp từ:
- Từ đầu tiên (dài nhất) đặt ngang ở trung tâm lưới
- Ưu tiên các từ chia sẻ chữ cái chung để tối đa giao điểm
- Không có từ nào chồng lên nhau trái quy tắc
- Tối thiểu **40% số từ** phải giao nhau ít nhất một lần

**FR-14** — Nếu không xếp được đủ số từ, tự động giảm bớt và thông báo rõ cho giáo viên.

**FR-15** — Sinh tự động số thứ tự (1, 2, 3...) theo thứ tự đọc (trái → phải, trên → dưới).

---

### 6.5 Hiển Thị UI Trò Chơi

**FR-16 — Giao diện Editor (giáo viên):**
- Lưới ô chữ tương tác
- Panel danh sách câu hỏi Ngang / Dọc
- Nút chỉnh sửa, xóa từng câu hỏi
- Nút thêm từ thủ công
- Nút "Xem trước như học sinh"

**FR-17 — Giao diện chơi (học sinh):**
- Click vào ô → highlight cả từ + hiện câu gợi ý
- Nhập chữ cái; tự động di chuyển sang ô tiếp theo
- Kiểm tra đáp án từng từ hoặc toàn bộ
- Hiển thị tiến độ (số từ đúng / tổng số từ)
- Timer tùy chọn; hỗ trợ bàn phím vật lý và bàn phím ảo mobile

**FR-18** — Responsive: desktop (≥1024px), tablet (768–1023px), mobile (≤767px).

---

### 6.6 Chỉnh Sửa Nội Dung (Editor)

**FR-19** — Giáo viên có thể chỉnh sửa:
- Câu gợi ý của từng từ
- Đáp án của từng từ (lưới tự động cập nhật)
- Xóa một từ khỏi lưới
- Thêm từ mới thủ công (nhập từ + câu gợi ý)

**FR-20** — Thêm/xóa/sửa từ → hệ thống tính lại lưới và cập nhật số thứ tự tự động.

**FR-21** — Lưu nháp tự động mỗi 60 giây (chỉ gói Basic trở lên; xem Mục 3).

**FR-22** — Undo/Redo tối đa **20 bước**.

---

### 6.7 Xuất Bản & Chia Sẻ

**FR-23** — Xuất bản tạo URL duy nhất (slug ngẫu nhiên), ví dụ: `/play/abc123`.

**FR-24** — Giáo viên có thể đặt deadline, bật/tắt hiển thị đáp án sau khi hết giờ, giới hạn số lần thử.

**FR-25** — Xuất PDF để in (chỉ gói Basic trở lên): PDF lưới trắng (học sinh điền tay) và PDF đáp án.

---

## 7. Yêu Cầu Phi Chức Năng

- **Hiệu suất:** Toàn bộ luồng upload → tạo lưới hoàn thành trong < 45 giây; trang chơi load < 2 giây (TTI)
- **Bảo mật:** API key OpenAI chỉ ở backend; sanitize nội dung tài liệu trước khi đưa vào prompt; không log nội dung file
- **Khả năng mở rộng:** Module AI tách biệt, dễ thay provider (OpenAI → Gemini → Claude); schema ô chữ độc lập với AI
- **Accessibility:** Điều hướng lưới bằng bàn phím (Tab, mũi tên); ARIA labels cho ô và câu gợi ý

---

## 8. Mô Hình Dữ Liệu

```typescript
interface CrosswordGame {
  id: string;
  createdBy: string;            // teacher user ID
  title: string;
  status: 'draft' | 'published' | 'archived';
  config: GameConfig;
  grid: CrosswordGrid;
  words: CrosswordWord[];
  sourceDocuments: string[];    // file IDs (xóa sau 24h)
  ecoinsSpent: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  expiresAt?: Date;
}

interface CrosswordWord {
  id: string;
  word: string;                 // chữ hoa, không dấu (dùng trong lưới)
  displayWord: string;          // gốc có dấu (hiển thị gợi ý)
  clue: string;
  direction: 'across' | 'down';
  startRow: number;
  startCol: number;
  number: number;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceContext?: string;
}

interface CrosswordGrid {
  rows: number;
  cols: number;
  cells: GridCell[][];
}

interface GridCell {
  letter: string | null;        // null = ô đen
  wordIds: string[];
  number?: number;
}

interface GameConfig {
  difficulty: 'easy' | 'medium' | 'hard';
  wordCount: number;
  language: 'vi' | 'en' | 'bilingual';
  clueStyle: 'definition' | 'fill-in-blank' | 'multiple-choice';
  gridSize: 'auto' | 'small' | 'medium' | 'large';
  topic?: string;
  excludeWords?: string[];
  timerEnabled: boolean;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  showAnswerAfterExpiry: boolean;
}

interface EcoinTransaction {
  id: string;
  userId: string;
  gameId: string;
  ecoinsSpent: number;
  action: 'generate' | 'regenerate';
  timestamp: Date;
}
```

---

## 9. API Endpoints (Backend)

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/crossword/upload` | Upload tài liệu → `documentId` + văn bản trích xuất |
| `POST` | `/api/crossword/estimate` | Tính ECoin dự kiến theo config (không gọi AI) |
| `POST` | `/api/crossword/generate` | Gọi OpenAI → trả lưới; trừ ECoin sau khi thành công |
| `POST` | `/api/crossword/regenerate/:gameId` | Tạo lại từ tài liệu cũ; phí 50% |
| `GET` | `/api/crossword/:gameId` | Lấy thông tin trò chơi (teacher view) |
| `PUT` | `/api/crossword/:gameId` | Cập nhật toàn bộ trò chơi |
| `PATCH` | `/api/crossword/:gameId/word/:wordId` | Chỉnh sửa một từ |
| `POST` | `/api/crossword/:gameId/publish` | Xuất bản trò chơi |
| `GET` | `/api/play/:slug` | Dữ liệu trò chơi (student view, ẩn đáp án) |
| `POST` | `/api/play/:slug/submit` | Học sinh nộp đáp án |
| `GET` | `/api/crossword/:gameId/export/pdf` | Xuất PDF để in (Basic+) |

---

## 10. Prompt Engineering (OpenAI)

```
Bạn là trợ lý giáo dục chuyên tạo câu đố ô chữ từ tài liệu học tập.

Nhiệm vụ: Trích xuất {wordCount} từ/cụm từ quan trọng và viết câu gợi ý phù hợp.

Yêu cầu:
- Ngôn ngữ: {language}
- Độ khó: {difficulty}
  • Dễ: từ phổ biến, gợi ý trực tiếp
  • Trung bình: từ chuyên ngành, gợi ý gián tiếp
  • Khó: từ phức tạp, gợi ý ẩn dụ
- Kiểu gợi ý: {clueStyle}
- Độ dài từ: 3–20 ký tự; không chứa khoảng trắng (dùng gạch dưới cho cụm từ)
- Chỉ trả về JSON theo schema dưới đây, không thêm giải thích

Schema:
{
  "words": [
    {
      "word": "TU_KHOA_KHONG_DAU",
      "displayWord": "Từ khóa gốc",
      "clue": "Câu gợi ý",
      "difficulty": "easy|medium|hard",
      "sourceContext": "Đoạn nguồn tối đa 100 ký tự"
    }
  ]
}
```

---

## 11. Xử Lý Tiếng Việt

- Từ trong lưới: **chữ hoa, bỏ dấu** (vd: "quang hợp" → `QUANG_HOP`)
- Câu gợi ý giữ nguyên dấu tiếng Việt
- Khi học sinh nhập: normalize (bỏ dấu, uppercase) trước khi so sánh đáp án
- Hiển thị `displayWord` (có dấu) trong panel câu hỏi để học sinh hiểu ngữ nghĩa

---

## 12. Rủi Ro & Giải Pháp

| Rủi ro | Mức độ | Giải pháp |
|---|---|---|
| AI trả về từ không phù hợp tài liệu | Cao | Giáo viên review trước khi xuất bản; có nút Tạo lại |
| Thuật toán xếp lưới không đủ từ | Trung bình | Tự động giảm từ, thông báo rõ cho giáo viên |
| Giáo viên hết ECoin giữa chừng | Trung bình | Kiểm tra đủ ECoin trước khi gọi API; hiển thị dự toán |
| PDF scan không trích xuất được text | Thấp | Fallback OCR; cảnh báo nếu chất lượng thấp |
| Nội dung tài liệu nhạy cảm | Thấp | Không log prompt; xóa file sau 24h; backend proxy |

---

## 13. Tiêu Chí Chấp Nhận (Definition of Done)

- [ ] Giáo viên upload file và tạo ô chữ trong vòng 60 giây
- [ ] ECoin được tính đúng và trừ chỉ khi API thành công
- [ ] Giới hạn theo gói subscription hoạt động chính xác (số file, số từ, tính năng)
- [ ] Lưới hiển thị đúng, không có từ chồng sai quy tắc
- [ ] Học sinh điền đáp án và nhận phản hồi đúng/sai chính xác
- [ ] Chỉnh sửa câu hỏi và lưu thành công không mất dữ liệu khác
- [ ] Hoạt động trên Chrome, Firefox, Safari phiên bản 2 năm gần nhất
