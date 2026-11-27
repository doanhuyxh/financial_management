/**
 * Vẽ ảnh khởi động iOS vào public/startup/ (cần ffmpeg). Logo lấy từ public/icon-512.png, đổi nền
 * sang màu primary chế độ tối, đặt đúng chỗ logo của splash (common/loading) để không bị nhảy.
 * Chạy: bun scripts/generate-startup-images.ts
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { BOOT_COLORS } from "@/libs/constants/brandColors";
import { STARTUP_DEVICES, startupImagePath } from "@/libs/constants/startupImages";

/** Cạnh logo, bán kính bo và khoảng logo nằm trên tâm vùng web, đơn vị point (khớp common/loading). */
const LOGO = 72;
const RADIUS = 18;
const LOGO_ABOVE_CENTER = 53;
/** Màu nền của icon-512.png */
const ICON_BACKGROUND_RED = 0x1d;

const root = join(import.meta.dir, "..");
const publicDir = join(root, "public");
mkdirSync(join(publicDir, "startup"), { recursive: true });

const [red, green, blue] = [1, 3, 5].map((start) => parseInt(BOOT_COLORS.primary.slice(start, start + 2), 16));
// Độ trắng của từng điểm ảnh (0 = nền, 1 = nét ví) tính theo kênh đỏ, rồi pha lại trên nền mới
const white = `clip((r(X,Y)-${ICON_BACKGROUND_RED})/(255-${ICON_BACKGROUND_RED}),0,1)`;
const recolor = (channel: number) => `'${channel}+${white}*(255-${channel})'`;

for (const device of STARTUP_DEVICES) {
    const { ratio, statusBar } = device;
    const width = device.width * ratio;
    const height = device.height * ratio;
    const size = LOGO * ratio;
    const radius = RADIUS * ratio;
    const centerY = ((statusBar + device.height) / 2 - LOGO_ABOVE_CENTER) * ratio;
    const corner = `hypot(max(${radius}-X-0.5,0)+max(X+0.5-(W-${radius}),0),max(${radius}-Y-0.5,0)+max(Y+0.5-(H-${radius}),0))`;
    const filter = [
        `[1]format=rgba,geq=r=${recolor(red)}:g=${recolor(green)}:b=${recolor(blue)}:a=255,scale=${size}:${size}:flags=lanczos,` +
            `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*clip(${radius}-${corner}+0.5,0,1)'[logo]`,
        `[0]format=rgb24[bg]`,
        `[bg][logo]overlay=x=(W-w)/2:y=${Math.round(centerY - size / 2)}:format=rgb,format=rgb24`,
    ].join(";");
    const output = join(publicDir, startupImagePath(device));
    const result = Bun.spawnSync([
        "ffmpeg", "-v", "error", "-y",
        "-f", "lavfi", "-i", `color=c=0x${BOOT_COLORS.background.slice(1)}:s=${width}x${height},format=rgb24`,
        "-i", join(publicDir, "icon-512.png"),
        "-filter_complex", filter,
        "-frames:v", "1", "-pred", "mixed", output,
    ]);
    if (result.exitCode !== 0) throw new Error(result.stderr.toString());
    console.log(startupImagePath(device));
}
