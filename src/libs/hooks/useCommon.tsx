import { useAntdApp } from "./useAntdApp";

export function useCommon() {
    const { notification } = useAntdApp();

    const sleep = (s: number) =>
        new Promise((resolve) => setTimeout(resolve, s * 1000));

    const copiedToClipboard = async (text: string) => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                notification.success({
                    message: "Đã sao chép vào clipboard",
                    duration: 2,
                });
            } else {
                notification.error({
                    message: "Clipboard API không được hỗ trợ",
                    duration: 2,
                });
            }
        } catch {
            notification.error({
                message: "Không thể sao chép vào clipboard",
                duration: 2,
            });
        }
    };

    return { sleep, copiedToClipboard };
}