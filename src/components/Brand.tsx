import Link from "next/link";
export default function Brand({
  logo = "",
  light = false,
}: {
  logo?: string;
  light?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`brand${light ? " light" : ""}`}
      aria-label="Vovinam phường Gò Vấp — Trang chủ"
    >
      {logo ? (
        <img
          src={logo}
          alt="Logo CLB Vovinam phường Gò Vấp"
          className="brand-logo"
        />
      ) : (
        <span className="brand-mark" aria-hidden="true">
          V
        </span>
      )}
      <span>
        VOVINAM<small>PHƯỜNG GÒ VẤP</small>
      </span>
    </Link>
  );
}
