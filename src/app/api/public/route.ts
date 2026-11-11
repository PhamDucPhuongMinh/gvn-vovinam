import { readState } from "@/lib/store";
import { errorResponse } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { settings, classes, coaches, media, posts } = await readState();
    const { monthlyFee, dueDay, billingStart, ...publicSettings } = settings;
    return Response.json({
      settings: publicSettings,
      classes,
      coaches,
      media,
      posts: posts.filter((p) => p.published),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
