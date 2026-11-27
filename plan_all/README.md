# Kế hoạch — Money Manager

Các kế hoạch đã triển khai xong được xóa khỏi thư mục này. `.gitignore` bỏ qua `plan_all/*`, nên chỉ các file đã `git add -f` (01–04, README) xem lại được bằng `git log -- plan_all/`. Nghiệp vụ đã triển khai nằm trong `.agents/business/`.

| # | Vấn đề | Mức độ | File kế hoạch |
|---|--------|--------|---------------|
| — | Rà soát 27/11/2026: không thấy kế hoạch nào còn code dở, các dòng dưới chủ yếu chờ kiểm tay hoặc việc trên server. `lint`, kiểm kiểu, `test` (139/139) và `build` đạt; `developer` trùng nội dung `origin/main` (merge 25/11), chưa kiểm kết quả deploy (plan 12 loading và 13 MCP đã kiểm tay xong 07/11/2026; thư mục `mcp/`, `redesign-loading-ui/` chỉ còn để tham khảo, xóa được) | | |
| 14 | Lịch sử nguồn tiền chuyển từ modal sang trang riêng `/source-history/<id>` (đã code 15/11/2026; `test` và `build` đạt 27/11/2026; còn kiểm tay) | Trung bình | [14-trang-lich-su-nguon-tien-mockup.html](14-trang-lich-su-nguon-tien-mockup.html) |
| 15 | Dashboard: gộp "Xu hướng thu – chi" và "Chi tiêu tháng" thành một khối có tab Ngày / Danh mục / Nguồn / Tháng (tab Ngày: thu chi mọi ngày trong tháng), "Cần chú ý" dạng chip, nút nổi hơn (đã code 15/11/2026; `test` và `build` đạt 27/11/2026; còn kiểm tay) | Trung bình | [15-dashboard-thu-chi-theo-ngay-mockup.html](15-dashboard-thu-chi-theo-ngay-mockup.html) |
| 16 | Trang Lãi suất dễ đọc hơn: ô số tiền + kỳ hạn và câu trả lời lên đầu, top 3, thanh ngang tiền lãi, biểu đồ đường theo kỳ hạn, bảng chỉ tô ô cao nhất (có đổi %/tiền lãi), gộp kênh trùng, thu gọn nguồn dữ liệu (đã code 15/11/2026; `test` và `build` đạt 27/11/2026; còn kiểm tay) | Trung bình | [16-lai-suat-de-hieu-mockup.html](16-lai-suat-de-hieu-mockup.html) |
| 17 | Báo cáo màu sắc và theme (trạng thái trước plan 18–19, giá trị màu đã lỗi thời; xóa được) của toàn dự án (token sáng/tối, màu theo nghĩa, hex ngoài CSS, điểm lệch cần dọn). Chỉ khảo sát, chưa sửa code (16/11/2026) | Thấp | [17-bao-cao-mau-sac-va-theme-hien-tai.md](17-bao-cao-mau-sac-va-theme-hien-tai.md) |
| 18 | Đồng bộ màu về một nơi: phần code đã xong 16/11/2026 (commit `3f91f32`). Còn: kiểm meta theme-color trên điện thoại thật, quyết quy tắc CSS link sidebar | Thấp | [18-dong-bo-mau-o-mot-noi.md](18-dong-bo-mau-o-mot-noi.md) |
| 19 | Bảng màu tài chính: đã chọn và code phương án A "Xanh ngân hàng" (slate + xanh `#1d4ed8`, tín dụng tím, icon mới) 16/11/2026 (commit `be6ee8c`). Còn: kiểm icon/thanh trình duyệt trên điện thoại thật, xem với dữ liệu thật | Trung bình | [19-de-xuat-bang-mau-tai-chinh.md](19-de-xuat-bang-mau-tai-chinh.md) · [mockup](19-de-xuat-bang-mau-tai-chinh-mockup.html) |
| 20 | Tiết kiệm dữ liệu 4G: đã code + commit 16/11/2026 (`8d0ecd1`, `db8e11b`, `30df778`; đã merge `main`, chưa kiểm production): bỏ G2 → biểu đồ tự vẽ có tooltip màu, font hệ thống, bỏ `motion` → hiệu ứng CSS, staleTime 5 phút + nút Làm mới, ETag chỉ cho lãi suất, bỏ pravatar, cache favicon. Lần đầu 753 → 537 KB, trang biểu đồ 486 → 68 KB. Còn: bật gzip nginx, kiểm điện thoại thật, xác nhận deploy và đo lại trên production (biểu đồ mobile tự cuộn tới hôm nay đã làm 27/11) | Trung bình | [20-tiet-kiem-du-lieu-4g.md](20-tiet-kiem-du-lieu-4g.md) |
| 21 | Giảm màu gây mất tập trung: bảng token ổn, vấn đề là cách dùng — chi tiêu thường tô đỏ khắp nơi, 4–6 màu nhấn mỗi màn, danh mục 10 màu đậm, nhiều nút đặc. Đề xuất "trung tính trước, màu khi cần chú ý" (A–H). Đã code đủ A–H 24/11/2026. Còn: kiểm điện thoại thật (cột lương áp đảo biểu đồ ngày đã xử lý 27/11) | Trung bình | [21-giam-mau-gay-mat-tap-trung.md](21-giam-mau-gay-mat-tap-trung.md) · [mockup](21-giam-mau-gay-mat-tap-trung-mockup.html) |
| 22 | Mở app từ Màn hình chính thấy đen rồi trắng: đen là chờ khởi động + phản hồi đầu, trắng là chờ CSS chặn vẽ. Đã code ảnh khởi động iOS, máy ảo hết khung trắng (27/11/2026); còn kiểm iPhone thật, service worker chưa làm | Thấp | [22-man-hinh-khoi-dong.md](22-man-hinh-khoi-dong.md) |

