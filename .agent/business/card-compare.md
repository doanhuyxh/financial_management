# So sánh thẻ tín dụng — `/credit-card-compare`

> Nguồn sự thật là code; nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md).
> Cấu hình phí, `calcPercentFee`, `estimateInterest`: [credit-card-fees.md](credit-card-fees.md).

**Phạm vi:** tính phía client trong `features/credit-card-compare/utils.ts` từ danh sách nguồn tiền, không có API riêng):
- **Kịch bản** (lưu localStorage `credit-card-compare-scenario`): chi tiêu/tháng, số giao dịch/tháng, số lần trả nợ/kỳ, dư nợ chưa trả, một lần rút tiền mặt, một lần chi tiêu nước ngoài. Mọi phí được quy ra số tiền theo kịch bản.
- **Phí cố định/năm** = thường niên (0 nếu đạt điều kiện miễn: `YEAR` so chi tiêu/tháng × 12, `MONTH` so chi tiêu/tháng) + quản lý × 12 (0 nếu đạt số giao dịch hoặc chi tiêu) + max(0, số lần trả nợ − số lần miễn phí) × `paymentFee` × 12 + `usageFee` × 12 (nếu số giao dịch/tháng > 0). Phí thường niên/quản lý/thanh toán/sử dụng bỏ trống = 0.
- **Lãi** = `estimateInterest(dư nợ chưa trả, interestRate)` 30 ngày. **Rút tiền mặt** = `calcPercentFee` + lãi 30 ngày trên số tiền rút. **Ngoại tệ / VND nước ngoài** = `calcPercentFee` theo cấu hình. Lãi suất và phí theo % bỏ trống = "Chưa nhập", không xếp hạng.
- **Xếp hạng** mỗi tiêu chí (`rankCriterion`): cần ≥ 2 thẻ có giá trị và không bằng nhau; thẻ tốt nhất tô xanh, tệ nhất tô đỏ (hạn mức còn lại: cao là tốt; còn lại: thấp là tốt). Điểm mạnh/yếu của thẻ = các tiêu chí thẻ đó đứng đầu/cuối. "Nên dùng thẻ nào" chọn thẻ chi phí thấp nhất cho chi tiêu hằng ngày, khi chưa trả hết dư nợ, rút tiền mặt, chi tiêu ngoại tệ.

**Bố cục trang:** kịch bản sử dụng, thẻ nên dùng cho từng nhu cầu, bảng so sánh tô xanh/đỏ, điểm mạnh/yếu.
