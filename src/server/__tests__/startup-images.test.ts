import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "@/proxy";
import { BOOT_COLORS } from "@/libs/constants/brandColors";
import { STARTUP_DEVICES, STARTUP_IMAGES, startupImagePath } from "@/libs/constants/startupImages";

const root = join(import.meta.dir, "../..");

describe("ảnh khởi động iOS", () => {
    test.each(STARTUP_DEVICES.map((device) => [startupImagePath(device), device] as const))(
        "%s có thật và đúng cỡ máy",
        (path, device) => {
            const png = readFileSync(join(root, "../public", path));
            // Chunk IHDR: rộng ở byte 16, cao ở byte 20
            expect(png.readUInt32BE(16)).toBe(device.width * device.ratio);
            expect(png.readUInt32BE(20)).toBe(device.height * device.ratio);
        },
    );

    test("mỗi cỡ máy chỉ khai một ảnh", () => {
        expect(new Set(STARTUP_IMAGES.map((image) => image.media)).size).toBe(STARTUP_IMAGES.length);
    });

    test("proxy cho tải ảnh khi chưa đăng nhập, trang thường vẫn bị chặn", () => {
        const matcher = new RegExp(`^${config.matcher[0]}$`);
        for (const image of STARTUP_IMAGES) expect(matcher.test(image.url.split("?")[0])).toBe(false);
        expect(matcher.test("/dashboard")).toBe(true);
    });

    test("màu ảnh bằng --background và --primary chế độ tối", () => {
        const css = readFileSync(join(root, "app/globals.css"), "utf8");
        const dark = css.slice(css.indexOf(".dark {"), css.indexOf("}", css.indexOf(".dark {")));
        expect(dark).toContain(`--background: ${BOOT_COLORS.background};`);
        expect(dark).toContain(`--primary: ${BOOT_COLORS.primary};`);
    });
});
