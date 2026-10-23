# Conventions — style, đặt tên, type safety

## Next.js

Đây là **Next.js 16** (App Router), có breaking change so với kiến thức cũ. Đọc guide tương ứng trong `node_modules/next/dist/docs/` trước khi viết code dùng API của Next, và chú ý các deprecation notice. Ví dụ: middleware nay là `src/proxy.ts`.

## Component

- **1 component = 1 folder có `index.tsx`.** Không tạo file `.tsx` đứng lẻ. File `.ts` đứng lẻ thì được (types, schemas, utils).
- **Tên folder `kebab-case`** (ví dụ `category-form-modal`). Không dùng `PascalCase`.
- **Import bỏ đuôi `.tsx`**: `import Header from "@/components/features/categories/components/header";`
- **UI library**: trước khi tự dựng UI, tìm component có sẵn trong **Ant Design (antd)** và **shadcn UI** (`src/components/shadcn/ui`). Icon dùng **lucide-react**. Component dùng chung nhiều feature đặt ở `src/components/common/`.

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
- Util dùng chung client + server (ví dụ `getTrackedAmount`, `filterCategoriesByKind`, `formatMoney`) đặt ở `src/libs/utils/`. Util chỉ dùng phía server đặt ở `src/server/utils/`.

## Hằng số và key

- Query key React Query: `configQueryKey` trong `src/libs/constants/configKey.ts`. Không viết chuỗi key trực tiếp.
- localStorage / cookie key: `configLocalStorageKey`, `configCookieKey` (cùng file).
- Route key của menu: `src/libs/constants/menuKey.ts`.

## TypeScript & lint

- `strict: true`. Alias `@/*` → `src/*`.
- ESLint đang **tắt**: `no-explicit-any`, `no-empty-object-type`, `react-hooks/exhaustive-deps`, `react-hooks/set-state-in-effect`. Được phép nhưng hạn chế `any` trong code mới.
- Kiểu dữ liệu API dùng chung (client + server) nằm ở `src/libs/interfaces/<entity>Data.ts`.

## Ngôn ngữ & định dạng

- UI, thông báo lỗi từ server và comment nghiệp vụ viết **tiếng Việt**. Tiền tệ VND, định dạng bằng `formatMoney` (`src/libs/utils/formatMoney.ts`).
- Ngày giờ tính theo **Asia/Ho_Chi_Minh (+07:00)**.

## Git

- Commit theo Conventional Commits: `feat(scope): ...`, `fix: ...`, `chore(scripts): ...`.
- Làm việc trên nhánh `developer`; push `main` sẽ deploy (xem [commands.md](commands.md#deploy)).
- **Đổi business rule thì cập nhật [business-logic.md](business-logic.md) trong cùng commit.**
