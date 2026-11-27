import { describe, expect, test } from "bun:test";
import CategoriesModel from "@/server/models/categories.model";
import { CategoriesService } from "@/server/services/categories.service";
import { CategoryKind } from "@/libs/interfaces/categoriesData";
import { call, makeCategory } from "./helpers";

const { EXPENSE, INCOME } = CategoryKind;
const DUPLICATE = "Đã có danh mục cùng tên trong loại này";

describe("Tên danh mục không trùng", () => {
    test("tạo trùng tên cùng loại (khác hoa thường, thừa khoảng trắng) bị từ chối", async () => {
        await makeCategory(EXPENSE, "Ăn uống");

        const res = await call(CategoriesService.createCategory({ name: "  ăn UỐNG ", kind: EXPENSE }));

        expect(res.status).toBe(400);
        expect(res.body.message).toBe(DUPLICATE);
        expect(await CategoriesModel.countDocuments()).toBe(1);
    });

    test("khác loại, khác dấu hoặc trùng với danh mục đã lưu trữ thì được", async () => {
        const archived = await makeCategory(EXPENSE, "Cũ");
        await CategoriesModel.updateOne({ _id: archived }, { $set: { archivedAt: new Date() } });
        await makeCategory(EXPENSE, "Bán");

        for (const body of [
            { name: "Bán", kind: INCOME },
            { name: "Bàn", kind: EXPENSE },
            { name: "Cũ", kind: EXPENSE },
        ]) {
            expect((await call(CategoriesService.createCategory(body))).status).toBe(200);
        }
    });

    test("đổi tên thành tên đã có bị từ chối; đổi hoa thường chính nó thì được", async () => {
        await makeCategory(EXPENSE, "Ăn uống");
        const other = await makeCategory(EXPENSE, "Di chuyển");

        expect((await call(CategoriesService.updateCategory(other, { name: "ăn uống" }))).status).toBe(400);
        expect((await call(CategoriesService.updateCategory(other, { name: "DI CHUYỂN" }))).status).toBe(200);
    });

    test("danh mục trùng tên có từ trước vẫn sửa icon được", async () => {
        await makeCategory(EXPENSE, "Ăn uống");
        const twin = await makeCategory(EXPENSE, "Ăn uống");

        const res = await call(CategoriesService.updateCategory(twin, { name: "Ăn uống", icon: "🍜" }));

        expect(res.status).toBe(200);
    });
});
