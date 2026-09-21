import { Schema, model, models } from "mongoose";


const userSchema = new Schema({
	avatarUrl: {
		type: String,
		required: false,
		default: "https://i.pravatar.cc/300",
	},
	fullName: {
		type: String,
		required: true,
	},
	phoneNumber: {
		type: String,
		required: false,
		default: "",
	},
	email: {
		type: String,
		required: false,
		default: "",
	},
	password: {
		type: String,
		required: false,
		default: "",
	},
}, { timestamps: true });

export const modelUserName = "user";
const User = models[modelUserName] || model(modelUserName, userSchema);
export default User;