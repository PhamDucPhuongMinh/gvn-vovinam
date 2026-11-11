import Login from "@/components/Login";
import { isDemo, readState } from "@/lib/store";
import { authenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
export const metadata = {
  title: "Đăng nhập quản trị",
  robots: { index: false, follow: false },
};
export default async function Page() {
  if (await authenticated()) redirect("/admin");
  let logo = "";
  try {
    logo = (await readState()).settings.logo;
  } catch {}
  return <Login demo={isDemo()} logo={logo} />;
}
