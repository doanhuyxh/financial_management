"use client";

import dynamic from "next/dynamic";
import LoadingComponent from "@/components/common/loading";

/**
 * Render toàn bộ app phía client như một SPA React: server chỉ trả HTML tĩnh (build sẵn)
 * chứa màn hình loading, không SSR giao diện theo từng request.
 */
const ClientApp = dynamic(() => import("@/components/providers/app-providers"), {
    ssr: false,
    loading: () => <LoadingComponent />,
});

export default ClientApp;
