import { Schema, model, models, type Document, type Types } from "mongoose";
import { McpTokenScope } from "@/libs/interfaces/mcpTokensData";
import { modelUserName } from "./users.model";

/** Personal Access Token cho agent kết nối MCP (`/api/mcp`). */
export interface IMcpToken extends Document {
    userId: Types.ObjectId;
    /** SHA-256 của token; token gốc chỉ trả về một lần lúc tạo. */
    tokenHash: string;
    /** Vài ký tự đầu của token để user nhận ra (không đủ để dùng). */
    prefix: string;
    label: string;
    scopes: McpTokenScope[];
    expiresAt?: Date | null;
    revokedAt?: Date | null;
    /** Cập nhật thưa (tối đa 1 lần/phút), không phải mỗi request. */
    lastUsedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const mcpTokensSchema = new Schema<IMcpToken>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: modelUserName,
            required: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
        },
        prefix: { type: String, required: true },
        label: { type: String, trim: true, default: "" },
        scopes: {
            type: [String],
            enum: Object.values(McpTokenScope),
            default: [McpTokenScope.READ],
        },
        expiresAt: { type: Date, default: null },
        revokedAt: { type: Date, default: null },
        lastUsedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

mcpTokensSchema.index({ userId: 1, revokedAt: 1, createdAt: -1 });

export const modelMcpTokensName = "mcpTokens";
const McpTokensModel =
    models[modelMcpTokensName] || model<IMcpToken>(modelMcpTokensName, mcpTokensSchema);

export default McpTokensModel;
