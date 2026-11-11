"use client";
import { useState } from "react";
import FieldLabel from "./FieldLabel";
import Link from "next/link";
import Brand from "./Brand";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
export default function Login({ demo, logo }: { demo: boolean; logo: string }) {
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      window.location.assign("/admin");
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-story">
        <Brand logo={logo} light />
        <div>
          <span className="eyebrow light">KHÔNG GIAN QUẢN TRỊ</span>
          <h1>
            Chăm chút từng
            <br />
            hành trình
            <br />
            <em>trưởng thành.</em>
          </h1>
          <p>
            Quản lý câu lạc bộ gọn gàng hơn.
            <br />
            Dành nhiều thời gian hơn cho võ đường.
          </p>
        </div>
        <span className="login-footer">VOVINAM · VIỆT VÕ ĐẠO</span>
      </div>
      <div className="login-form">
        <Link href="/" className="back-link">
          <ArrowLeft size={18} /> Về website CLB
        </Link>
        <form onSubmit={submit}>
          <div className="icon-box">
            <ShieldCheck />
          </div>
          <h2>Chào mừng trở lại</h2>
          <p className="muted">Đăng nhập để quản lý câu lạc bộ của bạn.</p>
          {demo && (
            <div className="notice">
              Chế độ xem thử cục bộ
              <br />
              Tài khoản: <b>admin</b> · Mật khẩu: <b>demo12345</b>
            </div>
          )}
          <label>
            <FieldLabel>Tên đăng nhập</FieldLabel>
            <input
              name="username"
              autoComplete="username"
              required
              defaultValue={demo ? "admin" : ""}
            />
          </label>
          <label>
            <FieldLabel>Mật khẩu</FieldLabel>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn primary full" disabled={loading}>
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
            <ArrowRight size={18} />
          </button>
          <p className="form-foot">Chỉ dành cho quản trị viên câu lạc bộ.</p>
        </form>
      </div>
    </main>
  );
}
