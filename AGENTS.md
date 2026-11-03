<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Money Manager — Agent Hub

App quản lý tài chính cá nhân (tiếng Việt, VND): Next.js 16 + React 19 + MongoDB/Mongoose, frontend và API chung một app. Package manager: **bun**.

File này chỉ là bộ định tuyến. Tài liệu thật nằm trong `.agents/` — **đọc file tương ứng trước khi làm việc**.

| Khi bạn cần... | Đọc |
|---|---|
| Chạy, build, lint, env, script, deploy | [.agents/commands.md](.agents/commands.md) |
| Viết/sửa component, hook, đặt tên, cấu trúc feature | [.agents/conventions.md](.agents/conventions.md) |
| Hiểu cây thư mục, ranh giới client/server, luồng dữ liệu, cache React Query | [.agents/architecture.md](.agents/architecture.md) |
| Thêm/sửa trang, URL, query param, menu, điều hướng mobile | [.agents/pages.md](.agents/pages.md) |
| Sửa model, schema, query ghi số dư, viết migration | [.agents/database.md](.agents/database.md) |
| Nguyên tắc nghiệp vụ chung, nợ kỹ thuật | [.agents/business/README.md](.agents/business/README.md) |
| Sửa expense / income / transfer, cập nhật số dư | [.agents/business/balance-rules.md](.agents/business/balance-rules.md) |
| Sửa nguồn tiền (CRUD, điều chỉnh số dư, VietQR) | [.agents/business/sources-of-money.md](.agents/business/sources-of-money.md) |
| Sửa lịch sử giao dịch nguồn tiền, link chia sẻ public | [.agents/business/source-history.md](.agents/business/source-history.md) |
| Sửa phí thẻ, kỳ sao kê, lãi | [.agents/business/credit-card-fees.md](.agents/business/credit-card-fees.md) |
| Sửa danh mục | [.agents/business/categories.md](.agents/business/categories.md) |
| Sửa dashboard | [.agents/business/dashboard.md](.agents/business/dashboard.md) |
| Sửa bảng phí thẻ trên dashboard | [.agents/business/dashboard-card-fees.md](.agents/business/dashboard-card-fees.md) |
| Sửa trang so sánh thẻ | [.agents/business/card-compare.md](.agents/business/card-compare.md) |
| Sửa đăng nhập, JWT, proxy | [.agents/business/auth.md](.agents/business/auth.md) |
| Sửa gợi ý "thường dùng" trong form | [.agents/business/suggestions.md](.agents/business/suggestions.md) |

## Luật không được vi phạm

1. Mọi query lọc theo `userId` từ JWT; không lấy `userId` từ body. Ngoại lệ duy nhất: API `/api/public/*` lấy `userId` từ ShareLink tìm theo token (xem `source-history.md`).
2. Không dùng Mongo transaction. Cập nhật số dư bằng `$inc` với điều kiện trong filter, có rollback thủ công — giữ nguyên thứ tự rollback khi sửa.
3. Business logic chỉ nằm trong `src/server/services/`; `route.ts` chỉ parse và gọi service.
4. 1 component = 1 folder `kebab-case` có `index.tsx`. Ưu tiên antd / shadcn / lucide-react.
5. Kiểm tra `src/libs/hooks/`, `src/libs/utils/` và `hooks/` của feature trước khi tạo hàm/hook mới.
6. Xong việc: `bun run lint` và `bun run build` không lỗi.
7. Sản phẩm thiết kế giao diện (mockup, prototype, banner, slide, design system, kế hoạch UI — kể cả khi dùng skill `design`, `ui-ux-pro-max`, `ui-styling`, `design-system`, `banner-design`, `brand`, `slides`) **chỉ lưu local trong `plan_all/`**: đặt tên `NN-ten-ngan.md` / `NN-ten-ngan-mockup.html`, thêm 1 dòng vào bảng trong `plan_all/README.md`. **Không đẩy lên đám mây**: không dùng Artifact, Claude Docs, Figma, Cloudinary, Notion, Google Drive… trừ khi user yêu cầu rõ trong tin nhắn. Asset ảnh do skill tạo cũng lưu trong `plan_all/` (thư mục con theo tên file kế hoạch), không upload.

## Giữ tài liệu đúng

- `.agents/` là nguồn sự thật duy nhất cho agent. Không tạo tài liệu song song ở chỗ khác.
- Đổi business rule → cập nhật file tương ứng trong `.agents/business/`. Đổi schema → `.agents/database.md`. Thêm lệnh/script/env → `.agents/commands.md`. Đổi cấu trúc thư mục hoặc luồng dữ liệu → `.agents/architecture.md`.
- Mỗi file trong `.agents/` giữ ≤ ~8 KB, chỉ đọc file cần cho task. Vượt thì tách theo domain con và thêm dòng vào bảng trên.
- Nếu tài liệu khác code, tin code và sửa tài liệu trong cùng commit.
