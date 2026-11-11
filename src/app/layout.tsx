import type { Metadata } from "next";
import { readState } from "@/lib/store";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
const siteMetadata: Metadata = {
  title: {
    default: "Vovinam Gò Vấp · Khỏe thể chất, vững tinh thần",
    template: "%s | Vovinam Gò Vấp",
  },
  description:
    "Câu lạc bộ Vovinam phường Gò Vấp. Chiêu sinh từ 5 tuổi, tập Thứ 7 và Chủ nhật, 7h30–9h tại 1A Nguyễn Oanh. Đăng ký học thử hoặc liên hệ 0968969392.",
  robots: { index: true, follow: true },
};
export async function generateMetadata(): Promise<Metadata> {
  let icon = "/brand-icon.svg";
  try {
    const { settings } = await readState();
    if (settings.logo) icon = settings.logo;
  } catch {
    // Keep the site icon available while the database is unreachable.
  }
  return {
    ...siteMetadata,
    icons: { icon, shortcut: icon },
  };
}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
