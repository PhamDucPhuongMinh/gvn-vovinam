import { readState } from "@/lib/store";
import { notFound } from "next/navigation";
import Link from "next/link";
import { renderPostBody } from "@/lib/rich-text";
export const dynamic = "force-dynamic";
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = await readState();
  const p = s.posts.find((p) => p.published && p.slug === slug);
  if (!p) notFound();
  return (
    <main className="article-page wrap">
      <Link className="text-link" href="/#tin-tuc">
        ← Về trang chủ
      </Link>
      <p className="eyebrow">
        TIN TỪ VÕ ĐƯỜNG · {p.date.split("-").reverse().join("/")}
      </p>
      <h1>{p.title}</h1>
      {p.image && <img src={p.image} alt={p.title} />}
      <div
        className="article-body"
        dangerouslySetInnerHTML={{
          __html: renderPostBody(p.body, p.bodyFormat),
        }}
      />
      <a href="/#dang-ky" className="btn primary">
        Đăng ký học thử
      </a>
    </main>
  );
}
