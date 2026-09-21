"use client";

import { App } from "antd";

/**
 * Custom hook để sử dụng Ant Design App context
 * Bao gồm notification, modal, message
 */
export const useAntdApp = () => {
    const { notification, modal, message } = App.useApp();

    return {
        notification,
        modal,
        message
    };
};