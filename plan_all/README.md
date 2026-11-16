# Kế hoạch — Money Manager

Các kế hoạch đã triển khai xong được xóa khỏi thư mục này. `.gitignore` bỏ qua `plan_all/*`, nên chỉ các file đã `git add -f` (01–04, README) xem lại được bằng `git log -- plan_all/`. Nghiệp vụ đã triển khai nằm trong `.agents/business/`.

| # | Vấn đề | Mức độ | File kế hoạch |
|---|--------|--------|---------------|
| — | Hiện không có kế hoạch nào đang làm (plan 12 loading và 13 MCP đã kiểm tay xong 07/11/2026; thư mục `mcp/`, `redesign-loading-ui/` chỉ còn để tham khảo, xóa được) | | |
| 14 | Lịch sử nguồn tiền chuyển từ modal sang trang riêng `/source-history/<id>` (đã code 15/11/2026, chờ kiểm tay; còn phải chạy `bun run test` và `bun run build`) | Trung bình | [14-trang-lich-su-nguon-tien-mockup.html](14-trang-lich-su-nguon-tien-mockup.html) |
| 15 | Dashboard: gộp "Xu hướng thu – chi" và "Chi tiêu tháng" thành một khối có tab Ngày / Danh mục / Nguồn / Tháng (tab Ngày: thu chi mọi ngày trong tháng), "Cần chú ý" dạng chip, nút nổi hơn (đã code 15/11/2026, chờ kiểm tay; còn phải chạy `bun run test` và `bun run build`) | Trung bình | [15-dashboard-thu-chi-theo-ngay-mockup.html](15-dashboard-thu-chi-theo-ngay-mockup.html) |
| 16 | Trang Lãi suất dễ đọc hơn: ô số tiền + kỳ hạn và câu trả lời lên đầu, top 3, thanh ngang tiền lãi, biểu đồ đường theo kỳ hạn, bảng chỉ tô ô cao nhất (có đổi %/tiền lãi), gộp kênh trùng, thu gọn nguồn dữ liệu (đã code 15/11/2026, chờ kiểm tay; còn phải chạy `bun run test` và `bun run build`) | Trung bình | [16-lai-suat-de-hieu-mockup.html](16-lai-suat-de-hieu-mockup.html) |
| 17 | Báo cáo màu sắc và theme (trạng thái trước plan 18–19, giá trị màu đã lỗi thời; xóa được) của toàn dự án (token sáng/tối, màu theo nghĩa, hex ngoài CSS, điểm lệch cần dọn). Chỉ khảo sát, chưa sửa code (16/11/2026) | Thấp | [17-bao-cao-mau-sac-va-theme-hien-tai.md](17-bao-cao-mau-sac-va-theme-hien-tai.md) |
| 18 | Đồng bộ màu về một nơi: phần code đã xong 16/11/2026 (commit `3f91f32`). Còn: kiểm meta theme-color trên điện thoại thật, quyết quy tắc CSS link sidebar | Thấp | [18-dong-bo-mau-o-mot-noi.md](18-dong-bo-mau-o-mot-noi.md) |
| 19 | Bảng màu tài chính: đã chọn và code phương án A "Xanh ngân hàng" (slate + xanh `#1d4ed8`, tín dụng tím, icon mới) 16/11/2026. Còn: kiểm icon/thanh trình duyệt trên điện thoại thật, xem với dữ liệu thật | Trung bình | [19-de-xuat-bang-mau-tai-chinh.md](19-de-xuat-bang-mau-tai-chinh.md) · [mockup](19-de-xuat-bang-mau-tai-chinh-mockup.html) |
| 20 | Tiết kiệm dữ liệu 4G: đã code 16/11/2026 (bỏ G2, font hệ thống, bỏ `motion` → hiệu ứng CSS, staleTime 5 phút + nút Làm mới, ETag chỉ cho lãi suất, bỏ pravatar, cache favicon). Lần đầu 753 → 537 KB, trang biểu đồ 486 → 68 KB. Còn: bật gzip nginx trên server, kiểm điện thoại thật | Trung bình | [20-tiet-kiem-du-lieu-4g.md](20-tiet-kiem-du-lieu-4g.md) |

## Định nghĩa "xong"

- `bun run lint`, `bun run test` và `bun run build` không lỗi.
- Checklist test thủ công ở cuối file kế hoạch đều pass.
