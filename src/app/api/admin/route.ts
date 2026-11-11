import { requireAdmin, sameOrigin } from "@/lib/auth";
import { readState, mutateState, isDemo } from "@/lib/store";
import { applyCommand } from "@/lib/commands";
import { errorResponse, readJson } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return Response.json(
      { state: await readState(), demo: isDemo() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const data = await readJson(req);
    await mutateState((s) => applyCommand(s, data));
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
