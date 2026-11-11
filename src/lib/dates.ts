// Calendar values are local date-only strings; never convert through UTC.
export function parseCalendarValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) return null;
  const [year, month, day = 1] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}
export function formatCalendarValue(
  date: Date | null,
  mode: "date" | "month" = "date",
): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return mode === "month"
    ? month
    : `${month}-${String(date.getDate()).padStart(2, "0")}`;
}
