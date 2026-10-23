# 04 — Dashboard: hiển thị "Tài sản"

Ngày lập: 2026-10-21 · Nhánh gốc: `main` (commit `598a909`)
**Trạng thái:** đã duyệt phương án C (2026-10-21) — tiền mặt gồm ngân hàng + ví + tiền mặt + khác; hiện tài sản ròng; ẩn nguồn số dư 0. Đã triển khai.

Mockup UI (3 phương án, mở bằng trình duyệt): [04-dashboard-assets-mockup.html](04-dashboard-assets-mockup.html)

## 1. Yêu cầu

Trên `/dashboard`, thêm phần **Tài sản**, gồm:

1. **Tiền mặt (tiền đang có)**: tổng số dư các nguồn tiền thường.
2. **Tín dụng có thể dùng**: tổng hạn mức còn lại của các thẻ tín dụng (số tiền còn có thể vay/quẹt).
3. **Tổng tài sản** = (1) + (2).

## 2. Định nghĩa số liệu (đề xuất, cần duyệt)

| Chỉ số | Công thức | Nguồn dữ liệu |
|---|---|---|
| Tiền mặt | `Σ balance` của nguồn có `type ∈ {BANK, CASH, E_WALLET, OTHER}` | `sourcesOfMoney.balance` |
| Tín dụng khả dụng | `Σ max(0, creditLimit − currentDebt)` của nguồn `CREDIT_CARD` (tính **mọi thẻ**, kể cả thẻ dư nợ = 0) | `creditDetails` |
| Tổng hạn mức | `Σ creditLimit` của thẻ (dùng cho thanh % đã dùng) | `creditDetails` |
| **Tổng tài sản** | Tiền mặt + Tín dụng khả dụng | tính phía client |
| Tài sản ròng *(tuỳ chọn)* | Tiền mặt − Tổng dư nợ thẻ | tính phía client |

Ghi chú:
- "Tiền mặt" ở đây hiểu là **mọi tiền đang sở hữu** (ngân hàng + ví điện tử + tiền mặt + khác), không chỉ loại `CASH`. Trong breakdown vẫn tách theo từng loại/nguồn.
- Tín dụng khả dụng là **tiền đi vay**, không phải tiền sở hữu → UI phải phân biệt màu/nhãn rõ ràng để không hiểu nhầm là tài sản ròng.
- Giống "Tổng dư nợ thẻ", đây là **số liệu hiện tại**, không đổi khi chọn tháng khác.

## 3. Thiết kế kỹ thuật

Không cần API mới: `GET /api/sources-of-money` đã trả `balance` và `creditDetails` của mọi nguồn.

### 3.1 Context — `features/dashboard/context/index.tsx`

- Đổi query nguồn tiền đang chỉ lấy `type: CREDIT_CARD` thành **lấy tất cả** (`{ page: 1, limit: 100 }`, không lọc type). Hook giữ nguyên `useGetSourcesOfMoney` (đã có, không tạo hook mới).
- `creditCardDebts` lọc thẻ trong mảng đó (hàm `buildCreditCardDebts` đã tự lọc `currentDebt > 0`; bổ sung điều kiện `type === CREDIT_CARD`).
- Thêm `assets = useMemo(() => buildAssetsSummary(items), [items])`.
- Đổi tên cờ loading `isCreditCardsLoading` → `isSourcesLoading` (dùng chung cho dư nợ + tài sản).

### 3.2 Utils — `features/dashboard/utils.ts`

```ts
export interface IAssetSourceItem {
    _id: string;
    name: string;
    type: SourcesOfMoneyType;
    amount: number;          // balance (nguồn thường) hoặc hạn mức còn lại (thẻ)
    creditLimit?: number;    // chỉ với thẻ
}

export interface IAssetsSummary {
    cashTotal: number;
    availableCreditTotal: number;
    creditLimitTotal: number;
    totalAssets: number;     // cashTotal + availableCreditTotal
    netWorth: number;        // cashTotal − tổng dư nợ
    cashSources: IAssetSourceItem[];    // sort amount desc, bỏ nguồn = 0
    creditSources: IAssetSourceItem[];  // sort amount desc
    cashByType: { type: SourcesOfMoneyType; total: number }[];
}

export function buildAssetsSummary(sources: ISourcesOfMoneyData[]): IAssetsSummary;
```

