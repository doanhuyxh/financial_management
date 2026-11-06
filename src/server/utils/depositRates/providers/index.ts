import { acbProvider } from "./acb";
import type { IDepositRateProvider } from "./types";
import { vietcombankProvider } from "./vietcombank";

/**
 * Ngân hàng có nguồn tự động. Thêm ngân hàng: viết `parse(html)` thuần + test với HTML mẫu,
 * rồi thêm vào đây. Chỉ dùng trang/JSON công khai đọc được trực tiếp; không vượt cơ chế chống thu thập.
 */
export const DEPOSIT_RATE_PROVIDERS: IDepositRateProvider[] = [vietcombankProvider, acbProvider];

export type { IDepositRateProvider, IParsedDepositTable } from "./types";
