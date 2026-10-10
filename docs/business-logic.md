# Nghiệp vụ — Money Manager (financial_management)

> Tài liệu tóm tắt nghiệp vụ đang chạy, đọc trước khi sửa code. Cập nhật lần cuối: 2026-10-09.
> Nguồn sự thật là `src/server/services/*.service.ts` — nếu code khác tài liệu, tin code và sửa lại tài liệu.

## 1. Tổng quan

Ứng dụng quản lý tài chính cá nhân (tiếng Việt, đơn vị VND). Mỗi user chỉ thấy dữ liệu của chính mình (mọi query đều lọc theo `userId` lấy từ JWT).

- **Stack:** Next.js 16 (App Router, `src/proxy.ts` thay cho middleware) + React 19, MongoDB/Mongoose, React Query, Redux Toolkit (chỉ cho auth/navigation), Ant Design + shadcn, `@ant-design/plots` cho biểu đồ.
- **Kiến trúc:** Frontend và API chung một app Next.js. API ở `src/app/api/**/route.ts`, route chỉ parse request rồi gọi `XxxService` trong `src/server/services/`. Client gọi API qua `src/libs/networkApi/*.api.ts`, sau đó đến hook React Query trong `src/libs/hooks/customHooks/`, rồi context của từng feature.
- **Response chuẩn:** `{ status, message, data, statusCode }`. Danh sách có phân trang trả `data: { items, pagination: { total, page, limit, totalPages } }` (xem `src/server/utils/responseServer.ts`).
- **Múi giờ:** Asia/Ho_Chi_Minh (+07:00). Dashboard tính theo múi này; PM2 cũng đặt `TZ`.

## 2. Thực thể (Mongo collections)

| Model | Collection | Trường chính |
|---|---|---|
| User | `user` | fullName, email, password (**plain text**), phoneNumber, avatarUrl |
| Category | `categories` | userId, name, sortOrder |
| SourceOfMoney | `sourcesOfMoney` | userId, name, type, balance, sortOrder, creditDetails{creditLimit, currentDebt, statementDate, dueDate}, metadata; virtual `availableCreditLimit = max(0, limit − debt)` |
| Expense | `expenses` | userId, categoryId, sourceOfMoneyId, amount (>0), note, spentAt, skipBalanceAdjust |
| Income | `incomes` | userId, categoryId, sourceOfMoneyId, amount (>0), note, receivedAt |
| Transfer | `transfers` | userId, fromSourceId, toSourceId, amount, feePercent, feeAmount, feeCategoryId, feeExpenseId, note, transferredAt |

**Category** dùng chung cho cả chi tiêu, thu nhập và phí chuyển tiền (không có phân loại thu/chi).

## 3. Nguồn tiền (Sources of Money)

Loại (`SourcesOfMoneyType`): `BANK` (Ngân hàng), `CASH` (Tiền mặt), `E_WALLET` (Ví điện tử), `CREDIT_CARD` (Thẻ tín dụng), `OTHER` (Khác).

Có hai cách theo dõi tiền:

- **Nguồn thường** (BANK/CASH/E_WALLET/OTHER): theo dõi bằng `balance`, luôn ≥ 0.
- **Thẻ tín dụng**: `balance` luôn = 0. Theo dõi bằng `creditDetails.currentDebt` (dư nợ) và `creditLimit` (hạn mức). Ràng buộc `0 ≤ currentDebt ≤ creditLimit`. `statementDate` và `dueDate` là ngày 1–31, hiện chỉ để hiển thị.

Quy tắc CRUD:

- Khi tạo/sửa, người dùng **nhập trực tiếp** số dư hoặc dư nợ. Đây là cách duy nhất để "điều chỉnh" số dư thủ công; việc này không sinh giao dịch nào.
- Khi đổi từ thẻ tín dụng sang loại khác, hệ thống `$unset creditDetails`.
- Có sắp xếp kéo-thả (`sortOrder`, API `/reorder`). Bản ghi mới nhận `sortOrder = max + 1`. Nếu dữ liệu cũ thiếu `sortOrder`, hệ thống tự backfill khi GET.
- **Xóa nguồn tiền không kiểm tra ràng buộc.** Expense/Income/Transfer đang trỏ tới nguồn đó sẽ mồ côi; UI hiển thị "—".

