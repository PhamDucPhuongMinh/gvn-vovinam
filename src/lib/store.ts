import { MongoClient } from "mongodb";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { createEmptyState } from "./empty-state";
import { migrateState } from "./migrations";
import type { ClubState } from "./types";
export const isDemo = () =>
  !process.env.MONGODB_URI &&
  process.env.NODE_ENV !== "production" &&
  !process.env.NETLIFY;
const globalStore = globalThis as typeof globalThis & {
  mongo?: Promise<MongoClient>;
  demoLock?: Promise<unknown>;
};
export async function database() {
  if (!process.env.MONGODB_URI)
    throw new Error(
      "Chưa cấu hình MONGODB_URI. Xem README để kết nối MongoDB.",
    );
  if (!globalStore.mongo)
    globalStore.mongo = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 6000,
    })
      .connect()
      .catch((e) => {
        globalStore.mongo = undefined;
        throw e;
      });
  return (await globalStore.mongo).db(process.env.MONGODB_DB || "vovinam");
}
const statePath = path.join(process.cwd(), ".data", "club.json");
export async function readState(): Promise<ClubState> {
  if (isDemo()) {
    try {
      return migrateState(JSON.parse(await readFile(statePath, "utf8")));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      return createEmptyState();
    }
  }
  const db = await database();
  const doc = await db
    .collection("club_state")
    .findOne({ _id: "club" as never });
  // Missing databases begin empty; records are added explicitly by the administrator.
  if (!doc) return createEmptyState();
  const { _id, ...state } = doc;
  return migrateState(state as unknown as ClubState);
}
export async function mutateState<T>(
  mutate: (state: ClubState) => T,
): Promise<T> {
  if (isDemo()) {
    const task = (globalStore.demoLock || Promise.resolve()).then(async () => {
      const state = await readState();
      const result = mutate(state);
      state.revision++;
      await mkdir(path.dirname(statePath), { recursive: true });
      await writeFile(statePath + ".tmp", JSON.stringify(state));
      await rename(statePath + ".tmp", statePath);
      return result;
    });
    globalStore.demoLock = task.catch(() => {});
    return task;
  }
  const db = await database();
  for (let i = 0; i < 8; i++) {
    const state = await readState();
    const revision = state.revision;
    const result = mutate(state);
    state.revision++;
    if (Buffer.byteLength(JSON.stringify(state)) > 12_000_000)
      throw new Error(
        "Dữ liệu gần giới hạn. Hãy xuất bản sao lưu và nâng cấp kho dữ liệu.",
      );
    try {
      const written = await db
        .collection("club_state")
        .replaceOne(
          { _id: "club" as never, revision },
          { ...state, _id: "club" as never },
          { upsert: revision === 0 },
        );
      if (written.modifiedCount || written.upsertedCount) return result;
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  throw new Error("Có cập nhật đồng thời. Vui lòng thử lại.");
}
