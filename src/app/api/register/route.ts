import { z } from "zod";
import { rateLimit, sameOrigin } from "@/lib/auth";
import { mutateState } from "@/lib/store";
import { errorResponse, readJson } from "@/lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rateLimit(req, "register", 5);
    const lead = z
      .object({
        name: z.string().trim().min(2).max(100),
        phone: z
          .string()
          .regex(/^(?:\+84|0)[0-9]{9,10}$/, "Số điện thoại chưa hợp lệ."),
        studentName: z.string().trim().min(2).max(100),
        age: z.number().int().min(5).max(100),
        notes: z.string().max(2000),
        website: z.string().max(0),
        consent: z.literal(true),
      })
      .parse(await readJson(req));
    await mutateState((s) => {
      s.leads.unshift({
        id: crypto.randomUUID(),
        name: lead.name,
        phone: lead.phone,
        studentName: lead.studentName,
        age: lead.age,
        notes: lead.notes,
        status: "Mới",
        createdAt: new Date().toISOString(),
      });
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
