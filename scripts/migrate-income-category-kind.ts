/**
 * Chuyển danh mục tên "Thu nhập" sang loại INCOME.
 *
 * Backfill `kind` gán EXPENSE cho danh mục từng được dùng bởi cả chi tiêu lẫn thu nhập,
 * nên danh mục "Thu nhập" có thể bị xếp nhầm. UI chặn đổi loại khi đã có giao dịch,
 * nên việc này làm qua script.
 *
 *   bun scripts/migrate-income-category-kind.ts          # chạy thử, chỉ báo cáo
 *   bun scripts/migrate-income-category-kind.ts --apply  # ghi vào DB
 *
 * Chi tiêu đang gắn danh mục này vẫn giữ nguyên: sửa giao dịch mà giữ danh mục cũ khác loại
 * vẫn được phép (xem .agent/business-logic.md mục 5).
 */
import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import CategoriesModel from "@/server/models/categories.model";
import ExpensesModel from "@/server/models/expenses.model";
import IncomesModel from "@/server/models/incomes.model";
import TransfersModel from "@/server/models/transfers.model";
import { CategoryKind } from "@/libs/interfaces/categoriesData";

// Dạng chuỗi: RegExp literal có ký tự Unicode bị serialize thành \u, PCRE2 của Mongo không nhận
const TARGET_NAME = { $regex: "^\\s*thu nhập\\s*$", $options: "i" };
const apply = process.argv.includes("--apply");

type CategoryRow = {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    name: string;
    kind?: CategoryKind | null;
    archivedAt?: Date | null;
};

async function main() {
    await dbConnect();

    const categories = await CategoriesModel.find({ name: TARGET_NAME })
        .select("_id userId name kind archivedAt")
        .lean<CategoryRow[]>();

    if (categories.length === 0) {
        console.log('Không có danh mục nào tên "Thu nhập".');
        return;
    }

    const toUpdate: mongoose.Types.ObjectId[] = [];
    for (const category of categories) {
        const filter = { userId: category.userId, categoryId: category._id };
        const [expenses, incomes, feeTransfers] = await Promise.all([
            ExpensesModel.countDocuments(filter),
            IncomesModel.countDocuments(filter),
            TransfersModel.countDocuments({
                userId: category.userId,
                feeCategoryId: category._id,
            }),
        ]);

        const needsUpdate = category.kind !== CategoryKind.INCOME;
        if (needsUpdate) toUpdate.push(category._id);

        console.log(
            [
                `- ${category._id} "${category.name}" (user ${category.userId})`,
                `kind: ${category.kind ?? "(trống)"}${category.archivedAt ? ", đã lưu trữ" : ""}`,
                `thu nhập: ${incomes}, chi tiêu: ${expenses}, phí chuyển tiền: ${feeTransfers}`,
                needsUpdate ? "→ đổi sang INCOME" : "→ đã là INCOME, bỏ qua",
            ].join(" | "),
        );
        if (needsUpdate && (expenses > 0 || feeTransfers > 0)) {
            console.log(
                "  ! Danh mục còn chi tiêu/phí: các bản ghi đó giữ nguyên, nhưng danh mục sẽ không còn trong form chi tiêu.",
            );
        }
    }

    if (toUpdate.length === 0) {
        console.log("Không có gì cần đổi.");
        return;
    }
    if (!apply) {
        console.log(`\nChạy thử: sẽ đổi ${toUpdate.length} danh mục. Thêm --apply để ghi vào DB.`);
        return;
    }

    const result = await CategoriesModel.updateMany(
        { _id: { $in: toUpdate } },
        { $set: { kind: CategoryKind.INCOME } },
    );
    console.log(`\nĐã đổi ${result.modifiedCount} danh mục sang INCOME.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
