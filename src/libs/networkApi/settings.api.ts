import { fetcherBackEnd } from "@/libs/fetchFromBackEnd";
import type ApiResponse from "@/libs/interfaces/ApiResponseData";
import type { IFromUserSettingsData, IUserSettingsData } from "@/libs/interfaces/userSettingsData";

export const getSettings = async () => {
    return fetcherBackEnd<ApiResponse<IUserSettingsData>>("/settings", { method: "GET" });
};

export const updateSettings = async (body: IFromUserSettingsData) => {
    return fetcherBackEnd<ApiResponse<IUserSettingsData>>("/settings", { method: "PUT", body });
};
