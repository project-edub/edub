# Design: Tính Năng Tạo Trò Chơi Ô Chữ (Crossword Generator)

## 1. Tổng Quan Kiến Trúc

### 1.1 Công Nghệ

| Layer | Công nghệ |
|---|---|
| Frontend | React + TypeScript |
| State management | Zustand (local UI state) + React Query (server state) |
| Styling | Tailwind CSS + CSS variables |
| File parsing (server) | Python: `python-docx`, `python-pptx`, `pdfplumber`, `pytesseract` |
| Backend API | REST (Node.js/Express hoặc Next.js API routes) |
| AI | OpenAI `gpt-4o` qua backend proxy |
| PDF export | `puppeteer` hoặc `react-pdf` |

### 1.2 Cấu Trúc Thư Mục (Frontend)

```
src/
├── features/
│   └── crossword/
│       ├── components/
│       │   ├── creator/              # Luồng tạo mới (giáo viên)
│       │   │   ├── FileUploadZone.tsx
│       │   │   ├── DocumentPreview.tsx
│       │   │   ├── GameConfigForm.tsx
│       │   │   ├── EcoinEstimator.tsx
│       │   │   └── GenerateConfirmModal.tsx
│       │   ├── editor/               # Chỉnh sửa sau khi tạo
│       │   │   ├── CrosswordEditor.tsx
│       │   │   ├── CrosswordGrid.tsx
│       │   │   ├── GridCell.tsx
│       │   │   ├── CluePanel.tsx
│       │   │   ├── WordEditModal.tsx
│       │   │   └── EditorToolbar.tsx
│       │   ├── player/               # Giao diện học sinh
│       │   │   ├── CrosswordPlayer.tsx
│       │   │   ├── PlayerGrid.tsx
│       │   │   ├── PlayerCell.tsx
│       │   │   ├── ClueDisplay.tsx
│       │   │   └── ProgressBar.tsx
│       │   └── shared/
│       │       ├── SubscriptionGate.tsx
│       │       └── EcoinBadge.tsx
│       ├── hooks/
│       │   ├── useCrosswordStore.ts   # Zustand store
│       │   ├── useGridBuilder.ts      # Thuật toán xếp lưới
│       │   ├── useEcoinEstimate.ts
│       │   ├── useUndoRedo.ts
│       │   └── useAutoSave.ts
│       ├── services/
│       │   ├── crosswordApi.ts        # React Query calls
│       │   └── viNormalizer.ts        # Xử lý tiếng Việt
│       ├── types/
│       │   └── crossword.types.ts
│       └── utils/
│           ├── gridBuilder.ts         # Logic backtracking
│           └── ecoinCalculator.ts
```

---

## 2. Luồng Màn Hình (Screen Flow)

```
/crossword/new
    Bước 1: Upload tài liệu
    Bước 2: Xem trước nội dung trích xuất
    Bước 3: Cấu hình thông số + xem ECoin dự kiến
    Bước 4: Xác nhận → Loading (gọi AI)
         ↓
/crossword/:gameId/edit
    Editor: Lưới + Panel câu hỏi + Toolbar
         ↓
/crossword/:gameId/publish (modal)
    Cài đặt deadline, tạo link chia sẻ
         ↓
/play/:slug
    Giao diện học sinh (public)
```

---

## 3. Màn Hình Tạo Mới — `/crossword/new`

### 3.1 Layout Tổng Thể

Wizard 3 bước, thanh step indicator ở trên cùng. Mỗi bước chiếm toàn màn hình; không cuộn giữa các bước.

```
┌─────────────────────────────────────────────────────┐
│  ← Quay lại   ①Upload  ②Xem trước  ③Cấu hình      │
├─────────────────────────────────────────────────────┤
│                                                     │
│                [Nội dung bước hiện tại]             │
│                                                     │
├─────────────────────────────────────────────────────┤
│                              [Tiếp theo →]          │
└─────────────────────────────────────────────────────┘
```

### 3.2 Bước 1 — Upload Tài Liệu (`FileUploadZone`)

```
┌─────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────┐        │
│  │   📄  Kéo thả file vào đây              │        │
│  │       hoặc  [Chọn file]                 │        │
│  │                                         │        │
│  │   Hỗ trợ: .docx .xlsx .pptx .pdf       │        │
│  │   Tối đa: 3 file · 20MB/file (Basic)   │        │
│  └─────────────────────────────────────────┘        │
│                                                     │
│  File đã chọn:                                      │
│  ┌─────────────────────────────────────┐            │
│  │ 📄 bai_hoc_sinh_hoc.pdf  2.3MB  ✕  │            │
│  └─────────────────────────────────────┘            │
└─────────────────────────────────────────────────────┘
```

