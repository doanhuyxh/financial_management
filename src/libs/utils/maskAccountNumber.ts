/** "1802200345" → "••••0345" (giữ 4 số cuối). Chuỗi ngắn hơn 5 ký tự giữ nguyên. */
export function maskAccountNumber(value?: string | null) {
    if (!value) return "";
    const trimmed = value.trim();
    if (trimmed.length <= 4) return trimmed;
    return `••••${trimmed.slice(-4)}`;
}
