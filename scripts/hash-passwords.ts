import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DATABASE_NAME;

if (!uri) {
    throw new Error("MONGODB_URI is required");
}

const userSchema = new mongoose.Schema(
    {
        email: String,
        password: String,
    },
    { strict: false },
);

async function main() {
    await mongoose.connect(uri!, { dbName });
    const User = mongoose.models.user || mongoose.model("user", userSchema, "users");
    const users = await User.find({ password: { $exists: true, $ne: "" } }).select("email password");
    let updated = 0;

    for (const user of users) {
        const password = String(user.password ?? "");
        if (!password || password.startsWith("$2")) continue;
        user.password = await bcrypt.hash(password, 12);
        await user.save();
        updated += 1;
        console.log(`Hashed password for ${user.email || user._id}`);
    }

    console.log(`Done. Updated ${updated} user(s).`);
    await mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
});
