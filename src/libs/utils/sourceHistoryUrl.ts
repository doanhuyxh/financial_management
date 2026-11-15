import { MENU_KEY } from "@/libs/constants/menuKey";

/** URL trang lịch sử giao dịch của một nguồn tiền: `/source-history/<id>`. */
export function buildSourceHistoryUrl(sourceId: string) {
    return `${MENU_KEY.SOURCE_HISTORY}/${sourceId}`;
}
