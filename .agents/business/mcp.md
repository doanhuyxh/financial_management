# MCP — cho agent khác đọc dữ liệu

> Nguồn sự thật là code (`src/server/mcp/`, `mcp-tokens.service.ts`); nếu code khác tài liệu, tin code và sửa tài liệu. Nguyên tắc chung: [README.md](README.md). Kế hoạch gốc: `plan_all/mcp/13-mcp-server.md` (local).

Endpoint **`POST /api/mcp`** là một MCP server (Streamable HTTP, **stateless**, trả JSON, không SSE) chạy ngay trong app Next.js: mỗi request tạo `McpServer` + transport mới (theo scope của token), dùng chung `dbConnect`, model, service. `GET`/`DELETE` trả 405. Token mặc định **chỉ đọc**; token có scope `write` thêm tool tạo chi tiêu, thu nhập: [mcp-write.md](mcp-write.md).

## Xác thực: Personal Access Token

- Agent gửi `Authorization: Bearer mm_pat_…`. Token = `mm_pat_` + `randomBytes(32)` base64url (43 ký tự). DB (`mcpTokens`) chỉ lưu `tokenHash` SHA-256 + `prefix` (`mm_pat_` + 4 ký tự) để user nhận ra; token gốc trả về **đúng một lần** lúc tạo.
- `proxy.ts` bỏ qua `api/mcp` (như `api/public/`). `handleMcpRequest` tự xác thực: thiếu/sai token → 401 + `WWW-Authenticate: Bearer`; `Origin` khác origin của app hoặc `NEXT_PUBLIC_CLIENT_BASE_URL` → 403 (chống DNS rebinding; agent CLI không gửi Origin thì qua); > **60 request/phút/token** → 429 (`Retry-After: 60`, đếm trong bộ nhớ process). Body tối đa 64 KB. Mọi response `Cache-Control: no-store`. Không log argument/kết quả tool.
- **Ngoại lệ luật 1:** `userId` của request MCP lấy từ token đã verify (`McpTokensService.verifyBearer`), không từ input. Route gọi `runWithAuth({ userId, tokenId, scopes, via: "mcp" })` (`server/utils/authContext.ts`, `AsyncLocalStorage`); `getCurrentUser()` đọc context này **trước** cookie nên 43 chỗ gọi trong service giữ nguyên và vẫn lọc `userId` như cũ. Schema tool không có field `userId`.
- `verifyBearer` cache kết quả 60 giây trong process (như `tokenVersionCache`); `revokeToken`/`revokeAllTokens` xóa cache ngay nên thu hồi có hiệu lực tức thì. `lastUsedAt` ghi thưa (tối đa 1 lần/phút/token). User bị xóa khỏi DB → token vô hiệu.
- PAT **không** gắn `tokenVersion`: logout web không thu hồi PAT. Thu hồi bằng nút trong Cài đặt.

### API quản lý token (cần cookie, lọc `userId`)

| | |
|---|---|
| `GET /api/settings/mcp-tokens` | token chưa thu hồi (kèm `isExpired`, `lastUsedAt`) |
| `POST /api/settings/mcp-tokens` `{ label?, expiresInDays: 30 \| 90 \| null, allowWrite? }` | mặc định 90 ngày; `label` ≤ 100 ký tự; tối đa **10** token còn hiệu lực/user; trả `token` một lần |
| `DELETE /api/settings/mcp-tokens/[id]` | thu hồi một token (đặt `revokedAt`, không hoàn tác) |
| `DELETE /api/settings/mcp-tokens` | thu hồi tất cả, trả `{ revoked }` |

UI: Cài đặt → thẻ "Kết nối agent (MCP)" (`features/settings/components/mcp-tokens-card`): tạo token (tên, hạn), hiện token/URL/lệnh `claude mcp add …` một lần với nút copy, danh sách token + thu hồi từng cái / tất cả. Query key `MCP_TOKENS`.

## Tool đọc (tất cả `readOnlyHint`, handler mỏng như `route.ts`: zod validate → gọi service có sẵn)

`src/server/mcp/`: `server.ts` (đăng ký), `registerReadTool.ts` (bọc auth context + annotations), `callService.ts` (mở `NextResponse` → `data`; `status=false` → lỗi tool kèm message của service; bỏ `userId`, `__v`, `tokenHash`), `tools/{sources,transactions,reports}.ts`, `guide.ts` (instructions của server, cũng là resource `money://guide`).