**Giới hạn subscription:**
- Số file tối đa và kích thước đọc từ `subscriptionLimits[user.plan]`
- Nếu vượt giới hạn: toast + modal upgrade, không cho thêm file
- Nút "Chọn file" disabled khi đạt giới hạn, tooltip giải thích

**States của FileUploadZone:** `idle` → `dragover` → `uploading` (progress bar) → `success` | `error` (inline error)

### 3.3 Bước 2 — Xem Trước Nội Dung (`DocumentPreview`)

Tabs theo từng file upload, nội dung text scroll được.

```
┌─────────────────────────────────────────────────────┐
│  [bai_hoc_sinh_hoc.pdf]  [slide_chuong2.pptx]       │
│ ─────────────────────────────────────────────────── │
│  ┌───────────────────────────────────────────────┐  │
│  │ Chương 1: Tế bào và cấu trúc tế bào          │  │
│  │ Tế bào là đơn vị cơ bản của sự sống...       │  │
│  └───────────────────────────────────────────────┘  │
│  ⚠️ OCR — có thể có lỗi nhỏ  (chip màu vàng)       │
└─────────────────────────────────────────────────────┘
```

**Chất lượng trích xuất:**
- `good` (text-based PDF) — Không chip
- `fair` (OCR confidence > 80%) — Chip vàng: "OCR — có thể có lỗi nhỏ"
- `poor` (OCR confidence < 80%) — Chip đỏ: "Chất lượng thấp — kết quả AI có thể không chính xác"
- `empty` (không trích xuất được gì) — Lỗi đỏ, chặn tiếp tục, hướng dẫn upload lại

### 3.4 Bước 3 — Cấu Hình (`GameConfigForm` + `EcoinEstimator`)

Layout 2 cột desktop, 1 cột mobile. Cột phải sticky.

```
┌──────────────────────────┬──────────────────────────┐
│  CẤU HÌNH TRÒ CHƠI       │  CHI PHÍ DỰ KIẾN         │
│                           │  ┌──────────────────────┐ │
│  Độ khó                   │  │ ECoin cơ bản   10 🪙  │ │
│  ○ Dễ  ● Trung bình ○ Khó │  │ + Song ngữ      5 🪙  │ │
│                           │  │ ──────────────────── │ │
│  Số từ mong muốn          │  │ Tổng           15 🪙  │ │
│  [───────●────────] 20   │  │                      │ │
│  (max 30 — Gói Basic)    │  │ Số dư hiện tại: 42🪙  │ │
│                           │  │ Sau khi tạo:    27🪙  │ │
│  Ngôn ngữ                 │  └──────────────────────┘ │
│  [Tiếng Việt ▾]           │                           │
│                           │  [  Tạo ô chữ  ]          │
│  Kiểu gợi ý               │                           │
│  [Định nghĩa ▾]           │                           │
│  🔒 Nâng cao (Pro)        │                           │
│                           │                           │
│  Chủ đề bổ sung           │                           │
│  [Sinh học tế bào...]    │                           │
│                           │                           │
│  Từ loại trừ              │                           │
│  [tag: "axit"] [+Thêm]   │                           │
│                           │                           │
│  Kích thước lưới          │                           │
│  ○ Tự động  ○ Nhỏ  ● Vừa │                           │
└──────────────────────────┴──────────────────────────┘
```

**Chi tiết controls:**

- `Độ khó` — Radio pills (3 lựa chọn ngang)
- `Số từ mong muốn` — Slider + input number; max lấy từ `subscriptionLimits[user.plan].maxWords`
- `Kiểu gợi ý` — Dropdown; `fill-in-blank` và `multiple-choice` hiện icon 🔒 + disabled nếu không phải Pro; hover → tooltip "Tính năng dành cho gói Pro"
- `Từ loại trừ` — Tag input: gõ từ + Enter để thêm, click × để xóa

**EcoinEstimator (sidebar):**
- Cập nhật realtime, debounce 300ms
- Nếu số dư < chi phí: vùng summary đổi nền đỏ nhạt; nút "Tạo ô chữ" disabled; hiện link "Nạp thêm ECoin"
- Nút "Tạo ô chữ" mở `GenerateConfirmModal` trước khi gọi API

