/**
 * Giải mã QR từ khung hình camera hoặc ảnh.
 * Ưu tiên BarcodeDetector có sẵn của trình duyệt (Android Chrome); không có (Safari iOS)
 * thì mới tải jsQR (~40 KB gzip) để không làm nặng các trang khác.
 */

type QrSource = HTMLVideoElement | HTMLImageElement;

interface IBarcodeDetector {
    detect(source: QrSource): Promise<{ rawValue: string }[]>;
}

interface IBarcodeDetectorConstructor {
    new (options: { formats: string[] }): IBarcodeDetector;
    getSupportedFormats(): Promise<string[]>;
}

export type QrDecodeFn = (
    source: QrSource,
    width: number,
    height: number,
    /** Ảnh chọn từ máy: thử cả QR màu đảo, độ phân giải cao hơn (chậm hơn) */
    thorough?: boolean,
) => Promise<string | null>;

async function getNativeDetector(): Promise<IBarcodeDetector | null> {
    const Detector = (globalThis as { BarcodeDetector?: IBarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) return null;
    try {
        const formats = await Detector.getSupportedFormats();
        return formats.includes("qr_code") ? new Detector({ formats: ["qr_code"] }) : null;
    } catch {
        return null;
    }
}

let decoderPromise: Promise<QrDecodeFn> | null = null;

export function getQrDecoder(): Promise<QrDecodeFn> {
    decoderPromise ??= createQrDecoder().catch((error) => {
        decoderPromise = null;
        throw error;
    });
    return decoderPromise;
}

async function createQrDecoder(): Promise<QrDecodeFn> {
    const native = await getNativeDetector();
    if (native) {
        return async (source) => {
            const codes = await native.detect(source);
            return codes[0]?.rawValue ?? null;
        };
    }

    const { default: jsQR } = await import("jsqr");
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Trình duyệt không hỗ trợ đọc ảnh");

    return async (source, width, height, thorough = false) => {
        if (!width || !height) return null;
        // Thu nhỏ để quét nhanh: QR chiếm phần lớn khung nên 720px là đủ; ảnh chụp màn hình cần nét hơn
        const maxSide = thorough ? 1280 : 720;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        const w = Math.round(width * scale);
        const h = Math.round(height * scale);
        canvas.width = w;
        canvas.height = h;
        context.drawImage(source, 0, 0, w, h);
        const image = context.getImageData(0, 0, w, h);
        const code = jsQR(image.data, w, h, {
            inversionAttempts: thorough ? "attemptBoth" : "dontInvert",
        });
        return code?.data ?? null;
    };
}

/** Đọc QR trong file ảnh (ảnh chụp màn hình QR gửi qua Zalo, Messenger...). */
export async function decodeQrFromFile(file: File): Promise<string | null> {
    const decode = await getQrDecoder();
    const url = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        return await decode(image, image.naturalWidth, image.naturalHeight, true);
    } finally {
        URL.revokeObjectURL(url);
    }
}
