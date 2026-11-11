import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { database, isDemo } from "./store";
const globals = globalThis as typeof globalThis & {
  demoSecret?: string;
  limits?: Map<string, { count: number; until: number }>;
};
function secret() {
  const value = process.env.SESSION_SECRET;
  if (value && value.length >= 32) return new TextEncoder().encode(value);
  if (!isDemo()) throw new Error("SESSION_SECRET phải có ít nhất 32 ký tự.");
  globals.demoSecret ||= randomBytes(32).toString("hex");
  return new TextEncoder().encode(globals.demoSecret);
}
export async function authenticated() {
  const token = (await cookies()).get("vovinam_session")?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "vovinam",
      audience: "admin",
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
export async function requireAdmin() {
  if (!(await authenticated())) throw new Error("UNAUTHORIZED");
}
export async function issueSession() {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("vovinam")
    .setAudience("admin")
    .setExpirationTime("8h")
    .sign(secret());
  (await cookies()).set("vovinam_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 3600,
  });
}
export function checkCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPass =
    process.env.ADMIN_PASSWORD || (isDemo() ? "demo12345" : "");
  if (!expectedPass || (!isDemo() && expectedPass.length < 12))
    throw new Error(
      "Cấu hình ADMIN_PASSWORD tối thiểu 12 ký tự trước khi sử dụng.",
    );
  const actual = scryptSync(password, "vovinam-password-compare", 64);
  const expected = scryptSync(expectedPass, "vovinam-password-compare", 64);
  return timingSafeEqual(actual, expected) && username === expectedUser;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") throw new Error("Yêu cầu không hợp lệ.");
  const source = new URL(origin);
  const host = request.headers.get("host") || new URL(request.url).host;
  if (
    !["http:", "https:"].includes(source.protocol) ||
    source.host !== host ||
    source.username ||
    source.password ||
    (process.env.NODE_ENV === "production" && source.protocol !== "https:")
  )
    throw new Error("Yêu cầu không hợp lệ.");
}
export async function rateLimit(request: Request, key: string, max: number) {
  const ip =
    request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    "local";
  const window = Math.floor(Date.now() / 900000);
  const id = createHash("sha256")
    .update(`${key}:${ip}:${window}`)
    .digest("hex");
  if (isDemo()) {
    globals.limits ||= new Map();
    for (const [k, v] of globals.limits)
      if (v.until < Date.now()) globals.limits.delete(k);
    const item = globals.limits.get(id) || {
      count: 0,
      until: Date.now() + 900000,
    };
    item.count++;
    globals.limits.set(id, item);
    if (item.count > max)
      throw new Error("Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.");
  } else {
    const db = await database();
    await db
      .collection("rate_limits")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    const doc = await db
      .collection("rate_limits")
      .findOneAndUpdate(
        { _id: id as never },
        {
          $inc: { count: 1 },
          $setOnInsert: { expiresAt: new Date(Date.now() + 900000) },
        },
        { upsert: true, returnDocument: "after" },
      );
    if (doc && doc.count > max)
      throw new Error("Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.");
  }
}
