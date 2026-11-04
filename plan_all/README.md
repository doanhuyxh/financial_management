# Kế hoạch fix & tối ưu — Money Manager

Ngày lập: 2026-10-15 · Nhánh gốc: `main` (commit `20027ab`)

## Các vấn đề cần xử lý

| # | Vấn đề | Mức độ | File kế hoạch |
|---|--------|--------|---------------|
| 1 | Đăng xuất rồi đăng nhập tài khoản mới vẫn hiện thông tin/dữ liệu tài khoản cũ | **Cao** (lộ dữ liệu giữa các tài khoản trên cùng trình duyệt) | [01-fix-auth-session.md](01-fix-auth-session.md) |
| 2 | Giao diện chưa tối ưu cho mobile | Trung bình | [02-mobile-ui.md](02-mobile-ui.md) |
| 3 | Tối ưu web chung (hiệu năng, bảo mật, SEO/a11y cơ bản) | Trung bình / Thấp | [03-web-optimization.md](03-web-optimization.md) |
| 4 | Dashboard hiển thị "Tài sản" (tiền mặt + tín dụng khả dụng) — đã duyệt phương án C, đã triển khai | Tính năng mới | [04-dashboard-assets.md](04-dashboard-assets.md) · [mockup](04-dashboard-assets-mockup.html) |
| 5 | Đánh giá giao diện tổng thể & hướng cải thiện (màu ngữ nghĩa, dashboard, nhập nhanh) | Trung bình | [05-ui-review.md](05-ui-review.md) |
| 6 | Re-design UI: so sánh hiện tại ↔ mới, design token, lộ trình — đã duyệt 2026-11-03 | Đã duyệt | [06-re-design-ui.md](re-design-ui/06-re-design-ui.md) · [mockup](re-design-ui/06-re-design-ui-mockup.html) |
| 7 | Plan code re-design UI: 5 giai đoạn (nền tảng → dashboard → giao dịch + điều hướng → ghi nhanh → nguồn tiền/danh mục/login) | Triển khai | [plan_code_redesign/](plan_code_redesign/README.md) |
| 8 | Đáo hạn thẻ tín dụng: bản ghi CardRollover, dư nợ chỉ tăng phí, modal trên dashboard, so sánh với lãi — đã triển khai 2026-11-04 | Tính năng mới | [08-dao-han-the.md](08-dao-han-the.md) |
| 9 | Đáo hạn có tự trả một phần (x · A · n) & tab Phân tích: hòa gốc sau bao nhiêu lần, mô phỏng, so sánh phương án — đã triển khai 2026-11-04 | Tính năng mới | [dao_han/09-phan-tich-dao-han.md](dao_han/09-phan-tich-dao-han.md) · [mockup](dao_han/09-phan-tich-dao-han-mockup.html) |
| 10 | Trang "Hành trình đáo hạn": theo dõi một thẻ từ lần đáo đầu đến khi sạch nợ, dòng thời gian, dự kiến, tổng kết — đã triển khai 2026-11-04 | Tính năng mới | [dao_han/10-hanh-trinh-dao-han.md](dao_han/10-hanh-trinh-dao-han.md) · [mockup](dao_han/10-hanh-trinh-dao-han-mockup.html) |
| 11 | Siết chặt quản trị dòng tiền: đối soát số dư theo sổ cái, ghi vết rollback lỗi, số tiền/ngày có biên, sửa cùng nguồn một `$inc`, test tự động, idempotency — đã triển khai 2026-11-04 (trừ 4.3, 4.4) | **Cao** (toàn vẹn số dư) | [update_requement/11-chat-che-dong-tien.md](update_requement/11-chat-che-dong-tien.md) |

## Thứ tự thực hiện đề xuất

1. **Sprint 1 — Auth (bắt buộc làm trước)**: toàn bộ mục A1 → A7 trong `01-fix-auth-session.md`. Mỗi bước là một commit nhỏ, test lại kịch bản "A → đăng xuất → B" sau mỗi commit.
2. **Sprint 2 — Mobile nền tảng**: M1 (CSS gốc, viewport, iOS zoom) → M2 (layout) → M3 (bảng dữ liệu) → M4 (bộ lọc).
3. **Sprint 3 — Mobile chi tiết**: M5 (modal/form) → M6 (dashboard/chart) → M7 (kéo thả trên cảm ứng) → M8 (login).
4. **Sprint 4 — Tối ưu chung**: các mục W1 → W8 trong `03-web-optimization.md`, ưu tiên mục bảo mật (W1).

## Quy ước khi code (theo `AGENTS.md`)

- Đọc `node_modules/next/dist/docs/` trước khi dùng API Next.js (bản 16.4 — khác kiến thức cũ).
- Component mới: 1 folder `kebab-case` + `index.tsx`, ưu tiên antd / shadcn / lucide-react.
- Hook dùng chung đặt ở `src/libs/hooks/` hoặc `src/libs/hooks/customHooks/` — kiểm tra trùng trước khi tạo.
- Nếu đổi business rule, cập nhật `.agent/business-logic.md`.

## Định nghĩa "xong"

- `bun run lint` và `bun run build` không lỗi.
- Checklist test thủ công ở cuối mỗi file kế hoạch đều pass.
- Test mobile trên Chrome DevTools (iPhone SE 375px, iPhone 14 Pro 393px, Galaxy S20 360px) và ít nhất 1 máy thật iOS Safari.
