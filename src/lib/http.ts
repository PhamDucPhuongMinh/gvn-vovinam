import { z } from "zod";
export function errorResponse(e: unknown) {
  const message =
    e instanceof z.ZodError
      ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      : e instanceof Error
        ? e.message
        : "Không thể xử lý yêu cầu.";
  const unauthorized = message === "UNAUTHORIZED";
  const known =
    unauthorized ||
    e instanceof z.ZodError ||
    !/(mongo|connect|ECONN|URI|ENOTFOUND|SSL|certificate)/i.test(message);
  if (!known) console.error("Storage request failed");
  return Response.json(
    {
      error: unauthorized
        ? "Vui lòng đăng nhập."
        : known
          ? message
          : "Không thể kết nối cơ sở dữ liệu. Kiểm tra cấu hình máy chủ.",
    },
    {
      status: unauthorized ? 401 : 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function readJson(request: Request) {
  const raw = await request.text();
  if (raw.length > 1_000_000) throw new Error("Dữ liệu quá lớn.");
  return JSON.parse(raw);
}
