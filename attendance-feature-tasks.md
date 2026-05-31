# 📋 Task: Attendance List Feature (Danh Sách Điểm Danh)

## Context
Thêm chức năng điểm danh vào trang **Classes** của web hỗ trợ giáo viên.  
Danh sách điểm danh hiển thị chung layout với danh sách học sinh, có định dạng dạng bảng (excel-like), hỗ trợ toggle trạng thái và xuất file Excel.

---

## 🔄 UPDATE v2 — Các thay đổi bổ sung (sau khi Phase 1–6 đã hoàn thành)

> Làm theo đúng thứ tự U1 → U2 → U3 → U4. Không thay đổi logic cũ trừ những chỗ được chỉ định.

### U1 — Fix logic tính % đi học (ƯU TIÊN CAO NHẤT — ảnh hưởng U3)

- [x] **U1.1** Sửa helper `getAttendancePercent` trong `utils/attendanceHelpers.ts`:
  - **Logic cũ (sai):** `present / totalSlots * 100` → chia cho tổng số cột, kể cả `empty`
  - **Logic mới (đúng):** Chỉ tính trên các slot đã được điểm danh (khác `empty`)
  ```ts
  // Logic mới
  const markedSlots = Object.values(row.slots).filter(s => s !== 'empty').length
  const presentSlots = Object.values(row.slots).filter(s => s === 'present').length
  if (markedSlots === 0) return null  // Trả về null nếu chưa có slot nào được điểm danh
  return Math.round((presentSlots / markedSlots) * 100)
  ```

- [x] **U1.2** Sửa cột **Tổng** (cột áp cuối): hiển thị `present / markedSlots` thay vì `present / totalSlots`.

- [x] **U1.3** Sửa hiển thị cột **%**: nếu `getAttendancePercent` trả về `null` → hiển thị `—` (dash) thay vì `0%`.

---

### U2 — UI: Cột slot dùng emoji, thu hẹp độ rộng

- [x] **U2.1** Sửa component `AttendanceTable` — thay đổi hiển thị ô slot:
  | Trạng thái | Hiển thị cũ | Hiển thị mới |
  |---|---|---|
  | `empty` | _(trống)_ | _(trống)_ |
  | `present` | ✅ Có mặt | ✅ |
  | `absent` | ❌ Vắng | ❌ |

- [x] **U2.2** Thu hẹp độ rộng cột slot — chỉ đủ chứa emoji:
  ```css
  /* Áp dụng cho tất cả cột slot (không áp dụng cho cột tên, tổng, %) */
  .slot-cell {
    width: 40px;       /* hoặc min-width: 36px */
    max-width: 48px;
    text-align: center;
    padding: 4px;
  }
  ```

- [x] **U2.3** Đảm bảo header cột slot (label + date) vẫn hiển thị đủ thông tin — có thể dùng `writing-mode: vertical-rl` hoặc xuống dòng nếu cần để vừa với độ rộng mới.

---

### U3 — UI: Nút "Tạo Điểm Danh" đồng bộ style với nút "Thêm Danh Sách"

- [x] **U3.1** Tìm component/style của nút "Thêm Danh Sách" hiện có trong `pages/Classes.tsx` (hoặc nơi nó được định nghĩa).

- [x] **U3.2** Áp dụng cùng className, variant, size, icon pattern cho nút "Tạo Điểm Danh".  
  _(Nếu dùng component UI library — ví dụ shadcn Button — thì dùng cùng `variant` và `size` props.)_

- [x] **U3.3** Kiểm tra 2 nút nằm cạnh nhau trông nhất quán: cùng chiều cao, spacing đều, không có nút nào lớn hơn nút kia.

---

### U4 — Feature: Cảnh báo học sinh vắng quá ngưỡng %

- [x] **U4.1** Thêm config ngưỡng cảnh báo — có thể là constant hoặc setting per-class:
  ```ts
  const ABSENCE_WARNING_THRESHOLD = 20  // % vắng tối đa cho phép (mặc định 20%)
  // tức là: nếu % đi học < 80% thì cảnh báo
  ```

