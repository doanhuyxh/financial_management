# Conventions — style, đặt tên, type safety

## Next.js

Đây là **Next.js 16** (App Router), có breaking change so với kiến thức cũ. Đọc guide tương ứng trong `node_modules/next/dist/docs/` trước khi viết code dùng API của Next, và chú ý các deprecation notice. Ví dụ: middleware nay là `src/proxy.ts`.

## Component

- **1 component = 1 folder có `index.tsx`.** Không tạo file `.tsx` đứng lẻ. File `.ts` đứng lẻ thì được (types, schemas, utils).
- **Tên folder `kebab-case`** (ví dụ `category-form-modal`). Không dùng `PascalCase`.
- **Import bỏ đuôi `.tsx`**: `import Header from "@/components/features/categories/components/header";`
- **UI library**: trước khi tự dựng UI, tìm component có sẵn trong **shadcn UI** (`src/components/shadcn/ui`, style `radix-nova`; thêm component mới xem [commands.md](commands.md#shadcn--animate-ui)). Icon dùng **lucide-react**. Component dùng chung nhiều feature đặt ở `src/components/common/`.
- **Không còn antd** (gỡ xong 07/11/2026). Hiệu ứng: component shadcn đã nối sang `@animate-ui/react` (`motion`), không thêm animation CSS tay cho chúng.
- **Bộ component dùng chung thay antd** (`src/components/common/`): `form-field` (`FormField` label/error/extra/tooltip + `useFieldStatus()` cho ô nhập tự tô lỗi), `combobox` (chọn có tìm kiếm, option nhóm `SelectOptionOrGroup` từ `libs/interfaces/selectOption.ts`), `date-picker` (giá trị `Dayjs`, `picker="date" | "month"`), `segmented`, `tag`, `pagination` (`AppPagination`, `IPaginationProps`, `IPageChange`), `data-table` (`IDataTableColumn`: render/width/align/fixed/responsive/onCell colSpan) và `sortable-table` trên nền nó, `action-menu` (menu "⋯" `{ key, label, danger }`), `empty-state`, `loading-overlay`, `input/DebouncedNumberInput` (số có nhóm nghìn, debounce). QR dùng `qrcode.react`.
- **Form**: react-hook-form (`useForm` + `Controller`, `rules` hoặc zod `zodResolver`) + `FormField`; không tự viết validation thủ công khi rhf làm được. Modal có `onOk` thì gọi `handleSubmit(onValid)()`.
- **Loading**: `common/loading` là splash toàn màn hình khi boot app (HTML tĩnh trước khi JS chạy → chỉ CSS + SVG inline, class `.boot-*` trong `globals.css`); chỉ dùng ở `client-app`, `app/loading.tsx` và trang ngoài layout (`share/[token]`). Trang trong `(protected)` dùng `common/route-loading` với `variant="dashboard" | "list" | "form"` cho cả `loading.tsx` lẫn `Suspense fallback`. Skeleton mới dùng `Skeleton` + `skeleton-shimmer animate-none`.
- **Thông báo & xác nhận**: `useAppFeedback()` (`src/libs/hooks/useAppFeedback.tsx`) → `notification.success/error/warning({ title, description?, duration? })` (sonner) và `modal.confirm({ title, content, okText, okType: "danger", onOk })` (`common/confirm-dialog`). Không dùng `window.alert`/`confirm`.

> Một số file cũ trong `src/components/layout/` và `src/components/providers/` vẫn là `.tsx` đứng lẻ. Không bắt chước; code mới theo quy tắc trên.

## Feature module (`src/components/features/<feature>/`)

Mẫu tham chiếu: `src/components/features/categories/`.

```
features/<feature>/
  index.tsx                 # Chỉ compose: Provider + component con (không business logic)
  context/
    index.tsx               # <Feature>ContextProvider + use<Feature>Context()
    type.ts                 # Kiểu của context value (I<Feature>ContextProps)
  components/
    <child>/index.tsx       # UI; đọc/ghi qua use<Feature>Context()
  hooks/                    # Tùy chọn: hook riêng của feature
  schemas/                  # Tùy chọn: zod/schema riêng của feature
```

- `index.tsx`: chỉ ghép layout. **Không** đặt fetch, mutation hay state modal ở đây.
- `context/`: giữ state của feature, gọi query/mutation hook, chứa handler. Mọi thứ component con cần đều expose qua context.
- `components/`: UI liên quan lồng dưới `components/<kebab-name>/index.tsx`. Ưu tiên context thay vì truyền prop qua nhiều tầng.
- Component con gọi `use<Feature>Context()`; hook này **throw** nếu dùng ngoài Provider.

## Function & hook

- **Kiểm tra trùng trước khi tạo mới**: tìm trong `src/libs/hooks/` (gồm `customHooks/`), `hooks/` của feature, và `src/libs/utils/`.
- Hook dữ liệu dùng chung (React Query gọi `networkApi`) đặt ở `src/libs/hooks/customHooks/`.
- Hook UI/state chỉ dùng trong một feature đặt ở `features/<feature>/hooks/`.
- Util dùng chung client + server (ví dụ `getTrackedAmount`, `filterCategoriesByKind`, `formatMoney`, `getNextDueDate` trong `dueDate.ts`) đặt ở `src/libs/utils/`. Util chỉ dùng phía server đặt ở `src/server/utils/`.

## Hằng số và key

- Query key React Query: `configQueryKey` trong `src/libs/constants/configKey.ts`. Không viết chuỗi key trực tiếp.
- localStorage / cookie key: `configLocalStorageKey`, `configCookieKey` (cùng file).
- Route key của menu: `src/libs/constants/menuKey.ts`.

## TypeScript & lint

- `strict: true`. Alias `@/*` → `src/*`.
- ESLint đang **tắt**: `no-explicit-any`, `no-empty-object-type`, `react-hooks/exhaustive-deps`, `react-hooks/set-state-in-effect`. Được phép nhưng hạn chế `any` trong code mới.
- Kiểu dữ liệu API dùng chung (client + server) nằm ở `src/libs/interfaces/<entity>Data.ts`.

## Ngôn ngữ & định dạng

- UI, thông báo lỗi từ server và comment nghiệp vụ viết **tiếng Việt**. Tiền tệ VND, định dạng bằng `formatMoney` (`src/libs/utils/formatMoney.ts`). Ngày hiển thị bằng `formatDate` (`src/libs/utils/formatDate.ts`, mặc định `DD/MM/YYYY`), không dùng `toLocaleDateString`.
- Ngày giờ tính theo **Asia/Ho_Chi_Minh (+07:00)**.

## Màu & số tiền

- Số tiền hiển thị bằng `Money` (`src/components/common/money`, tự có class `money-value` để chế độ ẩn số dư làm mờ; số tiền hiển thị bằng `formatMoney` trực tiếp mà là số dư/tổng thì thêm class `money-value` vào phần tử bao) hoặc class token: `text-money-in` (thu), `text-money-out` (chi, phí), `text-debt` (dư nợ, số âm), `text-warn` (cảnh báo), `text-credit` (hạn mức tín dụng). **Không** dùng màu Tailwind thô (`text-red-500`, `text-green-600`…) cho số tiền.
- Màu cam (`primary`) chỉ dành cho hành động (nút chính, mục đang chọn, focus). Chữ cam trên nền tối dùng `text-accent-text`.
- Khối nội dung dạng thẻ dùng `bg-card`, không dùng `bg-background`.
- Thêm/sửa màu: sửa token trong `src/app/globals.css` **và** hex tương ứng trong `src/libs/constants/themeColors.ts`.
- Kéo-thả trên danh sách đã lọc phía client (tab, ẩn mục trống): ghép thứ tự bằng `mergeSubsetOrder` (`src/libs/utils/reorder.ts`) vì API reorder cần đủ toàn bộ ID.
- Modal/Drawer qua `ResponsiveModal` (Dialog trên desktop, Drawer vaul trên mobile): đặt `className={MODAL_AUTOFOCUS_CLASS}` lên `FormField` cần focus khi mở (mặc định Dialog focus nút đóng). Chỉ áp dụng desktop: trên mobile (Drawer) không tự focus để bàn phím không che form; Drawer tự đẩy lên trên bàn phím hệ thống (`useKeyboardInset`). Footer mobile luôn 1 hàng.
- Ô số tiền của form giao dịch dùng `AmountInput` (`common/amount-input`): desktop là ô nhập số, mobile là ô hiển thị + bàn phím số riêng portal vào footer Drawer (`ModalFooterSlotContext`). Phần tử bấm vào mà không muốn ẩn bàn phím số thì gắn `KEEP_AMOUNT_KEYPAD_ATTR`.

## Git

- Commit theo Conventional Commits: `feat(scope): ...`, `fix: ...`, `chore(scripts): ...`.
- Làm việc trên nhánh `developer`; push `main` sẽ deploy (xem [commands.md](commands.md#deploy)).
- **Đổi business rule thì cập nhật file tương ứng trong [business/](business/README.md) trong cùng commit.**
