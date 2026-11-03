"use client";

import { useEffect, useState } from "react";

/** Phần màn hình bị che dưới đáy nhỏ hơn mức này coi như không có bàn phím (thanh công cụ trình duyệt). */
const KEYBOARD_MIN_HEIGHT = 120;

export type KeyboardInset = {
    /** Khoảng cách từ đáy layout viewport tới mép trên bàn phím ảo (px), 0 khi không có bàn phím */
    bottom: number;
    /** Chiều cao phần màn hình còn nhìn thấy (px) */
    visibleHeight: number;
};

/**
 * Theo dõi bàn phím ảo qua `window.visualViewport`. iOS Safari không co layout viewport khi bàn phím mở,
 * nên phần tử `position: fixed; bottom: 0` bị bàn phím đè. Dùng `bottom` để đẩy phần tử đó lên trên bàn phím.
 * Chỉ lắng nghe khi `enabled`.
 */
export function useKeyboardInset(enabled = true): KeyboardInset {
    const [inset, setInset] = useState<KeyboardInset>({ bottom: 0, visibleHeight: 0 });

    useEffect(() => {
        const viewport = window.visualViewport;
        if (!enabled || !viewport) return;

        const update = () => {
            const covered = window.innerHeight - viewport.height - viewport.offsetTop;
            const bottom = covered >= KEYBOARD_MIN_HEIGHT ? Math.round(covered) : 0;
            const visibleHeight = Math.round(viewport.height);
            setInset((prev) =>
                prev.bottom === bottom && prev.visibleHeight === visibleHeight ? prev : { bottom, visibleHeight },
            );
        };

        update();
        viewport.addEventListener("resize", update);
        viewport.addEventListener("scroll", update);
        return () => {
            viewport.removeEventListener("resize", update);
            viewport.removeEventListener("scroll", update);
            setInset({ bottom: 0, visibleHeight: 0 });
        };
    }, [enabled]);

    return inset;
}
