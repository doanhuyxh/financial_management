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
	INCOMES: "incomes",
	TRANSFERS: "transfers",
	DASHBOARD_EXPENSES_SUMMARY: "dashboard-expenses-summary",
	DASHBOARD_CASHFLOW: "dashboard-cashflow",
	BUDGETS: "budgets",
}

export const configSessionKey = {

}

export const configLocalStorageKey = {
	
}

export const configCookieKey = {
	THEME_KEY: "theme",
	ACCESS_TOKEN_KEY: "access_token",
}

/** JWT and access_token cookie lifetime. */
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const QUERY_STALE_TIME = {
	REFERENCE: 1000 * 60 * 5,
	TRANSACTION: 1000 * 30,
}

