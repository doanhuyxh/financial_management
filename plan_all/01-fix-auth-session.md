# 01 — Fix lỗi đăng nhập / đăng xuất: tài khoản mới vẫn nhận tài khoản cũ

## 1. Triệu chứng

Đăng nhập tài khoản A → đăng xuất → đăng nhập tài khoản B (không reload trang): sidebar, dashboard, danh mục, nguồn tiền… vẫn hiện tên/dữ liệu của A trong một khoảng thời gian (hoặc đến khi F5).

## 2. Kết luận nhanh

**Server không bị lỗi phân quyền**: mọi service (`src/server/services/*.service.ts`) đều lấy `userId` từ cookie JWT qua `getCurrentUser()` và filter theo `userId`. Lỗi nằm ở **state phía client không được xoá khi đổi tài khoản** và **luồng logout có race condition**.

## 3. Nguyên nhân gốc (đã kiểm tra trong code)

| # | Nguyên nhân | Vị trí | Hệ quả |
|---|-------------|--------|--------|
| C1 | `QueryClient` (React Query) nằm ở root layout, **không bao giờ bị `clear()`** khi login/logout. Query key không chứa `userId` (`["categories", query]`, `["dashboard-expenses-summary", query]`…). `staleTime: 60s` | `src/components/providers/tanstack-provider.tsx`, `src/libs/hooks/customHooks/*.ts` | Đăng nhập B bằng `router.push` (điều hướng client, không reload) → cache của A vẫn còn trong bộ nhớ → B thấy dữ liệu A tới 60 giây. |
| C2 | Mặc định toàn cục `placeholderData: (previousData) => previousData` | `tanstack-provider.tsx:18` | Kể cả khi đã refetch, trong lúc chờ vẫn hiện dữ liệu cũ của A thay vì loading. |
| C3 | `clearAuth()` đặt `status = "idle"` → `AuthBootstrap` thấy `idle` liền gọi lại `fetchAuthMe()` **trong khi request logout chưa xong, cookie A vẫn còn** → Redux nạp lại user A. | `src/libs/redux/authSlice.ts:633`, `src/components/providers/auth-bootstrap/index.tsx:10`, `src/components/shadcn/nav-user.tsx:167-171` | Sau đăng xuất Redux vẫn giữ A; sidebar hiện A. |
| C4 | `handleLogout` dùng `redirect()` của `next/navigation` **trong event handler** — Next 16 ghi rõ không được dùng trong event handler (xem `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md`, dòng 54). | `nav-user.tsx:170` | Điều hướng không ổn định, có thể không chuyển trang hoặc chuyển kiểu "soft" giữ nguyên toàn bộ state. |
| C5 | Logout là `GET` và xoá **tất cả** cookie bằng `cookieStore.delete(name)` (xoá cả cookie `theme`), không set `Cache-Control: no-store`. | `src/app/api/auth/logout/route.ts` | GET có thể bị prefetch/cache bởi proxy/CDN; cookie theme bị mất ngoài ý muốn. |
| C6 | Sau login dùng `router.push('/dashboard')` (soft navigation) → toàn bộ Redux store + QueryClient của phiên trước được giữ nguyên. `returnUrl` do proxy gắn vào không được dùng. | `src/components/features/auth-login/index.tsx:961-973` | Góp phần gây C1. |
| C7 | Redux `store` là **singleton cấp module** | `src/libs/redux/store.ts:6` | Trên server, module này dùng chung giữa mọi request. Hiện chưa gây lỗi vì state chỉ đổi phía client, nhưng là anti-pattern dễ thành lỗ hổng lộ dữ liệu giữa user nếu sau này dispatch phía server. |
| C8 | Trang `/` (login) không redirect khi đã đăng nhập; `fetcherBackEnd` vẫn gửi `Authorization: Bearer <localStorage.token>` cũ (code thừa, server không dùng). | `src/proxy.ts:51-55`, `src/libs/fetchFromBackEnd.ts:14-18` | Gây nhầm lẫn khi debug; token rác có thể bị gửi đi. |

## 4. Các bước fix chi tiết

> Làm theo thứ tự. Mỗi bước là 1 commit. Chiến lược chính: **khi đổi phiên đăng nhập thì reset cứng toàn bộ state client** (hard navigation) + phòng thủ nhiều lớp.

### A1. Logout route: chuyển sang POST, chỉ xoá cookie token, chống cache

File: `src/app/api/auth/logout/route.ts`

