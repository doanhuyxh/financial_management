import type { IDepositRateTier } from "@/libs/interfaces/depositRatesData";

/** Một bảng lãi suất đọc được từ trang ngân hàng. */
export interface IParsedDepositTable {
    /** Khóa sản phẩm trong provider, VD "online" → snapshot key `vcb:online` */
    productKey: string;
    product: string;
    tiers: IDepositRateTier[];
}

export interface IDepositRateProvider {
    id: string;
    /** Mã VietQR */
    bankCode: string;
    bankName: string;
    sourceUrl: string;
    /** Các sản phẩm provider này trả về (để hiện dòng "chưa lấy được" khi lỗi lần đầu) */
    products: { productKey: string; product: string }[];
    parse: (html: string) => IParsedDepositTable[];
}
