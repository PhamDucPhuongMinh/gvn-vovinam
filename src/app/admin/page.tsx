import { authenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Quản lý câu lạc bộ",
  robots: { index: false, follow: false },
};
export default async function Page() {
  if (!(await authenticated())) redirect("/login");
  return <Dashboard />;
}
