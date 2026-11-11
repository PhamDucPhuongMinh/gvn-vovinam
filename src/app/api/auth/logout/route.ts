import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    (await cookies()).delete("vovinam_session");
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
