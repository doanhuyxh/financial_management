# Nguồn tiền — `sources-of-money.service.ts`

> Nguồn sự thật là code; nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md).
> Phí, lãi, kỳ sao kê của thẻ tín dụng: [credit-card-fees.md](credit-card-fees.md).

Loại (`SourcesOfMoneyType`): `BANK` (Ngân hàng), `CASH` (Tiền mặt), `E_WALLET` (Ví điện tử), `CREDIT_CARD` (Thẻ tín dụng), `OTHER` (Khác).

Có hai cách theo dõi tiền:

- **Nguồn thường** (BANK/CASH/E_WALLET/OTHER): theo dõi bằng `balance`, luôn ≥ 0.
- **Thẻ tín dụng**: `balance` luôn = 0. Theo dõi bằng `creditDetails.currentDebt` (dư nợ) và `creditLimit` (hạn mức). Ràng buộc `0 ≤ currentDebt ≤ creditLimit`. `statementDate` và `dueDate` là ngày 1–31. `dueDate` chỉ để hiển thị; `statementDate` xác định **kỳ sao kê** dùng cho điều kiện miễn phí và phí thanh toán.
- **Phí thẻ, lãi, kỳ sao kê** (chỉ thẻ, tùy chọn): xem [credit-card-fees.md](credit-card-fees.md).

Quy tắc CRUD:

- Khi tạo/sửa, người dùng **nhập trực tiếp** số dư hoặc dư nợ. Đây là cách duy nhất để "điều chỉnh" số dư thủ công. Mỗi lần điều chỉnh sinh một bản ghi **BalanceAdjustment** (không phải giao dịch, không tính vào thống kê):
  - Tạo nguồn với số dư/dư nợ ≠ 0 thì ghi bản ghi "Số dư ban đầu" (0 → giá trị).
  - Khi sửa, client gửi `expectedAmount` = số dư (nguồn thường) hoặc dư nợ (thẻ) lúc mở form. Nếu giá trị mới **bằng** `expectedAmount` (người dùng không sửa số) thì server **giữ nguyên** số trong DB, kể cả khi giao dịch khác đã làm nó đổi. Với thẻ thì khi đó thêm điều kiện hạn mức mới ≥ dư nợ hiện tại ("Hạn mức mới không được thấp hơn dư nợ hiện tại"); thẻ cũ thiếu `currentDebt` được coi là 0. Quy tắc "dư nợ với thẻ, số dư với nguồn thường" nằm ở `getTrackedAmount` (`src/libs/utils/trackedAmount.ts`), dùng chung cho server và form.
  - Nếu giá trị mới **khác**, server chỉ ghi đè khi DB vẫn bằng `expectedAmount` (điều kiện nằm trong filter). Ngược lại trả 409 "Số dư/Dư nợ vừa thay đổi do giao dịch khác..."; client tải lại danh sách, cập nhật bản ghi đang sửa (form nhận số và `expectedAmount` mới) và báo người dùng kiểm tra rồi lưu lại. Ghi đè thành công thì ghi BalanceAdjustment kèm `adjustmentNote` (tối đa 200 ký tự). Nếu ghi lịch sử lỗi thì hoàn số cũ.
  - Thẻ tín dụng cập nhật theo từng trường (`creditDetails.creditLimit`, ...), nên sửa tên/hạn mức không ghi đè dư nợ.
  - Xem lịch sử: `GET /api/sources-of-money/[id]/adjustments?page=&limit=` (xem được cả nguồn đã lưu trữ); UI là nút "Lịch sử điều chỉnh" trên bảng nguồn tiền. Query key nằm dưới `SOURCES_OF_MONEY`.
- **Tài khoản nhận tiền / VietQR** (chỉ loại `BANK`, tùy chọn): `bankAccount` gồm `bin` (6 số NAPAS), `bankName` (tên ngắn, lưu kèm để hiển thị không cần API), `accountNumber` (chữ/số, ≤ 19 ký tự), `accountName` (server chuẩn hóa in hoa, không dấu, ≤ 50). Bỏ trống số tài khoản thì `$unset bankAccount`. Danh sách ngân hàng trong form lấy thẳng từ `https://api.vietqr.io/v2/banks` phía client (`useVietQrBanks`, cache cả phiên). Nút QR trên bảng mở modal tạo mã ngay trên trình duyệt (`buildVietQrPayload` trong `src/libs/utils/vietQr.ts`, chuẩn EMVCo/NAPAS, hiển thị bằng `QRCode` của antd): không nhập số tiền là QR tĩnh, có số tiền là QR động; nội dung bị bỏ dấu, chỉ giữ chữ/số, ≤ 50 ký tự. Quét QR không tự tạo Thu nhập — tiền về thì người dùng vẫn ghi giao dịch như bình thường.
- **Không đổi được loại** sau khi tạo (kể cả giữa các loại thường, kể cả khi chưa có giao dịch): server trả 400 "Không được đổi loại nguồn tiền", form khóa ô Loại khi sửa. Muốn đổi loại thì tạo nguồn mới.
- Có sắp xếp kéo-thả (`sortOrder`, API `/reorder`). API yêu cầu `orderedIds` gồm **toàn bộ** nguồn tiền của user; UI ẩn tay kéo khi đang tìm kiếm, lọc loại hoặc bật "Ẩn nguồn trống".
- Công tắc **"Ẩn nguồn trống"** (lọc phía client, nhớ trong localStorage `sources-of-money-hide-empty`): ẩn nguồn thường có số dư = 0 và thẻ tín dụng có dư nợ = 0 (`getTrackedAmount(source) === 0`). Chỉ ảnh hưởng trang Nguồn tiền, không ảnh hưởng ô chọn nguồn ở các form hay dashboard. Bản ghi mới nhận `sortOrder = max + 1`. Nếu dữ liệu cũ thiếu `sortOrder`, hệ thống tự backfill khi GET.
- **Xóa nguồn tiền (xóa mềm):**
  - Nguồn **chưa có** Expense/Income/Transfer thì xóa hẳn.
  - Nguồn **đã có** giao dịch thì chỉ đặt `archivedAt` (lưu trữ). Yêu cầu số dư = 0 (nguồn thường) hoặc dư nợ = 0 (thẻ); điều kiện này nằm trong filter của `findOneAndUpdate`. Nếu không thỏa thì báo "Nguồn tiền còn số dư hoặc dư nợ...".
  - Nguồn đã lưu trữ bị ẩn khỏi GET danh sách, reorder, gợi ý và ô chọn; không sửa được và không dùng được cho giao dịch mới. Lịch sử vẫn hiện tên kèm "(đã xóa)" (populate có `archivedAt`, xử lý ở `withArchivedLabel`).
  - Giao dịch cũ trên nguồn đã lưu trữ hoặc đã xóa hẳn (dữ liệu cũ) vẫn sửa/xóa được: phía nguồn đó được bỏ qua (không điều chỉnh số dư), phía còn hoạt động vẫn điều chỉnh bình thường. Khi sửa, được **giữ nguyên** nguồn đã lưu trữ, nhưng không được chọn một nguồn đã lưu trữ khác.
