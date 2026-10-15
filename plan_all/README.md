# Kế hoạch fix & tối ưu — Money Manager

Ngày lập: 2026-10-15 · Nhánh gốc: `main` (commit `20027ab`)

## Các vấn đề cần xử lý

| # | Vấn đề | Mức độ | File kế hoạch |
|---|--------|--------|---------------|
| 1 | Đăng xuất rồi đăng nhập tài khoản mới vẫn hiện thông tin/dữ liệu tài khoản cũ | **Cao** (lộ dữ liệu giữa các tài khoản trên cùng trình duyệt) | [01-fix-auth-session.md](01-fix-auth-session.md) |
| 2 | Giao diện chưa tối ưu cho mobile | Trung bình | [02-mobile-ui.md](02-mobile-ui.md) |
| 3 | Tối ưu web chung (hiệu năng, bảo mật, SEO/a11y cơ bản) | Trung bình / Thấp | [03-web-optimization.md](03-web-optimization.md) |

## Thứ tự thực hiện đề xuất

1. **Sprint 1 — Auth (bắt buộc làm trước)**: toàn bộ mục A1 → A7 trong `01-fix-auth-session.md`. Mỗi bước là một commit nhỏ, test lại kịch bản "A → đăng xuất → B" sau mỗi commit.
2. **Sprint 2 — Mobile nền tảng**: M1 (CSS gốc, viewport, iOS zoom) → M2 (layout) → M3 (bảng dữ liệu) → M4 (bộ lọc).
3. **Sprint 3 — Mobile chi tiết**: M5 (modal/form) → M6 (dashboard/chart) → M7 (kéo thả trên cảm ứng) → M8 (login).
4. **Sprint 4 — Tối ưu chung**: các mục W1 → W8 trong `03-web-optimization.md`, ưu tiên mục bảo mật (W1).

## Quy ước khi code (theo `AGENTS.md`)

- Đọc `node_modules/next/dist/docs/` trước khi dùng API Next.js (bản 16.4 — khác kiến thức cũ).
- Component mới: 1 folder `kebab-case` + `index.tsx`, ưu tiên antd / shadcn / lucide-react.
- Hook dùng chung đặt ở `src/libs/hooks/` hoặc `src/libs/hooks/customHooks/` — kiểm tra trùng trước khi tạo.
- Nếu đổi business rule, cập nhật `docs/business-logic.md`.

## Định nghĩa "xong"

- `bun run lint` và `bun run build` không lỗi.
- Checklist test thủ công ở cuối mỗi file kế hoạch đều pass.
- Test mobile trên Chrome DevTools (iPhone SE 375px, iPhone 14 Pro 393px, Galaxy S20 360px) và ít nhất 1 máy thật iOS Safari.
