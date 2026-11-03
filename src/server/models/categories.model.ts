import { Schema, model, models } from "mongoose";
import { modelUserName } from "./users.model";
import { CategoryKind } from "@/libs/interfaces/categoriesData";

const categoriesSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: modelUserName,
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    /** Dữ liệu cũ chưa có kind được backfill khi GET danh sách */
    kind: {
        type: String,
        enum: Object.values(CategoryKind),
    },
    /** 1 emoji hiển thị cạnh tên (tùy chọn); null = dùng chữ cái đầu */
    icon: {
        type: String,
        trim: true,
        maxlength: 16,
        default: null,
    },
    /** Màu #RRGGBB (tùy chọn); null = màu băm theo id (getCategoryColor) */
    color: {
        type: String,
        match: /^#[0-9a-fA-F]{6}$/,
        default: null,
    },
    sortOrder: {
        type: Number,
        required: true,
        default: 0,
        index: true,
    },
    /** Xóa mềm: danh mục đã có giao dịch chỉ được lưu trữ để giữ lịch sử */
    archivedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

categoriesSchema.index({ userId: 1, sortOrder: 1 });

export const modelCategoriesName = "categories";
const CategoriesModel = models[modelCategoriesName] || model(modelCategoriesName, categoriesSchema);
export default CategoriesModel;
