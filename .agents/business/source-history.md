# Lịch sử giao dịch nguồn tiền & link chia sẻ public

> Nguồn sự thật là code (`source-transactions.service.ts`, `share-links.service.ts`); nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md).

## Lịch sử giao dịch (nội bộ)

`GET /api/sources-of-money/[id]/transactions?page=&limit=&kind=&from=&to=` (mặc định 20 dòng/trang). UI: nút "Lịch sử" trên bảng nguồn tiền mở trang riêng `/source-history/<id>` (feature `source-history`, URL tạo bằng `buildSourceHistoryUrl`); không còn modal. API vẫn trả lịch sử của nguồn đã lưu trữ, nhưng trang lấy thông tin nguồn từ danh sách nguồn đang dùng nên nguồn đã xóa hiện "Không tìm thấy".

**Không lưu riêng:** mỗi lần gọi, `querySourceTransactions` gộp bằng `$unionWith` từ dữ liệu hiện tại. Sửa/xóa giao dịch thì lịch sử đổi theo, và thời gian là ngày người dùng nhập.

| Dòng (`kind`) | Collection | Điều kiện | Thời gian | `delta` nguồn thường | `delta` thẻ (dư nợ) |
|---|---|---|---|---|---|
| `EXPENSE` | expenses | `sourceOfMoneyId`, **`skipBalanceAdjust ≠ true`** | `spentAt` | −amount | +amount |
| `INCOME` | incomes | `sourceOfMoneyId` | `receivedAt` | +amount | −amount (thu nhập cũ) |
| `TRANSFER_OUT` | transfers | `fromSourceId` | `transferredAt` | −amount | +amount |
| `TRANSFER_IN` | transfers | `toSourceId` | `transferredAt` | +(amount − feeAmount) | −(amount − feeAmount) |
| `ADJUSTMENT` | balanceAdjustments | `sourceOfMoneyId` | `adjustedAt` | delta | delta |
| `ROLLOVER` | cardRollovers | `sourceOfMoneyId` (chỉ thẻ) | `rolledAt` | — | +feeAmount (kèm `rolloverAmount`, `provider`) |

- Phí chuyển tiền và phí đáo hạn (expense `skipBalanceAdjust`) **không** thành dòng riêng vì đã nằm trong transfer / đáo hạn gốc; hiện thành "Phí X" trên dòng chuyển, "Đáo X · dịch vụ" trên dòng đáo hạn. Phí quốc tế và phí thẻ ghi tay là expense thường nên vẫn là dòng `EXPENSE`.
- `kind` lọc theo `EXPENSE` / `INCOME` / `TRANSFER` (gồm cả đi và đến) / `ADJUSTMENT` / `ROLLOVER` (UI chỉ hiện nút lọc này với thẻ). `from`/`to` là `YYYY-MM-DD` theo giờ +07:00 (`server/utils/dayRange.ts`).
- Response: `{ items, pagination, summary: { increase, decrease }, breakdown }` (tổng delta dương / âm trong bộ lọc). `breakdown: [{ id, name, icon, color, total, count }]` là khoản chi (`EXPENSE`) theo danh mục trên toàn bộ kết quả lọc, lớn nhất trước, `id` rỗng = không có danh mục; client hiện 8 dòng đầu, còn lại gộp "Khác". Chỉ API nội bộ trả `breakdown`. UI ghi nhãn "Tiền vào/Tiền ra" cho nguồn thường, "Phát sinh nợ/Giảm nợ" cho thẻ.
- Sắp xếp `occurredAt desc, createdAt desc, _id desc`.
- Query key `[SOURCES_OF_MONEY, "transactions", id, query]`: mọi mutation đã invalidate `SOURCES_OF_MONEY` nên tự làm mới.
- **Biểu đồ theo ngày** (`source-history/components/source-daily-chart`, riêng một hàng ngay dưới tiêu đề trang): `GET /api/sources-of-money/[id]/transactions/daily?month=YYYY-MM` → `{ month, days: [{ date, expense, income, transfer, adjustment, rollover }] }`, đủ mọi ngày của tháng (giờ +07:00), dùng chung các nhánh `$unionWith` với danh sách (`querySourceDailyTotals`). Giá trị là độ lớn không dấu: |delta| cho chi/thu/chuyển (đi + đến gộp)/điều chỉnh; đáo hạn lấy **số tiền đáo** (`rolloverAmount`), không phải phí. Không theo bộ lọc loại; tháng mặc định là tháng của "Từ ngày" (không có thì tháng hiện tại), đổi bằng ô chọn tháng riêng. Cột Đáo hạn chỉ hiện với thẻ. Vẽ bằng `@ant-design/plots` `Column` (group); mobile cuộn ngang.
- **Tổng delta bằng số dư hiện tại** khi nguồn có sổ cái đầy đủ (`ledgerCompleteAt`; nguồn cũ cần chạy `scripts/backfill-opening-balance.ts`). Nút "Đối soát" trong modal so hai số này ([balance-integrity.md](balance-integrity.md)). Chưa làm "số dư sau mỗi giao dịch".

