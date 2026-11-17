import { Children, isValidElement, type ReactNode } from "react";
export function cellText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (
        !isValidElement<{
          children?: ReactNode;
          student?: { name?: string };
          value?: unknown;
        }>(child)
      )
        return String(child);
      if (child.props.student) return child.props.student.name || "";
      if (child.props.value !== undefined) return String(child.props.value);
      return cellText(child.props.children);
    })
    .join(" ")
    .trim();
}
export function sortValue(value: string | number): string | number {
  if (typeof value === "number") return value;
  const text = value.trim();
  if (/^-?[\d.,\s]+\s*(đ|₫|VND)$/i.test(text))
    return Number(text.replace(/[^\d-]/g, ""));
  const date = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (date) return `${date[3]}-${date[2]}-${date[1]}`;
  const month = text.match(/^(\d{2})\/(\d{4})$/);
  if (month) return `${month[2]}-${month[1]}`;
  return text;
}
const collator = new Intl.Collator("vi", {
  numeric: true,
  sensitivity: "base",
});
export function compareCells(left: string | number, right: string | number) {
  const a = sortValue(left),
    b = sortValue(right);
  return typeof a === "number" && typeof b === "number"
    ? a - b
    : collator.compare(String(a), String(b));
}
