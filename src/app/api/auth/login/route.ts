import {
  checkCredentials,
  issueSession,
  rateLimit,
  sameOrigin,
} from "@/lib/auth";
import { errorResponse, readJson } from "@/lib/http";
import { z } from "zod";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rateLimit(req, "login", 8);
    const { username, password } = z
      .object({ username: z.string().max(100), password: z.string().max(200) })
      .parse(await readJson(req));
    if (!checkCredentials(username, password))
      return Response.json(
        { error: "Tên đăng nhập hoặc mật khẩu chưa đúng." },
        { status: 401 },
      );
    await issueSession();
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
