export const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const currentMonth = () => today().slice(0, 7);
export const displayDate = (s: string) =>
  !s ? "Chưa có ngày" : s.split("-").reverse().join("/");
export const monthLabel = (s: string) => s.split("-").reverse().join("/");
export const uid = () => crypto.randomUUID();
