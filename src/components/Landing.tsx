"use client";
import Link from "next/link";
import FieldLabel from "./FieldLabel";
import VideoThumbnail from "./VideoThumbnail";
import Brand from "./Brand";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Menu,
  X,
  MapPin,
  Clock3,
  Phone,
  Heart,
  Shield,
  Sparkles,
  ChevronRight,
  Check,
  Users,
  Play,
} from "lucide-react";
import type { ClubClass, Coach, Media, Post, Settings } from "@/lib/types";
type Props = {
  settings: Omit<Settings, "monthlyFee" | "dueDay" | "billingStart">;
  classes: ClubClass[];
  coaches: Coach[];
  media: Media[];
  posts: Post[];
};
export default function Landing({
  settings: s,
  classes,
  coaches,
  media,
  posts,
}: Props) {
  const [open, setOpen] = useState(false),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          age: Number(data.age),
          consent: data.consent === "on",
        }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const nav = [
    ["Về câu lạc bộ", "#gioi-thieu"],
    ["Lớp học", "#lop-hoc"],
    ["Khoảnh khắc", "#khoanh-khac"],
    ["Tin tức", "#tin-tuc"],
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <div className="top-strip">
        <span>
          <MapPin size={13} /> 1A Nguyễn Oanh, phường Gò Vấp
        </span>
        <a href={`tel:${s.phone}`}>
          <Phone size={13} />
          {s.phone}
        </a>
      </div>
      <header className="site-header">
        <div className="site-nav wrap">
          <Brand logo={s.logo} />
          <nav
            aria-label="Điều hướng chính"
            className={open ? "nav-links open" : "nav-links"}
          >
            {nav.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}
          </nav>
          <a className="btn primary nav-cta" href="#dang-ky">
            Đăng ký học thử <ArrowUpRight size={17} />
          </a>
          <button
            className="mobile-menu"
            aria-label={open ? "Đóng menu" : "Mở menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main">
        <section className="hero wrap">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="live-dot" /> CHÀO ĐÓN VÕ SINH TỪ 5 TUỔI
            </span>
            <h1>
              {s.heroTitle.split("\n").map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </h1>
            <p>{s.heroDescription}</p>
            <div className="hero-buttons">
              <a href="#dang-ky" className="btn primary">
                Bắt đầu với buổi học thử <ArrowUpRight size={19} />
              </a>
              <a href="#gioi-thieu" className="text-link">
                Khám phá CLB <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-facts">
              <div>
                <strong>
                  5<span>+</span>
                </strong>
                <small>Tuổi bắt đầu</small>
              </div>
              <div>
                <strong>02</strong>
                <small>Buổi mỗi tuần</small>
              </div>
              <div>
                <strong>
                  90<span>′</span>
                </strong>
                <small>Rèn luyện mỗi buổi</small>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-top">
              <span>
                VOVINAM
                <br />
                <b>VIỆT VÕ ĐẠO</b>
              </span>
              <span className="visual-stamp">
                GÒ VẤP
                <br />
                TP. HỒ CHÍ MINH
              </span>
            </div>
            <img
              className={s.heroImage ? "hero-photo" : "dojo-art"}
              src={s.heroImage || "/dojo.svg"}
              alt={
                s.heroImage
                  ? "Hoạt động tập luyện tại câu lạc bộ"
                  : "Minh họa võ sinh Vovinam trong võ phục xanh"
              }
            />
            <div className="visual-bottom">
              <span>
                TINH THẦN VIỆT.
                <br />
                <b>HÀNH TRÌNH CỦA BẠN.</b>
              </span>
              <span className="circle-arrow">
                <ArrowUpRight size={28} />
              </span>
            </div>
            <div className="schedule-float">
              <span className="icon-box">
                <Clock3 />
              </span>
              <div>
                <small>HẸN NHAU TẠI VÕ ĐƯỜNG</small>
                <b>Thứ 7 & Chủ nhật</b>
                <span>07:30 – 09:00</span>
              </div>
            </div>
          </div>
        </section>
        <div className="values-strip">
          <div className="wrap">
            <span>
              <Shield size={19} /> Rèn tính kỷ luật
            </span>
            <i />
            <span>
              <Heart size={19} /> Bồi đắp thể chất
            </span>
            <i />
            <span>
              <Users size={19} /> Kết nối bạn bè
            </span>
            <i />
            <span>
              <Sparkles size={19} /> Nuôi dưỡng tự tin
            </span>
          </div>
        </div>
        <section id="gioi-thieu" className="section wrap about-grid">
          <div>
            <span className="eyebrow">MỘT VÕ ĐƯỜNG. NHIỀU HÀNH TRÌNH.</span>
            <h2>
              Học một môn võ.
              <br />
              Mang theo <em>nhiều giá trị.</em>
            </h2>
          </div>
          <div>
            <p className="large-copy">{s.intro}</p>
            <div className="about-points">
              {[
                [
                  "01",
                  "Rèn luyện từ nền tảng",
                  "Làm quen với Vovinam qua những bước tập luyện cơ bản.",
                ],
                [
                  "02",
                  "Cùng nhau tiến bộ",
                  "Tập luyện, sẻ chia và vun đắp tinh thần đồng đội.",
                ],
                [
                  "03",
                  "Một thói quen tích cực",
                  "Dành buổi sáng cuối tuần để vận động và kết nối.",
                ],
              ].map(([n, title, desc]) => (
                <div key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section id="lop-hoc" className="class-section">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  DÀNH MỘT CHÚT THỜI GIAN CHO BẢN THÂN
                </span>
                <h2>
                  Cuối tuần, mình <em>đi tập nhé.</em>
                </h2>
              </div>
              <p>
                Chào đón người học từ 5 tuổi.
                <br />
                Liên hệ CLB để được tư vấn lớp phù hợp.
              </p>
            </div>
            <div className="class-grid">
              {classes.map((c) => (
                <article className="class-card" key={c.id}>
                  <span className="pill">VOVINAM · TỪ 5 TUỔI</span>
                  <h3>{c.name}</h3>
                  <p className="class-schedule">
                    <Clock3 size={21} />
                    {c.schedule}
                  </p>
                  <p>
                    <MapPin size={19} />
                    {c.location}
                  </p>
                  {c.coach && (
                    <p>
                      <Users size={19} />
                      {c.coach}
                    </p>
                  )}
                  <a href="#dang-ky" className="btn primary">
                    Đăng ký học thử <ArrowUpRight size={19} />
                  </a>
                </article>
              ))}
              <div className="class-note">
                <span className="note-number">01</span>
                <h3>
                  Buổi tập đầu tiên,
                  <br />
                  một khởi đầu mới.
                </h3>
                <p>
                  Chưa từng học võ? Hãy để lại thông tin. CLB sẽ liên hệ, giải
                  đáp thắc mắc và hướng dẫn bạn chuẩn bị cho buổi học thử.
                </p>
                <a
                  className="text-link"
                  href={`https://zalo.me/${s.phone}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Trao đổi qua Zalo <ArrowUpRight size={17} />
                </a>
              </div>
            </div>
          </div>
        </section>
        <section className="section wrap" id="huan-luyen-vien">
          <div className="section-heading">
            <div>
              <span className="eyebrow">NGƯỜI ĐỒNG HÀNH</span>
              <h2>
                Cùng bạn trên <em>từng bước tập.</em>
              </h2>
            </div>
          </div>
          {coaches.length ? (
            <div className="coach-grid">
              {coaches.map((c) => (
                <article className="coach-card" key={c.id}>
                  {c.image ? (
                    <img src={c.image} alt={c.name} loading="lazy" />
                  ) : (
                    <div className="coach-initial">{c.name.charAt(0)}</div>
                  )}
                  <div>
                    <small>{c.role}</small>
                    <h3>{c.name}</h3>
                    <p>{c.bio}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="contact-band">
              <Users size={28} />
              <p>Tìm hiểu về đội ngũ hướng dẫn và cách tập luyện tại CLB.</p>
              <a href={`tel:${s.phone}`} className="text-link">
                Liên hệ tư vấn <ArrowUpRight size={18} />
              </a>
            </div>
          )}
          {s.achievements && (
            <div className="achievement-panel">
              <span className="eyebrow">DẤU ẤN CÂU LẠC BỘ</span>
              <h3>Những nỗ lực đáng tự hào</h3>
              <p className="preserve">{s.achievements}</p>
            </div>
          )}
        </section>
        <section id="khoanh-khac" className="gallery-section">
          <div className="wrap">
            <div className="section-heading">
              <div>
                <span className="eyebrow">NHỊP SỐNG VÕ ĐƯỜNG</span>
                <h2>
                  Không chỉ là <em>những buổi tập.</em>
                </h2>
              </div>
              <a
                href={s.facebook}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                Theo dõi Facebook <ArrowUpRight size={18} />
              </a>
            </div>
            {media.length ? (
              <div className="gallery-grid">
                {media.map((m) => (
                  <figure key={m.id}>
                    {m.type === "image" ? (
                      <img src={m.url} alt={m.title} loading="lazy" />
                    ) : (
                      <VideoThumbnail
                        url={m.url}
                        thumbnail={m.thumbnail}
                        title={m.title}
                      />
                    )}
                    <figcaption>{m.title}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="gallery-invite">
                <span className="giant-type">VOVINAM</span>
                <div>
                  <p>Mỗi buổi tập, thêm một câu chuyện.</p>
                  <a
                    href={s.facebook}
                    className="btn outline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ghé thăm câu lạc bộ trên Facebook <ArrowUpRight size={18} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>
        <section id="tin-tuc" className="section wrap">
          <div className="section-heading">
            <div>
              <span className="eyebrow">KẾT NỐI CÙNG CLB</span>
              <h2>
                Tin từ <em>võ đường.</em>
              </h2>
            </div>
          </div>
          {posts.length ? (
            <div className="post-grid">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/tin-tuc/${p.slug}`}
                  className="post-card"
                >
                  {p.image && <img src={p.image} alt="" loading="lazy" />}
                  <small>{p.date.split("-").reverse().join("/")}</small>
                  <h3>{p.title}</h3>
                  <span className="text-link">
                    Đọc bài viết <ArrowRight size={17} />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="contact-band">
              <p>
                Theo dõi lịch hoạt động và thông báo mới trên các kênh chính
                thức của CLB.
              </p>
              <a
                className="text-link"
                href={s.tiktok}
                target="_blank"
                rel="noreferrer"
              >
                Khám phá TikTok <ArrowUpRight size={18} />
              </a>
            </div>
          )}
        </section>
        <section id="dang-ky" className="register-section">
          <div className="wrap register-grid">
            <div>
              <span className="eyebrow light">HÀNH TRÌNH BẮT ĐẦU TỪ ĐÂY</span>
              <h2>
                Một buổi học thử.
                <br />
                <em>Một cơ hội khám phá.</em>
              </h2>
              <p>
                Để lại thông tin, CLB sẽ gọi lại để tư vấn và sắp xếp buổi học
                thử phù hợp.
              </p>
              <a className="register-phone" href={`tel:${s.phone}`}>
                <Phone size={23} />
                {s.phone}
                <ArrowUpRight size={24} />
              </a>
              <div className="register-location">
                <MapPin size={20} />
                <span>{s.address}</span>
              </div>
              <div className="register-location">
                <Clock3 size={20} />
                <span>{s.schedule}</span>
              </div>
              <a
                className="map-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`}
                target="_blank"
                rel="noreferrer"
              >
                Xem đường đi trên Google Maps <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="register-form">
              {sent ? (
                <div className="success-message" role="status">
                  <span className="success-icon">
                    <Check size={32} />
                  </span>
                  <h3>Hẹn gặp bạn tại võ đường!</h3>
                  <p>
                    CLB đã nhận được thông tin và sẽ liên hệ qua số điện thoại
                    bạn cung cấp.
                  </p>
                  <button
                    className="btn secondary"
                    onClick={() => setSent(false)}
                  >
                    Đăng ký thêm người học
                  </button>
                </div>
              ) : (
                <form onSubmit={register}>
                  <h3>Đăng ký học thử</h3>
                  <p className="muted">
                    Điền thông tin để CLB liên hệ với bạn.
                  </p>
                  <label>
                    <FieldLabel>Họ tên người liên hệ</FieldLabel>
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Ví dụ: Nguyễn Minh Anh"
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    <FieldLabel>Số điện thoại</FieldLabel>
                    <input
                      name="phone"
                      type="tel"
                      required
                      pattern="(\+84|0)[0-9]{9,10}"
                      placeholder="Số điện thoại liên hệ"
                      autoComplete="tel"
                    />
                  </label>
                  <div className="form-row">
                    <label>
                      <FieldLabel>Họ tên người học</FieldLabel>
                      <input
                        name="studentName"
                        required
                        minLength={2}
                        maxLength={100}
                        placeholder="Tên người học"
                      />
                    </label>
                    <label className="age-field">
                      <FieldLabel>Tuổi</FieldLabel>
                      <input
                        name="age"
                        required
                        type="number"
                        min={5}
                        max={100}
                        placeholder="Từ 5 tuổi"
                      />
                    </label>
                  </div>
                  <label>
                    Lời nhắn <span className="muted">(không bắt buộc)</span>
                    <textarea
                      name="notes"
                      maxLength={2000}
                      rows={2}
                      placeholder="Bạn muốn CLB tư vấn thêm điều gì?"
                    />
                  </label>
                  <label className="honeypot" aria-hidden="true">
                    Website
                    <input name="website" tabIndex={-1} autoComplete="off" />
                  </label>
                  <label className="checkbox-label">
                    <input name="consent" type="checkbox" required />
                    <FieldLabel>
                      Tôi đồng ý để CLB sử dụng thông tin trên để liên hệ tư vấn
                      học thử.
                    </FieldLabel>
                  </label>
                  {error && (
                    <p className="error" role="alert">
                      {error}
                    </p>
                  )}
                  <button disabled={busy} className="btn primary full">
                    {busy ? "Đang gửi…" : "Gửi đăng ký học thử"}
                    <ArrowUpRight size={18} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <footer className="site-footer wrap">
        <div className="footer-top">
          <Brand logo={s.logo} />
          <p>
            Rèn thân thể. Dưỡng tinh thần.
            <br />
            Cùng nhau trưởng thành.
          </p>
          <div>
            <a href={s.facebook} target="_blank" rel="noreferrer">
              Facebook <ArrowUpRight size={15} />
            </a>
            <a href={s.tiktok} target="_blank" rel="noreferrer">
              TikTok <ArrowUpRight size={15} />
            </a>
            <a
              href={`https://zalo.me/${s.phone}`}
              target="_blank"
              rel="noreferrer"
            >
              Zalo <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <small>
            © {new Date().getFullYear()} {s.name}
          </small>
          <Link href="/login">
            Quản trị câu lạc bộ <ChevronRight size={14} />
          </Link>
        </div>
      </footer>
    </>
  );
}
