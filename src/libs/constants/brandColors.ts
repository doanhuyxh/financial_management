/**
 * Hex cho metadata tĩnh không đọc được CSS (thẻ meta `theme-color`, manifest PWA).
 * Bằng `--card` (màu header) trong src/app/globals.css; test `theme-tokens.test.ts` chặn khi lệch.
 */
export const THEME_SURFACE = {
    light: "#ffffff",
    dark: "#171412",
} as const;
