# Chi dự kiến (chi trong tương lai) — giữ chỗ số dư

> Nguồn sự thật là code (`planned-expenses.service.ts`, `server/utils/reservation.ts`); nếu code khác tài liệu, tin code và sửa tài liệu. Quy tắc `$inc`/rollback: [balance-rules.md](balance-rules.md).

Quyết định của user (23/11/2026): đến ngày **không tự trừ**, chờ bấm Xác nhận; áp dụng cả thẻ tín dụng (giữ hạn mức); được sửa; UI nằm trong form Chi tiêu.

## Mô hình

- Collection `plannedExpenses`: `categoryId`, `sourceOfMoneyId`, `amount`, `note`, `plannedAt` (12:00 giờ VN của ngày dự kiến), `status` `PENDING` / `CONFIRMED` / `CANCELLED`, `expenseId` (chi tiêu tạo khi xác nhận), `confirmedAt`, `cancelledAt`.
- `SourceOfMoney.reservedAmount`: tổng `amount` của các khoản PENDING trên nguồn. **Không thuộc sổ cái**: số dư/dư nợ chưa đổi, đối soát không tính nó.
- **Phần khả dụng** (`getAvailableAmount` ở `libs/utils/trackedAmount.ts`): nguồn thường `balance − reserved`; thẻ `creditLimit − currentDebt − reserved`.

## Luật

| Thao tác | Điều kiện / tác động |
|---|---|
| Tạo | Ngày dự kiến **sau hôm nay** (giờ VN), tối đa 5 năm; danh mục chi tiêu đang dùng; nguồn chưa lưu trữ; `$inc reservedAmount` với filter phần khả dụng ≥ amount (`availableFilterFor`) — không đủ thì 400 |
| Sửa (chỉ PENDING) | Cùng nguồn: giữ thêm / bỏ bớt theo chênh lệch. Đổi nguồn: giữ chỗ nguồn mới trước, rồi bỏ nguồn cũ. Giữ nguyên ngày (kể cả đã tới hạn) thì cho qua; đổi ngày thì phải sau hôm nay. Ghi doc filter `status: PENDING`, lỗi thì bù trừ ngược |
| Hủy (PENDING, bất cứ lúc nào) | Chiếm trạng thái `CANCELLED` trước, rồi bỏ giữ chỗ (`releaseOnSource` kẹp về 0, không bao giờ âm). Không tạo giao dịch |
| Xác nhận (PENDING, từ ngày dự kiến) | Chiếm `CONFIRMED` → một `$inc` đổi giữ chỗ thành trừ thật (thường: `balance −`, `reserved −`, filter `balance ≥ amount`; thẻ: `debt +`, `reserved −`, filter `debt + amount ≤ limit`) → tạo Expense (ngày chi = `plannedAt`, hoặc bây giờ nếu xác nhận trước 12:00 của chính ngày đó; kiểm khóa sổ). Lỗi: xóa expense → hoàn `$inc` → trả về PENDING |

- **Mọi khoản trừ mới** đi qua phần khả dụng: chi tiêu tạo/sửa (`adjustSourceBalance` apply) và chuyển tiền đi (`debitSource`, gồm tự trả của đáo hạn). Thông báo: không có giữ chỗ thì giữ câu cũ ("Số dư nguồn tiền không đủ" / "Vượt hạn mức tín dụng còn lại"); thiếu do giữ chỗ thì "… khả dụng không đủ: đang giữ X cho chi dự kiến" (`insufficientMessage`).
- **Không chặn** bởi giữ chỗ: xóa thu nhập, điều chỉnh số dư tay, phí đáo hạn, giảm hạn mức. Phần khả dụng có thể âm; khi xác nhận mà không đủ thì báo lỗi, user sửa số tiền hoặc hủy.
- Nguồn còn khoản PENDING: **không xóa được** ("Hãy hủy hoặc xác nhận trước khi xóa"). Danh mục có chi dự kiến (mọi trạng thái) chỉ lưu trữ, không xóa hẳn, không đổi loại.
- Mỗi bước bù trừ bọc `safeRollback`, giữ nguyên thứ tự. Bước "trả lại giữ chỗ" khi rollback dùng `$inc` không kiểm khả dụng để không mất giữ chỗ.
- Xác nhận không ghi `transactionAudits` (như tạo chi tiêu trên web). MCP chưa có tool cho chi dự kiến (MCP chỉ đọc + tạo chi/thu, [mcp-write.md](mcp-write.md)); `list_sources_of_money` có sẵn `reservedAmount`.

## API

| | |
|---|---|
| `GET /api/planned-expenses?status=` | mặc định `PENDING` (sắp theo `plannedAt` tăng, tối đa 200); trạng thái khác: 50 bản mới nhất |
| `POST /api/planned-expenses` `{ categoryId, sourceOfMoneyId, amount, note?, plannedDate: "YYYY-MM-DD" }` | có `withIdempotency` (`planned-expense.create`) |
| `PUT /api/planned-expenses/[id]` | cùng body |
| `POST /api/planned-expenses/[id]/cancel` · `/confirm` | |

## UI

- Form chi tiêu (tạo mới, không mở từ phí thẻ): công tắc **"Chi trong tương lai"** → ô "Ngày dự kiến chi" chỉ cho ngày sau hôm nay; ẩn phí quốc tế và cảnh báo phí sử dụng thẻ; nút "Tạo chi dự kiến". Ô nguồn hiện "Số dư/Hạn mức khả dụng … · đang giữ X cho chi dự kiến".
- Trang chi tiêu: khối **"Chi dự kiến"** (`expenses/components/planned-expenses-panel`) trên danh sách, ẩn khi trống: tổng đang giữ chỗ, tag "Đến hạn", nút **Xác nhận** khi tới ngày, menu Sửa / Hủy; bấm dòng để sửa (form tiêu đề "Sửa chi dự kiến").
- Trang nguồn tiền: dòng nhỏ "Giữ chỗ chi dự kiến X" dưới số dư / dư nợ.
- Hook `usePlannedExpenses` (query key `PLANNED_EXPENSES`): mọi mutation làm mới nguồn tiền; xác nhận làm mới thêm chi tiêu + dashboard.

Test: `src/server/__tests__/planned-expenses.test.ts`.
