export const EnvsConfig = {
	MONGODB_URI: process.env.MONGODB_URI,
	DATABASE_NAME: process.env.DATABASE_NAME,
	BACK_END_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
	JWT_SECRET: process.env.JWT_SECRET,
	CLIENT_BASE_URL: process.env.NEXT_PUBLIC_CLIENT_BASE_URL,
	NODE_ENV: process.env.NEXT_PUBLIC_NODE_ENV,

	CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
	CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
	CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

};

export const configQueryKey = {
	CATEGORIES: "categories",
	SOURCES_OF_MONEY: "sources-of-money",
	EXPENSES: "expenses",
	PLANNED_EXPENSES: "planned-expenses",
	INCOMES: "incomes",
	TRANSFERS: "transfers",
	CARD_ROLLOVERS: "card-rollovers",
	ROLLOVER_JOURNEYS: "rollover-journeys",
	DASHBOARD_EXPENSES_SUMMARY: "dashboard-expenses-summary",
	DASHBOARD_CASHFLOW: "dashboard-cashflow",
	VIETQR_BANKS: "vietqr-banks",
	VIETQR_BANK_APPS: "vietqr-bank-apps",
	PUBLIC_SHARE: "public-share",
	SETTINGS: "settings",
	TRANSACTION_AUDITS: "transaction-audits",
	MCP_TOKENS: "mcp-tokens",
	DEPOSIT_RATES: "deposit-rates",
}

export const configSessionKey = {
	/** Quét QR trả tiền: kết quả vừa ghi, để quay lại từ app ngân hàng (trang bị tải lại) vẫn thấy màn copy thông tin */
	SCAN_PAY_LAST_RESULT: "scan-pay-last-result",
}

export const configLocalStorageKey = {
	SOURCES_HIDE_EMPTY: "sources-of-money-hide-empty",
	CREDIT_CARD_COMPARE_SCENARIO: "credit-card-compare-scenario",
	CREDIT_CARD_COMPARE_HIDDEN_CARDS: "credit-card-compare-hidden-cards",
	DEPOSIT_RATE_COMPARE_SCENARIO: "deposit-rate-compare-scenario",
	DASHBOARD_CARD_FEE_HIDDEN_COLUMNS: "dashboard-card-fee-hidden-columns",
	/** Chế độ ẩn số dư (làm mờ số tiền) */
	PRIVACY_MODE: "privacy-mode",
	/** Quét QR trả tiền: nguồn dùng lần trước, app ngân hàng chọn tay theo nguồn, danh mục/nguồn theo người nhận */
	SCAN_PAY_MEMORY: "scan-pay-memory",
}

export const configCookieKey = {
	THEME_KEY: "theme",
	ACCESS_TOKEN_KEY: "access_token",
}

/** JWT and access_token cookie lifetime. */
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const QUERY_STALE_TIME = {
	REFERENCE: 1000 * 60 * 5,
	/** 5 phút (plan 20, tiết kiệm 4G): chỉ giữ trong RAM; thao tác ghi trong app đã invalidate, nút Làm mới cho thay đổi từ ngoài */
	TRANSACTION: 1000 * 60 * 5,
}

