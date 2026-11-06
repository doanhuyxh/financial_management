const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;
const USER_AGENT = "Mozilla/5.0 (compatible; MoneyManager/1.0; +personal finance app)";

/** Tải một trang công khai (GET, có timeout, giới hạn kích thước). Lỗi mạng/HTTP → throw. */
export async function fetchText(url: string, timeoutMs = FETCH_TIMEOUT_MS) {
    const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
        cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > MAX_BYTES) throw new Error("Trang quá lớn");
    return text;
}
