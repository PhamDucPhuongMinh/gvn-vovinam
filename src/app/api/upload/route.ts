import { createHash } from "node:crypto";
import { requireAdmin, sameOrigin } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const cloud = process.env.CLOUDINARY_CLOUD_NAME,
      key = process.env.CLOUDINARY_API_KEY,
      secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !key || !secret)
      throw new Error(
        "Chưa cấu hình kho ảnh Cloudinary. Bạn có thể dùng liên kết ảnh HTTPS trong lúc chờ kết nối.",
      );
    const form = await req.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      throw new Error("Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.");
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHash("sha1")
      .update(`folder=vovinam&timestamp=${timestamp}${secret}`)
      .digest("hex");
    const upload = new FormData();
    upload.set("file", file);
    upload.set("api_key", key);
    upload.set("timestamp", timestamp);
    upload.set("folder", "vovinam");
    upload.set("signature", signature);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
      { method: "POST", body: upload, signal: AbortSignal.timeout(20000) },
    );
    if (!response.ok)
      throw new Error(
        "Tải ảnh thất bại. Vui lòng kiểm tra kho ảnh và thử lại.",
      );
    const result = await response.json();
    return Response.json({ url: result.secure_url });
  } catch (e) {
    return errorResponse(e);
  }
}
