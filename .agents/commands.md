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
| `NEXT_DIST_DIR` | Thư mục output của build (mặc định `.next`). Hiện không script nào dùng |

Toàn bộ env được đọc tập trung qua `EnvsConfig` trong `src/libs/constants/configKey.ts`. Không đọc `process.env` rải rác.

## Script một lần (`scripts/`)

Chạy bằng `bun scripts/<file>.ts` từ thư mục gốc (alias `@/` hoạt động). Quy ước viết script: xem [database.md](database.md#migration).

| Script | Việc |
|---|---|
| `migrate-income-category-kind.ts` | Chuyển danh mục tên "Thu nhập" sang `kind = INCOME`. Mặc định chạy thử; thêm `--apply` để ghi DB |
| `backfill-category-icons.ts` | Gán emoji cho danh mục chưa có icon, đoán theo từ khóa trong tên (bỏ dấu). Chỉ đụng danh mục chưa lưu trữ và chưa có icon; không đổi màu. Mặc định chạy thử; `--apply` để ghi DB |

## Deploy

- Push lên `main` → GitHub Actions (`.github/workflows/deploy.yml`) SSH vào server và chạy `scripts/deploy.sh`.
- `deploy.sh` (ở `/home/rocky/financial_management`): `git pull --rebase` → `bun install --frozen-lockfile` → đổi `.next` → `.next-prev` (build sạch, tránh types của route đã xoá làm type check lỗi) → `bun run build` → `pm2 delete` + `pm2 start` → health check `GET /` (tối đa 60 giây). Build hoặc health check lỗi thì tự rollback về `.next-prev`. Trong lúc build, bản cũ đang chạy mất file `.next` nên web có thể lỗi tạm thời. Báo kết quả qua webhook Zalo.
- `bun install --frozen-lockfile`: đổi dependency thì phải commit cả `bun.lock`, không thì deploy fail (bản cũ vẫn chạy).
- PM2 (`ecosystem.config.js`): app `finance-management-web`, chế độ fork 1 instance, port **3004**, `TZ=Asia/Ho_Chi_Minh`, tự restart khi vượt 1G RAM, restart giãn dần khi crash liên tục.
- Production chỉ giữ `console.error`/`console.warn` (`removeConsole`) và không log từng request.
- Nhánh làm việc là `developer`; chỉ merge vào `main` khi muốn deploy.

## shadcn + Animate UI

CLI `shadcn` nằm trong devDependencies (chạy local, cần Node ≥ 22.12; bun không có `node`, dùng nvm: `export PATH="$HOME/.nvm/versions/node/v26.1.0/bin:$PATH"`).

1. Thêm component: `yes n | ./node_modules/.bin/shadcn add --yes <tên>` (`yes n` trả lời "không ghi đè" cho component đã có, nếu không CLI treo ở prompt).
2. CLI resolve sai alias utils: file mới có thể `import { cn } from "cn"` và tự thêm package `cn` → sửa thành `@/libs/shadcn/utils` và `bun remove cn`. Không dùng `next-themes` (theme đọc từ class `dark`, xem `sonner.tsx`).
3. Nối hiệu ứng: `./node_modules/.bin/animate-ui animate <tên>` (hoặc `animate all`; thêm `--dry-run` để xem trước). Lệnh đổi import `radix-ui` → `@animate-ui/react/primitives/radix-ui` và bỏ class animation CSS. `animate-ui audit` liệt kê trạng thái.
