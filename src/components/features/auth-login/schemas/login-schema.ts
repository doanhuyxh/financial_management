import { z } from 'zod';

export const AuthLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email là bắt buộc')
    .email('Địa chỉ email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu là bắt buộc')
    .min(6, 'Mật khẩu phải có tối thiểu 6 ký tự'),
});
export type AuthLoginSchemaType = z.infer<typeof AuthLoginSchema>;