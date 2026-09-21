import type { Dayjs } from "dayjs";
import type { IDashboardExpensesSummary } from "@/libs/interfaces/dashboardData";

export interface IDashboardContextProps {
    monthValue: Dayjs;
    summary?: IDashboardExpensesSummary;
    isLoading: boolean;
    handleChangeMonth: (value: Dayjs | null) => void;
}
