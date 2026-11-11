"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/shadcn/ui/field";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/ui/tooltip";
import { cn } from "@/libs/shadcn/utils";

type FieldStatus = {
    /** Ô đang có lỗi (để ô nhập tự tô viền đỏ) */
    invalid: boolean;
    /** id gợi ý cho ô nhập để nhãn `htmlFor` trỏ tới */
    id: string;
};

const FieldStatusContext = createContext<FieldStatus>({ invalid: false, id: "" });

/** Trạng thái lỗi + id của FormField bao quanh (thay `Form.Item.useStatus()` của antd). */
export function useFieldStatus() {
    return useContext(FieldStatusContext);
}

interface IFormFieldProps {
    label?: ReactNode;
    /** Thông báo lỗi (từ react-hook-form `fieldState.error?.message`) */
    error?: string | null;
    /** Chữ phụ dưới ô nhập (gợi ý, số dư hiện có…) */
    extra?: ReactNode;
    /** Icon (i) cạnh nhãn, hover hiện giải thích */
    tooltip?: ReactNode;
    /** Đặt `MODAL_AUTOFOCUS_CLASS` ở đây để modal focus vào ô này khi mở */
    className?: string;
    /** id cho ô nhập bên trong; bỏ trống thì tự sinh (đọc qua `useFieldStatus().id`) */
    htmlFor?: string;
    children: ReactNode;
}

/**
 * Một dòng của form: nhãn · ô nhập · lỗi · chữ phụ (thay `Form.Item` của antd).
 * Dùng với react-hook-form: `<Controller render={({ field, fieldState }) => <FormField error={fieldState.error?.message}>…` .
 */
export default function FormField({
    label,
    error,
    extra,
    tooltip,
    className,
    htmlFor,
    children,
}: IFormFieldProps) {
    const generatedId = useId();
    const id = htmlFor ?? generatedId;
    const invalid = Boolean(error);

    return (
        <Field data-invalid={invalid || undefined} className={cn("gap-1.5", className)}>
            {label ? (
                <FieldLabel htmlFor={id} className="text-sm font-medium text-foreground">
                    {label}
                    {tooltip ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="size-3.5 cursor-help text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-72">{tooltip}</TooltipContent>
                        </Tooltip>
                    ) : null}
                </FieldLabel>
            ) : null}
            <FieldStatusContext.Provider value={{ invalid, id }}>{children}</FieldStatusContext.Provider>
            {error ? <FieldError>{error}</FieldError> : null}
            {extra ? <FieldDescription className="text-xs">{extra}</FieldDescription> : null}
        </Field>
    );
}
