/**
 * Hex cho metadata tĩnh không đọc được CSS (thẻ meta `theme-color`, manifest PWA).
 * Bằng `--card` (màu header) trong src/app/globals.css; test `theme-tokens.test.ts` chặn khi lệch.
 */
export const THEME_SURFACE = {
    light: "#ffffff",
    dark: "#131b2c",
} as const;

/**
 * Màu của ảnh khởi động iOS (luôn nền tối, như splash PWA trong manifest): bằng `--background` và
 * `--primary` của chế độ tối để chuyển sang splash của app liền mạch.
 */
export const BOOT_COLORS = {
    background: "#0b1120",
    primary: "#2563eb",
} as const;
