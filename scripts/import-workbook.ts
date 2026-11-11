import { readFile } from "node:fs/promises";
import { MongoClient } from "mongodb";
import {
  prepareWorkbookImport,
  type WorkbookPayload,
} from "../src/lib/workbook-import";
import type { ClubState } from "../src/lib/types";
const file = process.argv.find(
  (arg, index) => index > 1 && !arg.startsWith("--"),
);
if (!file) throw new Error("Chỉ định file JSON đã kiểm tra từ workbook.");
const payload = JSON.parse(await readFile(file, "utf8")) as WorkbookPayload;
if (!process.env.MONGODB_URI) throw new Error("Chưa cấu hình MongoDB.");
const client = new MongoClient(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
});
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "vovinam");
  const collection = db.collection("club_state");
  const current = await collection.findOne({ _id: "club" as never });
  if (!current) throw new Error("Không tìm thấy cấu hình CLB.");
  const { _id, ...data } = current;
  const { state, summary } = prepareWorkbookImport(
    data as unknown as ClubState,
    payload,
  );
  console.log(
    JSON.stringify({
      database: db.databaseName,
      summary,
      execute: process.argv.includes("--execute"),
    }),
  );
  if (process.argv.includes("--execute")) {
    if (
      summary.addedStudents ||
      summary.updatedStudents ||
      summary.addedEntries
    ) {
      state.revision = current.revision + 1;
      const result = await collection.replaceOne(
        { _id: "club" as never, revision: current.revision },
        { ...state, _id: "club" as never },
      );
      if (result.modifiedCount !== 1)
        throw new Error("Dữ liệu vừa thay đổi. Chưa nhập; hãy chạy lại.");
    }
    const saved = await collection.findOne({ _id: "club" as never });
    if (!saved) throw new Error("Không đọc được dữ liệu sau khi nhập.");
    const verified = prepareWorkbookImport(
      saved as unknown as ClubState,
      payload,
    );
    if (
      verified.summary.addedEntries ||
      verified.summary.addedStudents ||
      verified.summary.updatedStudents
    )
      throw new Error("Đối soát sau nhập không khớp.");
    if (JSON.stringify(saved.settings) !== JSON.stringify(current.settings))
      throw new Error("Cấu hình website khác trước khi nhập.");
    for (const key of [
      "classes",
      "coaches",
      "posts",
      "media",
      "exams",
      "leads",
    ])
      if (JSON.stringify(saved[key]) !== JSON.stringify(current[key]))
        throw new Error(`Dữ liệu ngoài phạm vi đã thay đổi: ${key}`);
    console.log(
      JSON.stringify({
        verified: true,
        students: saved.students.length,
        activeStudents: saved.students.filter(
          (s: { status: string }) => s.status === "active",
        ).length,
        transactions: saved.entries.length,
        bills: saved.bills.length,
        totals: verified.summary.totals,
        settingsPreserved: true,
        duplicateEntriesOnRerun: verified.summary.addedEntries,
      }),
    );
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/g, "[hidden URI]")
      : "Không thể nhập dữ liệu.",
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
