import dayjs from "dayjs";

/** Định dạng ngày thống nhất toàn app (mặc định DD/MM/YYYY). Giá trị rỗng/sai trả "—". */
export function formatDate(value?: string | Date | null, pattern = "DD/MM/YYYY") {
    if (!value) return "—";
    const date = dayjs(value);
    return date.isValid() ? date.format(pattern) : "—";
}
