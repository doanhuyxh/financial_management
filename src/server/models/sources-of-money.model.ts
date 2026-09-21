import { Schema, model, models } from "mongoose";
import { modelUserName } from "./users.model";

const sourcesOfMoneySchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: modelUserName,
        required: true,
    },
	name: {
		type: String,
		required: true,
	},
    type: {
        type: String,
        required: true,
    },
    balance: {
        type: Number,
        required: true,
    },
    metadata: {
        type: Schema.Types.Mixed,
        required: false,
        default: {},
    },
}, { timestamps: true });

export const modelSourcesOfMoneyName = "sourcesOfMoney";
const SourcesOfMoneyModel = models[modelSourcesOfMoneyName] || model(modelSourcesOfMoneyName, sourcesOfMoneySchema);
export default SourcesOfMoneyModel;