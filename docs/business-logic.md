# Nghiệp vụ — Money Manager (financial_management)

> Tài liệu tóm tắt nghiệp vụ đang chạy, đọc trước khi sửa code. Cập nhật lần cuối: 2026-10-23.
> Nguồn sự thật là `src/server/services/*.service.ts` — nếu code khác tài liệu, tin code và sửa lại tài liệu.

## 1. Tổng quan

Ứng dụng quản lý tài chính cá nhân (tiếng Việt, đơn vị VND). Mỗi user chỉ thấy dữ liệu của chính mình (mọi query đều lọc theo `userId` lấy từ JWT).

- **Stack:** Next.js 16 (App Router, `src/proxy.ts` thay cho middleware) + React 19, MongoDB/Mongoose, React Query, Redux Toolkit (chỉ cho auth/navigation), Ant Design + shadcn, `@ant-design/plots` cho biểu đồ.
- **Kiến trúc:** Frontend và API chung một app Next.js. API ở `src/app/api/**/route.ts`, route chỉ parse request rồi gọi `XxxService` trong `src/server/services/`. Client gọi API qua `src/libs/networkApi/*.api.ts`, sau đó đến hook React Query trong `src/libs/hooks/customHooks/`, rồi context của từng feature.
- **Response chuẩn:** `{ status, message, data, statusCode }`. Danh sách có phân trang trả `data: { items, pagination: { total, page, limit, totalPages } }` (xem `src/server/utils/responseServer.ts`). `page`/`limit` được chuẩn hóa qua `normalizePagination` (`src/server/utils/pagination.ts`): page ≥ 1, 1 ≤ limit ≤ 100, giá trị sai thì dùng mặc định.
- **Cập nhật số dư thẻ tín dụng** luôn đặt điều kiện hạn mức/dư nợ ngay trong filter của `findOneAndUpdate` (không chỉ kiểm tra trên bản đọc trước), để request đồng thời không vượt hạn mức hoặc làm dư nợ âm.
- **Múi giờ:** Asia/Ho_Chi_Minh (+07:00). Dashboard tính theo múi này; PM2 cũng đặt `TZ`.

## 2. Thực thể (Mongo collections)

| Model | Collection | Trường chính |
|---|---|---|
| User | `user` | fullName, email, password (**bcrypt**), phoneNumber, avatarUrl, tokenVersion |
| Category | `categories` | userId, name, kind (`EXPENSE`/`INCOME`), sortOrder |
| SourceOfMoney | `sourcesOfMoney` | userId, name, type, balance, sortOrder, creditDetails{creditLimit, currentDebt, statementDate, dueDate}, metadata; virtual `availableCreditLimit = max(0, limit − debt)` |
| Expense | `expenses` | userId, categoryId, sourceOfMoneyId, amount (>0), note, spentAt, skipBalanceAdjust |
| Income | `incomes` | userId, categoryId, sourceOfMoneyId, amount (>0), note, receivedAt |
| Transfer | `transfers` | userId, fromSourceId, toSourceId, amount, feePercent, feeAmount, feeCategoryId, feeExpenseId, note, transferredAt |

**Category** có `kind`: `EXPENSE` (dùng cho chi tiêu và phí chuyển tiền) hoặc `INCOME` (dùng cho thu nhập). Xem mục 5.

## 3. Nguồn tiền (Sources of Money)

Loại (`SourcesOfMoneyType`): `BANK` (Ngân hàng), `CASH` (Tiền mặt), `E_WALLET` (Ví điện tử), `CREDIT_CARD` (Thẻ tín dụng), `OTHER` (Khác).

Có hai cách theo dõi tiền:

- **Nguồn thường** (BANK/CASH/E_WALLET/OTHER): theo dõi bằng `balance`, luôn ≥ 0.
- **Thẻ tín dụng**: `balance` luôn = 0. Theo dõi bằng `creditDetails.currentDebt` (dư nợ) và `creditLimit` (hạn mức). Ràng buộc `0 ≤ currentDebt ≤ creditLimit`. `statementDate` và `dueDate` là ngày 1–31, hiện chỉ để hiển thị.

Quy tắc CRUD:

