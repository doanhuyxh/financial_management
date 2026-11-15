import type { IDepositRateTableData, IFromDepositRateData } from "@/libs/interfaces/depositRatesData";
import type { IVietQrBank } from "@/libs/interfaces/sourcesOfMoneyData";
import type { IDepositOption, IDepositRow, IDepositScenario } from "@/components/features/deposit-rate-compare/utils";

export interface IDepositRateCompareContextProps {
    // values
    scenario: IDepositScenario;
    /** Mọi bảng (tự động + tự nhập), kể cả bảng tự động chưa lấy được số */
    tables: IDepositRateTableData[];
    /** Lựa chọn gửi (bảng có số liệu; sản phẩm tự lấy trùng lãi suất của cùng ngân hàng đã gộp) */
    options: IDepositOption[];
    /** `options` xếp theo kỳ hạn đang chọn, lãi cao trước */
    rows: IDepositRow[];
    /** Kỳ hạn có ít nhất một ngân hàng có số */
    availableTerms: number[];
    banks: IVietQrBank[];
    isLoading: boolean;
    isRefreshing: boolean;
    isSaving: boolean;
    /** Dialog nhập tay: null = đóng; `table` null = thêm mới */
    editor: { table: IDepositRateTableData | null } | null;

    // handlers
    getBankLogo: (bankCode: string) => string | undefined;
    handleScenarioChange: (patch: Partial<IDepositScenario>) => void;
    handleRefresh: () => Promise<void>;
    handleOpenCreate: () => void;
    handleOpenEdit: (table: IDepositRateTableData) => void;
    handleCloseEditor: () => void;
    handleSubmit: (body: IFromDepositRateData) => Promise<boolean>;
    handleDelete: (table: IDepositRateTableData) => void;
}
