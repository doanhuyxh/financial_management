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
    sortOrder: {
        type: Number,
        required: true,
        default: 0,
        index: true,
    },
}, { timestamps: true });

categoriesSchema.index({ userId: 1, sortOrder: 1 });

export const modelCategoriesName = "categories";
const CategoriesModel = models[modelCategoriesName] || model(modelCategoriesName, categoriesSchema);
export default CategoriesModel;