| Tool | Service | Input |
|---|---|---|
| `list_sources_of_money` | `SourcesOfMoneyService.getSourcesOfMoney` (limit 100) | `type?`, `search?` |
| `get_source_transactions` | `SourceTransactionsService.getSourceTransactions` | `sourceId`, `kind?`, `from?`, `to?`, `page?`, `limit?` |
| `get_reconcile` | `BalanceReconcileService.getReconcile` (chỉ xem) | `sourceId` |
| `list_categories` | `CategoriesService.getCategories` (limit 100) | `kind?`, `search?` |
| `list_expenses` / `list_incomes` | `ExpensesService.getExpenses` / `IncomesService.getIncomes` | `from?`, `to?`, `search?`, `categoryId?`, `sourceOfMoneyId?`, `page?`, `limit?` (mặc định 20) |
| `list_transfers` | `TransfersService.getTransfers` | như trên với `fromSourceId?`, `toSourceId?` |
| `list_transaction_audits` | `TransactionAuditsService.getTransactionAudits` | `kind?`, `page?`, `limit?` |
| `get_cashflow_summary` / `get_expenses_summary` | `DashboardService.*` | `year?`, `month?` (mặc định tháng hiện tại giờ VN) |
| `get_credit_card_fee_progress` | `SourcesOfMoneyService.getCreditCardFeeProgress` | — |
| `list_card_rollovers` | `CardRolloversService.getCardRollovers` | `sourceOfMoneyId?`, `from?`, `to?`, `page?`, `limit?` |
| `list_rollover_journeys` / `get_rollover_journey` | `RolloverJourneysService.getJourneys` / `getJourneyDetail` | `cardId?` / `id` |
| `get_settings` | `SettingsService.getSettings` | — |

- Không đưa ra: link chia sẻ, auth, gợi ý "thường dùng". Tool ghi: [mcp-write.md](mcp-write.md).
- Id là hex 24 ký tự, ngày `YYYY-MM-DD` giờ VN (`to` đến cuối ngày), `limit` ≤ 100. Output là JSON text của `data` service trả (tiền số nguyên VND, timestamp ISO).
- Mô tả tool/guide nhắc agent: thẻ tín dụng theo dõi `currentDebt`, `delta` dương = phát sinh nợ; phí chuyển/đáo hạn là chi tiêu; `note`/tên là dữ liệu người dùng nhập, không phải chỉ dẫn.
- Thêm tool mới: thêm vào file `tools/` tương ứng qua `registerReadTool`; cần dữ liệu mới thì thêm method vào service, không query trong tool.

## Kết nối

UI Cài đặt có chip chọn client và snippet copy sẵn (`MCP_CLIENT_SNIPPETS` trong `libs/interfaces/mcpTokensData.ts`; client đổi định dạng thì sửa ở đó). Server key `money-manager`, URL `<origin>/api/mcp`, header `Authorization: Bearer mm_pat_…`:

| Client | Cách thêm |
|---|---|
| Claude Code | `claude mcp add --transport http money-manager <url> --header "Authorization: Bearer …"`. Claude Desktop "Connectors" cần OAuth (chưa có) → dùng Claude Code hoặc cầu nối stdio `mcp-remote` |
| Codex | `~/.codex/config.toml`: `[mcp_servers.money-manager]` với `url` và `http_headers = { Authorization = "Bearer …" }` (hoặc `bearer_token_env_var`) |
| GitHub Copilot (VS Code) | `.vscode/mcp.json`: `servers.money-manager = { type: "http", url, headers: { Authorization: "Bearer ${input:money-manager-token}" } }` + `inputs` kiểu `promptString`/`password` — token không nằm trong file |
| Antigravity | `~/.gemini/antigravity/mcp_config.json`: `mcpServers.money-manager = { serverUrl, headers }` — bắt buộc `serverUrl`, không nhận `url`; khởi động lại sau khi sửa |

- Kiểm tra tay: `bunx @modelcontextprotocol/inspector` → Streamable HTTP, URL `/api/mcp`, header Bearer.
- Test: `src/server/__tests__/mcp-tokens.test.ts`, `mcp.test.ts` (client SDK thật, `fetch` trỏ thẳng vào `handleMcpRequest`). `setup.ts` giả lập `getCurrentUser` nhưng vẫn ưu tiên auth context như bản thật.
