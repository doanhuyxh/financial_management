/**
 * Ảnh khởi động iOS (`apple-touch-startup-image`) cho web app mở từ Màn hình chính (plan 22):
 * thay màn đen/trắng trong lúc chờ HTML + CSS. iOS chỉ dùng ảnh khớp **đúng** cỡ máy.
 * Thêm máy mới: thêm một dòng rồi chạy `bun scripts/generate-startup-images.ts`.
 */
export const STARTUP_DEVICES = [
    // width/height: point ở chiều dọc; statusBar: chiều cao thanh trạng thái (để logo trùng vị trí splash)
    { width: 375, height: 667, ratio: 2, statusBar: 20 }, // SE 2/3, 8
    { width: 414, height: 736, ratio: 3, statusBar: 20 }, // 8 Plus
    { width: 375, height: 812, ratio: 3, statusBar: 50 }, // X, XS, 11 Pro, 12/13 mini
    { width: 414, height: 896, ratio: 2, statusBar: 48 }, // XR, 11
    { width: 414, height: 896, ratio: 3, statusBar: 44 }, // XS Max, 11 Pro Max
    { width: 390, height: 844, ratio: 3, statusBar: 47 }, // 12, 13, 14, 16e
    { width: 428, height: 926, ratio: 3, statusBar: 47 }, // 12/13 Pro Max, 14 Plus
    { width: 393, height: 852, ratio: 3, statusBar: 59 }, // 14 Pro, 15, 16
    { width: 430, height: 932, ratio: 3, statusBar: 59 }, // 14 Pro Max, 15 Plus, 16 Plus
    { width: 402, height: 874, ratio: 3, statusBar: 62 }, // 16 Pro, 17, 17 Pro
    { width: 420, height: 912, ratio: 3, statusBar: 68 }, // Air
    { width: 440, height: 956, ratio: 3, statusBar: 62 }, // 16 Pro Max, 17 Pro Max
] as const;

export type IStartupDevice = (typeof STARTUP_DEVICES)[number];

/** Đổi ảnh thì tăng số: file được cache 1 năm (next.config.ts). */
const STARTUP_VERSION = 1;

/** Đường dẫn trong `public/`; thư mục `startup/` được `proxy.ts` cho qua không cần đăng nhập. */
export function startupImagePath(device: IStartupDevice) {
    return `/startup/dark-${device.width * device.ratio}x${device.height * device.ratio}.png`;
}

/** Cho `metadata.appleWebApp.startupImage`. */
export const STARTUP_IMAGES = STARTUP_DEVICES.map((device) => ({
    url: `${startupImagePath(device)}?v=${STARTUP_VERSION}`,
    media: `(device-width: ${device.width}px) and (device-height: ${device.height}px) and (-webkit-device-pixel-ratio: ${device.ratio}) and (orientation: portrait)`,
}));
