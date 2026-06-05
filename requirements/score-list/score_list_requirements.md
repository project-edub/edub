# Danh sách điểm số

* * *
### **FR-01 – Quản lý Danh sách Lớp & Học sinh**
**Mô tả:** Giáo viên có thể xem và quản lý danh sách học sinh trong lớp mình phụ trách
*   Website đã có tính năng nhập xuất file excel và hiện dữ liệu lên trên giao diện
#### **User Stories**
**US-01.1**
> _"Là giáo viên, tôi muốn nhập dữ liệu vào một thanh tìm kiếm học sinh và có cho phép lựa chọn các cột cần tìm để tăng cường tốc độ tìm kiếm, nếu không có cột nào được chọn, đáp án trả về sẽ gồm kết quả tìm được trên tất cả các cột"_
**US-01.2**
> _"Là giáo viên, tôi muốn sắp xếp học sinh theo cột bằng cách nhấn vào tên cột để thay đổi A-Z và Z-A"_
**US-01.3**
> _"Là giáo viên, tôi muốn xem lịch sử các chỉnh sửa trên danh sách lớp của mình"_
#### **Acceptance Criteria**
- [ ] AC-01.1: Giáo viên có thể tìm kiếm học sinh với kết quả trả về dưới 1 giây
- [ ] AC-01.2: Giáo viên có thể sắp sếp danh sách theo cột được chọn
- [ ] AC-01.3: Giáo viên có thể xem lịch sử chỉnh sửa của mình
### FR-02 – Cấu hình Cột Điểm (Đầu điểm)
**Mô tả:** Giáo viên thiết lập các cột điểm theo đúng quy định của từng môn học và cấp học
*   Mỗi một cột điểm khi click vào tiêu đề cột sẽ hiện một lựa chọn "Chọn hệ số"
*   Giáo viên nhập hệ số, ví dụ: 1, 2, 3
*   Giáo viên chọn một cột, đánh dấu cột đó là cột tổng điểm, sau đó chọn các cột để tính tổng
*   Hệ thống tính và trả về kết quả cho cột điểm trung bình theo công thức (điểm 1 x hệ số + điểm 2 x hệ số + .... + điểm n x hệ số)/tổng hệ số = điểm trung bình
*   Hệ thống sẽ cảnh báo giáo viên nếu có một cột được chọn để tính tổng nhưng chưa được cấu hình hệ số, nếu cột đó là chữ thì bỏ qua không cần tính
*   Website hiện có tính năng copy bảng nhưng tính năng này hiện tại đang copy toàn bộ bảng ra một bảng mới
#### User Stories
**US-02.1**
> _"Là giáo viên, tôi muốn chọn hệ số cho các cột điểm trong danh sách và chọn một cột làm cột điểm trung bình; khi chọn cột trung bình sẽ cho phép chọn các cột để tính trung bình, từ đó tính ra giá trị điểm trung bình"_
**US-02.2**
> _"Là giáo viên, tôi muốn chọn các template điểm phổ biến được đề xuất bởi hệ thống"_
**US-02.3**
> _"Là giáo viên, tôi muốn copy một bảng có sẵn sang một bảng mới, và chọn phép chọn các cột để copy qua thay vì copy toàn bộ cùng option chọn/bỏ chọn toàn bộ cột"_
**US-02.4**
> _"Là quản trị viên, tôi muốn chỉnh sửa các template điểm cho giáo viên chọn"_
#### Acceptance Criteria
- [ ] AC-02.1: Giáo viên chọn hệ số cho các cột và chọn một cột làm cột điểm trung bình, hệ thống tính trung bình dựa trêN giá trị trong cột và hệ số
- [ ] AC-02.2: Hệ thống cung cấp template mặc định cho các môn phổ biến (Toán, Văn, Anh, Lý, Hoá, Sinh, Sử, Địa, vân vân)
- [ ] AC-02.3: Giáo viên chọn các cột để copy qua bảng mới
- [ ] AC-02.4: Quản trị viên chỉnh sửa các template điểm có sẵn cho giáo viên chọn
* * *
### FR-03 – Nhập & Chỉnh sửa Điểm
**Mô tả:** Chức năng cốt lõi – giáo viên nhập điểm số cho từng học sinh theo từng cột điểm
#### User Stories
**US-03.1**
> _"Là giáo viên, tôi muốn nhập điểm trực tiếp trên bảng lưới (grid/table), để việc nhập liệu nhanh như dùng bảng tính Excel, nhập vào là giá trị tự lưu mà không cần nhấn phím Enter"_
**US-03.2**
> _"Là giáo viên, tôi muốn dùng phím Tab/Enter để di chuyển giữa các ô điểm, để không phải dùng chuột liên tục, Tab là di chuyển sang cột tiếp theo của dòng, Enter là xuống dòng tiếp theo của cột"_
**US-03.3**
> _"Là giáo viên, tôi muốn nhập ghi chú cho từng ô điểm, để giải thích các trường hợp đặc biệt"_
**US-03.4**
> _"Là giáo viên, tôi muốn hệ thống tự động lưu khi tôi di chuyển sang ô khác (auto-save), để tránh mất dữ liệu khi quên lưu"_
#### Acceptance Criteria
- [ ] AC-03.1: Điểm hợp lệ nằm trong khoảng 0–10, cho phép 2 chữ số thập phân (VD: 8.75) Nhập giá trị ngoài khoảng → hiện cảnh báo inline màu đỏ
- [ ] AC-03.2: Phím Tab di chuyển sang ô tiếp theo (theo chiều ngang), Enter di chuyển xuống ô bên dưới
- [ ] AC-03.3: Hệ thống auto-save sau mỗi lần rời khỏi ô điểm, hiển thị trạng thái "Đang lưu..." → "Đã lưu lúc HH:MM"
- [ ] AC-03.4: Nếu mất kết nối internet, hệ thống lưu tạm vào localStorage và đồng bộ lại khi có mạng, thông báo: "Đang lưu ngoại tuyến – sẽ đồng bộ khi có kết nối"
- [ ] AC-03.5: Lịch sử chỉnh sửa điểm được ghi lại: thời gian, cột/dòng sửa, giá trị cũ → giá trị mới
- [ ] AC-03.6: Giáo viên không thể nhập điểm số thập phân quá 2 chữ số (8.555 → tự làm tròn thành 8.56)
### FR-04 – Xếp loại
**Mô tả:** Hệ thống tự động tính ĐTB (Điểm Trung Bình môn) theo công thức quy định
**US-04.1**
> _"Là giáo viên, sau khi chọn một cột điểm làm điểm trung bình, tôi có thể cấu hình màu sắc và tên gọi cho các khoảng giá trị điểm, như là từ khoảng 1 - 4.9 là màu đỏ loại yếu, từ 5 - 7.9 là màu vàng loại khá, từ 8 - 10 là màu xanh lá loại giỏi"_
#### Acceptance Criteria
- [ ] AC-04.1: ĐTB được tính lại tự động (real-time) ngay sau mỗi lần lưu điểm thành công
- [ ] AC-04.2: ĐTB làm tròn đến 2 chữ số thập phân theo quy tắc làm tròn toán học (≥ 0.005 → làm tròn lên)
- [ ] AC-04.3: Nếu học sinh có bất kỳ cột điểm nào còn trống, ĐTB hiển thị dấu "–" (chưa đủ dữ liệu)
- [ ] AC-04.4: Khi hover vào ô ĐTBm, tooltip hiện chi tiết: "(7 + 8 + 6) × 1 = 21 | 7.5 × 2 = 15 | 8 × 3 = 24 | Tổng: 60/7 = 8.6"
### FR-05 – Xem Bảng Điểm Tổng hợp
**Mô tả:** Giáo viên xem tổng quan bảng điểm của cả lớp, có thể lọc và sắp xếp
#### User Stories
**US-05.1**
> _"Là giáo viên, tôi muốn lọc danh sách học sinh theo mức xếp loại (Giỏi/Khá/TB/Yếu/Kém), để nhanh chóng xác định học sinh cần hỗ trợ"_
#### Acceptance Criteria
- [ ] AC-05.1: Bảng hiển thị thống kê tóm tắt ở cuối: ĐTB của lớp | % Giỏi | % Khá | % TB | % Yếu+Kém | Số HS chưa đủ điểm
- [ ] AC-05.5: Giáo viên chủ nhiệm có thể chuyển đổi giữa các danh sách điểm bằng tab mà không cần load lại trang

* * *