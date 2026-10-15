# 02 — Tối ưu giao diện mobile

Màn hình mục tiêu: 360px – 430px (điện thoại), 768px (tablet). Breakpoint chuẩn dùng chung: `md = 768px` (trùng `MOBILE_BREAKPOINT` trong `src/libs/hooks/use-mobile.tsx`).

## Hiện trạng (đã kiểm tra trong code)

| # | Vấn đề | Vị trí |
|---|--------|--------|
| P1 | CSS gốc viết nhầm `.html` (class) thay vì `html` (thẻ) → rule cỡ chữ không bao giờ áp dụng. Nếu sửa nhầm thành `html` mà giữ `font-size: 0.9vw` thì chữ trên mobile chỉ còn ~3px. | `src/app/globals.css:249-263` |
| P2 | Input antd/HTML cỡ chữ 14px → iOS Safari **tự zoom** khi focus vào ô nhập. | toàn bộ form, `auth-login/index.tsx` (`text-sm`) |
| P3 | Chưa khai báo `viewport` (safe-area cho iPhone tai thỏ, `themeColor`); `<html lang="en">` trong khi nội dung tiếng Việt. | `src/app/layout.tsx` |
| P4 | Header cao `h-16`, có `<BannerHeader />` rỗng chiếm `flex-1`; nội dung padding `p-4` cố định. | `src/components/layout/shadcnLayout.tsx` |
| P5 | Tất cả bảng dùng antd `Table` với `scroll={{ x: 900/1000 }}` → trên điện thoại phải vuốt ngang để đọc 1 dòng; nút thao tác `size="small"` (24px) khó bấm. | `features/*/components/*-table/index.tsx`, `dashboard/components/credit-card-debts` |
| P6 | Bộ lọc (search + 2 Select + RangePicker + nút thêm) xếp dọc chiếm gần hết màn hình đầu tiên; `RangePicker` antd mở 2 lịch song song tràn ngang trên mobile. | `features/expenses|incomes|transfers/components/header/index.tsx` |
| P7 | Modal form cố định `width={520}`, form dài (transfer 384 dòng) phải cuộn cả trang; bàn phím ảo che nút OK. | `*-form-modal/index.tsx`, `transfer-form-modal-content/index.tsx` |
| P8 | Dashboard: số tiền `text-2xl … truncate` bị cắt; donut chart cao 420px, bar chart 31 cột trong 360px; header có DatePicker + nút "Thêm chi tiêu" chen chung một dòng. | `dashboard/components/*` |
| P9 | Bảng kéo thả (`SortableTable`) chỉ dùng `PointerSensor` → trên cảm ứng kéo bị lẫn với cuộn trang. | `src/components/common/sortable-table/index.tsx` |

## Các bước thực hiện

### M1. Nền tảng CSS / viewport (làm đầu tiên)

1. `src/app/globals.css`
   - Xoá block `.html { … }` và 2 media query `.html` (dòng ~249-263). Không đổi cỡ chữ gốc theo `vw`.
   - Thêm chống zoom iOS:
     ```css
     @media (max-width: 767px) {
         input, select, textarea,
         .ant-select-selection-search-input,
         .ant-picker-input > input {
             font-size: 16px !important;
         }
     }
     ```
   - Thêm tiện ích safe-area:
     ```css
     .pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
     ```
2. `src/app/layout.tsx`
   - Đổi `lang="en"` → `lang="vi"`.
   - Thêm export `viewport` (đọc `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md` trước):
     ```ts
     export const viewport: Viewport = {
         width: "device-width",
         initialScale: 1,
         viewportFit: "cover",
         themeColor: [
             { media: "(prefers-color-scheme: light)", color: "#ffffff" },
             { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
         ],
     };
     ```
   - **Không** đặt `maximumScale: 1` / `userScalable: false` (vi phạm accessibility).

### M2. Layout chung

File: `src/components/layout/shadcnLayout.tsx`