- [x] **U4.2** Sửa logic cảnh báo — chỉ hiển thị warning khi **tất cả** điều kiện sau đều đúng:
  1. `getAttendancePercent(row)` trả về giá trị khác `null` (tức là đã có ít nhất 1 slot được điểm danh)
  2. Phần trăm đi học < `(100 - ABSENCE_WARNING_THRESHOLD)`%

- [x] **U4.3** UI cảnh báo trong bảng: highlight row hoặc hiển thị icon ⚠️ cạnh tên học sinh khi đủ điều kiện cảnh báo.

- [x] **U4.4** _(Tuỳ chọn)_ Thêm badge/summary phía trên bảng: `"⚠️ X học sinh có nguy cơ vắng quá phép"` — chỉ hiển thị khi có ít nhất 1 học sinh bị cảnh báo.

---

## File cần sửa trong UPDATE v2

| File | Thay đổi | Task |
|---|---|---|
| `utils/attendanceHelpers.ts` | Sửa logic `getAttendancePercent`, `getPresentCount` | U1.1, U1.2 |
| `components/AttendanceTable.tsx` | Emoji-only cells, thu hẹp cột, warning highlight | U2.x, U4.3 |
| `pages/Classes.tsx` | Đồng bộ style nút Tạo Điểm Danh | U3.x |
| `constants/attendanceConfig.ts` | Tạo mới — chứa `ABSENCE_WARNING_THRESHOLD` | U4.1 |

---

## 🔄 UPDATE v3 — Các thay đổi bổ sung (sau khi UPDATE v2 đã hoàn thành)

> Làm theo đúng thứ tự V1 → V2 → V3 → V4 → V5 → V6. Không thay đổi logic cũ trừ những chỗ được chỉ định rõ.

---

### V1 — Data Model: Thêm trạng thái `excused` (vắng có phép) ⚠️ LÀM TRƯỚC — các task sau phụ thuộc

- [x] **V1.1** Cập nhật type `SlotStatus` trong `types/attendance.ts`:
  ```ts
  // Cũ
  type SlotStatus = 'empty' | 'present' | 'absent'
  // Mới
  type SlotStatus = 'empty' | 'present' | 'absent' | 'excused'
  ```

- [x] **V1.2** Cập nhật chu kỳ toggle trong `AttendanceTable.tsx`:
  ```
  empty → present → absent → excused → empty
  ```

- [x] **V1.3** Cập nhật helper `getAttendancePercent` trong `utils/attendanceHelpers.ts`:
  - `excused` được tính là **có mặt** (tương đương `present`) khi tính %
  - `markedSlots` = số slot có trạng thái `present` | `absent` | `excused`
  - `presentSlots` = số slot có trạng thái `present` | `excused`
  ```ts
  const markedSlots = Object.values(row.slots).filter(s => s !== 'empty').length
  const presentSlots = Object.values(row.slots).filter(s => s === 'present' || s === 'excused').length
  if (markedSlots === 0) return null
  return Math.round((presentSlots / markedSlots) * 100)
  ```

- [x] **V1.4** Cập nhật map trạng thái ở mọi nơi có dùng `SlotStatus` (export Excel, warning logic, v.v.):
  - `excused` → xuất Excel thành `"Vắng CP"` (vắng có phép)

---

### V2 — UI: Hiển thị emoji cho trạng thái mới + Legend (chú thích)

- [x] **V2.1** Cập nhật bảng emoji trong `AttendanceTable.tsx`:
  | Trạng thái | Emoji | Ghi chú |
  |---|---|---|
  | `empty` | _(trống)_ | Chưa điểm danh |
  | `present` | ✅ | Có mặt |
  | `absent` | ❌ | Vắng |
  | `excused` | 🟡 | Vắng có phép (emoji khác biệt rõ) |

  > Lưu ý: emoji `excused` phải khác hẳn với `present` và `absent`. Gợi ý: `🟡`, `📋`, `🔔`, `〰️` — chọn 1 cái nhất quán trong codebase.

