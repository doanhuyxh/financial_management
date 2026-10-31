# Danh mục — `categories.service.ts`

> Nguồn sự thật là code; nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md).

- **Loại (`kind`)**: bắt buộc khi tạo (`EXPENSE` hoặc `INCOME`, UI mặc định Chi tiêu).
  - Chỉ đổi được loại khi danh mục **chưa có** Expense/Income nào và chưa được Transfer nào dùng làm danh mục phí ("Danh mục đã có giao dịch, không thể đổi loại").
  - Dữ liệu cũ thiếu `kind` được backfill khi GET danh sách: danh mục chỉ được dùng bởi Income thì thành `INCOME`, còn lại thành `EXPENSE`. Mỗi user chỉ backfill một lần trên mỗi tiến trình server (cache trong bộ nhớ).
  - Server kiểm tra loại khi tạo expense/income, khi đổi sang danh mục khác lúc sửa, và với danh mục phí chuyển tiền (phải là `EXPENSE`). Sửa giao dịch mà **giữ nguyên** danh mục cũ khác loại thì vẫn cho qua (dữ liệu cũ dùng chung danh mục).
  - Form và bộ lọc chỉ hiện danh mục đúng loại (`filterCategoriesByKind` trong `src/libs/utils/categoryKind.ts`). Khi sửa, form vẫn giữ danh mục hiện tại của bản ghi.
- CRUD theo tên, kéo-thả sắp xếp (`/api/categories/reorder`, body `{ orderedIds }`; mọi ID phải thuộc user và phải gửi đủ toàn bộ danh mục). GET hỗ trợ lọc `search` và `kind`; trang Danh mục có bộ lọc "Loại". UI ẩn tay kéo khi đang tìm kiếm hoặc lọc loại.
- **Xóa (xóa mềm):** danh mục chưa có Expense/Income/Transfer (phí) thì xóa hẳn; đã có thì đặt `archivedAt`. Danh mục lưu trữ bị ẩn khỏi danh sách, reorder, gợi ý và ô chọn; không dùng được cho giao dịch mới, nhưng giao dịch cũ được giữ nguyên danh mục khi sửa. Lịch sử và dashboard vẫn hiện đúng tên. Dữ liệu cũ đã bị xóa hẳn trước đây vẫn gom vào "Không xác định".