- Khi tạo/sửa, người dùng **nhập trực tiếp** số dư hoặc dư nợ. Đây là cách duy nhất để "điều chỉnh" số dư thủ công; việc này không sinh giao dịch nào.
- Khi đổi từ thẻ tín dụng sang loại khác, hệ thống `$unset creditDetails`.
- **Không cho đổi giữa thẻ tín dụng và loại thường** (theo cả hai chiều) khi nguồn đã có Expense/Income/Transfer, vì logic hoàn số dư phụ thuộc loại hiện tại. Đổi giữa các loại thường (BANK/CASH/E_WALLET/OTHER) vẫn được.
- Có sắp xếp kéo-thả (`sortOrder`, API `/reorder`). API yêu cầu `orderedIds` gồm **toàn bộ** nguồn tiền của user; UI ẩn tay kéo khi đang tìm kiếm hoặc lọc loại. Bản ghi mới nhận `sortOrder = max + 1`. Nếu dữ liệu cũ thiếu `sortOrder`, hệ thống tự backfill khi GET.
- **Xóa nguồn tiền không kiểm tra ràng buộc.** Expense/Income/Transfer đang trỏ tới nguồn đó sẽ mồ côi; UI hiển thị "—". Giao dịch mồ côi vẫn sửa/xóa được: phía nguồn đã bị xóa được bỏ qua (không hoàn số dư), phía còn tồn tại vẫn được điều chỉnh bình thường.

## 4. Quy tắc biến động số dư (cốt lõi)

Mọi giao dịch đều cập nhật số dư bằng `$inc` atomic với điều kiện trong filter (ví dụ `balance: {$gte: amount}`) để tránh âm. **Không dùng Mongo transaction.** Thay vào đó, mỗi bước có rollback thủ công bằng try/catch (bù trừ ngược). Khi sửa code, phải giữ nguyên thứ tự rollback này.

### 4.1 Chi tiêu (Expense) — `expenses.service.ts`

| | Nguồn thường | Thẻ tín dụng |
|---|---|---|
| Tạo (apply) | `balance −= amount`, yêu cầu `balance ≥ amount` ("Số dư nguồn tiền không đủ") | `currentDebt += amount`, yêu cầu ≤ creditLimit ("Vượt hạn mức tín dụng còn lại") |
| Xóa (revert) | `balance += amount` | `currentDebt −= amount` (không xuống dưới 0) |
| Sửa | revert bản cũ (nguồn cũ, số tiền cũ), rồi apply bản mới; nếu lỗi thì khôi phục | như cột bên |

- `skipBalanceAdjust = true` (chỉ dùng cho **phí chuyển tiền**, xem 4.3): expense này **bị khóa**, API sửa/xóa trả 400. Muốn thay đổi thì xóa transfer gốc (xóa luôn fee expense) rồi tạo lại. UI gắn tag "Phí chuyển tiền" và vô hiệu nút sửa/xóa.
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

- **Loại (`kind`)**: bắt buộc khi tạo (`EXPENSE` hoặc `INCOME`, UI mặc định Chi tiêu).
  - Chỉ đổi được loại khi danh mục **chưa có** Expense/Income nào ("Danh mục đã có giao dịch, không thể đổi loại").
  - Dữ liệu cũ thiếu `kind` được backfill khi GET danh sách: danh mục chỉ được dùng bởi Income thì thành `INCOME`, còn lại thành `EXPENSE`.
  - Server kiểm tra loại khi tạo expense/income, khi đổi sang danh mục khác lúc sửa, và với danh mục phí chuyển tiền (phải là `EXPENSE`). Sửa giao dịch mà **giữ nguyên** danh mục cũ khác loại thì vẫn cho qua (dữ liệu cũ dùng chung danh mục).
  - Form và bộ lọc chỉ hiện danh mục đúng loại (`filterCategoriesByKind` trong `src/libs/utils/categoryKind.ts`). Khi sửa, form vẫn giữ danh mục hiện tại của bản ghi.
- CRUD theo tên, kéo-thả sắp xếp (`/api/categories/reorder`, body `{ orderedIds }`; mọi ID phải thuộc user và phải gửi đủ toàn bộ danh mục). UI ẩn tay kéo khi đang tìm kiếm.
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
- Cạnh tổng chi tiêu, header còn hiện **Tổng dư nợ thẻ tín dụng**: tổng `currentDebt` của các thẻ đang có dư nợ (cùng số với "Tổng dư nợ" ở bảng dư nợ phía dưới). Đây là dư nợ hiện tại, không đổi khi chọn tháng khác.

**Tài sản** (tính phía client, `buildAssetsSummary` trong `features/dashboard/utils.ts`, từ toàn bộ nguồn tiền; số liệu hiện tại, không đổi khi chọn tháng):
- **Tiền mặt** = tổng `balance` của mọi nguồn không phải thẻ tín dụng (BANK, CASH, E_WALLET, OTHER).
- **Tín dụng có thể dùng** = tổng `max(0, creditLimit − currentDebt)` của mọi thẻ, kể cả thẻ không có dư nợ. Thanh % = phần này chia cho tổng `creditLimit`.
- **Tổng tài sản** = Tiền mặt + Tín dụng có thể dùng.
- **Tài sản ròng** = Tiền mặt − tổng dư nợ thẻ (có thể âm, khi đó hiển thị màu đỏ).
- Bảng "Chi tiết tài sản theo nguồn" gom 2 nhóm (Tiền mặt, Tín dụng có thể dùng), **ẩn nguồn có số tiền = 0**, sắp xếp giảm dần; tỷ trọng = số tiền / tổng tài sản.