```ts
import { successResponse } from "@/server/utils/responseServer";
import { configCookieKey } from "@/libs/constants/configKey";

export async function POST() {
    const response = successResponse(null, "Đăng xuất thành công");
    response.cookies.set({
        name: configCookieKey.ACCESS_TOKEN_KEY,
        value: "",
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
}
```

- Thuộc tính `path/secure/sameSite` phải **giống lúc set** (`responseServer.ts:66` set `Path=/; HttpOnly; Secure; SameSite=Strict`) để trình duyệt chắc chắn ghi đè đúng cookie.
- Không xoá cookie `theme`.
- Đổi `src/libs/networkApi/auth.api.ts` → `authLogout` dùng `method: "POST"`.

### A2. Thêm `Cache-Control: no-store` cho `/api/auth/me` và `/api/auth/login`

File: `src/app/api/auth/me/route.ts`, `src/server/services/auth.service.ts` (hàm `successResponseWithSetCookie` trong `responseServer.ts`).

- Thêm `headers.set("Cache-Control", "no-store")` vào response của `me` và login.
- Có thể thêm helper `noStore(response)` trong `src/server/utils/responseServer.ts` để tái dùng.

### A3. Sửa Redux auth: tách trạng thái "đã đăng xuất" khỏi "chưa kiểm tra"

File: `src/libs/redux/authSlice.ts`

- Thêm status mới: `export type AuthStatus = "idle" | "loading" | "succeeded" | "failed" | "loggedOut";`
- `clearAuth` đặt `state.status = "loggedOut"` (KHÔNG phải `"idle"`) → `AuthBootstrap` sẽ không tự gọi lại `/auth/me`.
- Bỏ qua kết quả `fetchAuthMe` đã lỗi thời: trong `fetchAuthMe.fulfilled`, chỉ ghi nếu `action.meta.requestId === state.currentRequestId` (lưu `currentRequestId` ở `pending`). Tránh trường hợp request `/me` cũ (của A) về muộn ghi đè user B.

File: `src/components/providers/auth-bootstrap/index.tsx`

- Giữ điều kiện `status === "idle"` (chỉ chạy 1 lần lúc khởi tạo app). Sau A3, trạng thái `loggedOut` không còn kích hoạt lại.

### A4. Viết lại luồng logout ở client

File: `src/components/shadcn/nav-user.tsx`

```ts
import { useQueryClient } from "@tanstack/react-query"

const queryClient = useQueryClient()

const handleLogout = async () => {
  try {
    await authLogout()
  } finally {
    queryClient.cancelQueries()
    queryClient.clear()
    dispatch(clearAuth())
    // Hard navigation: xoá sạch mọi state JS trong bộ nhớ (Redux, React Query, context)
    window.location.replace("/")
  }
}
```

- Bỏ `import { redirect } from "next/navigation"` (C4).
- Thứ tự quan trọng: **chờ server xoá cookie xong** rồi mới clear state + chuyển trang.
- Có thể tách logic này thành hook dùng chung `src/libs/hooks/useLogout.tsx` (kiểm tra trùng trước theo AGENTS.md) để dùng cho cả nút logout và xử lý 401.

### A5. Viết lại luồng login ở client

File: `src/components/features/auth-login/index.tsx`

```ts
const queryClient = useQueryClient();
const searchParams = useSearchParams();

onSuccess: () => {
    queryClient.clear();
    const returnUrl = searchParams.get("returnUrl");
    const target =
        returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")
            ? returnUrl
            : "/dashboard";
    window.location.replace(target);
},
```

- Bỏ `dispatch(setAuthFromLogin)` + `await dispatch(fetchAuthMe())`: sau hard navigation, `AuthBootstrap` sẽ tự gọi `/auth/me` với cookie mới → luôn đúng user.
- Kiểm tra `returnUrl` bắt đầu bằng `/` và không phải `//` để tránh open-redirect.
- `useSearchParams` cần bọc trong `<Suspense>` ở `src/app/page.tsx` (đọc docs Next 16 `use-search-params.md` trước khi làm).
- Theo AGENTS.md, nên chuyển logic submit sang hook `features/auth-login/hooks/useLogin.ts` (đã có) để component chỉ lo UI.

### A6. Bỏ mặc định `placeholderData` toàn cục; chỉ giữ dữ liệu cũ khi phân trang

File: `src/components/providers/tanstack-provider.tsx`

