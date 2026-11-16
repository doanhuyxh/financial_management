import { describe, expect, test } from "bun:test";
import { successResponse, withEtag } from "@/server/utils/responseServer";

// ETag chỉ dùng cho GET /api/deposit-rates (plan 20)
describe("withEtag", () => {
    test("lần đầu: 200 kèm ETag và Cache-Control private, no-cache", async () => {
        const res = await withEtag(new Request("http://x/api/deposit-rates"), successResponse({ a: 1 }));
        expect(res.status).toBe(200);
        expect(res.headers.get("ETag")).toMatch(/^W\/".+"$/);
        expect(res.headers.get("Cache-Control")).toBe("private, no-cache");
        expect(await res.json()).toMatchObject({ status: true, data: { a: 1 } });
    });

    test("If-None-Match khớp: 304 không body", async () => {
        const first = await withEtag(new Request("http://x"), successResponse({ a: 1 }));
        const etag = first.headers.get("ETag")!;
        const again = await withEtag(
            new Request("http://x", { headers: { "If-None-Match": etag } }),
            successResponse({ a: 1 }),
        );
        expect(again.status).toBe(304);
        expect(await again.text()).toBe("");
    });

    test("dữ liệu đổi: ETag khác, trả 200 body mới", async () => {
        const first = await withEtag(new Request("http://x"), successResponse({ a: 1 }));
        const changed = await withEtag(
            new Request("http://x", { headers: { "If-None-Match": first.headers.get("ETag")! } }),
            successResponse({ a: 2 }),
        );
        expect(changed.status).toBe(200);
        expect(await changed.json()).toMatchObject({ data: { a: 2 } });
    });

    test("response lỗi giữ nguyên, không gắn ETag", async () => {
        const { errorResponseWithStatusCode } = await import("@/server/utils/responseServer");
        const res = await withEtag(new Request("http://x"), errorResponseWithStatusCode("x", 500));
        expect(res.status).toBe(500);
        expect(res.headers.get("ETag")).toBeNull();
    });
});
