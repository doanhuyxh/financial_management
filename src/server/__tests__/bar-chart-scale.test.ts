import { describe, expect, test } from "bun:test";
import { niceMax } from "@/components/common/bar-chart";

// Trục Y của biểu đồ cột tự vẽ (plan 20): 4 vạch, mỗi vạch phải là số tròn
describe("niceMax", () => {
    test.each([
        [4_800_000, 6_000_000],
        [2_050_000, 2_400_000],
        [1_000_000, 1_000_000],
        [999, 1_000],
        [37_000_000, 40_000_000],
    ])("đỉnh %p → trục %p", (peak, expected) => {
        expect(niceMax(peak)).toBe(expected);
    });

    test("trục luôn ≥ đỉnh và mỗi vạch (max/4) là bội của bước đẹp", () => {
        for (const peak of [1, 7, 123, 4_567, 89_000, 1_234_567, 98_765_432]) {
            const max = niceMax(peak);
            expect(max).toBeGreaterThanOrEqual(peak);
            const step = max / 4;
            const mantissa = step / 10 ** Math.floor(Math.log10(step));
            expect([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]).toContain(Number(mantissa.toFixed(6)));
        }
    });

    test("không có dữ liệu: trục mặc định, không chia cho 0", () => {
        expect(niceMax(0)).toBeGreaterThan(0);
    });
});
