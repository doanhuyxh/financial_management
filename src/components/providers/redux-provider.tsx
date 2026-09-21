"use client";

import { Provider } from "react-redux";
import { store } from "@/libs/redux/store";
import AuthBootstrap from "@/components/providers/auth-bootstrap";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
    return (
        <Provider store={store}>
            <AuthBootstrap>{children}</AuthBootstrap>
        </Provider>
    );
}