## Kiểm trên iPhone ảo (27/11/2026)

iPhone 17, iOS 27.2, Safari, bản build local với dữ liệu giả. Không thay được máy thật và Android.

| Plan | Đạt | Lỗi / còn mở |
|---|---|---|
| 14 | Mở từ menu nguồn tiền, lọc "Chi" đổi số tổng và danh sách, drawer Chia sẻ kéo xuống để đóng. Đã sửa 27/11: menu một dòng, ô Từ/Đến ngày rộng hết hàng | — |
| 15 | Chip "Cần chú ý", 4 tab Ngày/Danh mục/Nguồn/Tháng, chạm ngày xem số rồi chạm lại mở chi tiêu. Đã sửa 27/11: trục Y đứng yên, mở ở hôm nay | Nhiều ngày chi lớn thì ngày chi nhỏ vẫn thấp |
| 16 | Câu trả lời + thẻ cao nhất, biểu đồ đường, bảng tô ô cao nhất, tự lấy lãi suất. Đã sửa 27/11: ô số tiền không còn tràn, màu đường gán theo thứ tự, chữ "cột cam" | — |
| 18, 19 | Thanh trạng thái Safari đổi theo theme app ngay khi bấm (máy đang sáng, app tối); sidebar tối đọc rõ; icon Màn hình chính đúng, tên "Money" | Mở web app lần đầu: màn đen → trắng → trang đăng nhập (chưa xem lại với theme tối) |
| 20 | Drawer kéo đóng, không thấy lỗi font | Đã sửa 27/11: chạm cột hiện tooltip, chạm lần nữa mới chuyển trang |
| 21 | Chi tiêu không đỏ, dư nợ đỏ đúng khi sắp hạn hoặc gần hết hạn mức. Đã xử lý 27/11: cắt cột đột biến, có vạch đứt | — |

Quét thêm mọi trang ở bề ngang 360px (khung trình duyệt giả lập, 27/11/2026), đã sửa: khoản chi dự kiến đến hạn bị số tiền đè tên; bộ lọc loại ở lịch sử thẻ đè chữ; số tổng trang Nguồn tiền sát/tràn ô; chip "Cần chú ý" bị cắt nút; dòng chuyển tiền mất tên nguồn nhận; tiêu đề tab còn tiếng Anh.

Chưa kiểm: máy thật, Android Chrome, hiệu ứng chuyển động của modal/dropdown, gzip nginx, production.

## Định nghĩa "xong"

- `bun run lint`, `bun run test` và `bun run build` không lỗi.
- Checklist test thủ công ở cuối file kế hoạch đều pass.
