# Architecture — cây thư mục, ranh giới, luồng dữ liệu

Ứng dụng quản lý tài chính cá nhân (tiếng Việt, VND). Frontend và API chung **một app Next.js 16**. Mỗi user chỉ thấy dữ liệu của chính mình: mọi query đều lọc theo `userId` lấy từ JWT.

**Stack:** Next.js 16 (App Router) + React 19 (React Compiler), MongoDB/Mongoose, React Query, Redux Toolkit (chỉ cho auth/navigation), Ant Design + shadcn, `@ant-design/plots` cho biểu đồ, react-hook-form + zod, `@dnd-kit` cho kéo-thả.

## Cây thư mục

```
src/
  proxy.ts                    # Thay middleware: chặn route chưa đăng nhập (xem business-logic.md §7)
  app/
    (protected)/<page>/       # Các trang cần đăng nhập; mỗi page chỉ render features/<feature>
    api/<resource>/route.ts   # API route: parse request → gọi Service → trả response
  server/                     # CHỈ chạy phía server
    connectDb.ts              # Kết nối Mongo (cache global)
    models/*.model.ts         # Mongoose schema (xem database.md)
    services/*.service.ts     # Toàn bộ business logic — nguồn sự thật
    utils/                    # responseServer, pagination, monthRange, jwtUtil, getCurrentUser, archived...
  libs/                       # Dùng phía client (một số utils dùng chung với server)
    networkApi/*.api.ts       # Hàm gọi API
    hooks/customHooks/        # React Query hook dùng chung (gọi networkApi)
    hooks/                    # Hook chung khác (useDebounce, useLocalStorage, useLogout...)
    interfaces/               # Kiểu dữ liệu API dùng chung client + server
    constants/                # configKey.ts (env, query key, storage key), menuKey.ts
    redux/                    # authSlice, navigationSlice
    utils/                    # Util thuần, dùng được cả client và server
  components/
    features/<feature>/       # Module theo trang (cấu trúc: conventions.md)
    common/                   # Component dùng chung nhiều feature
    layout/                   # Khung trang, menu (navigation-config.tsx)
    providers/                # antd, redux, tanstack, auth-bootstrap
    shadcn/ui/                # Component shadcn đã sinh
scripts/                      # Script một lần + deploy.sh
plan_all/                     # Kế hoạch cũ (lịch sử, không phải nguồn sự thật)
```

## Ranh giới

- `src/server/**` không được import từ component client. Client chỉ nói chuyện với server qua HTTP (`networkApi`).
- `route.ts` **mỏng**: không chứa business logic, chỉ parse input, gọi `XxxService`, trả response.
- Business rule chỉ nằm trong `src/server/services/`. Nếu tài liệu khác code, tin code và sửa tài liệu.
- Validate phía client (form) chỉ để UX; server luôn validate lại.

## Luồng dữ liệu

```
UI component ──use<Feature>Context()──▶ feature context
  ──▶ React Query hook (libs/hooks/customHooks/useXxx.ts)
  ──▶ networkApi (libs/networkApi/xxx.api.ts, fetcherBackEnd)
  ──HTTP──▶ proxy.ts (kiểm tra JWT)
  ──▶ app/api/xxx/route.ts
  ──▶ server/services/xxx.service.ts (getCurrentUser → userId)
  ──▶ server/models (Mongoose) ──▶ MongoDB
```

### Response chuẩn

- Mọi API trả `{ status, message, data, statusCode }` (`src/server/utils/responseServer.ts`).
- Danh sách phân trang: `data: { items, pagination: { total, page, limit, totalPages } }`.
- `page`/`limit` chuẩn hóa qua `normalizePagination` (`src/server/utils/pagination.ts`): page ≥ 1, 1 ≤ limit ≤ 100, giá trị sai dùng mặc định.
- Mọi response 401 (`unauthorizedResponse`) xóa cookie `access_token`.

### Cache React Query

Key ở `configQueryKey`. Mặc định (`tanstack-provider.tsx`): staleTime 30 giây, gcTime 5 phút, không refetch khi focus lại tab, retry 1 lần, không giữ dữ liệu query trước ở mức global (chỉ list phân trang dùng `keepPreviousData`). Danh mục và nguồn tiền stale 5 phút (`QUERY_STALE_TIME`). Dữ liệu chỉ đổi qua mutation của chính app, nên dựa vào invalidate:

| Mutation | Invalidate |
|---|---|
| expense | `EXPENSES`, `SOURCES_OF_MONEY`, `DASHBOARD_EXPENSES_SUMMARY`, `DASHBOARD_CASHFLOW` |
| income | `INCOMES`, `SOURCES_OF_MONEY`, `DASHBOARD_CASHFLOW` |
| transfer | `TRANSFERS`, `SOURCES_OF_MONEY`, `EXPENSES`, `DASHBOARD_EXPENSES_SUMMARY`, `DASHBOARD_CASHFLOW` |

Query key gợi ý nằm dưới `[EXPENSES|INCOMES|TRANSFERS, "suggestions"]`; lịch sử điều chỉnh số dư nằm dưới `SOURCES_OF_MONEY`, nên tự làm mới theo các invalidate trên. **Thêm mutation mới thì phải thêm invalidate tương ứng.**

## Trang và menu

| URL | Feature folder | Nội dung |
|---|---|---|
| `/` | `auth-login` | Đăng nhập |
| `/dashboard` | `dashboard` | Thống kê tháng, tài sản, dòng tiền, dư nợ thẻ |
| `/expenses` | `expenses` | Bảng + form chi tiêu; `?action=create` mở sẵn modal |
| `/incomes` | `incomes` | Bảng + form thu nhập |
| `/transfers` | `transfers` | Lịch sử chuyển tiền: tạo, xóa |
| `/sources-of-money` | `sources-of-money` | Nguồn tiền, kéo-thả, chuyển tiền nhanh, lịch sử điều chỉnh |
| `/categories` | `categories` | Danh mục, kéo-thả, lọc theo loại |

Menu: `src/components/layout/navigation-config.tsx` — Dashboard; nhóm "Giao dịch" (Chi tiêu, Thu nhập, Chuyển tiền); nhóm "Quản lý" (Nguồn tiền, Danh mục). Chi tiết từng trang: [business-logic.md](business-logic.md).

## Thêm một tính năng CRUD mới (checklist)

1. Model: `src/server/models/<entity>.model.ts` (xem [database.md](database.md)).
2. Interface: `src/libs/interfaces/<entity>Data.ts`.
3. Service: `src/server/services/<entity>.service.ts`, lọc theo `userId`.
4. Route: `src/app/api/<entity>/route.ts` và `[id]/route.ts`.
5. Client: `networkApi/<entity>.api.ts` → `customHooks/use<Entity>.ts` → query key mới trong `configQueryKey`.
6. UI: `components/features/<entity>/` theo [conventions.md](conventions.md), page ở `app/(protected)/<entity>/`, thêm menu + `menuKey`.
7. Cập nhật [business-logic.md](business-logic.md).