## 4. Quy tắc biến động số dư (cốt lõi)

Mọi giao dịch đều cập nhật số dư bằng `$inc` atomic với điều kiện trong filter (ví dụ `balance: {$gte: amount}`) để tránh âm. **Không dùng Mongo transaction.** Thay vào đó, mỗi bước có rollback thủ công bằng try/catch (bù trừ ngược). Khi sửa code, phải giữ nguyên thứ tự rollback này.

### 4.1 Chi tiêu (Expense) — `expenses.service.ts`

| | Nguồn thường | Thẻ tín dụng |
|---|---|---|
| Tạo (apply) | `balance −= amount`, yêu cầu `balance ≥ amount` ("Số dư nguồn tiền không đủ") | `currentDebt += amount`, yêu cầu ≤ creditLimit ("Vượt hạn mức tín dụng còn lại") |
| Xóa (revert) | `balance += amount` | `currentDebt −= amount` (không xuống dưới 0) |
| Sửa | revert bản cũ (nguồn cũ, số tiền cũ), rồi apply bản mới; nếu lỗi thì khôi phục | như cột bên |

- `skipBalanceAdjust = true` (chỉ dùng cho **phí chuyển tiền**, xem 4.3): sửa hoặc xóa expense này **không động vào số dư**.
- Lọc danh sách: `search` (regex theo note), `categoryId`, `sourceOfMoneyId`, `from`/`to` (to = cuối ngày). Sắp xếp `spentAt desc`.

### 4.2 Thu nhập (Income) — `incomes.service.ts`

| | Nguồn thường | Thẻ tín dụng |
|---|---|---|
| Tạo (apply) | `balance += amount` | **Trả nợ thẻ:** `currentDebt −= amount`, yêu cầu amount ≤ dư nợ ("Số tiền thanh toán vượt dư nợ hiện tại") |
| Xóa (revert) | `balance −= amount`, yêu cầu `balance ≥ amount` (nếu đã tiêu hết thì không xóa được) | `currentDebt += amount` |
| Sửa | revert cũ rồi apply mới, có rollback | |

### 4.3 Chuyển tiền (Transfer) — `transfers.service.ts`

Chỉ có **tạo** và **xóa**. **Không có sửa** (không có PUT).

Các trường hợp được phép (`validateTransferRules`):

| Từ → Đến | Phí | Bên chuyển | Bên nhận |
|---|---|---|---|
| Thường → Thường | **Không cho phép phí** | `balance −= amount` (phải đủ số dư) | `balance += amount` |
| Thường → Thẻ (trả nợ thẻ) | **Không cho phép phí** | `balance −= amount` | `currentDebt −= amount`; amount ≤ dư nợ hiện tại |
| Thẻ → Thường (rút/chuyển tiền từ thẻ) | Cho phép `feePercent` | `currentDebt += amount` (≤ hạn mức còn lại) | `balance += amount − feeAmount` |
| Thẻ → Thẻ | ❌ "Không hỗ trợ chuyển giữa hai thẻ tín dụng" | | |

Nguồn chuyển và nguồn nhận phải khác nhau.

**Phí chuyển đổi (chỉ khi chuyển từ thẻ tín dụng):**
- `feeAmount = round(amount × feePercent / 100)` và phải `< amount`.
- Khi có phí, bắt buộc chọn `feeCategoryId`. Hệ thống tự tạo một **Expense** với: nguồn = thẻ chuyển, amount = feeAmount, note = note của transfer (hoặc "Phí chuyển đổi X%"), `spentAt = transferredAt`, `skipBalanceAdjust: true`. ID của expense này lưu vào `transfer.feeExpenseId`.
- Ý nghĩa: dư nợ thẻ tăng **đủ amount**, người nhận chỉ được `amount − fee`. Phần phí được **ghi nhận** thành chi tiêu (để hiện trong thống kê) nhưng **không trừ số dư lần nữa**.

**Xóa transfer:** lấy lại `receiveAmount` từ bên nhận (nếu bên nhận đã tiêu hết, hoặc thẻ nhận không còn đủ hạn mức để hoàn dư nợ, thì báo lỗi), hoàn `amount` cho bên chuyển, rồi xóa fee expense và transfer.

