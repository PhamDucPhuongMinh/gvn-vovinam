import { getSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await getSession();
  return Response.json(
    session
      ? { ...session, serverTime: Date.now() }
      : { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." },
    {
      status: session ? 200 : 401,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
