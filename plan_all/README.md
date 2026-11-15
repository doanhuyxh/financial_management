# Kế hoạch — Money Manager

Các kế hoạch đã triển khai xong được xóa khỏi thư mục này. `.gitignore` bỏ qua `plan_all/*`, nên chỉ các file đã `git add -f` (01–04, README) xem lại được bằng `git log -- plan_all/`. Nghiệp vụ đã triển khai nằm trong `.agents/business/`.

| # | Vấn đề | Mức độ | File kế hoạch |
|---|--------|--------|---------------|
| — | Hiện không có kế hoạch nào đang làm (plan 12 loading và 13 MCP đã kiểm tay xong 07/11/2026; thư mục `mcp/`, `redesign-loading-ui/` chỉ còn để tham khảo, xóa được) | | |
| 14 | Lịch sử nguồn tiền chuyển từ modal sang trang riêng `/source-history/<id>` (đã code 15/11/2026, chờ kiểm tay; còn phải chạy `bun run test` và `bun run build`) | Trung bình | [14-trang-lich-su-nguon-tien-mockup.html](14-trang-lich-su-nguon-tien-mockup.html) |
| 15 | Dashboard: gộp "Xu hướng thu – chi" và "Chi tiêu tháng" thành một khối có tab Ngày / Danh mục / Nguồn / Tháng (tab Ngày: thu chi mọi ngày trong tháng), "Cần chú ý" dạng chip, nút nổi hơn (đã code 15/11/2026, chờ kiểm tay; còn phải chạy `bun run test` và `bun run build`) | Trung bình | [15-dashboard-thu-chi-theo-ngay-mockup.html](15-dashboard-thu-chi-theo-ngay-mockup.html) |
| 16 | Trang Lãi suất dễ đọc hơn: ô số tiền + kỳ hạn và câu trả lời lên đầu, top 3, thanh ngang tiền lãi, biểu đồ đường theo kỳ hạn, bảng chỉ tô ô cao nhất (có đổi %/tiền lãi), gộp kênh trùng, thu gọn nguồn dữ liệu (đã code 15/11/2026, chờ kiểm tay; còn phải chạy `bun run test` và `bun run build`) | Trung bình | [16-lai-suat-de-hieu-mockup.html](16-lai-suat-de-hieu-mockup.html) |

## Định nghĩa "xong"

- `bun run lint`, `bun run test` và `bun run build` không lỗi.
- Checklist test thủ công ở cuối file kế hoạch đều pass.
