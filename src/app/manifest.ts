import type { MetadataRoute } from "next";
import { buildTransactionsUrl } from "@/libs/utils/transactionsUrl";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "/",
        name: "Money Manager",
        short_name: "Money",
        description: "Quản lý thu chi cá nhân",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#171412",
        theme_color: "#171412",
        lang: "vi",
        icons: [
            { src: "/icon-192.png?v=2", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "any" },
            // Android cắt icon theo hình của launcher (tròn, squircle...). Logo chiếm 56% giữa ảnh,
            // nằm trong vùng an toàn 80%, nên dùng lại cùng file mà không bị cắt mất logo.
            { src: "/icon-192.png?v=2", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icon-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        // Nhấn giữ icon app (Android/desktop) để ghi giao dịch ngay
        shortcuts: [
            {
                name: "Ghi chi tiêu",
                short_name: "Chi tiêu",
                url: buildTransactionsUrl("expense", { action: "create" }),
                icons: [{ src: "/icon-192.png?v=2", sizes: "192x192" }],
            },
            {
                name: "Ghi thu nhập",
                short_name: "Thu nhập",
                url: buildTransactionsUrl("income", { action: "create" }),
                icons: [{ src: "/icon-192.png?v=2", sizes: "192x192" }],
            },
            {
                name: "Chuyển tiền",
                url: buildTransactionsUrl("transfer", { action: "create" }),
                icons: [{ src: "/icon-192.png?v=2", sizes: "192x192" }],
            },
        ],
    };
}