**`GenerateConfirmModal`:**

```
┌────────────────────────────────────┐
│  Xác nhận tạo ô chữ               │
│                                    │
│  Thao tác này sẽ tiêu tốn:        │
│  ┌──────────────────────────────┐  │
│  │  15 ECoin                    │  │
│  │  Số dư còn lại: 27 ECoin    │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Huỷ]         [Xác nhận & Tạo]   │
└────────────────────────────────────┘
```

### 3.5 Loading State (Đang Gọi AI)

Toàn màn hình loading. Fake progress bar 0→90%, dừng chờ API xong.

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              ⠋ Đang phân tích tài liệu...           │
│                                                     │
│   ████████████████░░░░░░░░░░░░  68%                 │
│                                                     │
│   AI đang chọn từ và viết câu gợi ý.               │
│   Thường mất 10–30 giây.                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Dòng trạng thái cycling mỗi 4 giây:
1. "Đang phân tích tài liệu..."
2. "AI đang chọn từ khoá..."
3. "Đang viết câu gợi ý..."
4. "Đang xây dựng lưới ô chữ..."

---

## 4. Màn Hình Editor — `/crossword/:gameId/edit`

### 4.1 Layout Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│ TOOLBAR: [←] [Tên trò chơi]  [Undo][Redo]  [🔄 Tạo lại 8🪙]  [Xuất bản →] │
├──────────────────────────────┬───────────────────────────────────────┤
│                              │                                       │
│     LƯỚI Ô CHỮ               │   DANH SÁCH CÂU HỎI                  │
│                              │                                       │
│   ¹Q  U  A  N  G  H  O  P    │   NGANG                              │
│      I                       │   1. [Quang hợp]  Quá trình...  ✏️  │
│   ²  B  I  O  L  O  G  Y     │   3. [Tế bào]     Đơn vị cơ...  ✏️  │
│      O                       │                                       │
│      S                       │   DỌC                                │
│      O                       │   2. [Ribosome]   Bào quan...   ✏️  │
│      M                       │   4. [Protein]    Đại phân...   ✏️  │
│      E                       │                                       │
│                              │   [+ Thêm từ thủ công]               │
│                              │                                       │
├──────────────────────────────┴───────────────────────────────────────┤
│  ⚠️ 2 từ không xếp được: [ARN], [ENZYME]         [Xem chi tiết ▾]  │
└──────────────────────────────────────────────────────────────────────┘
```

**Layout mobile (≤767px):** Lưới full-width trên cùng. Panel câu hỏi là bottom sheet cố định ở đáy; tap vào ô → bottom sheet scroll đến câu hỏi tương ứng.

### 4.2 Component `CrosswordGrid` (Editor Mode)

CSS Grid, kích thước ô: `40px` (desktop) / `34px` (tablet) / `28px` (mobile).

**Mỗi ô (`GridCell`):**
```
┌──────┐
│ ¹    │  ← số thứ tự, font nhỏ, góc trên trái
│  Q   │  ← chữ cái, font lớn, trung tâm
└──────┘
```

**Màu sắc ô:**

| Trạng thái | Class |
|---|---|
| Ô đen | `bg-gray-900` |
| Bình thường | `bg-white border border-gray-300` |
| Từ đang chọn (highlight) | `bg-blue-100 border-blue-400` |
| Con trỏ đang ở | `bg-blue-300` |
| Đúng (sau check) | `bg-green-100` |
| Sai (sau check) | `bg-red-100` |

**Tương tác editor mode:**
- Click ô → highlight cả từ + scroll panel đến câu hỏi tương ứng
- Click 2 lần ô giao nhau → chuyển giữa từ ngang / dọc
- Grid read-only trong editor (không nhập liệu trực tiếp); chỉnh sửa qua `WordEditModal`

### 4.3 Component `CluePanel`

```
┌─────────────────────────────────────────────────┐
│  NGANG                                          │
│                                                 │
│  ▶ 1.  Quang hợp                               │
│        Quá trình cây xanh chuyển hóa ánh sáng  │
│        thành năng lượng                         │
│        [Chỉnh sửa ✏️]  [Xoá 🗑]                │
│                                                 │
│    3.  Tế bào — Đơn vị cơ bản của sự sống      │
│        [Chỉnh sửa ✏️]  [Xoá 🗑]                │
│                                                 │
│  DỌC                                            │
│  ...                                            │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  + Thêm từ thủ công                      │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