- Header: `h-14 md:h-16`, padding `px-3 md:px-4`.
- Bỏ `<BannerHeader />` nếu không dùng, hoặc thêm `hidden md:flex` để không chiếm chỗ trên mobile.
- Vùng nội dung: `p-3 pt-4 md:p-4 md:pt-5`, thêm `min-w-0` để bảng/biểu đồ con không đẩy tràn ngang trang.
- `BreadcrumbTrail` đã ẩn các mục cha trên mobile — thêm `truncate max-w-[50vw]` cho mục cuối.
- Sidebar mobile đã tự đóng khi chọn menu (`nav-main.tsx:51`) — giữ nguyên, chỉ test lại.
- Thêm `className="pb-safe"` cho container nội dung để không bị thanh home iPhone che.

### M3. Bảng dữ liệu → dạng thẻ (card) trên mobile

**Bước 3.1 — sửa nhanh (1 ngày):** dùng thuộc tính `responsive` của cột antd + điều chỉnh bảng.

- Ẩn cột phụ trên mobile: STT, Ghi chú, Tag loại nguồn → `responsive: ["md"]`.
- Bảng: `size={isMobile ? "small" : "middle"}`, `scroll={{ x: "max-content" }}` thay vì số cố định.
- Phân trang mobile: `pagination={{ …, simple: isMobile, showSizeChanger: !isMobile, showTotal: isMobile ? undefined : … }}`.
- Nút thao tác: `size={isMobile ? "middle" : "small"}` (vùng chạm ≥ 40px).
- `isMobile` lấy từ `useIsMobile()` (`src/libs/hooks/use-mobile.tsx`) — đã có, không tạo hook mới.

**Bước 3.2 — làm chuẩn:** tạo component dùng chung hiển thị danh sách dạng thẻ trên mobile.

- Tạo `src/components/common/mobile-record-list/index.tsx`, dùng antd `List` + `Card`/`Pagination`:
  ```tsx
  type Props<T> = {
      items: T[];
      loading?: boolean;
      rowKey: (item: T) => string;
      renderItem: (item: T) => React.ReactNode; // nội dung thẻ
      pagination?: PaginationProps;
  };
  ```
- Mỗi feature table render: `isMobile ? <MobileRecordList … /> : <Table … />`.
- Mẫu thẻ cho khoản chi (expenses), áp tương tự cho incomes/transfers:
  ```
  ┌───────────────────────────────────┐
  │ Ăn uống                 -120.000₫ │  ← danh mục (đậm) | số tiền (đỏ, căn phải)
  │ 15/10/2026 · Ví tiền mặt          │  ← ngày · nguồn tiền (muted, text-xs)
  │ Ghi chú cắt 2 dòng…        ✎  🗑  │  ← line-clamp-2 | nút thao tác 40px
  └───────────────────────────────────┘
  ```
- Áp dụng cho: `expenses-table`, `incomes-table`, `transfers-table`, `sources-of-money-table`, `category-table`, `dashboard/credit-card-debts`.
- Với bảng có kéo thả (categories, sources-of-money): trên mobile giữ `SortableTable` nhưng ẩn cột phụ (xem M7), hoặc thêm nút "Sắp xếp" mở chế độ kéo thả riêng.

### M4. Bộ lọc gọn trên mobile

Files: `features/expenses|incomes|transfers|categories|sources-of-money/components/header/index.tsx`

- Mobile: 1 hàng gồm `Input` tìm kiếm (flex-1) + nút icon `SlidersHorizontal` (lucide) có `Badge` đếm số bộ lọc đang bật.
- Bấm nút → mở `Drawer` (antd `Drawer placement="bottom"` hoặc shadcn `drawer` đã có ở `src/components/shadcn/ui/drawer.tsx`) chứa Select danh mục, Select nguồn tiền, khoảng ngày, nút "Xoá lọc" / "Áp dụng".
- `RangePicker` trên mobile: thay bằng 2 `DatePicker` "Từ ngày" / "Đến ngày" xếp dọc (tránh popup 2 lịch tràn màn hình), thêm `inputReadOnly` để không bật bàn phím.
- Nút "Thêm …": trên mobile chuyển thành **nút nổi (FAB)** góc phải dưới: `fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 size-14 rounded-full` (antd `FloatButton` cũng được). Desktop giữ như cũ.
- Tách logic hiển thị filter thành component con `components/header/filter-drawer/index.tsx` theo quy tắc feature module; state filter vẫn lấy từ context.

### M5. Modal & form

Files: `*-form-modal/index.tsx`, `transfer-form-modal-content/index.tsx`

