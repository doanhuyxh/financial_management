<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Money Manager — Agent Hub

App quản lý tài chính cá nhân (tiếng Việt, VND): Next.js 16 + React 19 + MongoDB/Mongoose, frontend và API chung một app. Package manager: **bun**.

File này chỉ là bộ định tuyến. Tài liệu thật nằm trong `.agent/` — **đọc file tương ứng trước khi làm việc**.

| Khi bạn cần... | Đọc |
|---|---|
| Chạy, build, lint, env, script, deploy | [.agent/commands.md](.agent/commands.md) |
| Viết/sửa component, hook, đặt tên, cấu trúc feature | [.agent/conventions.md](.agent/conventions.md) |
| Hiểu cây thư mục, ranh giới client/server, luồng dữ liệu, cache React Query | [.agent/architecture.md](.agent/architecture.md) |
| Sửa model, schema, query ghi số dư, viết migration | [.agent/database.md](.agent/database.md) |
| Sửa services, số dư, chuyển tiền, danh mục, dashboard, auth | [.agent/business-logic.md](.agent/business-logic.md) |

## Luật không được vi phạm

1. Mọi query lọc theo `userId` từ JWT; không lấy `userId` từ body.
2. Không dùng Mongo transaction. Cập nhật số dư bằng `$inc` với điều kiện trong filter, có rollback thủ công — giữ nguyên thứ tự rollback khi sửa.
3. Business logic chỉ nằm trong `src/server/services/`; `route.ts` chỉ parse và gọi service.
4. 1 component = 1 folder `kebab-case` có `index.tsx`. Ưu tiên antd / shadcn / lucide-react.
5. Kiểm tra `src/libs/hooks/`, `src/libs/utils/` và `hooks/` của feature trước khi tạo hàm/hook mới.
6. Xong việc: `bun run lint` và `bun run build` không lỗi.

## Giữ tài liệu đúng

- `.agent/` là nguồn sự thật duy nhất cho agent. Không tạo tài liệu song song ở chỗ khác.
- Đổi business rule → cập nhật `.agent/business-logic.md`. Đổi schema → `.agent/database.md`. Thêm lệnh/script/env → `.agent/commands.md`. Đổi cấu trúc thư mục hoặc luồng dữ liệu → `.agent/architecture.md`.
- Nếu tài liệu khác code, tin code và sửa tài liệu trong cùng commit.
