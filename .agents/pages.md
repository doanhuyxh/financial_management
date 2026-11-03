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
| `/categories` | `categories` | Danh mục, kéo-thả, lọc theo loại |
| `/share/[token]` | `public-share` | **Public, không cần đăng nhập**: lịch sử giao dịch một nguồn qua link chia sẻ ([business/source-history.md](business/source-history.md)) |

Ghi giao dịch nhanh: nút "Ghi giao dịch" trên header (desktop, `common/quick-add-button`), phím `N` ở mọi trang (`useHotkey`, bỏ qua khi đang gõ hoặc có modal/drawer mở) và nút "+" của bottom nav đều gọi `useQuickAdd` (`libs/hooks/useQuickAdd.tsx`). Form tạo có `TransactionTypeSwitch` ở tiêu đề để đổi Chi/Thu/Chuyển (dữ liệu đang nhập bị bỏ); `Ctrl/⌘+Enter` = lưu (`useSubmitShortcut`). Nút con mắt trên header bật chế độ ẩn số dư (`usePrivacyMode`, localStorage `privacy-mode`): gắn `data-privacy="on"` lên `<html>`, CSS làm mờ mọi `.money-value`.

Menu phẳng: `src/components/layout/navigation-config.tsx` — Tổng quan, Giao dịch, Nguồn tiền, Thẻ tín dụng (`/credit-card-compare`), Danh mục. Mobile có thêm `layout/mobile-bottom-nav` (Tổng quan · Giao dịch · [+] · Nguồn tiền · Thêm = mở sidebar); nút "+" mở `/transactions?action=create` đúng loại đang xem. Nghiệp vụ từng trang: [business/README.md](business/README.md).
