import { Schema, model, models } from "mongoose";
import { modelUserName } from "./users.model";

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
