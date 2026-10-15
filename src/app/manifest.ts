import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Money Manager",
        short_name: "Money",
        description: "Quản lý thu chi cá nhân",
        start_url: "/dashboard",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        lang: "vi",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
    };
}
