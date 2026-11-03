/**
 * Gán emoji cho danh mục chưa có icon, đoán theo từ khóa trong tên (ăn, cà phê, nhà, di chuyển...).
 *
 * Danh mục tạo trước khi có trường `icon` đều hiện chữ cái đầu. Không suy ra chắc chắn được nên
 * làm qua script, người dùng vẫn sửa lại được trong trang Danh mục.
 *
 *   bun scripts/backfill-category-icons.ts          # chạy thử, chỉ in danh sách sẽ gán
 *   bun scripts/backfill-category-icons.ts --apply  # ghi vào DB
 *
 * Idempotent: chỉ đụng danh mục chưa lưu trữ và đang không có icon (điều kiện nằm trong filter),
 * nên chạy lại không ghi đè icon người dùng đã chọn. Không đổi `color`.
 */
import mongoose from "mongoose";
import dbConnect from "@/server/connectDb";
import CategoriesModel from "@/server/models/categories.model";

const apply = process.argv.includes("--apply");

/**
 * Từ khóa (không dấu, chữ thường) → emoji; khớp quy tắc đầu tiên. Tên được đệm khoảng trắng hai đầu,
 * nên từ khóa ngắn viết dạng " an " để chỉ khớp nguyên từ (không khớp "ca nhan").
 */
const RULES: [string[], string][] = [
    [["ca phe", "cafe", "coffee"], "☕"],
    [["tra sua", " tra "], "🧋"],
    [["an sang"], "🍳"],
    [["an trua", " com "], "🍱"],
    [["an vat", "bua nhe", "an dem"], "🥛"],
    [["an uong", " an ", "nha hang", "do an"], "🍲"],
    [["di cho", "sieu thi", "tap hoa"], "🛒"],
    [["tien nha", "thue nha", "nha tro"], "🏠"],
    [["dien thoai", "the cao"], "📱"],
    [[" dien ", " nuoc ", "internet", "wifi"], "💡"],
    [["gia dung", "noi that", "decor"], "🛋️"],
    [["suc khoe", "thuoc", "benh vien", " kham "], "💊"],
    [["di chuyen", "xang", "grab", "taxi", " xe "], "🛵"],
    [["quan ao", "thoi trang", " giay "], "👕"],
    [["ca nhan", "my pham", "lam dep"], "🧴"],
    [["giai tri", "huong thu", " game ", " phim "], "🎮"],
    [[" qua ", " bieu ", " cuoi ", " hieu "], "🎁"],
    [[" hoc ", " sach ", "khoa hoc"], "📚"],
    [["may chu", "server", "hosting", "ha tang"], "🖥️"],
    [[" ai ", "agent", "chatgpt", "claude"], "🤖"],
    [["nen tang", "phan mem", " app", " web", "subscription"], "🌐"],
    [["cho vay", " vay ", " no "], "🤝"],
    // Không dùng "lai": bỏ dấu thì "lãi" và "lại" trùng nhau
    [["phi the", "the tin dung", "phi ngan hang"], "💳"],
    [[" que ", "gia dinh", "bo me"], "👪"],
    [[" luong ", "thu nhap", " thuong "], "💰"],
    [["dau tu", "lai suat", "co tuc"], "📈"],
];

/** Bỏ dấu tiếng Việt, chữ thường, thêm khoảng trắng hai đầu để khớp từ đầu/cuối. */
function normalize(name: string) {
    return ` ${name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()} `;
}

function guessIcon(name: string) {
    const text = normalize(name);
    for (const [keywords, icon] of RULES) {
        if (keywords.some((keyword) => text.includes(keyword))) {
            return icon;
        }
    }
    return null;
}

type CategoryRow = { _id: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; name: string };

const NO_ICON = { $or: [{ icon: { $exists: false } }, { icon: null }, { icon: "" }] };

async function main() {
    await dbConnect();

    const categories = await CategoriesModel.find({ archivedAt: null, ...NO_ICON })
        .select("_id userId name")
        .lean<CategoryRow[]>();

    const matched = categories
        .map((category) => ({ ...category, icon: guessIcon(category.name) }))
        .filter((category): category is CategoryRow & { icon: string } => Boolean(category.icon));

    console.log(`Danh mục chưa có icon: ${categories.length}, đoán được: ${matched.length}`);
    for (const category of matched) {
        console.log(`  ${category.icon}  ${category.name}  (user ${category.userId})`);
    }
    const unmatched = categories.filter((category) => !guessIcon(category.name));
    if (unmatched.length) {
        console.log(`Không đoán được (giữ chữ cái đầu): ${unmatched.map((c) => c.name).join(", ")}`);
    }

    if (!apply) {
        console.log("\nChạy thử: chưa ghi gì. Thêm --apply để ghi vào DB.");
        return;
    }

    let updated = 0;
    for (const category of matched) {
        const result = await CategoriesModel.updateOne(
            { _id: category._id, userId: category.userId, ...NO_ICON },
            { $set: { icon: category.icon } },
        );
        updated += result.modifiedCount;
    }
    console.log(`\nĐã gán icon cho ${updated} danh mục.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
