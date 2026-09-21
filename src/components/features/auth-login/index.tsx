"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    AlertCircle,
    Loader2,
    Sparkles,
    ShieldCheck,
} from 'lucide-react';
import { useLogin } from './hooks/useLogin';
import { AuthLoginSchema, type AuthLoginSchemaType } from './schemas/login-schema';
import { useAntdApp } from '@/libs/hooks/useAntdApp';
import { EnvsConfig } from '@/libs/constants/configKey';
import { useAppDispatch } from '@/libs/redux/redux';
import { fetchAuthMe, setAuthFromLogin } from '@/libs/redux/authSlice';

export default function AuthLoginComponent() {
    const [showPassword, setShowPassword] = useState(false);
    const { mutateAsync: loginMutation, isPending: isLoginPending } = useLogin();
    const { notification } = useAntdApp()
    const router = useRouter();
    const dispatch = useAppDispatch();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AuthLoginSchemaType>({
        mode: 'onTouched',
        defaultValues: {
            email: EnvsConfig.NODE_ENV === "development" ? "doanhuyxh@gmail.com" : "",
            password: EnvsConfig.NODE_ENV === "development" ? "Anhem88@@" : "",
        },
        resolver: zodResolver(AuthLoginSchema),
    });

    const onSubmit = async (data: AuthLoginSchemaType) => {
        await loginMutation({
            email: data.email,
            password: data.password,
        },
            {
                onSuccess: async (res) => {
                    if (res?.data) {
                        dispatch(setAuthFromLogin(res.data));
                    }
                    await dispatch(fetchAuthMe());
                    router.push('/dashboard');
                },
                onError: (error: any) => {
                    notification.error({
                        title: error.message || "Đăng nhập thất bại",
                    });
                },
            }
        );
    };

    return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-indigo-300">
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 shadow-2xl shadow-indigo-950/40 rounded-2xl p-6 sm:p-8 transition-all duration-300">


                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-linear-to-tr from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 mb-4 ring-4 ring-indigo-500/10">
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Chào mừng trở lại
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">
                        Đăng nhập vào tài khoản của bạn để tiếp tục
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                            Địa chỉ Email
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                <Mail className="h-5 w-5" />
                            </div>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                disabled={isLoginPending}
                                className={`w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border rounded-xl text-sm placeholder:text-slate-600 focus:outline-none transition-all duration-200 disabled:opacity-50 ${errors.email
                                    ? 'border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 text-rose-100'
                                    : 'border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 text-slate-100'
                                    }`}
                                {...register('email')}
                            />
                        </div>
                        {errors.email && (
                            <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1.5 font-medium animate-in fade-in duration-150">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {errors.email.message}
                            </p>
                        )}
                    </div>

                    { }
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                                Mật khẩu
                            </label>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                <Lock className="h-5 w-5" />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                disabled={isLoginPending}
                                className={`w-full pl-10 pr-11 py-2.5 bg-slate-950/60 border rounded-xl text-sm placeholder:text-slate-600 focus:outline-none transition-all duration-200 disabled:opacity-50 ${errors.password
                                    ? 'border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 text-rose-100'
                                    : 'border-slate-800 hover:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 text-slate-100'
                                    }`}
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoginPending}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition focus:outline-none"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1.5 font-medium animate-in fade-in duration-150">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {errors.password.message}
                            </p>
                        )}
                    </div>

                    { }
                    <button
                        type="submit"
                        disabled={isLoginPending}
                        className="w-full relative py-3 px-4 rounded-xl bg-linear-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:via-indigo-700 hover:to-violet-700 active:scale-[0.99] text-white text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isLoginPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Đang xác thực...</span>
                            </>
                        ) : (
                            <>
                                <span>Đăng nhập</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-600">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Bảo mật chuẩn mã hoá SSL 256-bit</span>
                </div>
            </div>
        </div>
    );
}