# Kế hoạch — Money Manager

Các kế hoạch đã triển khai xong được xóa khỏi thư mục này. `.gitignore` bỏ qua `plan_all/*`, nên chỉ các file đã `git add -f` (01–04, README) xem lại được bằng `git log -- plan_all/`.

| # | Vấn đề | Mức độ | File kế hoạch |
|---|--------|--------|---------------|
| 11 | Siết chặt quản trị dòng tiền: đối soát số dư theo sổ cái, ghi vết rollback lỗi, số tiền/ngày có biên, sửa cùng nguồn một `$inc`, test tự động, idempotency — đã triển khai 2026-11-04 (trừ 4.3, 4.4) | **Cao** (toàn vẹn số dư) | [update_requement/11-chat-che-dong-tien.md](update_requement/11-chat-che-dong-tien.md) |

## Việc còn lại từ các kế hoạch đã xóa

- Plan 03 (tối ưu web): `reactStrictMode` vẫn `false` trong `next.config.ts`.

## Định nghĩa "xong"

- `bun run lint`, `bun run test` và `bun run build` không lỗi.
- Checklist test thủ công ở cuối file kế hoạch đều pass.
