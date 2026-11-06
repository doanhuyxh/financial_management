"use client";

import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, Wallet } from "lucide-react";
import FormField from "@/components/common/form-field";
import { Button } from "@/components/shadcn/ui/button";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/shadcn/ui/input-group";
import { Spinner } from "@/components/shadcn/ui/spinner";
import { useLogin } from "./hooks/useLogin";
import { AuthLoginSchema, type AuthLoginSchemaType } from "./schemas/login-schema";
import { useAppFeedback } from "@/libs/hooks/useAppFeedback";

const HIGHLIGHTS = [
    "Ghi chi tiêu trong vài giây",
    "Theo dõi dư nợ và phí thẻ tín dụng",
    "Tài sản ròng cập nhật theo từng giao dịch",
];

function Logo() {
    return (
        <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Wallet className="size-5" />
            </span>
            <span className="text-base font-bold">Money Manager</span>
        </div>
    );
}

/** Đăng nhập: cùng token màu, logo và component shadcn với phần còn lại của app (theo theme sáng/tối). */
export default function AuthLoginComponent() {
    const { submit, isPending } = useLogin();
    const { notification } = useAppFeedback();
    const [showPassword, setShowPassword] = useState(false);
    const emailId = useId();
    const passwordId = useId();
    const { control, handleSubmit } = useForm<AuthLoginSchemaType>({
        mode: "onTouched",
        defaultValues: { email: "", password: "" },
        resolver: zodResolver(AuthLoginSchema),
    });

    const onSubmit = async (data: AuthLoginSchemaType) => {
        try {
            await submit({ email: data.email, password: data.password });
        } catch (error: any) {
            notification.error({ title: error.message || "Đăng nhập thất bại" });
        }
    };

    return (
        <div className="grid min-h-dvh w-full bg-background text-foreground lg:grid-cols-2">
            {/* Panel thương hiệu (desktop) */}
            <aside className="relative hidden flex-col justify-center gap-6 overflow-hidden bg-linear-to-br from-[#bc4800] to-[#7c2d00] p-12 text-white lg:flex">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl"
                />
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
                    <Wallet className="size-6" />
                </span>
                <h2 className="text-3xl leading-tight font-bold">
                    Biết rõ tiền của bạn
                    <br />
                    đang ở đâu.
                </h2>
                <ul className="flex flex-col gap-3 text-white/90">
                    {HIGHLIGHTS.map((text) => (
                        <li key={text} className="flex items-center gap-2.5">
                            <Check className="size-4 shrink-0" />
                            {text}
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Form */}
            <main className="flex items-center justify-center p-6 sm:p-10">
                <div className="flex w-full max-w-sm flex-col gap-6">
                    <Logo />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Đăng nhập</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Chào mừng trở lại, đăng nhập để tiếp tục.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
                        <Controller
                            name="email"
                            control={control}
                            render={({ field, fieldState }) => (
                                <FormField label="Email" htmlFor={emailId} error={fieldState.error?.message}>
                                    <InputGroup className="h-9">
                                        <InputGroupAddon>
                                            <Mail />
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            {...field}
                                            id={emailId}
                                            type="email"
                                            autoComplete="email"
                                            inputMode="email"
                                            placeholder="name@example.com"
                                            disabled={isPending}
                                            aria-invalid={fieldState.invalid || undefined}
                                        />
                                    </InputGroup>
                                </FormField>
                            )}
                        />
                        <Controller
                            name="password"
                            control={control}
                            render={({ field, fieldState }) => (
                                <FormField label="Mật khẩu" htmlFor={passwordId} error={fieldState.error?.message}>
                                    <InputGroup className="h-9">
                                        <InputGroupAddon>
                                            <Lock />
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            {...field}
                                            id={passwordId}
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="current-password"
                                            placeholder="••••••••"
                                            disabled={isPending}
                                            aria-invalid={fieldState.invalid || undefined}
                                        />
                                        <InputGroupAddon align="inline-end">
                                            <InputGroupButton
                                                size="icon-xs"
                                                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                                aria-pressed={showPassword}
                                                disabled={isPending}
                                                onClick={() => setShowPassword((prev) => !prev)}
                                            >
                                                {showPassword ? <EyeOff /> : <Eye />}
                                            </InputGroupButton>
                                        </InputGroupAddon>
                                    </InputGroup>
                                </FormField>
                            )}
                        />
                        <Button type="submit" size="lg" disabled={isPending} className="mt-2 w-full">
                            {isPending ? <Spinner data-icon="inline-start" /> : null}
                            {isPending ? "Đang xác thực..." : "Đăng nhập"}
                            {isPending ? null : <ArrowRight data-icon="inline-end" />}
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
}
