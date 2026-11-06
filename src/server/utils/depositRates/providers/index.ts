import { acbProvider } from "./acb";
import { agribankProvider } from "./agribank";
import type { IDepositRateProvider } from "./types";
import { vietcombankProvider } from "./vietcombank";
import { vietinbankProvider } from "./vietinbank";
import { vpbankProvider } from "./vpbank";

/**
 * Ngân hàng có nguồn tự động. Thêm ngân hàng: viết `parse(html)` thuần + test với HTML mẫu,
 * rồi thêm vào đây. Chỉ dùng trang/JSON công khai đọc được trực tiếp; không vượt cơ chế chống thu thập.
 */
export const DEPOSIT_RATE_PROVIDERS: IDepositRateProvider[] = [
    vietcombankProvider,
    vietinbankProvider,
    agribankProvider,
    acbProvider,
    vpbankProvider,
];

export type { IDepositRateProvider, IParsedDepositTable } from "./types";
