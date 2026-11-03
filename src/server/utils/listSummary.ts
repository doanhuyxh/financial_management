import mongoose, { type Model } from "mongoose";
import type { IDayTotal, IListSummary } from "@/libs/interfaces/ApiResponseData";

const TIMEZONE = "+07:00";
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** `find()` tự ép chuỗi sang ObjectId nhưng `aggregate()` thì không: chuyển các field id trước khi $match. */
const OBJECT_ID_FIELDS = ["userId", "categoryId", "sourceOfMoneyId", "fromSourceId", "toSourceId"];

function toAggregateMatch(filter: Record<string, unknown>) {
    const match: Record<string, unknown> = { ...filter };
    for (const field of OBJECT_ID_FIELDS) {
        const value = match[field];
        if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
            match[field] = new mongoose.Types.ObjectId(value);
        }
    }
    return match;
}

/** Đầu ngày (00:00 giờ VN) chứa thời điểm `date`. */
function startOfDayVN(date: Date) {
    const shifted = date.getTime() + VN_OFFSET_MS;
    return new Date(shifted - (shifted % DAY_MS) - VN_OFFSET_MS);
}

interface IListSummaryOptions {
    /** Field ngày dùng để nhóm theo ngày (spentAt, receivedAt, transferredAt) */
    dateField: string;
    /** Field phí cộng riêng vào `totalFee` (chuyển tiền) */
    feeField?: string;
}

/**
 * Tổng của **toàn bộ** kết quả lọc (không chỉ trang hiện tại) và tổng theo ngày (giờ VN) cho các ngày
 * có mặt trong trang hiện tại. Tổng ngày tính trên toàn bộ kết quả lọc nên vẫn đúng khi một ngày
 * nằm vắt qua hai trang. `filter` là filter đã dùng cho `find()` (luôn có `userId`).
 */
export async function buildListSummary(
    model: Model<any>,
    filter: Record<string, unknown>,
    items: Record<string, any>[],
    { dateField, feeField }: IListSummaryOptions,
): Promise<{ summary: IListSummary; dayTotals: IDayTotal[] }> {
    const match = toAggregateMatch(filter);

    const totalsPromise = model.aggregate([
        { $match: match },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                totalAmount: { $sum: "$amount" },
                ...(feeField ? { totalFee: { $sum: { $ifNull: [`$${feeField}`, 0] } } } : {}),
            },
        },
    ]);

    const times = items
        .map((item) => new Date(item[dateField]).getTime())
        .filter((time) => Number.isFinite(time));

    const dayTotalsPromise: Promise<{ _id: string; total: number }[]> = times.length
        ? model.aggregate([
              {
                  $match: {
                      $and: [
                          match,
                          {
                              [dateField]: {
                                  $gte: startOfDayVN(new Date(Math.min(...times))),
                                  $lt: new Date(
                                      startOfDayVN(new Date(Math.max(...times))).getTime() + DAY_MS,
                                  ),
                              },
                          },
                      ],
                  },
              },
              {
                  $group: {
                      _id: {
                          $dateToString: {
                              format: "%Y-%m-%d",
                              date: `$${dateField}`,
                              timezone: TIMEZONE,
                          },
                      },
                      total: { $sum: "$amount" },
                  },
              },
          ])
        : Promise.resolve([]);

    const [[totals], dayRows] = await Promise.all([totalsPromise, dayTotalsPromise]);

    const summary: IListSummary = {
        count: totals?.count ?? 0,
        totalAmount: totals?.totalAmount ?? 0,
    };
    if (feeField) summary.totalFee = totals?.totalFee ?? 0;

    return {
        summary,
        dayTotals: dayRows.map((row) => ({ date: row._id, total: row.total })),
    };
}