- Mobile dùng `Drawer placement="bottom" height="90dvh"` (hoặc `Modal` full màn hình: `width="100%"`, `style={{ top: 0, maxWidth: "100vw", padding: 0 }}`), desktop giữ `Modal width={520}`.
  - Gợi ý: tạo `src/components/common/responsive-modal/index.tsx` nhận cùng props (`open`, `title`, `onCancel`, `footer`, `children`) và tự chọn Modal/Drawer theo `useIsMobile()` → các feature chỉ đổi import.
- Body cuộn riêng: `styles={{ body: { maxHeight: "calc(90dvh - 120px)", overflowY: "auto" } }}`; footer dính đáy (`sticky bottom-0`), có `pb-safe`.
- Footer modal chi tiêu: trên mobile xếp `flex-col-reverse gap-2`, nút OK/Huỷ `block` full width.
- Ô số tiền (`DebouncedNumberInput`): thêm `inputMode="numeric"` để bật bàn phím số.
- `DatePicker` trong form: `inputReadOnly` trên mobile.

### M6. Dashboard

Files: `src/components/features/dashboard/components/*`

- `header`:
  - Số tiền: bỏ `truncate`, dùng `text-xl sm:text-3xl break-words` để không bị cắt số.
  - Khối điều khiển: mobile tách 2 hàng — DatePicker full width; nút "Thêm chi tiêu" thành FAB (dùng chung với M4) hoặc nút full width.
  - `MiniStat` grid: `grid-cols-2 sm:grid-cols-3` (mục thứ 3 `col-span-2 sm:col-span-1`).
- `expense-donut-chart`: `height={isMobile ? 280 : 420}`, legend `position: isMobile ? "bottom" : "right"`, ẩn label trên lát nhỏ khi mobile.
- `daily-bar-chart`: `height={isMobile ? 240 : 320}`; trục X `labelAutoHide`/`labelAutoRotate`; hoặc bọc trong `overflow-x-auto` với `min-w-[640px]` để vuốt ngang.
- `credit-card-debts`: dùng `MobileRecordList` (M3.2) — mỗi thẻ: tên thẻ, dư nợ, `Progress`, ngày đến hạn, Tag trạng thái.
- Chart chỉ render khi container có kích thước (antd plots `autoFit` đã bật) — test xoay ngang/dọc máy.

### M7. Kéo thả trên cảm ứng

File: `src/components/common/sortable-table/index.tsx`

```ts
const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);
```

- Nút kéo (`GripVertical`): thêm `touch-none` và kích thước `size-9` trên mobile để dễ chạm.

### M8. Trang đăng nhập

File: `src/components/features/auth-login/index.tsx`

- Input: `text-base md:text-sm` (chống zoom iOS — trùng mục M1 nhưng input này là HTML thuần).
- Thêm `autoComplete="email"` / `autoComplete="current-password"`, `inputMode="email"`.
- Container `min-h-dvh` thay vì `min-h-screen` (tránh nhảy layout khi thanh địa chỉ Safari ẩn/hiện).
- Nút hiện mật khẩu: bỏ `tabIndex={-1}`, thêm `aria-label`.

## Checklist test mobile

- [ ] Không có thanh cuộn ngang ở bất kỳ trang nào tại 360px (DevTools → kiểm tra `document.documentElement.scrollWidth === innerWidth`).
- [ ] Focus vào mọi ô nhập trên iOS Safari: trang không tự zoom.
- [ ] Danh sách chi tiêu/thu nhập/chuyển tiền đọc được không cần vuốt ngang; sửa/xoá bấm được bằng ngón tay.
- [ ] Mở bộ lọc → chọn danh mục + khoảng ngày → áp dụng → Badge hiện số bộ lọc.
- [ ] Mở form thêm chi tiêu, bàn phím bật lên không che nút "Tạo mới".
- [ ] Dashboard: số tiền lớn (≥ 1.000.000.000₫) hiển thị đủ; chart không tràn; xoay ngang máy chart vẽ lại đúng.
- [ ] Kéo thả sắp xếp danh mục trên điện thoại: giữ ~0,2s rồi kéo được; vuốt bình thường vẫn cuộn trang.
- [ ] Dark mode trên mobile hiển thị đúng ở Drawer/FAB mới.
- [ ] Lighthouse (Mobile) — Accessibility ≥ 90, không có cảnh báo "tap targets too small".
