import { Schema, model, models } from "mongoose";


const userSchema = new Schema({
	avatarUrl: {
		type: String,
		required: false,
		default: "https://i.pravatar.cc/300",
	},
	fullName: {
		type: String,
		required: false,
		default: "",
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
	tokenVersion: {
		type: Number,
		required: false,
		default: 0,
	},
	/** Khóa sổ: giao dịch có ngày trước mốc này (đầu ngày giờ VN) không được tạo/sửa/xóa. null = không khóa. */
	ledgerLockedBefore: {
		type: Date,
		required: false,
		default: null,
	},
}, { timestamps: true });

export const modelUserName = "user";
const User = models[modelUserName] || model(modelUserName, userSchema);
export default User;