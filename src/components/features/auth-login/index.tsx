"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Form, Input } from "antd";
import { ArrowRight, Check, Lock, Mail, Wallet } from "lucide-react";
import { useLogin } from "./hooks/useLogin";
import { AuthLoginSchema, type AuthLoginSchemaType } from "./schemas/login-schema";
import { useAntdApp } from "@/libs/hooks/useAntdApp";

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

/** Đăng nhập: cùng token màu, logo và component antd với phần còn lại của app (theo theme sáng/tối). */
export default function AuthLoginComponent() {
    const { submit, isPending } = useLogin();
    const { notification } = useAntdApp();
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<AuthLoginSchemaType>({
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

                    <Form layout="vertical" requiredMark={false} onFinish={handleSubmit(onSubmit)}>
                        <Form.Item
                            label="Email"
                            validateStatus={errors.email ? "error" : undefined}
                            help={errors.email?.message}
                        >
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        type="email"
                                        size="large"
                                        autoComplete="email"
                                        inputMode="email"
                                        placeholder="name@example.com"
                                        prefix={<Mail className="size-4 text-muted-foreground" />}
                                        disabled={isPending}
                                    />
                                )}
                            />
                        </Form.Item>
                        <Form.Item
                            label="Mật khẩu"
                            validateStatus={errors.password ? "error" : undefined}
                            help={errors.password?.message}
                        >
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <Input.Password
                                        {...field}
                                        size="large"
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        prefix={<Lock className="size-4 text-muted-foreground" />}
                                        disabled={isPending}
                                    />
                                )}
                            />
                        </Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            block
                            loading={isPending}
                            icon={isPending ? undefined : <ArrowRight className="size-4" />}
                            iconPlacement="end"
                            className="mt-2"
                        >
                            {isPending ? "Đang xác thực..." : "Đăng nhập"}
                        </Button>
                    </Form>
                </div>
            </main>
        </div>
    );
}