**Trang `/source-history/<id>`:** tiêu đề (quay lại, tên nguồn, ô đổi nguồn, đối soát, chia sẻ) → biểu đồ theo ngày → 4 ô số liệu (số dư/dư nợ, tăng, giảm, số giao dịch) → bộ lọc → danh sách + "Chi theo danh mục". Bộ lọc nằm trên query `?kind=&from=&to=&page=` (`router.replace`, giá trị lạ bị bỏ qua); đổi nguồn thì bỏ bộ lọc. Từ `lg` danh sách là bảng nhóm theo ngày (Giờ | Loại | Danh mục / Đối ứng | Nội dung | Số tiền; tổng ngày chỉ cộng các dòng trong trang đang xem); nhỏ hơn dùng `common/source-transaction-list`. Từ `xl` khối "Chi theo danh mục" nằm cột phải.

## Link chia sẻ public

Mỗi link gắn với **đúng một** nguồn tiền; một nguồn có thể có nhiều link (mỗi người nhận một link). Quản lý trong modal "Chia sẻ" (`source-history/components/share-links-modal`) mở từ nút "Chia sẻ" trên trang lịch sử.

**API nội bộ (cần JWT, lọc `userId`):**
- `GET /api/sources-of-money/[id]/shares`: link chưa thu hồi (kèm `isExpired`).
- `POST /api/sources-of-money/[id]/shares` `{ label?, expiresInDays: 7 | 30 | null, from?, to? }`: mặc định 30 ngày; `label` ≤ 100 ký tự; `from ≤ to`. Trả `token` **đúng một lần**; client ghép URL `<origin>/share/<token>`.
- `DELETE /api/shares/[shareId]`: thu hồi (đặt `revokedAt`), không hoàn tác.

**Token:** `randomBytes(32)` base64url (43 ký tự). DB chỉ lưu `tokenHash` = SHA-256, nên lộ DB không lộ link.

**API public (không cần đăng nhập):**
- `GET /api/public/shares/[token]`: `{ sourceName, sourceType, from, to, expiresAt }`; tăng `viewCount`, đặt `lastViewedAt`.
- `GET /api/public/shares/[token]/transactions?page=&limit=&from=&to=`: `{ items: [{ occurredAt, delta, note }], pagination }`.
- `userId` và `sourceOfMoneyId` lấy từ **ShareLink tìm theo token** (ngoại lệ có kiểm soát của luật "userId từ JWT"); không nhận id nguồn từ URL/query.
- Sai token, hết hạn, đã thu hồi hay nguồn đã xóa hẳn đều trả **404** "Link không tồn tại hoặc đã hết hạn". Nguồn đã lưu trữ vẫn xem được.
- **Chỉ trả 4 thứ:** tên nguồn tiền, thời gian, số tiền có dấu (`delta`), nội dung (`note`). Không có danh mục, loại giao dịch, phí, số dư, nguồn đối ứng, điều chỉnh tay hay bất kỳ ID nào. Điều này nằm ở `$project` phía server, không chỉ ẩn ở client.
- `from`/`to` của người xem bị kẹp trong khoảng ngày của link. Không lọc theo loại.
- Header `Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
- Logout/`tokenVersion` **không** thu hồi link; muốn thu hồi phải bấm thu hồi.

**Trang `/share/[token]`** (`features/public-share`): nằm ngoài `(protected)`, không có sidebar. Token đọc bằng `useParams` phía client. Proxy bỏ qua `share/` và `api/public/`; `AuthBootstrap` không gọi `/auth/me` trên `/share/*`; network API public gọi với `skipAuthRedirect`. Danh sách dùng chung `components/common/source-transaction-list` với modal nội bộ.
