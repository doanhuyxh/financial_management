import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { THEME_SURFACE } from "@/libs/constants/brandColors";

// globals.css là nơi duy nhất khai báo màu theme; test này giữ các bản chép tĩnh và cấu trúc token khớp nó.
const css = readFileSync(join(import.meta.dir, "../../app/globals.css"), "utf8");

/** Nội dung `{ ... }` của block đầu tiên khớp selector (không lồng nhau). */
function block(selector: string) {
    const start = css.indexOf(`${selector} {`);
    if (start === -1) throw new Error(`Không thấy block "${selector}" trong globals.css`);
    const open = css.indexOf("{", start);
    return css.slice(open + 1, css.indexOf("}", open));
}

/** Map `--name` → giá trị của mọi custom property khai báo trong block. */
function declarations(body: string) {
    const result = new Map<string, string>();
    for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
        result.set(match[1], match[2].trim());
    }
    return result;
}

const light = declarations(block(":root"));
const dark = declarations(block(".dark"));
const themeInline = declarations(block("@theme inline"));

describe("theme tokens (globals.css)", () => {
    test("đọc được token cả hai chế độ", () => {
        expect(light.size).toBeGreaterThan(20);
        expect(dark.size).toBeGreaterThan(20);
    });

    test("token sáng và tối có cùng danh sách", () => {
        expect([...dark.keys()].sort()).toEqual([...light.keys()].sort());
    });

    test("mọi --color-* trong @theme inline trỏ tới token có thật", () => {
        const missing: string[] = [];
        for (const [name, value] of themeInline) {
            const ref = value.match(/^var\((--[\w-]+)\)$/)?.[1];
            if (!name.startsWith("--color-") || !ref) continue;
            if (!light.has(ref)) missing.push(`${name} → ${ref}`);
        }
        expect(missing).toEqual([]);
    });

    test("token màu nào cũng có --color-* để dùng làm class Tailwind", () => {
        const exposed = new Set(
            [...themeInline.values()].map((value) => value.match(/^var\((--[\w-]+)\)$/)?.[1]).filter(Boolean),
        );
        const notExposed = [...light.keys()].filter(
            // Token chỉ dùng nội bộ trong CSS (quy tắc menu sidebar đang chọn)
            (name) => !exposed.has(name) && name !== "--sidebar-accent-active",
        );
        expect(notExposed).toEqual([]);
    });

    test("THEME_SURFACE (meta theme-color, manifest) bằng --card của từng chế độ", () => {
        expect(light.get("--card")).toBe(THEME_SURFACE.light);
        expect(dark.get("--card")).toBe(THEME_SURFACE.dark);
    });
});
