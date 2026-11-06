# Pages — URL, feature, menu

> Nguồn sự thật là code. Cấu trúc thư mục và luồng dữ liệu: [architecture.md](architecture.md).

| URL | Feature folder | Nội dung |
|---|---|---|
| `/` | `auth-login` | Đăng nhập |
| `/dashboard` | `dashboard` | Thống kê tháng, tài sản, dòng tiền, dư nợ thẻ |
| `/transactions` | `transactions` | Gộp chi tiêu / thu nhập / chuyển tiền, chọn bằng `?type=expense\|income\|transfer` (Segmented). Render nguyên feature `expenses` / `incomes` / `transfers`; danh sách nhóm theo ngày (`common/grouped-transaction-list`) + dải tổng. `?action=create` mở sẵn modal; chi tiêu nhận thêm `sourceOfMoneyId`/`amount`/`note`/`cardFeeType`/`date`, chuyển tiền nhận `fromSourceId`/`toSourceId`/`amount`. `?t=` đổi key để mount lại (mở form lần nữa). Tạo URL bằng `buildTransactionsUrl` (`libs/utils/transactionsUrl.ts`) |
| `/expenses`, `/incomes`, `/transfers` | — | Redirect 307 (`next.config.ts`) sang `/transactions?type=…`, giữ nguyên query cũ |
| `/sources-of-money` | `sources-of-money` | Nguồn tiền, kéo-thả, chuyển tiền nhanh, lịch sử giao dịch, tạo link chia sẻ |
| `/credit-card-compare` | `credit-card-compare` | So sánh thẻ tín dụng theo kịch bản sử dụng (chỉ tính phía client từ danh sách nguồn tiền) |
| `/rollover-journey` | `rollover-journey` | Hành trình đáo hạn của một thẻ (`?cardId=`): số liệu, thanh tiến độ, biểu đồ, dòng thời gian, dự kiến, danh sách hành trình; ghi đáo hạn / kết thúc / sửa gốc ngay trên trang ([business/card-rollover.md](business/card-rollover.md)) |
| `/categories` | `categories` | Danh mục, kéo-thả, lọc theo loại |
| `/settings` | `settings` | Khóa sổ (mốc ngày), lịch sử sửa/xóa giao dịch ([business/ledger-lock-audit.md](business/ledger-lock-audit.md)), token kết nối agent MCP ([business/mcp.md](business/mcp.md)) |
| `/share/[token]` | `public-share` | **Public, không cần đăng nhập**: lịch sử giao dịch một nguồn qua link chia sẻ ([business/source-history.md](business/source-history.md)) |

Ghi giao dịch nhanh: nút "Ghi giao dịch" trên header (desktop, `common/quick-add-button`), phím `N` ở mọi trang (`useHotkey`, bỏ qua khi đang gõ hoặc có modal/drawer mở) và nút "+" của bottom nav đều gọi `useQuickAdd` (`libs/hooks/useQuickAdd.tsx`). Form tạo có `TransactionTypeSwitch` ở tiêu đề để đổi Chi/Thu/Chuyển (dữ liệu đang nhập bị bỏ); `Ctrl/⌘+Enter` = lưu (`useSubmitShortcut`). Nút con mắt trên header bật chế độ ẩn số dư (`usePrivacyMode`, localStorage `privacy-mode`): gắn `data-privacy="on"` lên `<html>`, CSS làm mờ mọi `.money-value`.

Trang Giao dịch: tab loại (`transactions/components/type-tabs`) có icon + màu theo loại (chi `money-out`, thu `money-in`, chuyển tiền màu nhấn). Bộ lọc ngày (`common/transaction-date-range`) có chọn nhanh "7 ngày qua / Tháng này / 3 tháng gần đây" (`getDateRangePresets`, `libs/utils/dateRangePresets.ts`; 3 tháng = từ ngày 1 của tháng cách 2 tháng đến hôm nay): desktop nằm trong khung lịch, mobile là chip trong drawer; chip bộ lọc hiện tên preset nếu khớp.

Trang Giao dịch trên desktop: mỗi trang 20 dòng; từ `lg` dòng giao dịch tách cột Danh mục | Nguồn (chuyển tiền: Phí) | Ghi chú | Số tiền; từ `xl` có cột "Phân tích" dính bên phải (`common/transaction-insights`: tổng, trung bình/khoản, trung bình/ngày khi lọc khoảng ngày, phí; phân bổ theo danh mục hoặc nơi nhận từ `breakdown`) và dải tổng phía trên bị ẩn.

Trang Giao dịch trên mobile: bộ lọc nằm trong drawer, nên các bộ lọc đang bật hiện thành chip có nút × dưới thanh tìm kiếm (`common/active-filter-chips`); desktop không hiện chip vì ô lọc đã nằm trên toolbar.

Menu phẳng: `src/components/layout/navigation-config.tsx` — Tổng quan, Giao dịch, Nguồn tiền, Thẻ tín dụng (`/credit-card-compare`), Đáo hạn (`/rollover-journey`), Danh mục, Cài đặt (`/settings`). Mobile có thêm `layout/mobile-bottom-nav` (Tổng quan · Giao dịch · [+] · Nguồn tiền · Thêm = mở sidebar); nút "+" mở `/transactions?action=create` đúng loại đang xem. Nghiệp vụ từng trang: [business/README.md](business/README.md).

PWA: `src/app/manifest.ts` (standalone, shortcut "Ghi chi tiêu / thu nhập / Chuyển tiền" → `/transactions?type=...&action=create`) + `appleWebApp` trong `src/app/layout.tsx`. Viewport có `interactiveWidget: "resizes-content"` (Android co layout khi bàn phím mở). Cài trên iOS: Safari → Chia sẻ → Thêm vào MH chính (app cài riêng cookie, phải đăng nhập lại).