Item active (ứng với ô đang click trên lưới) có nền highlight (`bg-blue-50`) và tự động scroll vào view.

### 4.4 `WordEditModal`

```
┌──────────────────────────────────────────────────┐
│  Chỉnh sửa câu hỏi                         [✕]  │
│                                                  │
│  Đáp án                                          │
│  ┌──────────────────────────────────────────┐    │
│  │  QUANG HOP                               │    │
│  └──────────────────────────────────────────┘    │
│  ⚠️ Thay đổi đáp án sẽ tính toán lại lưới        │
│                                                  │
│  Câu gợi ý                                       │
│  ┌──────────────────────────────────────────┐    │
│  │  Quá trình cây xanh chuyển hóa ánh sáng  │    │
│  │  thành năng lượng                         │    │
│  └──────────────────────────────────────────┘    │
│                                                  │
│  Nguồn tài liệu (chỉ đọc)                        │
│  "Trang 3, đoạn 2"                               │
│                                                  │
│  [Huỷ]                         [Lưu thay đổi]   │
└──────────────────────────────────────────────────┘
```

**Validation:** Đáp án 3–20 ký tự, chỉ chữ cái và `_`. Câu gợi ý không rỗng.

### 4.5 `EditorToolbar`

```
[← Quay lại]  [Tên trò chơi ✏️]  [↩ Undo] [↪ Redo]  [🔄 Tạo lại · 8🪙]  [Xuất bản →]
                                                            "Đã lưu lúc 14:32" (Basic+)
```

- Undo/Redo disabled khi không có lịch sử
- "Tạo lại" mở modal xác nhận ECoin (50% phí) trước khi gọi API
- "Tạo lại" chỉ hiển thị badge ECoin sau khi đã tính `calculateRegenerateEcoin(config)`

### 4.6 Banner Từ Không Xếp Được

```
⚠️ 2 từ không xếp được vào lưới: [ARN], [ENZYME]    [Xem chi tiết ▾]
```

Click "Xem chi tiết" mở accordion giải thích lý do (không có chữ cái chung với các từ đã xếp).

---

## 5. Modal Xuất Bản (`PublishModal`)

```
┌──────────────────────────────────────────────┐
│  Xuất bản trò chơi                     [✕]  │
│                                              │
│  Thời hạn (tuỳ chọn)                         │
│  ○ Không giới hạn                            │
│  ● Đặt deadline   [25/12/2025  23:59  ▾]   │
│                                              │
│  Hiển thị đáp án sau khi hết hạn            │
│  [Toggle: Bật]                               │
│                                              │
│  Số lần thử tối đa                           │
│  ○ Không giới hạn   ● [  3  ] lần           │
│                                              │
│  ──────────────────────────────────────      │
│  Link chia sẻ (sau khi xuất bản):           │
│  https://app.com/play/abc123        [📋]    │
│                                              │
│  [Xuất PDF 🖨️]         [Xuất bản ngay →]    │
└──────────────────────────────────────────────┘
```

Nút "Xuất PDF" chỉ active với gói Basic+; gói Free hiện disabled + tooltip "Nâng cấp để xuất PDF".

---

## 6. Màn Hình Chơi — `/play/:slug`

### 6.1 Layout Desktop

```
┌────────────────────────────────────────────────────────────────────┐
│  🧩 Tế Bào Và Sự Sống                        ⏱️ 12:45  [Kiểm tra] │
├───────────────────────────────┬────────────────────────────────────┤
│                               │                                    │
│     LƯỚI Ô CHỮ                │  Câu đang chọn:                   │
│                               │  ┌────────────────────────────┐   │
│   ¹[Q][U][A][ ][ ][ ][ ][ ]   │  │ 1 — Ngang                  │   │
│     [I]                       │  │ Quá trình cây xanh chuyển  │   │
│   ² [B][ ][ ][ ][ ][ ][ ]     │  │ hóa ánh sáng thành năng   │   │
│     [O]                       │  │ lượng                       │   │
│     [S]                       │  └────────────────────────────┘   │
│     [O]                       │                                    │
│     [M]                       │  Tiến độ  ████░░░░░  3/15 từ     │
│     [E]                       │                                    │
│                               │  NGANG                            │
│                               │  1. Quá trình cây xanh...        │
│                               │  3. Đơn vị cơ bản...              │
│                               │                                    │
│                               │  DỌC                              │
│                               │  2. Bào quan tổng hợp...         │
│                               │                                    │
└───────────────────────────────┴────────────────────────────────────┘
```

