import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePostHTML, renderPostBody } from "../src/lib/rich-text";
import { toEditorHTML, postExcerpt } from "../src/lib/post-content";
import {
  videoPresentation,
  allowedVideoFrame,
  safeHTTPS,
} from "../src/lib/video";
import { applyCommand } from "../src/lib/commands";
import { createEmptyState } from "../src/lib/empty-state";
test("formatting, images and safe video survive a sanitized HTML round trip", () => {
  const html =
    '<h2 style="text-align: center;">Tiêu đề</h2><p><strong>Đậm</strong> <em>Nghiêng</em> <u>Gạch chân</u> <span style="font-size: 24px; color: #0063cd;">Màu chữ</span></p><ul><li>Danh sách</li></ul><img src="https://example.com/photo.jpg" alt="Buổi tập"><figure class="article-video" data-video-url="https://youtu.be/dQw4w9WgXcQ"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Video"></iframe></figure><video src="https://example.com/clip.mp4"></video>';
  const clean = sanitizePostHTML(html);
  assert.match(clean, /<strong>Đậm<\/strong>/);
  assert.match(clean, /font-size: 24px/);
  assert.match(clean, /text-align: center/);
  assert.match(clean, /alt="Buổi tập"/);
  assert.match(clean, /youtube-nocookie\.com\/embed/);
  assert.match(clean, /controls/);
  assert.match(clean, /data-video-url=/);
  assert.equal(sanitizePostHTML(clean), clean);
});
test("HTML sanitization strips scripts, event handlers, srcdoc and executable URL schemes", () => {
  const html =
    '<script>alert(1)</script><svg onload="alert(2)"></svg><img src="javascript:alert(3)" onerror="alert(4)"><a href="javascript:alert(5)" onclick="alert(6)">Link</a><iframe src="https://evil.example/embed" srcdoc="<script>alert(7)</script>"></iframe><p style="position:fixed;background:url(javascript:alert(8))">Text</p>';
  const clean = sanitizePostHTML(html);
  assert.doesNotMatch(
    clean,
    /script|onload|onerror|onclick|srcdoc|javascript:|evil\.example|position:|background:/i,
  );
  assert.match(clean, /Text/);
  assert.match(clean, /noopener/);
});
test("plain-text posts keep literal markup and paragraph breaks", () => {
  const original = "Dòng 1\n<script>Ví dụ văn bản</script>\nDòng 3";
  const html = renderPostBody(original);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&#x3C;script>|&lt;script&gt;/);
  assert.match(html, /Dòng 3/);
  assert.equal(toEditorHTML("A & B"), "<p>A &amp; B</p>");
});
test("rich article saving sanitizes HTML and preserves explicit content format", () => {
  const s = createEmptyState();
  applyCommand(s, {
    action: "save_post",
    data: {
      title: "Bài có định dạng",
      slug: "bai-dinh-dang",
      body: "<p><strong>Nội dung</strong></p><script>alert(1)</script>",
      bodyFormat: "html",
      image: "",
      published: true,
      date: "2026-11-10",
    },
  });
  assert.equal(s.posts[0].bodyFormat, "html");
  assert.match(s.posts[0].body, /<strong>Nội dung<\/strong>/);
  assert.doesNotMatch(s.posts[0].body, /script/);
  applyCommand(s, {
    action: "save_post",
    data: {
      title: "Bài cũ",
      slug: "bai-cu",
      body: "<literal text>",
      image: "",
      published: false,
      date: "2026-11-10",
    },
  });
  assert.equal(s.posts[1].body, "<literal text>");
});
test("video thumbnails are saved, editable and optional for legacy records", () => {
  const s = createEmptyState();
  applyCommand(s, {
    action: "save_media",
    data: {
      title: "Buổi tập",
      url: "https://youtu.be/dQw4w9WgXcQ",
      type: "video",
      thumbnail: "https://example.com/thumb.jpg",
    },
  });
  assert.equal(s.media[0].thumbnail, "https://example.com/thumb.jpg");
  applyCommand(s, {
    action: "save_media",
    data: { ...s.media[0], thumbnail: "https://example.com/new-thumb.webp" },
  });
  assert.equal(s.media[0].thumbnail, "https://example.com/new-thumb.webp");
  assert.throws(() =>
    applyCommand(s, {
      action: "save_media",
      data: {
        title: "Bad",
        url: "https://example.com/video",
        type: "video",
        thumbnail: "javascript:alert(1)",
      },
    }),
  );
  applyCommand(s, {
    action: "save_media",
    data: {
      title: "Video cũ",
      url: "https://example.com/video",
      type: "video",
    },
  });
  assert.equal(s.media[1].thumbnail, "");
});
test("video provider URLs become canonical embeds and unsupported sources stay links", () => {
  assert.deepEqual(videoPresentation("https://youtu.be/dQw4w9WgXcQ?t=30"), {
    kind: "embed",
    src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  });
  assert.deepEqual(videoPresentation("https://vimeo.com/123456789"), {
    kind: "embed",
    src: "https://player.vimeo.com/video/123456789",
  });
  assert.equal(
    videoPresentation("https://example.com/clip.mp4?token=123")?.kind,
    "file",
  );
  assert.equal(
    videoPresentation("https://www.facebook.com/club/videos/123")?.kind,
    "link",
  );
  assert.equal(videoPresentation("javascript:alert(1)"), null);
  assert.equal(safeHTTPS("https://user:pass@example.com"), null);
  assert.equal(
    allowedVideoFrame("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"),
    true,
  );
  assert.equal(
    allowedVideoFrame(
      "https://www.youtube-nocookie.com.evil.example/embed/dQw4w9WgXcQ",
    ),
    false,
  );
});
test("post excerpts contain readable text instead of saved HTML tags", () => {
  assert.equal(
    postExcerpt(
      "<p><strong>Tập luyện</strong> &amp; kết nối &#x26; chia sẻ</p>",
      "html",
    ),
    "Tập luyện & kết nối & chia sẻ",
  );
});
