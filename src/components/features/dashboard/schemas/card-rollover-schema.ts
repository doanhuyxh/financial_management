import { z } from "zod";
import dayjs, { type Dayjs } from "dayjs";

/** Ô số của antd/DebouncedNumberInput trả về chuỗi; ép về số trước khi validate. */
function toNumber(value: unknown) {
    if (value === undefined || value === null || value === "") return undefined;
    const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
    return Number.isFinite(num) ? num : Number.NaN;
}

const numberInput = z.union([z.string(), z.number(), z.null(), z.undefined()]);

export const CardRolloverSchema = z
    .object({
        amount: numberInput
            .transform((value) => toNumber(value) ?? Number.NaN)
            .pipe(z.number({ message: "Số tiền là bắt buộc" }).positive("Số tiền phải lớn hơn 0")),
        feePercent: numberInput
            .transform((value) => toNumber(value) ?? 0)
            .pipe(z.number({ message: "% phí không hợp lệ" }).min(0, "Từ 0 đến 100").max(100, "Từ 0 đến 100")),
        feeAmount: numberInput
            .transform((value) => toNumber(value) ?? 0)
            .pipe(z.number({ message: "Phí không hợp lệ" }).min(0, "Phí phải >= 0")),
        feeCategoryId: z.string().optional(),
        rolledAt: z.custom<Dayjs>((value) => dayjs.isDayjs(value), {
            message: "Ngày đáo hạn là bắt buộc",
        }),
        provider: z.string().max(100, "Tối đa 100 ký tự").optional(),
        note: z.string().max(500, "Tối đa 500 ký tự").optional(),
    })
    .superRefine((values, ctx) => {
        if (values.feeAmount > 0 && !values.feeCategoryId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["feeCategoryId"],
                message: "Danh mục chi tiêu phí là bắt buộc khi có phí",
            });
        }
    });

export type CardRolloverFormInput = z.input<typeof CardRolloverSchema>;
export type CardRolloverFormValues = z.output<typeof CardRolloverSchema>;
