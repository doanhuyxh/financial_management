/** Hạn dùng chọn được khi tạo link chia sẻ (số ngày, null = không hạn). */
export const SHARE_LINK_EXPIRY_OPTIONS = [
    { value: 7, label: "7 ngày" },
    { value: 30, label: "30 ngày" },
    { value: null, label: "Không hạn" },
] as const;

export const DEFAULT_SHARE_LINK_EXPIRY_DAYS = 30;

export type ShareLinkExpiryDays = (typeof SHARE_LINK_EXPIRY_OPTIONS)[number]["value"];

export interface IShareLinkData {
    _id: string;
    sourceOfMoneyId: string;
    label?: string;
    /** YYYY-MM-DD: giới hạn khoảng ngày người xem được thấy */
    from?: string | null;
    to?: string | null;
    expiresAt?: string | null;
    /** Server tính lúc trả về. */
    isExpired: boolean;
    viewCount: number;
    lastViewedAt?: string | null;
    createdAt: string;
}

/** Token chỉ trả về đúng một lần, ngay khi tạo. */
export interface ICreatedShareLinkData extends IShareLinkData {
    token: string;
}

export interface IFromShareLinkData {
    label?: string;
    expiresInDays: ShareLinkExpiryDays;
    from?: string | null;
    to?: string | null;
}

export const SHARE_PATH = "/share";

export function buildShareUrl(origin: string, token: string) {
    return `${origin}${SHARE_PATH}/${token}`;
}
