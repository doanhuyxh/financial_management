# 03 — Tối ưu web chung

Xếp theo mức ưu tiên. Các mục bảo mật (W1) nên làm ngay sau `01-fix-auth-session.md`.

## W1. Bảo mật (ưu tiên cao)

| Vấn đề | Vị trí | Cách sửa |
|--------|--------|----------|
| Mật khẩu so sánh **plaintext** (`user["password"] === password`) | `src/server/services/auth.service.ts:337` | Dùng `bcryptjs` (hoặc `argon2`): hash khi tạo user, `await bcrypt.compare(password, user.password)` khi login. Viết script migrate một lần trong `scripts/` để hash mật khẩu hiện có. |
| **Email + mật khẩu thật hard-code** làm giá trị mặc định form login (dev) | `src/components/features/auth-login/index.tsx:955-956` | Xoá ngay, đổi mật khẩu tài khoản đó vì đã nằm trong lịch sử git. Nếu cần tiện dev thì đọc từ `.env.local` (`NEXT_PUBLIC_DEV_EMAIL`), không commit. |
| JWT sống **365 ngày**, không có cách thu hồi | `src/server/utils/jwtUtil.ts:217`, `responseServer.ts:65` | Giảm còn 7–30 ngày; thêm trường `tokenVersion` vào user, nhúng vào JWT và kiểm tra ở `/auth/me` để có thể "đăng xuất mọi thiết bị". |
| Login không giới hạn số lần thử | `src/app/api/auth/login/route.ts` | Rate-limit theo IP + email (bộ đếm trong Mongo/Redis, khoá 15 phút sau 5 lần sai). |
| `jwtUtil.edge.ts` tự cài HMAC thủ công | `src/server/utils/jwtUtil.edge.ts` | `jose` chạy được trên edge runtime → dùng chung `jwtVerify` của `jose`, xoá file tự viết (giảm rủi ro sai sót). |
| Route login trả lỗi 500 kèm `error.message` thô | `src/app/api/auth/login/route.ts:12` | Log lỗi phía server, trả message chung cho client. |

## W2. React Query & tải dữ liệu

- Bỏ `placeholderData` toàn cục (đã nêu ở 01-A6), chỉ dùng `keepPreviousData` cho list phân trang.
- `staleTime` theo loại dữ liệu: danh mục/nguồn tiền (ít đổi) `5 phút`; danh sách giao dịch/dashboard `30 giây`. Khai báo trong từng hook ở `src/libs/hooks/customHooks/`.
- Các header + form modal cùng gọi `useGetCategories({ page: 1, limit: 100 })` / `useGetSourcesOfMoney(...)` — key giống nhau nên đã được dedup; nên gom thành hook `useCategoryOptions()` / `useSourceOptions()` trả sẵn mảng `options` (memo) để không lặp code map ở 6+ file.
- Mutation: dùng `onSettled` + `invalidateQueries` (đã có) — cân nhắc optimistic update cho reorder danh mục/nguồn tiền để kéo thả không bị giật.

## W3. Kích thước bundle & tốc độ tải

- `@ant-design/plots` rất nặng: load động chỉ khi vào dashboard
  ```ts
  const Pie = dynamic(() => import("@ant-design/plots").then((m) => m.Pie), { ssr: false, loading: () => <Skeleton.Node active /> });
  ```
  áp dụng cho `expense-donut-chart`, `daily-bar-chart`, `category-pie-chart`, `source-pie-chart`. (Đọc docs `lazy-loading.md` của Next 16 trước.)
- Chạy phân tích bundle: `next build` rồi xem báo cáo (Next 16 có `next experimental-analyze` hoặc dùng `@next/bundle-analyzer`) — kiểm tra antd, lucide-react, dayjs locale có bị kéo nguyên gói không.
- Gỡ phụ thuộc không dùng (kiểm tra bằng `grep -rn "<package>" src`): `react-resizable-panels`, `input-otp`, `@ant-design/icons` (dự án dùng lucide-react), `shadcn` (là CLI, chuyển sang devDependencies).
- `NextTopLoader`: OK; đặt `showSpinner={false}` để đỡ rối trên mobile.

