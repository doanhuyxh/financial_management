import { Schema, model, models } from "mongoose";

const loginAttemptSchema = new Schema(
    {
        key: { type: String, required: true, unique: true },
        failCount: { type: Number, default: 0 },
        lockedUntil: { type: Date, default: null },
    },
    { timestamps: true },
);

export const modelLoginAttemptName = "loginAttempt";
const LoginAttempt =
    models[modelLoginAttemptName] || model(modelLoginAttemptName, loginAttemptSchema);
export default LoginAttempt;
