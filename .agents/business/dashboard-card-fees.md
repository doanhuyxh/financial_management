# Dashboard — phí thẻ tín dụng

> Nguồn sự thật là code; nếu code khác tài liệu, tin code và sửa tài liệu. Phần còn lại của dashboard: [dashboard.md](dashboard.md).
> Quy tắc phí thẻ (kỳ sao kê, điều kiện miễn phí, lãi): [credit-card-fees.md](credit-card-fees.md).

Code: `src/components/features/dashboard/components/credit-cards-panel/` (danh sách thẻ, `components/fee-details` là phần mở rộng, `components/record-fee-button` là nút "Ghi phí"). Số liệu phí tính phía client bằng `buildCreditCardFees` trong `features/dashboard/utils.ts`, kết hợp nguồn tiền với API tiến độ.

## Dữ liệu

- Phí có ở mọi thẻ cấu hình phí thường niên, phí quản lý, phí thanh toán dư nợ, phí sử dụng, lãi suất hoặc phí chậm trả (kể cả thẻ không có dư nợ), kèm kỳ sao kê hiện tại. Thẻ không cấu hình phí vẫn có dòng trong khối "Thẻ tín dụng", cột phí hiện "Chưa cấu hình phí" và không có nút mở rộng.
- Ngày thu phí thường niên: `getNextAnnualDate` (`src/libs/utils/annualFeeDate.ts`, dùng chung với server: hôm nay tính là kỳ này, đã qua thì sang năm sau). Trạng thái dùng chung ngưỡng với hạn trả (≤ 3 ngày đỏ, ≤ 7 ngày cam).
- Điều kiện miễn phí: thanh tiến độ "đã đạt / mức tối thiểu", % đã đạt (hoặc "Đạt") và dòng "Còn thiếu …". Miễn phí quản lý hiện hai thanh nối bằng "hoặc".
- Phí thanh toán dư nợ: số lần đã trả trong kỳ và phí ước tính = max(0, số lần − số lần miễn phí) × `paymentFee`.
- "Lãi & chậm trả": lãi suất, lãi ước tính 30 ngày trên dư nợ hiện tại và quy tắc phí chậm trả.

## Câu tóm tắt "Phí sắp tới" (`getCardFeeHeadline`)

Mỗi thẻ hiện một câu, chọn theo thứ tự ưu tiên:

1. Phí quản lý > 0 và chưa đạt điều kiện miễn → "Phí quản lý X/tháng · cần thêm N GD hoặc chi M trước DD/MM" (cuối kỳ sao kê), màu cảnh báo.
2. Phí sử dụng > 0 đã phát sinh kỳ này → màu cảnh báo.
3. Phí trả nợ ước tính kỳ này > 0 → màu cảnh báo.
4. Phí thường niên > 0: đã đạt miễn → "Đã đủ điều kiện miễn phí thường niên" (xanh); chưa → "Phí thường niên X vào DD/MM/YYYY · cần chi thêm …" (cảnh báo nếu còn ≤ 30 ngày, còn lại trung tính).
5. Phí quản lý > 0 đã đạt miễn → "Đã miễn phí quản lý kỳ này" (xanh).
6. Phí sử dụng > 0 chưa phát sinh → "Phí sử dụng X/kỳ nếu có chi tiêu" (trung tính).
7. Còn lại → "Không có phí sắp tới" (xanh).

## Màu sắc

- Thanh tiến độ miễn phí: đỏ (`--debt`) < 50%, vàng (`--warn`) ≥ 50%, xanh (`--money-in`) khi đạt; % hiện bằng chữ cùng màu, không dùng tag.
- Số tiền phí sẽ bị thu: `text-debt`, in đậm. Phí đã đạt miễn: xanh, gạch ngang. Phí cấu hình = 0: hiện "Miễn phí".
- Số ước tính dùng ký hiệu "≈" (font hiện tại vẽ "~" giống dấu trừ).

## Ghi phí

- Nằm trong phần mở rộng của thẻ: nút "Ghi phí ▾" (antd `Dropdown`). Menu chỉ gồm các mục áp dụng cho thẻ; không có mục nào thì ẩn nút:
  - "Phí thường niên", "Phí quản lý"
  - "Phí thanh toán": chỉ khi phí ước tính > 0
  - "Phí sử dụng": chỉ khi kỳ này đã có chi tiêu
  - "Lãi": điền lãi ước tính
  - "Phí chậm trả": điền `lateFeeMin`
- Chọn một mục sẽ mở `/transactions?type=expense&action=create&sourceOfMoneyId=&amount=&note=&cardFeeType=`. Trang Giao dịch (tab Chi tiêu) điền sẵn thẻ, số tiền ước tính và ghi chú; người dùng chọn danh mục, sửa số thực tế rồi lưu. `cardFeeType` chỉ được gửi khi vẫn chọn đúng thẻ đó.
- Không lưu trạng thái "đã thu".

## Ẩn/hiện mục phí

- Nút "Mục phí" ở đầu khối mở modal chọn mục hiển thị trong phần mở rộng (`VisibilitySettings` trong `components/common/`, dùng chung với trang so sánh thẻ).
- Lưu danh sách mục **bị ẩn** ở localStorage `dashboard-card-fee-hidden-columns` (`configLocalStorageKey.DASHBOARD_CARD_FEE_HIDDEN_COLUMNS`, giữ key cũ của bảng phí), nên mục mới mặc định hiện.
