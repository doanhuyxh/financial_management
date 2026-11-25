import type { ICategoriesData } from "@/libs/interfaces/categoriesData";
import type {
    ISourcesOfMoneyData,
    IVietQrBank,
    IVietQrBankApp,
} from "@/libs/interfaces/sourcesOfMoneyData";
import type { BankAppPlatform } from "@/libs/networkApi/vietqr.api";
import type { IParsedVietQr } from "@/libs/utils/vietQr";

export type ScanPayStep = "scan" | "confirm" | "done";

export interface IScanPayFormValues {
    amount: string | number | null;
    categoryId: string;
    sourceOfMoneyId: string;
    /** App ngân hàng sẽ mở; rỗng = chỉ ghi chi tiêu */
    appId: string;
    note: string;
}

export interface IScanPayResult {
    amount: number;
    note: string;
    app?: IVietQrBankApp;
    deeplink?: string;
    /** App điền sẵn người nhận/số tiền/nội dung */
    autofill: boolean;
    /** Đã copy số TK vào clipboard (app không tự điền) */
    accountCopied: boolean;
}

export interface IScanPayContextProps {
    step: ScanPayStep;
    qr: IParsedVietQr | null;
    /** Ngân hàng người nhận (tra theo BIN trong QR) */
    receiverBank?: IVietQrBank;
    /** null = máy tính: không mở được app ngân hàng */
    platform: BankAppPlatform | null;
    bankApps: IVietQrBankApp[];
    bankAppsLoading: boolean;
    /** Nguồn chuyển khoản được (ngân hàng, ví, khác) */
    sources: ISourcesOfMoneyData[];
    categories: ICategoriesData[];
    suggestedCategoryIds?: string[];
    suggestedSourceIds?: string[];
    isDataLoading: boolean;
    isSubmitting: boolean;
    result: IScanPayResult | null;
    /** Giá trị điền sẵn cho form xác nhận (nhớ theo người nhận, nguồn lần trước) */
    getDefaultValues: () => IScanPayFormValues;
    /** App mặc định của nguồn: chọn tay lần trước, hoặc ghép theo ngân hàng của số TK nguồn */
    getAppForSource: (sourceId: string) => IVietQrBankApp | undefined;
    /** App có điền sẵn được cho mã QR đang xử lý không */
    isAutofillApp: (app?: IVietQrBankApp) => boolean;
    /** Nhận chuỗi vừa quét; trả lỗi nếu không phải VietQR */
    handleDetected: (text: string) => string | null;
    /**
     * Gọi ngay trong sự kiện bấm nút (trước khi gửi API): app không tự điền thì copy số TK.
     * Safari chỉ cho ghi clipboard trong lúc người dùng vừa bấm.
     */
    prepareClipboard: (appId: string) => void;
    submitPayment: (values: IScanPayFormValues) => Promise<void>;
    openBankApp: () => void;
    reset: () => void;
}
