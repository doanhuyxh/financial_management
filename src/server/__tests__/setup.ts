/**
 * Nạp trước mọi file test (bunfig.toml): Mongo in-memory thay DB thật, giả lập user đăng nhập.
 * Không bao giờ kết nối MONGODB_URI trong .env: `dbConnect` bị thay bằng kết nối in-memory.
 */
import { afterAll, beforeAll, beforeEach, mock } from "bun:test";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getAuthContext } from "@/server/utils/authContext";

export const testAuth = { userId: new mongoose.Types.ObjectId().toString() };

function getUserFromAuthContext() {
    const context = getAuthContext();
    return context ? { userId: context.userId, email: null, phoneNumber: null } : undefined;
}

mock.module("@/server/connectDb", () => ({ default: async () => mongoose }));
// Như bản thật: request MCP (runWithAuth) lấy user từ auth context, còn lại giả lập cookie = testAuth
const fakeCookieUser = () => (testAuth.userId ? { userId: testAuth.userId } : null);
mock.module("@/server/utils/getCurrentUser", () => ({
    getCurrentUser: async () => getUserFromAuthContext() ?? fakeCookieUser(),
    getUserFromAuthContext,
    validateAccessToken: async () => fakeCookieUser(),
    invalidateTokenVersionCache: () => {},
}));

let server: MongoMemoryServer | null = null;

beforeAll(async () => {
    server = await MongoMemoryServer.create();
    process.env.MONGODB_URI = server.getUri();
    await mongoose.connect(server.getUri(), { dbName: "money-manager-test" });
    // Tạo index (unique, TTL) trước khi test dựa vào chúng
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

beforeEach(async () => {
    testAuth.userId = new mongoose.Types.ObjectId().toString();
    const collections = await mongoose.connection.db!.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
    await mongoose.disconnect();
    await server?.stop();
});
