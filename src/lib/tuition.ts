/** Split a total payment into whole VND, assigning the remainder to earlier months. */
export function splitTuition(total: number, months: number): number[] {
  if (
    !Number.isInteger(months) ||
    months < 1 ||
    months > 24 ||
    !Number.isInteger(total) ||
    total < months ||
    total > 1_000_000_000
  )
    throw new Error(
      "Số tiền phải đủ để phân bổ ít nhất 1đ mỗi tháng (1–24 tháng).",
    );
  const base = Math.floor(total / months);
  return Array.from(
    { length: months },
    (_, i) => base + (i < total % months ? 1 : 0),
  );
}
