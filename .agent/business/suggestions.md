# Gợi ý "thường dùng" trong form — `suggestions.service.ts`

> Nguồn sự thật là code; nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md).

API: `GET /api/expenses/suggestions`, `/api/incomes/suggestions`, `/api/transfers/suggestions`. Không có tham số; mọi tính toán làm ở server.

- **Phạm vi:** giao dịch trong 90 ngày gần nhất của user. Expense phí chuyển tiền (`skipBalanceAdjust: true`) bị loại.
- **Điểm:** mỗi giao dịch cộng `exp(−số_ngày_trước / 30)` (giao dịch đặt ngày tương lai tính như hôm nay). Xếp theo tổng điểm giảm dần.
- **Ngưỡng:** phải xuất hiện ≥ 2 lần mới được gợi ý (riêng "nguồn hay dùng nhất của danh mục" chỉ cần 1 lần).
- Danh mục hoặc nguồn tiền đã bị xóa hoặc lưu trữ không được gợi ý.
- **Chi tiêu / thu nhập** trả về: `categoryIds` (top 5), `sourceIds` (top 3), `topAmounts` (top 4, sắp tăng dần), và `byCategory[id] = { amounts (top 4), sourceId }`.
- **Chuyển tiền** trả về: `pairs` (top 3 cặp từ→đến, mỗi cặp kèm `amounts`), `fromSourceIds` (top 3), `topAmounts`.

Cách form dùng:
- Select danh mục và nguồn tiền chia 2 nhóm "Thường dùng" và "Khác" (`groupSuggestedOptions`).
- Chip số tiền nằm dưới ô Số tiền (`common/amount-suggestion-chips`). Khi chưa chọn danh mục, chip hiện `topAmounts`; khi đã chọn, chip chỉ hiện số tiền của danh mục đó.
- Khi tạo mới, chọn danh mục mà ô nguồn tiền đang trống thì tự điền `byCategory[id].sourceId`. Ở chế độ sửa thì không tự điền.
- Form chuyển tiền có dòng "Hay chuyển": bấm vào là điền cả nguồn chuyển và nguồn nhận. Chọn nguồn chuyển khi ô "đến" đang trống thì tự điền nguồn nhận của cặp quen. Chip số tiền hiện theo cặp đang chọn, hoặc `topAmounts` khi chưa chọn nguồn.
- Query key nằm dưới `[EXPENSES|INCOMES|TRANSFERS, "suggestions"]`, nên các invalidate sẵn có tự làm mới gợi ý. Chỉ fetch khi modal mở; stale 5 phút.