**Layout mobile:** Lưới full-width. Bottom sheet cố định ở đáy: dòng trên hiện câu đang chọn, dòng dưới là danh sách câu hỏi có thể scroll.

### 6.2 Tương Tác Player Grid

- Click/tap ô trắng → chọn từ; ô giao nhau click lần 2 → đổi hướng
- Gõ chữ → điền ô, tự nhảy sang ô tiếp theo trong từ
- `Backspace` → xóa ô hiện tại, lui một ô
- Phím mũi tên → di chuyển theo hướng từ đang chọn
- `Enter` / `Tab` → chuyển từ tiếp theo
- Mobile: bàn phím ảo chỉ chữ cái (A–Z), ẩn bàn phím hệ thống

**Feedback sau "Kiểm tra":**
- Ô đúng: `bg-green-100` + ✓ nhỏ
- Ô sai: `bg-red-100`, giữ chữ cái của học sinh
- Ô chưa điền: giữ nguyên

**Khi hoàn thành (tất cả đúng):** Overlay celebration + confetti animation + thống kê (thời gian hoàn thành, số lần kiểm tra).

### 6.3 Game States

```typescript
type CellState   = 'empty' | 'filled' | 'correct' | 'incorrect' | 'revealed'
type GameStatus  = 'playing' | 'checking' | 'completed' | 'expired'
```

| Status | Hành vi |
|---|---|
| `playing` | Bình thường |
| `checking` | Briefly disable input, chạy validation |
| `completed` | Hiện overlay celebration, disable grid |
| `expired` | Disable grid, hiện đáp án nếu được bật, hiện thông báo hết hạn |

---

## 7. State Management

### 7.1 Zustand Store (`useCrosswordStore`)

```typescript
interface CrosswordStore {
  game: CrosswordGame | null;
  words: CrosswordWord[];
  grid: CrosswordGrid | null;

  // UI state (editor)
  selectedWordId: string | null;
  selectedCell: { row: number; col: number } | null;
  direction: 'across' | 'down';

  // Undo/Redo (max 20 entries)
  history: CrosswordWord[][];
  historyIndex: number;

  // Async state
  isGenerating: boolean;
  isSaving: boolean;
  generateError: string | null;

  // Actions
  selectWord: (wordId: string) => void;
  selectCell: (row: number, col: number) => void;
  toggleDirection: () => void;
  updateWord: (wordId: string, updates: Partial<CrosswordWord>) => void;
  deleteWord: (wordId: string) => void;
  addWord: (word: Omit<CrosswordWord, 'id' | 'number' | 'startRow' | 'startCol'>) => void;
  undo: () => void;
  redo: () => void;
  rebuildGrid: () => void;
}
```

### 7.2 React Query Keys

```typescript
const crosswordKeys = {
  detail: (id: string) => ['crossword', id] as const,
  play:   (slug: string) => ['crossword', 'play', slug] as const,
}
```

### 7.3 `useUndoRedo`

Mỗi action thay đổi `words` snapshot toàn bộ `words[]` trước khi thay đổi vào `history`. Undo restore snapshot và gọi `rebuildGrid()`. Max 20 entries; FIFO khi đầy.

### 7.4 `useAutoSave`

```
- Chỉ active nếu user.plan !== 'free'
- Debounce 60 giây kể từ thay đổi cuối
- Gọi PUT /api/crossword/:gameId
- UI: "Đang lưu..." → "Đã lưu lúc HH:mm"
```

---

## 8. Xử Lý Tiếng Việt (`viNormalizer.ts`)

```typescript
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // bỏ diacritics
    .replace(/đ/gi, 'd')
    .toUpperCase()
    .replace(/[^A-Z_]/g, '');
}

// So sánh chấp nhận cả có dấu và không dấu
export function checkAnswer(input: string, answer: string): boolean {
  return normalize(input) === normalize(answer);
}
```

---

## 9. Thuật Toán Xây Dựng Lưới (`gridBuilder.ts`)