- Xoá dòng `placeholderData: (previousData: any) => previousData`.
- Ở các hook danh sách cần mượt khi đổi trang (`useGetExpenses`, `useGetIncomes`, `useGetTransfers`, `useGetCategories`, `useGetSourcesOfMoney`, `useGetDashboardExpensesSummary`) thêm `placeholderData: keepPreviousData` (import từ `@tanstack/react-query`). Với cùng một user điều này vẫn đúng, còn khi đổi user thì cache đã bị `clear()` ở A4/A5.

**Phòng thủ thêm (tuỳ chọn, khuyến nghị):** thêm `userId` vào query key để cache của 2 user không bao giờ trùng key:

```ts
// src/libs/hooks/customHooks/useAuthScopedKey.ts
export function useAuthScopedKey() {
    const userId = useAppSelector(selectAuthUser)?.userId ?? "anonymous";
    return (...key: unknown[]) => [userId, ...key];
}
```

và `enabled: Boolean(userId)` để không fetch khi chưa có user. Lưu ý khi đó `invalidateQueries({ queryKey: [configQueryKey.X] })` phải đổi thành predicate hoặc thêm userId ở đầu key → phạm vi sửa lớn, làm sau A1–A5.

### A7. Xử lý 401 toàn cục + redirect trang login khi đã đăng nhập

1. `src/libs/fetchFromBackEnd.ts`
   - Xoá đoạn đọc `localStorage.getItem('token')` và header `Authorization` (C8).
   - Khi `res.status === 401` ở phía client (`typeof window !== "undefined"`) và `location.pathname !== "/"`: `window.location.replace("/?returnUrl=" + encodeURIComponent(location.pathname + location.search))`. Tránh trường hợp token hết hạn mà UI vẫn hiện dữ liệu cũ.
2. `src/proxy.ts`
   - Khi `pathname === "/"`: nếu có token hợp lệ → `NextResponse.redirect(new URL("/dashboard", request.url))`; không có/không hợp lệ → `nextWithClientMeta(request)` như hiện tại.
3. Bỏ `redirect`/`router.push` sau login vì đã dùng `window.location.replace` (A5).

### A8. (Khuyến nghị) Redux store theo từng instance, không singleton

Theo hướng dẫn chính thức của Redux cho Next App Router:

```ts
// src/libs/redux/store.ts
export const makeStore = () => configureStore({ reducer: { auth: authReducer, navigation: navigationReducer } });
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
```

```tsx
// src/components/providers/redux-provider.tsx
const storeRef = useRef<AppStore | null>(null);
if (!storeRef.current) storeRef.current = makeStore();
return <Provider store={storeRef.current}>...</Provider>;
```

Tìm mọi chỗ import `store` trực tiếp (`grep -rn "from \"@/libs/redux/store\"" src`) và đổi sang hook `useAppStore`/`useAppDispatch`.

## 5. Checklist test thủ công

- [ ] Đăng nhập A → tạo 1 danh mục "A-only" → đăng xuất → đăng nhập B: sidebar hiện tên B, trang Danh mục **không** có "A-only", dashboard hiện số liệu B ngay lập tức (không nhấp nháy số liệu A).
- [ ] Sau đăng xuất, mở DevTools → Application → Cookies: `access_token` đã mất, `theme` vẫn còn.
- [ ] Sau đăng xuất bấm nút Back của trình duyệt: không thấy được dữ liệu A (nếu bfcache vẫn hiện trang cũ, mọi request API phải trả 401 và tự chuyển về `/`).
- [ ] Mở 2 tab: tab 1 đăng xuất → thao tác ở tab 2 bị 401 và chuyển về trang login.
- [ ] Truy cập `/expenses` khi chưa đăng nhập → về `/?returnUrl=%2Fexpenses` → đăng nhập → quay lại đúng `/expenses`.
- [ ] Truy cập `/?returnUrl=//evil.com` → sau đăng nhập vẫn vào `/dashboard`.
- [ ] Đã đăng nhập mà vào `/` → tự chuyển `/dashboard`.
- [ ] Network tab: request `/api/auth/logout` là `POST`, response có `Cache-Control: no-store`.
- [ ] Test trên Safari iOS (cookie `SameSite=Strict` + `Secure`).

## 6. Cập nhật tài liệu

- Thêm mục "Phiên đăng nhập" vào `.agent/business-logic.md`: đổi tài khoản luôn reset state client bằng hard navigation; logout là POST và chỉ xoá `access_token`.
