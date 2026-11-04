# Kế hoạch — Money Manager

Các kế hoạch đã triển khai xong được xóa khỏi thư mục này. `.gitignore` bỏ qua `plan_all/*`, nên chỉ các file đã `git add -f` (01–04, README) xem lại được bằng `git log -- plan_all/`. Nghiệp vụ đã triển khai nằm trong `.agents/business/`.

| # | Vấn đề | Mức độ | File kế hoạch |
|---|--------|--------|---------------|
| 12 | Thiết kế lại loading toàn trang (3 phương án: Ví tiền / Khung app / Dòng tiền) | Thấp | [redesign-loading-ui/12-redesign-loading-ui.md](redesign-loading-ui/12-redesign-loading-ui.md) · [mockup](redesign-loading-ui/12-redesign-loading-ui-mockup.html) |

## Việc còn lại từ các kế hoạch đã xóa

- Plan 03 (tối ưu web): `reactStrictMode` vẫn `false` trong `next.config.ts`.
- Plan 11 (chặt chẽ dòng tiền) — server đã có test tự động; còn kiểm tay trên giao diện:
  - Modal lịch sử nguồn tiền → "Đối soát": khớp sổ hiện xanh; lệch thì "Sửa về theo sổ" về đúng.
  - Cài đặt → khóa sổ: ô ngày trong form không chọn được ngày trước mốc, sửa/xóa giao dịch cũ báo "Kỳ đã khóa sổ", bỏ khóa thì làm lại được.
  - Sửa rồi xóa một chi tiêu → Cài đặt → Lịch sử hiện 2 dòng, dòng sửa có "cũ → mới" đúng trường đã đổi.

## Định nghĩa "xong"

- `bun run lint`, `bun run test` và `bun run build` không lỗi.
- Checklist test thủ công ở cuối file kế hoạch đều pass.