Từ UI có hai lối vào chuyển tiền: trang `/transfers` và nút chuyển tiền trên trang `/sources-of-money`. Cả hai dùng chung `transfers/components/transfer-form-modal-content`, và UI validate trùng với server (ẩn thẻ ở ô "đến" khi "từ" là thẻ, hiển thị số dư hoặc hạn mức còn lại).

## 5. Danh mục (Categories)

- CRUD theo tên, kéo-thả sắp xếp (`/api/categories/reorder`, body `{ orderedIds }`; mọi ID phải thuộc user).
- **Xóa không kiểm tra ràng buộc.** Expense/Income đang dùng danh mục sẽ mồ côi, và dashboard gom chúng vào "Không xác định".

## 6. Dashboard — `dashboard.service.ts`

`GET /api/dashboard/expenses-summary?year=&month=` chỉ thống kê **chi tiêu**. Thu nhập và chuyển tiền chưa có thống kê.
- Khoảng thời gian: ngày 1 00:00 đến ngày cuối tháng 23:59:59.999, theo +07:00.
- `byCategory`: tổng theo danh mục (pie chart), sắp xếp theo tổng giảm dần.
- `byDay`: tổng theo từng ngày trong tháng (bar chart), ngày không có chi tiêu vẫn có giá trị 0.
- `bySource`: tổng theo nguồn tiền (`sourceId, sourceName, sourceType`; donut chart kèm tỷ lệ %), sắp xếp theo tổng giảm dần. Nguồn đã bị xóa gom vào "Không xác định" (`sourceType = null`). Tỷ lệ % tính phía client = total / tổng tháng.
- `totalAmount` = tổng `byCategory`.
- **Phí chuyển tiền (expense có skipBalanceAdjust) được tính vào chi tiêu.**
- Thẻ tổng quan ở header (tính phía client từ summary): **Trung bình / ngày** = totalAmount chia cho số ngày đã qua (tháng hiện tại tính đến hôm nay, tháng trước tính cả tháng, tháng tương lai trả về 0); **Ngày chi nhiều nhất** = ngày có tổng lớn nhất trong `byDay`; **Số danh mục đã chi** = số phần tử của `byCategory`.

**Dư nợ thẻ tín dụng** (tính phía client, `features/dashboard/utils.ts`): lấy các nguồn `CREDIT_CARD` có `currentDebt > 0`. Ngày đến hạn kế tiếp là lần gần nhất (tính từ hôm nay) có ngày = `dueDate`; nếu tháng ngắn hơn thì lấy ngày cuối tháng. Trạng thái: hôm nay → "Đến hạn hôm nay" (đỏ); ≤ 3 ngày → đỏ; ≤ 7 ngày → cam; còn lại → xanh; không có `dueDate` → "Chưa đặt ngày đến hạn". Hệ thống không theo dõi việc đã thanh toán kỳ nào: còn dư nợ là còn hiện cảnh báo.

Nút "Thêm chi tiêu" trên dashboard điều hướng tới `/expenses?action=create`. Trang chi tiêu mở sẵn modal tạo mới, sau đó xóa query param.

## 7. Xác thực

- `POST /api/auth/login` với `{ email, password }`: so sánh password **dạng plain text**. Thành công thì set cookie `access_token` (HttpOnly, Secure, SameSite=Strict, sống 1 năm). JWT là HS256, `exp` 365 ngày, payload gồm `userId, email, phoneNumber, fullName, avatarUrl`.
- `GET /api/auth/me` trả thông tin lấy từ token. `GET /api/auth/logout` xóa mọi cookie.
- Không có đăng ký. User được tạo thẳng trong DB.
- `src/proxy.ts`: chặn mọi route trừ `/` và `/api/auth/*`. Nếu không có token hoặc token sai: request API nhận 401, request trang bị redirect về `/?returnUrl=...`. Proxy dùng `jwtUtil.edge.ts` (WebCrypto); service dùng `jwtUtil.ts` (`jose`). Service tự đọc lại cookie qua `getCurrentUser()`.
- Client: `AuthBootstrap` gọi `fetchAuthMe` một lần và lưu vào Redux `authSlice`.