## W4. Font & ngôn ngữ

- `Geist` đang load `subsets: ["latin"]`. Kiểm tra hiển thị chữ có dấu tiếng Việt (ạ, ế, ữ…): nếu bị lẫn font fallback, đổi sang font có subset `vietnamese` (vd. `Be_Vietnam_Pro` hoặc `Inter` với `subsets: ["latin", "vietnamese"]`).
- `lang="vi"` (cùng mục M1 của file 02).
- Định dạng tiền: đang khai báo `Intl.NumberFormat("vi-VN", …)` riêng ở nhiều file (`dashboard/components/header`, `credit-card-debts`, `features/*/utils.ts`) → gom vào `src/libs/utils/formatMoney.ts` dùng chung.

## W5. Rendering & Next.js

- `src/app/(protected)/layout.tsx` và `src/app/layout.tsx` đều đọc cookie `theme` → layout con dùng lại giá trị từ root (truyền qua context hoặc đọc 1 nơi), tránh trùng logic.
- `MainLayout` chỉ bọc `ShadcnLayout` — có thể bỏ 1 tầng.
- `reactStrictMode: false` trong `next.config.ts` → bật lại `true` để phát hiện sớm lỗi effect chạy 2 lần (như lỗi `AuthBootstrap` ở file 01).
- Thêm `loading.tsx` riêng cho từng route trong `(protected)` để chuyển trang trên mobile có skeleton thay vì màn trắng.
- Proxy (`src/proxy.ts`) đang verify JWT cho cả request `/api/*` rồi service lại verify lần nữa qua `getCurrentUser()` — chấp nhận được; có thể đọc header `x-user-info` proxy đã gắn để bỏ 1 lần verify.

## W6. Database

- Đã có index `{ userId: 1, spentAt: -1 }` cho expenses. Kiểm tra tương tự cho `incomes` (`userId + receivedAt`), `transfers` (`userId + transferredAt`), `categories`/`sources-of-money` (`userId + sortOrder`).
- Dashboard aggregate: thêm `$match` theo `userId` + khoảng ngày **trước** mọi `$lookup` (kiểm tra `dashboard.service.ts`).
- `connectDb.ts`: đảm bảo cache connection trên `globalThis` để không mở kết nối mới mỗi request khi dev hot-reload.

## W7. Accessibility & UX nhỏ

- Mọi nút chỉ có icon (sửa/xoá, theme toggle, sidebar trigger) cần `aria-label` / `title`.
- Xác nhận xoá dùng `Modal.confirm` / `Popconfirm` có nội dung rõ (tên bản ghi, số tiền).
- Màu chữ `text-slate-600` trên nền `slate-950` ở trang login (dòng "Bảo mật chuẩn mã hoá…") có tương phản thấp → `text-slate-400`.
- Thêm trang offline/lỗi mạng thân thiện trong `src/app/error.tsx`.

## W8. PWA (tuỳ chọn — hợp với app quản lý chi tiêu dùng trên điện thoại)

- Thêm `src/app/manifest.ts` (tên, icon 192/512, `display: "standalone"`, `theme_color`) để người dùng "Thêm vào màn hình chính".
- Icon `apple-touch-icon` trong `public/`.
- Không cần service worker ở giai đoạn này.

## Checklist

- [ ] Login bằng mật khẩu đã hash hoạt động; tài khoản cũ đã migrate.
- [ ] Không còn credential trong source (`grep -rn "Anhem" src` trả về rỗng).
- [ ] Lighthouse Mobile: Performance ≥ 80, Accessibility ≥ 90, Best Practices ≥ 90.
- [ ] JS tải lần đầu ở trang `/expenses` không chứa code `@ant-design/plots`.
- [ ] Chữ tiếng Việt có dấu hiển thị cùng một font.