- [x] **V2.2** Thêm block **Legend / Chú thích** phía trên (hoặc phía dưới) bảng điểm danh, **nằm ngoài bảng**:
  ```
  Chú thích:  ✅ Có mặt   ❌ Vắng   🟡 Vắng có phép   _(trống)_ Chưa điểm danh
  ```
  - Style: nhỏ gọn, inline, dạng tag/badge hoặc plain text với icon
  - Vị trí: trên toolbar xuất/nhập Excel, không nằm trong `<table>`

---

### V3 — Fix: Lỗi định dạng ngày khi download rồi upload lại (dd/MM/yyyy ↔ MM/dd/yyyy)

> Đây là bug cần fix trước khi làm CRUD để tránh data corruption.

- [x] **V3.1** Xác định nơi parse ngày khi **upload** file Excel trong `utils/importAttendanceExcel.ts` (hoặc file tương đương).

- [x] **V3.2** Sửa hàm parse ngày — **không dùng `new Date(dateString)` trực tiếp** vì JS tự suy luận locale:
  ```ts
  // Helper parse an toàn cho định dạng dd/MM/yyyy
  function parseSlotDate(raw: string): Date | null {
    if (!raw) return null
    // Thử parse dd/MM/yyyy trước
    const parts = raw.split('/')
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts
      const d = new Date(`${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`)
      if (!isNaN(d.getTime())) return d
    }
    // Fallback: ISO string
    const fallback = new Date(raw)
    return isNaN(fallback.getTime()) ? null : fallback
  }
  ```

- [x] **V3.3** Đảm bảo hàm **export** luôn ghi ngày ra dạng `dd/MM/yyyy` dưới dạng **text string** (không để SheetJS tự convert thành Date serial number):
  ```ts
  // Khi set cell value cho ngày trong header slot
  ws[cellRef] = { v: formattedDate, t: 's' }  // t: 's' = string, không phải date
  ```

- [x] **V3.4** Test round-trip: export → mở file → upload lại → kiểm tra ngày không bị NaN.

---

### V4 — Feature: Sửa/Xoá Slot (click vào header slot)

- [x] **V4.1** Thêm interaction vào **header ô slot** (không phải ô data):
  - Click vào tên/ngày slot trong header row → mở popover/modal với 2 option:
    - ✏️ **Sửa ngày** (date picker)
    - 🗑️ **Xoá slot** (xoá cả cột + toàn bộ data slot đó)

- [x] **V4.2** Khi **sửa ngày**:
  - Cập nhật `AttendanceSlot.date` trong state/store
  - Re-render header cột tương ứng

- [x] **V4.3** Khi **xoá slot**:
  - Hiện confirm dialog: `"Xoá slot [label] ngày [date]? Dữ liệu điểm danh của slot này sẽ bị mất."`
  - Nếu confirm → xoá `AttendanceSlot` khỏi `slots[]` và xoá key tương ứng trong tất cả `StudentAttendance.slots`
  - Tự động tính lại cột Tổng và % sau khi xoá

- [x] **V4.4** Visual hint: header slot có cursor `pointer` và hover effect nhẹ để người dùng biết có thể click.

---

### V5 — Feature: CRUD Danh Sách Điểm Danh (tương tự Student List)

> Tham khảo implementation CRUD của danh sách học sinh để đảm bảo UX nhất quán.

- [x] **V5.1** **Create** — đã có (nút "Tạo Điểm Danh"). Kiểm tra lại flow có đủ các bước: nhập tên danh sách → tạo danh sách rỗng → redirect về bảng mới.

- [x] **V5.2** **Read** — đã có. Đảm bảo danh sách điểm danh được list ra dạng tương tự danh sách học sinh (tên, ngày tạo, số slot, số học sinh).

- [x] **V5.3** **Update (rename)** — thêm chức năng đổi tên danh sách điểm danh:
  - Inline edit hoặc modal (tham khảo cách Student List làm)

- [x] **V5.4** **Delete** — thêm nút xoá danh sách điểm danh:
  - Confirm dialog trước khi xoá: `"Xoá danh sách điểm danh [tên]? Hành động này không thể hoàn tác."`
  - Xoá toàn bộ data của danh sách đó

- [x] **V5.5** Đảm bảo store/state được cập nhật đồng bộ sau mỗi thao tác CRUD.

---

### V6 — UI: Đổi tên & vị trí nút Import Excel

- [x] **V6.1** Đổi tên nút từ **"Nhập Điểm Danh"** → **"Nhập Excel"** để đồng bộ với bên Danh Sách Học Sinh.

- [x] **V6.2** Di chuyển nút "Nhập Excel" vào **cạnh nút "Xuất Excel"** trên toolbar của bảng điểm danh.  
  _(Thứ tự gợi ý: `[Nhập Excel] [Xuất Excel]` — nhất quán với pattern import/export của Student List.)_

- [x] **V6.3** Đảm bảo 2 nút cùng style (variant, size, spacing) — không có nút nào trông khác biệt.

---

## File cần sửa trong UPDATE v3

| File | Thay đổi | Task |
|---|---|---|
| `types/attendance.ts` | Thêm `'excused'` vào `SlotStatus` | V1.1 |
| `utils/attendanceHelpers.ts` | Cập nhật logic tính % với `excused` | V1.3 |
| `utils/importAttendanceExcel.ts` | Fix parse ngày dd/MM/yyyy | V3.2, V3.3 |
| `utils/exportAttendanceExcel.ts` | Ghi ngày dạng string, thêm map `excused` | V1.4, V3.3 |
| `components/AttendanceTable.tsx` | Cycle 4 trạng thái, emoji mới, header click, legend | V1.2, V2.1, V2.2, V4.x |
| `components/SlotHeaderPopover.tsx` | Tạo mới — popover sửa/xoá slot | V4.1 |
| `pages/Classes.tsx` | Đổi tên + vị trí nút Nhập Excel | V6.x |
| `store/attendanceStore.ts` | CRUD actions (rename, delete list) | V5.x |

---

## Task Checklist (Thứ tự ưu tiên)

### 🗂️ PHASE 1 — Data Model & State
> Làm trước để các phase sau có nền tảng dùng chung.

- [x] **T1.1** Định nghĩa kiểu dữ liệu `AttendanceSlot`:
  ```ts
  type SlotStatus = 'empty' | 'present' | 'absent'
  type AttendanceSlot = { id: string; date: string; label: string }
  type StudentAttendance = { studentId: string; name: string; slots: Record<string, SlotStatus> }
  type AttendanceList = { id: string; classId: string; slots: AttendanceSlot[]; rows: StudentAttendance[] }
  ```

- [x] **T1.2** Tạo state/store cho `AttendanceList` (tách biệt với student list state).

- [x] **T1.3** Viết helper tính toán tự động:
  - `getPresentCount(row)` → số buổi có mặt
  - `getAttendancePercent(row, totalSlots)` → phần trăm (%)

---

### 🧩 PHASE 2 — UI Layout Integration (trang Classes)

- [x] **T2.1** Thêm nút **"Tạo Điểm Danh"** cạnh nút "Tạo Danh Sách Lớp" trong header/toolbar của trang Classes.  
  _(Không thay đổi vị trí hoặc style của nút hiện có.)_

- [x] **T2.2** Tạo tab hoặc toggle switch để chuyển giữa **"Danh Sách Học Sinh"** và **"Điểm Danh"** trong cùng một khu vực hiển thị.  
  _(Hai danh sách dùng chung container, không tách trang.)_

---

### 🏗️ PHASE 3 — Attendance Table Component

- [x] **T3.1** Tạo component `AttendanceTable`:
  - Cột đầu: **Tên học sinh** (fixed/sticky bên trái)
  - Các cột giữa: mỗi slot là một cột (header = label + date)
  - Cột áp cuối: **Tổng có mặt / Tổng slot** (auto, read-only)
  - Cột cuối: **% Đi học** (auto, read-only)

- [x] **T3.2** Render ô trạng thái slot với 3 trạng thái:
  | Trạng thái | Hiển thị | Click tiếp theo |
  |---|---|---|
  | `empty` | _(trống)_ | → `present` |
  | `present` | ✅ Có mặt | → `absent` |
  | `absent` | ❌ Vắng | → `empty` |

- [x] **T3.3** Xử lý sự kiện `onClick` trên ô slot → cycle qua 3 trạng thái → cập nhật state → tự động tính lại 2 cột cuối.

- [x] **T3.4** Sticky header row (tên slot + ngày) và sticky cột đầu (tên học sinh) khi scroll bảng lớn.

---

### ➕ PHASE 4 — Thêm Slot (Cột)

- [x] **T4.1** Nút **"+ Thêm Slot"** ở cuối hàng header của bảng.

- [x] **T4.2** Khi click → mở modal/popover nhập:
  - Tên slot (VD: "Buổi 1", "Session 3")
  - Ngày (date picker)

- [x] **T4.3** Sau khi confirm → append cột mới vào bảng, mặc định tất cả ô là `empty`.

---

### 📤 PHASE 5 — Xuất File Excel

- [x] **T5.1** Nút **"Xuất Excel"** trên toolbar của bảng điểm danh (tương tự nút xuất của danh sách học sinh).

- [x] **T5.2** Dùng thư viện `xlsx` (SheetJS) để tạo file:
  - Row 1: Header (Tên HS, các slot label+date, Tổng, %)
  - Các row tiếp theo: dữ liệu từng học sinh
  - Map trạng thái: `present` → "Có mặt" | `absent` → "Vắng" | `empty` → ""

- [x] **T5.3** Đặt tên file xuất: `diem-danh-[className]-[date].xlsx`

---

### 🧪 PHASE 6 — Edge Cases & Polish

- [x] **T6.1** Xử lý trường hợp chưa có slot nào → hiển thị empty state với hướng dẫn.
- [x] **T6.2** Xử lý trường hợp class chưa có học sinh → disable nút "Tạo Điểm Danh" hoặc hiển thị thông báo.
- [x] **T6.3** Đảm bảo 2 cột cuối (Tổng & %) không thể click/chỉnh tay (read-only styling rõ ràng).
- [x] **T6.4** Responsive: bảng scroll ngang trên màn hình nhỏ, không vỡ layout.
- [x] **T6.5** Requiremnet: không cho phép người dùng đặt tên slot trùng hoặc chọn ngày học trùng với slot đã tồn tại
---

## File/Component Dự Kiến Cần Tạo/Sửa

| File | Action | Ghi chú |
|---|---|---|
| `types/attendance.ts` | Tạo mới | T1.1 |
| `store/attendanceStore.ts` | Tạo mới | T1.2 |
| `utils/attendanceHelpers.ts` | Tạo mới | T1.3 |
| `components/AttendanceTable.tsx` | Tạo mới | T3.x |
| `components/AddSlotModal.tsx` | Tạo mới | T4.x |
| `pages/Classes.tsx` | Chỉnh sửa | T2.x — thêm nút + tab toggle |
| `utils/exportAttendanceExcel.ts` | Tạo mới | T5.x |

---

## Notes cho Copilot
- **Không** refactor hoặc thay đổi logic danh sách học sinh hiện có.
- Tham khảo style/component của nút xuất Excel và bảng học sinh hiện có để đảm bảo UI nhất quán.
- Ưu tiên làm theo đúng thứ tự Phase 1 → 2 → 3 → 4 → 5 → 6.
- Mỗi task hoàn thành thì check vào checkbox trước khi sang task tiếp theo.
