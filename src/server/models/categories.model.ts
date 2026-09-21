import { Schema, model, models } from "mongoose";
import { modelUserName } from "./users.model";

const categoriesSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: modelUserName,
        required: true,
    },
	name: {
		type: String,
		required: true,
	},
}, { timestamps: true });

export const modelCategoriesName = "categories";
const CategoriesModel = models[modelCategoriesName] || model(modelCategoriesName, categoriesSchema);
export default CategoriesModel;