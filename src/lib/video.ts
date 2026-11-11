export function safeHTTPS(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function videoPresentation(
  value: string,
): { kind: "embed" | "file" | "link"; src: string } | null {
  const safe = safeHTTPS(value);
  if (!safe) return null;
  const url = new URL(safe);
  let id: string | null = null;
  if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtube-nocookie.com",
      "www.youtube-nocookie.com",
    ].includes(url.hostname)
  ) {
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : url.pathname.match(
            /^\/(?:embed|shorts|live)\/([\w-]{11})(?:\/|$)/,
          )?.[1] || null;
  } else if (url.hostname === "youtu.be")
    id = url.pathname.slice(1).split("/")[0];
  if (id && /^[\w-]{11}$/.test(id))
    return {
      kind: "embed",
      src: `https://www.youtube-nocookie.com/embed/${id}`,
    };
  if (
    ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(url.hostname)
  ) {
    const match = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/);
    if (match)
      return {
        kind: "embed",
        src: `https://player.vimeo.com/video/${match[1]}`,
      };
  }
  if (/\.(?:mp4|webm|ogg)$/i.test(url.pathname))
    return { kind: "file", src: safe };
  return { kind: "link", src: safe };
}
export function allowedVideoFrame(value: string) {
  return (
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}$/.test(value) ||
    /^https:\/\/player\.vimeo\.com\/video\/\d+$/.test(value)
  );
}
