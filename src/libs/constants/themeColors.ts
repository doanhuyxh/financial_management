/**
 * Màu hex cho nơi không đọc được CSS var (biểu đồ @ant-design/plots trong dashboard).
 * Giá trị PHẢI khớp với token trong src/app/globals.css; sửa một bên thì sửa cả bên kia.
 */
export const THEME_COLORS = {
    light: {
        bg: "#f6f5f3",
        card: "#ffffff",
        card2: "#f2f0ed",
        border: "#e7e3de",
        fg: "#1c1917",
        muted: "#78716c",
        disabledText: "rgba(28, 25, 23, 0.35)",
        disabledBg: "rgba(28, 25, 23, 0.06)",
        primary: "#bc4800",
        accentText: "#bc4800",
        moneyIn: "#15803d",
        moneyOut: "#be123c",
        debt: "#b91c1c",
        warn: "#b45309",
        credit: "#1d4ed8",
    },
    dark: {
        bg: "#0c0a09",
        card: "#171412",
        card2: "#211d1a",
        border: "#2c2724",
        fg: "#f5f5f4",
        muted: "#a8a29e",
        disabledText: "rgba(245, 245, 244, 0.4)",
        disabledBg: "rgba(245, 245, 244, 0.08)",
        primary: "#bc4800",
        accentText: "#f0883e",
        moneyIn: "#4ade80",
        moneyOut: "#fb7185",
        debt: "#f87171",
        warn: "#fbbf24",
        credit: "#60a5fa",
    },
} as const;

export type ThemeMode = keyof typeof THEME_COLORS;