**Dư nợ thẻ tín dụng** (tính phía client, `features/dashboard/utils.ts`): lấy các nguồn `CREDIT_CARD` có `currentDebt > 0`. Ngày đến hạn kế tiếp là lần gần nhất (tính từ hôm nay) có ngày = `dueDate`; nếu tháng ngắn hơn thì lấy ngày cuối tháng. Trạng thái: hôm nay → "Đến hạn hôm nay" (đỏ); ≤ 3 ngày → đỏ; ≤ 7 ngày → cam; còn lại → xanh; không có `dueDate` → "Chưa đặt ngày đến hạn". Hệ thống không theo dõi việc đã thanh toán kỳ nào: còn dư nợ là còn hiện cảnh báo.

Nút "Thêm chi tiêu" trên dashboard điều hướng tới `/expenses?action=create`. Trang chi tiêu mở sẵn modal tạo mới, sau đó xóa query param.

## 7. Xác thực

- `POST /api/auth/login` với `{ email, password }`: so sánh password bằng **bcrypt**. Mật khẩu plain text cũ được hash lại ngay khi đăng nhập đúng. Sai 5 lần (theo IP + email) thì khóa 15 phút. Thành công thì set cookie `access_token` (HttpOnly, Secure, SameSite=Strict, sống 30 ngày); body chỉ trả `userId, fullName, email`, **không** trả token. `email`/`password` phải là string. Response có `Cache-Control: no-store`. JWT là HS256, `exp` 30 ngày, payload gồm `userId, email, phoneNumber, fullName, avatarUrl, tokenVersion`.
- `GET /api/auth/me` trả thông tin khi JWT còn hạn và `tokenVersion` khớp user trong DB. Response có `Cache-Control: no-store`.
- `POST /api/auth/logout` chỉ xóa cookie `access_token` (giữ cookie `theme`) và tăng `tokenVersion` để thu hồi mọi thiết bị. Response có `Cache-Control: no-store`.
- Không có đăng ký. User được tạo thẳng trong DB. Script một lần: `bun scripts/hash-passwords.ts`.
- `src/proxy.ts`: chặn mọi route trừ `/api/auth/*` và file tĩnh. `/` khi đã có token hợp lệ thì chuyển `/dashboard`. Nếu không có token hoặc token sai: request API nhận 401, request trang bị redirect về `/?returnUrl=...`. Proxy và service cùng verify JWT bằng `jose` (`jwtUtil.ts`). Service đọc lại cookie qua `getCurrentUser()` và đối chiếu `tokenVersion`. Mọi response 401 (`unauthorizedResponse`) đều xóa cookie `access_token`: proxy không kiểm tra `tokenVersion`, nên nếu giữ lại token đã bị thu hồi thì `/` sẽ chuyển về `/dashboard`, API lại trả 401 và client reload vô hạn.
- Client: đổi phiên luôn reset state bằng hard navigation (`window.location.replace`). `AuthBootstrap` chỉ gọi `fetchAuthMe` khi status là `idle`. Logout đặt status `loggedOut` để không tự gọi lại `/auth/me`. Request API 401 (ngoài trang login) chuyển về `/?returnUrl=...`.

## 7.1 Phiên đăng nhập

Đổi tài khoản luôn reset state client (Redux, React Query) bằng hard navigation. Logout là POST và chỉ xóa `access_token`. Cache danh sách không giữ `placeholderData` toàn cục; chỉ list phân trang dùng `keepPreviousData`.

## 7.2 Gợi ý "thường dùng" trong form — `suggestions.service.ts`

API: `GET /api/expenses/suggestions`, `/api/incomes/suggestions`, `/api/transfers/suggestions`. Không có tham số; mọi tính toán làm ở server.

- **Phạm vi:** giao dịch trong 90 ngày gần nhất của user. Expense phí chuyển tiền (`skipBalanceAdjust: true`) bị loại.
- **Điểm:** mỗi giao dịch cộng `exp(−số_ngày_trước / 30)` (giao dịch đặt ngày tương lai tính như hôm nay). Xếp theo tổng điểm giảm dần.
- **Ngưỡng:** phải xuất hiện ≥ 2 lần mới được gợi ý (riêng "nguồn hay dùng nhất của danh mục" chỉ cần 1 lần).
- Danh mục hoặc nguồn tiền đã bị xóa không được gợi ý.
- **Chi tiêu / thu nhập** trả về: `categoryIds` (top 5), `sourceIds` (top 3), `topAmounts` (top 4, sắp tăng dần), và `byCategory[id] = { amounts (top 4), sourceId }`.
- **Chuyển tiền** trả về: `pairs` (top 3 cặp từ→đến, mỗi cặp kèm `amounts`), `fromSourceIds` (top 3), `topAmounts`.

