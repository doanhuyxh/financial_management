# So sánh lãi suất tiết kiệm — `/deposit-rate-compare`

> Nguồn sự thật là code (`deposit-rates.service.ts`, `server/utils/depositRates/`, `features/deposit-rate-compare/utils.ts`); nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md).

Độc lập với nguồn tiền: không cần có tài khoản ở ngân hàng đó. Chỉ lãi **gửi tiết kiệm VND**, lãi cuối kỳ.

## Nguồn số liệu (kết hợp)

**Tự động** — `server/utils/depositRates/providers/`, mỗi ngân hàng một `parse(html)` thuần:

| Provider | Trang | Cách đọc | Sản phẩm (`key`) |
|---|---|---|---|
| `vcb` | vietcombank.com.vn …/KHCN---Lai-suat | JSON nhúng trong thuộc tính HTML (`{Count, UpdatedDate, Data:[{tenorType, tenor, currencyCode, rates}]}`), `rates` thập phân (0.054 = 5,4%) | `vcb:online` (tenorType `Online`), `vcb:counter` (`Savings`); bỏ `FixedDeposit`, ngoại tệ, kỳ hạn ngày |
| `acb` | acb.com.vn/lai-suat-tien-gui | Bảng HTML trong `__NEXT_DATA__`, chọn bảng có "Online (LCK)" và không phải "tùy chọn"/"trả trước"; hàng = bậc số tiền (triệu VND), cột = kỳ hạn | `acb:online` (4 bậc: 0, 200 tr, 1 tỷ, 5 tỷ) |

- Lý do chỉ có 2 ngân hàng (kiểm tra 06/11/2026): trang tổng hợp webgia.com **mã hóa số liệu chống thu thập** → không dùng, không giải mã. BIDV, Techcombank, VietinBank render bảng bằng JS; MB trả 403. Thêm ngân hàng chỉ khi trang/JSON công khai đọc được trực tiếp; không vượt cơ chế chống thu thập.
- `parseHtmlTable` (`depositRates/html.ts`) tự viết vì repo không có thư viện parse HTML: trải `rowspan`/`colspan`, giải mã entity.
- Lưu ở collection **dùng chung** `depositRateSnapshots` (không `userId` — dữ liệu công khai, ngoại lệ có chủ đích của luật 1; user không ghi được). Một document/sản phẩm: `tiers`, `fetchedAt`, `lastAttemptAt`, `lastError`.
- **Khi nào lấy:** `GET /api/deposit-rates` lấy lại ngân hàng có bảng chưa có hoặc cũ hơn **12 giờ**, nhưng không thử lại nếu lần thử gần nhất (kể cả lỗi) chưa quá **10 phút**; chờ lấy xong rồi trả (timeout 10 giây/trang). Nhiều request cùng lúc chờ chung một lần lấy (`global.depositRatesRefreshing`). Không có cron.
- `POST /api/deposit-rates/refresh` (nút "Lấy lại"): bỏ qua mốc 12 giờ, vẫn giữ khoảng nghỉ 10 phút (hết lượt → 429).
- **Kiểm tra hợp lý** trước khi ghi: bậc đầu `minAmount = 0`, ≥ 3 kỳ hạn, mọi lãi suất trong (0, 20]%. Sai, lỗi mạng/HTTP, hay trang đổi cấu trúc → **giữ số cũ**, chỉ ghi `lastError` (UI: "Lần lấy gần nhất lỗi, đang hiện số cũ"); lỗi ngay lần đầu → dòng rỗng "Chưa lấy được".

**Tự nhập** — collection `depositRates` (theo `userId`): ngân hàng chọn từ danh sách VietQR (`bankCode` = `code`), sản phẩm ≤ 60 ký tự, một bậc (`minAmount 0`), kỳ hạn 1–120 tháng, lãi suất (0, 20]% làm tròn 2 số lẻ, tối đa 30 bảng/user. API: `POST /api/deposit-rates`, `PUT|DELETE /api/deposit-rates/[id]`.

## Tính toán (client, `utils.ts`)

- Kịch bản (localStorage `deposit-rate-compare-scenario`): số tiền (mặc định 100 triệu), kỳ hạn (mặc định 12 tháng; chip 1, 3, 6, 9, 12, 13, 18, 24, 36).
- `pickTier`: bậc có `minAmount` lớn nhất ≤ số tiền. Ngân hàng không có kỳ hạn đó → "Không có kỳ hạn này", xuống cuối, không xếp hạng.
- Tiền lãi = `round(số tiền × %/năm × tháng / 12)` — lãi đơn, nhận cuối kỳ, không tái tục (ngân hàng tính theo ngày thực tế/365 nên chênh nhỏ).
- Xếp hạng (`rankValues`, như so sánh thẻ): cần ≥ 2 giá trị khác nhau; cao nhất xanh, thấp nhất đỏ. Bảng ma trận tô từng cột kỳ hạn.

## Bố cục trang

Kịch bản gửi → ngân hàng lãi cao nhất (kèm chênh lệch so với thấp nhất) → bảng xếp hạng kỳ hạn đang chọn → bảng ngân hàng × kỳ hạn (bấm kỳ hạn để chọn) → nguồn số liệu (link trang ngân hàng, ngày cập nhật, lỗi, nút "Lấy lại"; danh sách tự nhập + sửa/xóa). Query key `DEPOSIT_RATES` (stale 30 phút). Logo ngân hàng lấy từ VietQR theo `bankCode`.

Test: `src/server/__tests__/deposit-rates.test.ts` (HTML mẫu thu gọn đúng cấu trúc trang thật, `fetch` giả).
