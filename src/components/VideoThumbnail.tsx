import { Play } from "lucide-react";
export default function VideoThumbnail({
  url,
  thumbnail,
  title,
}: {
  url: string;
  thumbnail?: string;
  title: string;
}) {
  return (
    <a
      className="video-thumbnail"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Xem video: ${title}`}
    >
      {thumbnail && <img src={thumbnail} alt="" loading="lazy" />}
      <span className="video-thumbnail-overlay">
        <span className="video-play">
          <Play size={28} fill="currentColor" />
        </span>
        <span>Xem video</span>
      </span>
    </a>
  );
}
