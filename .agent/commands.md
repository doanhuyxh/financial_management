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

Toàn bộ env được đọc tập trung qua `EnvsConfig` trong `src/libs/constants/configKey.ts`. Không đọc `process.env` rải rác.

## Script một lần (`scripts/`)

Chạy bằng `bun scripts/<file>.ts` từ thư mục gốc (alias `@/` hoạt động). Quy ước viết script: xem [database.md](database.md#migration).

| Script | Việc |
|---|---|
| `migrate-income-category-kind.ts` | Chuyển danh mục tên "Thu nhập" sang `kind = INCOME`. Mặc định chạy thử; thêm `--apply` để ghi DB |

## Deploy

- Push lên `main` → GitHub Actions (`.github/workflows/deploy.yml`) SSH vào server và chạy `scripts/deploy.sh`.
- `deploy.sh` (ở `/home/rocky/financial_management`): `pm2 stop` → `git pull --rebase` → xóa `node_modules`, `bun i` → xóa `.next`, `bun run build` → `pm2 restart ecosystem.config.js`. Báo kết quả qua webhook Zalo.
- PM2 (`ecosystem.config.js`): app `finance-management-web`, port **3004**, `TZ=Asia/Ho_Chi_Minh`.
- Nhánh làm việc là `developer`; chỉ merge vào `main` khi muốn deploy.
