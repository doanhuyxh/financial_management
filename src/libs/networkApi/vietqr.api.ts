import type { IVietQrBank } from "@/libs/interfaces/sourcesOfMoneyData";

const VIETQR_BANKS_URL = "https://api.vietqr.io/v2/banks";

/** Danh sách ngân hàng (BIN, tên, logo) từ API công khai của VietQR — gọi thẳng, không qua backend. */
export const getVietQrBanks = async (): Promise<IVietQrBank[]> => {
    const res = await fetch(VIETQR_BANKS_URL);
    if (!res.ok) {
        throw new Error("Không tải được danh sách ngân hàng");
    }
    const json = (await res.json()) as { code?: string; data?: IVietQrBank[] };
    return json.data ?? [];
};
