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
    /** Trang công khai của ngân hàng (hiện link cho user; cũng là trang được tải nếu không có `fetchUrl`) */
    sourceUrl: string;
    /** Tải từ URL khác thay vì `sourceUrl`, VD JSON công khai mà chính trang đó gọi (VPBank). */
    fetchUrl?: string;
    /**
     * Trang nạp bảng bằng JS từ một URL khác: đọc URL đó từ HTML của `sourceUrl`,
     * service tải tiếp và đưa HTML mảnh vào `parse`.
     */
    fragmentUrl?: (pageHtml: string) => string;
    /** Các sản phẩm provider này trả về (để hiện dòng "chưa lấy được" khi lỗi lần đầu) */
    products: { productKey: string; product: string }[];
    parse: (html: string) => IParsedDepositTable[];
}
