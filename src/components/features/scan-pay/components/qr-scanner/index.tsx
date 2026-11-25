"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, ImageUp } from "lucide-react";
import { Button } from "@/components/shadcn/ui/button";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { useScanPayContext } from "@/components/features/scan-pay/context";
import { decodeQrFromFile, getQrDecoder } from "@/components/features/scan-pay/hooks/qrDecoder";

type CameraStatus = "starting" | "scanning" | "denied" | "unavailable";

/** Quét mỗi 250ms: đủ nhanh mà không nóng máy */
const SCAN_INTERVAL_MS = 250;

const CAMERA_MESSAGES: Record<Exclude<CameraStatus, "scanning">, string> = {
    starting: "Đang mở camera…",
    denied: "Chưa có quyền dùng camera. Cho phép camera trong cài đặt trình duyệt, hoặc chọn ảnh QR.",
    unavailable: "Không mở được camera trên thiết bị này. Hãy chọn ảnh QR.",
};

/** Bước 1: quét VietQR bằng camera sau, hoặc chọn ảnh QR (ảnh chụp màn hình, ảnh gửi qua Zalo). */
export default function QrScanner() {
    const { handleDetected } = useScanPayContext();
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [status, setStatus] = useState<CameraStatus>("starting");
    const [error, setError] = useState<string | null>(null);
    const [isReadingFile, setIsReadingFile] = useState(false);

    useEffect(() => {
        let stopped = false;
        let stream: MediaStream | null = null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        // Cùng một mã sai thì không báo lại mỗi lần quét
        let lastRejected = "";

        const scanLoop = async () => {
            const video = videoRef.current;
            if (stopped || !video) return;
            try {
                if (video.readyState >= video.HAVE_CURRENT_DATA) {
                    const decode = await getQrDecoder();
                    const text = await decode(video, video.videoWidth, video.videoHeight);
                    if (stopped) return;
                    if (text && text !== lastRejected) {
                        const message = handleDetected(text);
                        if (!message) return; // Hợp lệ: chuyển sang bước xác nhận, component bị gỡ
                        lastRejected = text;
                        setError(message);
                    }
                }
            } catch {
                // Khung hình lỗi (camera vừa tắt...) thì thử lại lượt sau
            }
            timer = setTimeout(scanLoop, SCAN_INTERVAL_MS);
        };

        const start = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                setStatus("unavailable");
                return;
            }
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: "environment" } },
                    audio: false,
                });
            } catch (cameraError) {
                if (stopped) return;
                const name = (cameraError as { name?: string })?.name;
                setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
                return;
            }
            if (stopped) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            const video = videoRef.current;
            if (!video) return;
            video.srcObject = stream;
            await video.play().catch(() => undefined);
            setStatus("scanning");
            void scanLoop();
        };

        void start();
        return () => {
            stopped = true;
            clearTimeout(timer);
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [handleDetected]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setIsReadingFile(true);
        setError(null);
        try {
            const text = await decodeQrFromFile(file);
            if (!text) {
                setError("Không tìm thấy mã QR trong ảnh. Thử cắt ảnh sát mã QR hơn.");
                return;
            }
            const message = handleDetected(text);
            if (message) setError(message);
        } catch {
            setError("Không đọc được ảnh này");
        } finally {
            setIsReadingFile(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
                <video
                    ref={videoRef}
                    className="size-full object-cover"
                    playsInline
                    muted
                    aria-label="Khung quét mã QR"
                />
                {status === "scanning" ? (
                    // Khung ngắm: vùng giữa sáng, viền ngoài tối
                    <div className="pointer-events-none absolute inset-[15%] rounded-lg border-2 border-white/80 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white/85">
                        {status === "starting" ? <Spinner /> : <CameraOff className="size-8" />}
                        <p>{CAMERA_MESSAGES[status]}</p>
                    </div>
                )}
            </div>

            {error ? (
                <p role="alert" className="rounded-md border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-warn">
                    {error}
                </p>
            ) : (
                <p className="text-center text-sm text-muted-foreground">
                    Đưa mã VietQR chuyển khoản vào khung. Mã có sẵn số tiền thì không cần nhập lại.
                </p>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
            />
            <Button
                variant="outline"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReadingFile}
            >
                {isReadingFile ? <Spinner data-icon="inline-start" /> : <ImageUp data-icon="inline-start" />}
                Chọn ảnh QR
            </Button>
        </div>
    );
}
