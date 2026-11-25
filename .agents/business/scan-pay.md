# Quét QR trả tiền — `/scan-pay`

> Nguồn sự thật là code (`src/components/features/scan-pay/`, `src/libs/utils/vietQr.ts`). Nếu code khác tài liệu, tin code và sửa tài liệu.

Mục đích: trả tiền bằng chuyển khoản trên điện thoại mà vẫn ghi được chi tiêu. Quét VietQR → xác nhận → **ghi chi tiêu trước** → mở app ngân hàng bằng deeplink. **Toàn bộ chạy phía client, không có API riêng**: chi tiêu tạo qua `POST /api/expenses` như form thường (`useCreateExpense`, có Idempotency-Key), nên vẫn đủ kiểm số dư, khóa sổ, chống gửi trùng ([balance-rules.md](balance-rules.md)).

## Luồng 3 bước (state trong context, không lên URL)

1. **Quét** (`qr-scanner`): camera sau (`getUserMedia`, `facingMode: environment`), quét mỗi 250 ms. Có nút "Chọn ảnh QR" cho ảnh chụp màn hình / ảnh gửi qua Zalo. Giải mã (`hooks/qrDecoder.ts`): dùng `BarcodeDetector` của trình duyệt nếu có (Android Chrome); không có (Safari iOS) thì `import("jsqr")` động, để các trang khác không phải tải thư viện này. Không có quyền camera hoặc không phải https thì báo lỗi, vẫn chọn ảnh được.
2. **Xác nhận** (`payment-form`): người nhận (ngân hàng tra theo BIN qua `useVietQrBanks`, số TK, tên nếu QR có tag 59). QR động có sẵn số tiền thì **khóa số tiền**; QR tĩnh thì nhập. Danh mục, "Chuyển từ" (chỉ nguồn **không phải** tiền mặt / thẻ tín dụng: `canPayByTransfer`), app ngân hàng, nội dung (mặc định lấy nội dung trong QR, vừa là ghi chú chi tiêu vừa là nội dung chuyển khoản). Ngày chi = lúc bấm.
3. **Đã ghi** (`payment-done`): web tự chuyển sang deeplink. Nếu quay lại web thì thấy màn này: các nút copy từng thông tin (khi app không tự điền), nút "Mở lại app", "Quét mã khác". Kết quả được lưu ở `sessionStorage` (`configSessionKey.SCAN_PAY_LAST_RESULT`, sống 15 phút), nên trang bị tải lại khi quay về từ app vẫn khôi phục được màn này. Quét mã mới hoặc bấm "Quét mã khác" thì xóa.

Hủy chuyển khoản trong app thì khoản chi **vẫn còn**: người dùng tự xóa ở trang Giao dịch (đã chọn "ghi trước rồi mở app" cho nhanh, chấp nhận điểm này).

## Đọc VietQR — `parseVietQrPayload`

Chuẩn EMVCo/NAPAS, ngược với `buildVietQrPayload`. Kiểm CRC16 (sai thì báo "Mã QR bị hỏng"). Tag 38 phải có GUID `A000000727`, trong đó 01 → 00 là BIN 6 số, 01 là số TK; 02 = `QRIBFTTC` thì là **số thẻ** (`isCard`). Tag 54 là số tiền (làm tròn, có thể dạng `50000.00`), tag 62.08 là nội dung, tag 59 là tên (bỏ qua giá trị "NA"). QR không phải VietQR (VNPay, QR riêng của ví…) thì báo "không phải VietQR chuyển khoản ngân hàng". Camera quét trúng cùng một mã sai thì không báo lại.

## Deeplink app ngân hàng — dịch vụ VietQR

- Danh sách app lấy thẳng phía client từ `https://api.vietqr.io/v2/{ios|android}-app-deeplinks` (`useVietQrBankApps`, cache cả phiên). Hệ điều hành nhận theo UA (`detectPlatform`); trên máy tính thì không tải danh sách, ẩn ô app, chỉ ghi chi tiêu.
- Link: `https://dl.vietqr.io/pay?app=<appId>`. Chỉ app có `autofill = 1` (11/2026: VietinBank `icb`, BIDV, ACB, OCB, MB) mới được thêm `ba=<số TK>@<mã ngân hàng nhận viết thường>&am=&tn=&bn=&url=` để mở sẵn lệnh chuyển (`buildBankAppDeeplink`). Nội dung `tn` đi qua `normalizeTransferNote` (không dấu, ≤ 50 ký tự). QR số thẻ, hoặc không tra được mã ngân hàng nhận, thì coi như không tự điền (`isAutofillApp`).
- App không tự điền: **copy số TK ngay trong sự kiện bấm nút**, trước khi gọi API (`prepareClipboard`), vì Safari chặn ghi clipboard sau khi đã chờ API. Sau đó mở app.
- Giới hạn của VietQR: deeplink tự điền tối đa 5 lần/phút mỗi IP. Dùng miễn phí theo điều khoản `dl.vietqr.io/term`.

## Chọn sẵn (nhớ trên máy, localStorage `configLocalStorageKey.SCAN_PAY_MEMORY`)

- **Nguồn**: lần trước trả cho cùng người nhận (`bin:số TK`), nếu không có thì nguồn dùng lần gần nhất, rồi nguồn gợi ý số 1, rồi nguồn đầu tiên.
- **Danh mục**: chỉ lấy khi đã trả cho cùng người nhận. Nhớ tối đa 100 người nhận gần nhất.
- **App theo nguồn**: nếu đã chọn tay (khác app tự ghép) thì dùng app đó; không thì tự ghép từ `bankAccount.bin` của nguồn → `code` ngân hàng → app có `appId` trùng code viết thường, nếu không có thì `code-…` (bỏ app `-biz`): `findBankAppByCode`. Đổi nguồn trong form thì app đổi theo.

## Lối vào

Menu "Quét QR trả tiền" (sau Giao dịch) và shortcut PWA đầu tiên (nhấn giữ icon app trên Android).
