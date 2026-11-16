export function matchesSelectOption(
  option: { label: string; value: string },
  query: string,
) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase();
  return normalize(`${option.label} ${option.value}`).includes(
    normalize(query.trim()),
  );
}
