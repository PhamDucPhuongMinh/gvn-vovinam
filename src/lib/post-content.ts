export function escapeHTML(text: string) {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
export function toEditorHTML(body: string, format?: "text" | "html") {
  return format === "html"
    ? body
    : body
        .split(/\r?\n/)
        .map((line) => `<p>${escapeHTML(line) || "<br>"}</p>`)
        .join("");
}
export function postExcerpt(
  body: string,
  format?: "text" | "html",
  length = 160,
) {
  const text =
    format === "html"
      ? body
          .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
          .replace(/<[^>]*>/g, " ")
          .replace(
            /&(?:nbsp|amp|lt|gt|quot|#39);/g,
            (entity) =>
              ({
                "&nbsp;": " ",
                "&amp;": "&",
                "&lt;": "<",
                "&gt;": ">",
                "&quot;": '"',
                "&#39;": "'",
              })[entity]!,
          )
      : body;
  return text
    .replace(/&#(x[0-9a-f]+|[0-9]+);/gi, (entity, code: string) => {
      const value = code.toLowerCase().startsWith("x")
        ? parseInt(code.slice(1), 16)
        : parseInt(code, 10);
      return value > 0 && value <= 0x10ffff
        ? String.fromCodePoint(value)
        : entity;
    })
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, length);
}