Cách form dùng:
- Select danh mục và nguồn tiền chia 2 nhóm "Thường dùng" và "Khác" (`groupSuggestedOptions`).
- Chip số tiền nằm dưới ô Số tiền (`common/amount-suggestion-chips`). Khi chưa chọn danh mục, chip hiện `topAmounts`; khi đã chọn, chip chỉ hiện số tiền của danh mục đó.
- Khi tạo mới, chọn danh mục mà ô nguồn tiền đang trống thì tự điền `byCategory[id].sourceId`. Ở chế độ sửa thì không tự điền.
- Form chuyển tiền có dòng "Hay chuyển": bấm vào là điền cả nguồn chuyển và nguồn nhận. Chọn nguồn chuyển khi ô "đến" đang trống thì tự điền nguồn nhận của cặp quen. Chip số tiền hiện theo cặp đang chọn, hoặc `topAmounts` khi chưa chọn nguồn.
- Query key nằm dưới `[EXPENSES|INCOMES|TRANSFERS, "suggestions"]`, nên các invalidate sẵn có tự làm mới gợi ý. Chỉ fetch khi modal mở; stale 5 phút.

## 8. Trang (UI) và menu

| URL | Feature folder | Nội dung |
|---|---|---|
| `/` | `auth-login` | Đăng nhập |
| `/dashboard` | `dashboard` | Chọn tháng; nút thêm chi tiêu; header hiện tổng chi tiêu tháng và tổng dư nợ thẻ tín dụng hiện tại; phần Tài sản (4 ô: tổng tài sản, tiền mặt, tín dụng có thể dùng, tài sản ròng + bảng chi tiết theo nguồn); bảng dư nợ thẻ tín dụng và hạn thanh toán; donut chart theo danh mục và theo nguồn tiền (số tiền + %), bar chart theo ngày |
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
- Mặc định (`tanstack-provider.tsx`): staleTime 30 giây, gcTime 5 phút, không refetch khi focus lại tab, retry 1 lần, không giữ dữ liệu query trước đó ở mức global. Danh mục và nguồn tiền stale 5 phút. Dữ liệu chỉ đổi qua mutation của chính app nên dựa vào invalidate ở trên.

## 9. Điểm cần lưu ý / nợ kỹ thuật đã biết

1. Không dùng Mongo transaction. Rollback thủ công có thể để lại dữ liệu lệch nếu chính bước rollback cũng lỗi, hoặc nếu có request đồng thời.
2. Fee expense (có `skipBalanceAdjust`) bị khóa sửa/xóa ở trang Chi tiêu để luôn khớp với `feeAmount`/`feeExpenseId` của transfer gốc.
3. Xóa Category hoặc SourceOfMoney không kiểm tra giao dịch đang tham chiếu (giao dịch mồ côi vẫn sửa/xóa được, xem mục 3).
4. Sửa trực tiếp số dư/dư nợ trên form nguồn tiền sẽ ghi đè và không để lại lịch sử. Sau đó, revert một giao dịch cũ có thể bị chặn (ví dụ số dư không đủ để xóa income).
5. Password lưu bcrypt. Token sống 30 ngày. Logout tăng `tokenVersion` nên thu hồi mọi thiết bị.
6. Chuyển tiền không sửa được, chỉ xóa rồi tạo lại.
7. Bộ lọc `to` dùng `setHours(23,59,59)` theo giờ server (PM2 đặt `TZ=Asia/Ho_Chi_Minh`).
8. `formatMoney` dùng chung ở `src/libs/utils/formatMoney.ts`. `getRefId` vẫn nằm trong utils của từng feature.

## 10. Vận hành

- Dev: `bun dev`. Build: `bun run build`. Package manager là **bun** (đã bỏ `package-lock.json`).
- ENV: `MONGODB_URI`, `DATABASE_NAME`, `JWT_SECRET`, `NEXT_PUBLIC_API_BASE_URL` (base URL của API, ví dụ `.../api`, dùng trong `fetcherBackEnd`), `NEXT_PUBLIC_CLIENT_BASE_URL`.
- Deploy: `scripts/deploy.sh` trên server (`/home/rocky/financial_management`) thực hiện git pull, `bun i`, build, rồi `pm2 restart ecosystem.config.js` (app `finance-management-web`, port 3004). Kết quả deploy được báo qua webhook Zalo.
