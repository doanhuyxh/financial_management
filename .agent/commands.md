# Commands — build, lint, chạy script, deploy

Package manager là **bun** (không dùng npm/yarn/pnpm, không commit `package-lock.json`).

## Hằng ngày

| Việc | Lệnh | Ghi chú |
|---|---|---|
| Cài dependency | `bun i` | |
| Dev server | `bun dev` | http://localhost:3000 |
| Build production | `bun run build` | Chạy cả type-check của Next |
| Lint | `bun run lint` | ESLint 9 flat config (`eslint.config.mjs`) |
| Chạy production local | `bun run start` | Cần build trước |

**Chưa có test tự động.** Định nghĩa "xong" cho mọi thay đổi: `bun run lint` và `bun run build` không lỗi, rồi tự kiểm tra trên UI (`bun dev`).

## Biến môi trường (`.env`, không commit)

| Biến | Dùng cho |
|---|---|
| `MONGODB_URI` | Kết nối Mongo (bắt buộc, thiếu thì `connectDb.ts` throw) |
| `DATABASE_NAME` | Tên database |
| `JWT_SECRET` | Ký/verify JWT (HS256) |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL API (ví dụ `.../api`), dùng trong `fetcherBackEnd` |
| `NEXT_PUBLIC_CLIENT_BASE_URL` | Base URL client |
| `NEXT_DIST_DIR` | Thư mục output của build (mặc định `.next`). Chỉ `deploy.sh` dùng để build vào `.next-build` |

Toàn bộ env được đọc tập trung qua `EnvsConfig` trong `src/libs/constants/configKey.ts`. Không đọc `process.env` rải rác.

## Script một lần (`scripts/`)

Chạy bằng `bun scripts/<file>.ts` từ thư mục gốc (alias `@/` hoạt động). Quy ước viết script: xem [database.md](database.md#migration).

| Script | Việc |
|---|---|
| `migrate-income-category-kind.ts` | Chuyển danh mục tên "Thu nhập" sang `kind = INCOME`. Mặc định chạy thử; thêm `--apply` để ghi DB |

## Deploy

- Push lên `main` → GitHub Actions (`.github/workflows/deploy.yml`) SSH vào server và chạy `scripts/deploy.sh`.
- `deploy.sh` (ở `/home/rocky/financial_management`): `git pull --rebase` → `bun install --frozen-lockfile` → build vào `.next-build` (`NEXT_DIST_DIR`) **trong lúc bản cũ vẫn chạy** → đổi `.next` → `.next-prev`, `.next-build` → `.next` → `pm2 delete` + `pm2 start` → health check `GET /` (tối đa 60 giây). Health check lỗi thì tự rollback về `.next-prev`. Build lỗi thì bản cũ vẫn chạy, không bị gián đoạn. Báo kết quả qua webhook Zalo.
- `bun install --frozen-lockfile`: đổi dependency thì phải commit cả `bun.lock`, không thì deploy fail (bản cũ vẫn chạy).
- PM2 (`ecosystem.config.js`): app `finance-management-web`, chế độ fork 1 instance, port **3004**, `TZ=Asia/Ho_Chi_Minh`, tự restart khi vượt 1G RAM, restart giãn dần khi crash liên tục.
- Production chỉ giữ `console.error`/`console.warn` (`removeConsole`) và không log từng request.
- Nhánh làm việc là `developer`; chỉ merge vào `main` khi muốn deploy.