```typescript
export function buildGrid(words: string[], size: GridSize): GridResult {
  // 1. Sort words giảm dần theo độ dài
  // 2. Đặt từ đầu tiên (dài nhất) ngang ở trung tâm lưới
  // 3. Với mỗi từ tiếp theo:
  //    a. Tìm tất cả vị trí đặt hợp lệ (chia sẻ ≥1 chữ cái với từ đã có)
  //    b. Score từng vị trí theo số giao điểm tạo ra
  //    c. Đặt ở vị trí score cao nhất; nếu không có → đưa vào unplacedWords[]
  // 4. Compact lưới về (0,0), cắt padding thừa
  // 5. Gán số thứ tự theo thứ tự đọc (trái→phải, trên→dưới)
  return { grid, placedWords, unplacedWords };
}
```

Chạy phía **client** trong `useGridBuilder` hook. Gọi lại mỗi khi `words` thay đổi trong editor.

---

## 10. ECoin Calculator (`ecoinCalculator.ts`)

```typescript
const RATES = {
  wordCount: { low: 5, mid: 10, high: 20 },   // 5-15 / 16-30 / 31-60
  clueStyle: { definition: 0, 'fill-in-blank': 3, 'multiple-choice': 5 },
  language:  { vi: 0, en: 0, bilingual: 5 },
};

export function calculateEcoin(config: GameConfig): number {
  const base = config.wordCount <= 15 ? 5 : config.wordCount <= 30 ? 10 : 20;
  return base + RATES.clueStyle[config.clueStyle] + RATES.language[config.language];
}

export function calculateRegenerateEcoin(config: GameConfig): number {
  return Math.ceil(calculateEcoin(config) * 0.5);
}
```

---

## 11. Subscription Gate (`SubscriptionGate.tsx`)

```typescript
interface Props {
  requiredPlan: 'basic' | 'pro';
  featureName: string;
  children: React.ReactNode;
}

// Nếu user.plan đủ: render children bình thường
// Nếu không đủ: render children với pointer-events: none + opacity: 0.5
//               + Tooltip "Tính năng dành cho gói [X] — Nâng cấp"
//               + onClick trên wrapper → mở UpgradeModal
```

---

## 12. Xử Lý Lỗi & Edge Cases

| Tình huống | Xử lý UI |
|---|---|
| API timeout > 30s | Toast lỗi, không trừ ECoin, hiện nút thử lại |
| AI trả JSON không hợp lệ (sau 2 retry) | Toast lỗi rõ ràng, không trừ ECoin |
| Không từ nào xếp được vào lưới | Màn hình trắng + thông báo + nút "Tạo lại" (không tốn ECoin) |
| Đổi đáp án gây xung đột | Rebuild lưới; từ không fit → banner cảnh báo |
| Học sinh vào link sau deadline | Trang "Trò chơi đã kết thúc" + đáp án nếu được bật |
| Học sinh hết số lần thử | Disable grid + nút "Xem đáp án" nếu được phép |
| Upload thất bại (network) | Inline error trên file card + nút retry riêng từng file |
| OCR trả về rỗng | Chip đỏ, chặn bước tiếp theo, hướng dẫn upload lại |
| Số dư ECoin không đủ | Nút "Tạo ô chữ" disabled + link nạp thêm |

---

## 13. Responsive

| Breakpoint | Thay đổi |
|---|---|
| `≥1024px` | 2 cột: lưới trái, panel phải |
| `768–1023px` | 1 cột: lưới trên, panel accordion bên dưới |
| `≤767px` | Lưới full-width (overflow-x: auto nếu cần), panel = bottom sheet cố định |

**Kích thước ô:**
```css
.cell { width: 40px; height: 40px; }
@media (max-width: 1023px) { .cell { width: 34px; height: 34px; } }
@media (max-width: 767px)  { .cell { width: 28px; height: 28px; } }
```

Lưới không shrink ô; nếu quá rộng → container `overflow-x: auto`.

---

## 14. Accessibility

- Ô lưới player: `<input maxLength={1} aria-label="Ô [số]-[hướng], vị trí [n]" />`
- Panel câu hỏi: `role="list"` + `role="listitem"`
- Focus trap trong tất cả modal
- Khi ô được focus: `aria-live="polite"` announce "Từ số 3 ngang: [câu gợi ý]"
- Contrast ratio ≥ 4.5:1 cho tất cả text
- Điều hướng lưới bằng phím mũi tên; `Tab` chuyển từ tiếp theo
