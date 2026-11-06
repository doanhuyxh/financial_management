import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type {
    IDepositRateComparisonData,
    IDepositRateRefreshData,
    IDepositRateTableData,
    IFromDepositRateData,
} from "@/libs/interfaces/depositRatesData";

const BASE_PATH = "/deposit-rates";

export const getDepositRates = async () => {
    return fetcherBackEnd<ApiResponse<IDepositRateComparisonData>>(BASE_PATH, { method: "GET" });
};

export const refreshDepositRates = async () => {
    return fetcherBackEnd<ApiResponse<IDepositRateRefreshData>>(`${BASE_PATH}/refresh`, { method: "POST" });
};

export const createDepositRate = async (body: IFromDepositRateData) => {
    return fetcherBackEnd<ApiResponse<IDepositRateTableData>>(BASE_PATH, { method: "POST", body });
};

export const updateDepositRate = async (id: string, body: IFromDepositRateData) => {
    return fetcherBackEnd<ApiResponse<IDepositRateTableData>>(`${BASE_PATH}/${id}`, { method: "PUT", body });
};

export const deleteDepositRate = async (id: string) => {
    return fetcherBackEnd<ApiResponse<null>>(`${BASE_PATH}/${id}`, { method: "DELETE" });
};