## 8. Trang (UI) và menu

| URL | Feature folder | Nội dung |
|---|---|---|
| `/` | `auth-login` | Đăng nhập |
| `/dashboard` | `dashboard` | Chọn tháng; nút thêm chi tiêu; bảng dư nợ thẻ tín dụng và hạn thanh toán; donut chart theo danh mục và theo nguồn tiền (số tiền + %), bar chart theo ngày |
| `/expenses` | `expenses` | Bảng và form chi tiêu (có tùy chọn "tiếp tục tạo"); `?action=create` mở sẵn modal |
| `/incomes` | `incomes` | Bảng và form thu nhập (có tùy chọn "tiếp tục tạo") |
| `/transfers` | `transfers` | Lịch sử chuyển tiền: tạo, xóa |
| `/sources-of-money` | `sources-of-money` | Quản lý nguồn tiền, kéo-thả sắp xếp, chuyển tiền nhanh |
| `/categories` | `categories` | Quản lý danh mục, kéo-thả sắp xếp |

Menu nằm trong `src/components/layout/navigation-config.tsx`: Dashboard; nhóm "Giao dịch" (Chi tiêu, Thu nhập, Chuyển tiền); nhóm "Quản lý" (Nguồn tiền, Danh mục). Route key ở `src/libs/constants/menuKey.ts`.

**Cache React Query** (key ở `configQueryKey`), các mutation invalidate như sau:
- expense → `EXPENSES`, `SOURCES_OF_MONEY`, `DASHBOARD_EXPENSES_SUMMARY`
- income → `INCOMES`, `SOURCES_OF_MONEY`
- transfer → `TRANSFERS`, `SOURCES_OF_MONEY`, `EXPENSES`, `DASHBOARD_EXPENSES_SUMMARY`
- Mặc định (`tanstack-provider.tsx`): staleTime 60 giây, gcTime 5 phút, không refetch khi focus lại tab, retry 1 lần. Dữ liệu chỉ đổi qua mutation của chính app nên dựa vào invalidate ở trên.

## 9. Điểm cần lưu ý / nợ kỹ thuật đã biết

1. Không dùng Mongo transaction. Rollback thủ công có thể để lại dữ liệu lệch nếu chính bước rollback cũng lỗi, hoặc nếu có request đồng thời.
2. Sửa fee expense (có `skipBalanceAdjust`) trong trang Chi tiêu **không đồng bộ** với transfer gốc (feeAmount của transfer giữ nguyên). Nếu xóa fee expense riêng lẻ, transfer vẫn giữ `feeExpenseId` cũ.
3. Xóa Category hoặc SourceOfMoney không kiểm tra giao dịch đang tham chiếu.
4. Sửa trực tiếp số dư/dư nợ trên form nguồn tiền sẽ ghi đè và không để lại lịch sử. Sau đó, revert một giao dịch cũ có thể bị chặn (ví dụ số dư không đủ để xóa income).
5. Password lưu plain text; token sống 1 năm, không có refresh hay revoke.
6. Chuyển tiền không sửa được, chỉ xóa rồi tạo lại.
7. Bộ lọc `to` dùng `setHours(23,59,59)` theo giờ server (PM2 đặt `TZ=Asia/Ho_Chi_Minh`).
8. Các helper `formatMoney`, `getRefId`... đang bị lặp lại trong `features/{expenses,incomes,transfers}/utils.ts`.

## 10. Vận hành

- Dev: `bun dev`. Build: `bun run build`. Package manager là **bun** (đã bỏ `package-lock.json`).
- ENV: `MONGODB_URI`, `DATABASE_NAME`, `JWT_SECRET`, `NEXT_PUBLIC_API_BASE_URL` (base URL của API, ví dụ `.../api`, dùng trong `fetcherBackEnd`), `NEXT_PUBLIC_CLIENT_BASE_URL`.
- Deploy: `scripts/deploy.sh` trên server (`/home/rocky/financial_management`) thực hiện git pull, `bun i`, build, rồi `pm2 restart ecosystem.config.js` (app `finance-management-web`, port 3004). Kết quả deploy được báo qua webhook Zalo.