### 3.3 Type — `features/dashboard/context/type.ts`

Thêm `assets: IAssetsSummary` vào `IDashboardContextProps`.

### 3.4 Component (tuỳ phương án được chọn)

| Phương án | File mới / sửa |
|---|---|
| A — Gắn vào header | Sửa `components/header/index.tsx`: thêm khối thứ 3 "Tổng tài sản" + 2 `MiniStat` (Tiền mặt, Tín dụng khả dụng). Không thêm component mới. |
| B — Card tài sản riêng | Tạo `components/assets-overview/index.tsx` (antd `Card` + thanh tỉ lệ + 2 cột danh sách nguồn). Đặt giữa `DashboardHeader` và `CreditCardDebts` trong `features/dashboard/index.tsx`. |
| C — KPI tiles + chi tiết | Tạo `components/assets-overview/index.tsx` (lưới 4 ô KPI) và `components/assets-overview/components/assets-breakdown/index.tsx` (antd `Collapse` + `Table`/`MobileRecordList` theo nguồn). Đặt cùng vị trí như B. |

Quy ước chung: icon `lucide-react` (`Landmark`, `Banknote`, `CreditCard`, `PiggyBank`), tiền dùng `formatMoney`, mobile dùng `useIsMobile` / `MobileRecordList` có sẵn, màu theo token sẵn có (`primary`, `text-red-500`, xanh lá cho tiền mặt, xanh dương cho tín dụng).

### 3.5 Cache

Không cần đổi invalidate: expense / income / transfer đều đã invalidate `SOURCES_OF_MONEY`, nên tài sản tự cập nhật sau mỗi giao dịch.

### 3.6 Tài liệu

Cập nhật `.agent/business-logic.md`:
- Mục 6 (Dashboard): thêm định nghĩa Tiền mặt / Tín dụng khả dụng / Tổng tài sản (và Tài sản ròng nếu duyệt).
- Mục 8 (bảng trang): bổ sung "phần Tài sản" vào mô tả `/dashboard`.

## 4. Các bước thực hiện

1. `utils.ts`: thêm `buildAssetsSummary` + type; sửa `buildCreditCardDebts` lọc theo type.
2. `context`: đổi query lấy toàn bộ nguồn tiền, expose `assets`, đổi tên cờ loading.
3. Component theo phương án được chọn (A / B / C).
4. Responsive: kiểm tra 360px / 768px / ≥1280px.
5. Cập nhật `.agent/business-logic.md`.
6. `bun run lint` + `bun run build`.

Ước lượng: A ~0.5 ngày · B ~1 ngày · C ~1.5 ngày.

## 5. Checklist test thủ công

- [ ] Tổng tiền mặt = tổng số dư hiển thị ở trang Nguồn tiền (trừ thẻ).
- [ ] Tín dụng khả dụng = Σ "Còn lại" của mọi thẻ (kể cả thẻ không nợ — thẻ này không hiện trong bảng dư nợ nhưng **có** trong tài sản).
- [ ] Thêm chi tiêu bằng thẻ → tín dụng khả dụng giảm đúng số tiền, tiền mặt không đổi.
- [ ] Thêm chi tiêu bằng nguồn thường → tiền mặt giảm.
- [ ] Trả nợ thẻ (chuyển Thường → Thẻ) → tiền mặt giảm, tín dụng khả dụng tăng, tổng tài sản không đổi.
- [ ] Rút tiền từ thẻ có phí → tổng tài sản giảm đúng bằng phí.
- [ ] Đổi tháng ở DatePicker → số tài sản không đổi.
- [ ] User không có nguồn tiền nào → hiện 0 đ, không lỗi.
- [ ] Bảng dư nợ thẻ vẫn hiển thị như cũ.

## 6. Câu hỏi cần anh/chị chốt

1. **Chọn phương án UI**: A, B hay C (xem mockup)?
2. "Tiền mặt" = toàn bộ nguồn thường (ngân hàng + ví + tiền mặt + khác) — đúng ý chưa, hay chỉ loại `CASH`?
3. Có hiển thị thêm **Tài sản ròng** (tiền mặt − dư nợ) không? Mockup B, C đang có; A không có.
4. Nguồn có số dư 0 có hiện trong danh sách chi tiết không? (Đề xuất: ẩn.)
