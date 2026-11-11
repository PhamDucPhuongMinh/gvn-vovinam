"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, Color, FontSize } from "@tiptap/extension-text-style";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  Unlink,
  ImagePlus,
  Video,
  Undo2,
  Redo2,
  RemoveFormatting,
  Upload,
  X,
} from "lucide-react";
import { safeHTTPS, videoPresentation } from "@/lib/video";
import type { DOMOutputSpec } from "@tiptap/pm/model";

const VideoBlock = Node.create({
  name: "videoBlock",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      url: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-video-url"),
        renderHTML: (attrs) => ({ "data-video-url": attrs.url }),
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure[data-video-url]",
        getAttrs: (element) =>
          safeHTTPS(element.getAttribute("data-video-url") || "") ? {} : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const media = videoPresentation(
      String(HTMLAttributes["data-video-url"] || ""),
    );
    if (!media) return ["p", {}, "Video không hợp lệ"];
    const child: DOMOutputSpec =
      media.kind === "embed"
        ? [
            "iframe",
            {
              src: media.src,
              title: "Video trong bài viết",
              loading: "lazy",
              allowfullscreen: "true",
              sandbox: "allow-scripts allow-same-origin allow-presentation",
              referrerpolicy: "strict-origin-when-cross-origin",
            },
          ]
        : media.kind === "file"
          ? [
              "video",
              {
                src: media.src,
                controls: "",
                playsinline: "",
                preload: "metadata",
              },
            ]
          : [
              "a",
              { href: media.src, target: "_blank", rel: "noopener noreferrer" },
              "Xem video tại nguồn",
            ];
    const attributes = mergeAttributes(HTMLAttributes, {
      class: "article-video",
    });
    const caption: DOMOutputSpec = [
      "figcaption",
      {},
      [
        "a",
        {
          href: String(HTMLAttributes["data-video-url"]),
          target: "_blank",
          rel: "noopener noreferrer",
        },
        "Mở video tại nguồn",
      ],
    ];
    return media.kind === "link"
      ? ["figure", attributes, child]
      : ["figure", attributes, child, caption];
  },
});
type Props = {
  value: string;
  onChange: (html: string) => void;
  onPendingChange?: (pending: boolean) => void;
};
export default function RichTextEditor({
  value,
  onChange,
  onPendingChange,
}: Props) {
  const [panel, setPanel] = useState<"image" | "video" | "link" | null>(null),
    [url, setURL] = useState(""),
    [alt, setAlt] = useState(""),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
        },
      }),
      Image.configure({ allowBase64: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      FontSize,
      VideoBlock,
    ],
    content: value,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Nội dung bài viết",
        "aria-multiline": "true",
        class: "rich-editor-content",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => () => controller.current?.abort(), []);
  function showPanel(next: typeof panel) {
    setPanel(panel === next ? null : next);
    setURL(next === "link" ? editor?.getAttributes("link").href || "" : "");
    setAlt("");
    setError("");
  }
  function insertBlock(content: JSONContent) {
    if (!editor) return;
    const selection = editor.state.selection;
    if (selection instanceof NodeSelection)
      editor.chain().focus().insertContentAt(selection.to, content).run();
    else editor.chain().focus().insertContent(content).run();
  }
  function insert() {
    if (!editor || !panel) return;
    const src = safeHTTPS(url);
    if (!src) {
      setError("Vui lòng nhập liên kết HTTPS hợp lệ.");
      return;
    }
    if (panel === "image") insertBlock({ type: "image", attrs: { src, alt } });
    else if (panel === "video")
      insertBlock({ type: "videoBlock", attrs: { url: src } });
    else
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: src, target: "_blank" })
        .run();
    setPanel(null);
    setURL("");
    setError("");
  }
  async function upload(image: File) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(image.type) ||
      image.size > 5 * 1024 * 1024
    ) {
      setError("Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.");
      return;
    }
    setUploading(true);
    onPendingChange?.(true);
    setError("");
    controller.current = new AbortController();
    try {
      const form = new FormData();
      form.set("file", image);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: form,
        signal: controller.current.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const src = safeHTTPS(result.url);
      if (!src) throw new Error("Kho ảnh trả về liên kết không hợp lệ.");
      insertBlock({ type: "image", attrs: { src, alt } });
      setPanel(null);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setUploading(false);
      onPendingChange?.(false);
      if (file.current) file.current.value = "";
    }
  }
  function tool(
    label: string,
    icon: React.ReactNode,
    action: () => void,
    active = false,
    disabled = false,
  ) {
    return (
      <button
        type="button"
        className={active ? "active" : ""}
        title={label}
        aria-label={label}
        aria-pressed={active}
        disabled={!editor || uploading || disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={action}
      >
        {icon}
      </button>
    );
  }
  if (!editor)
    return (
      <div className="rich-editor-loading" role="status">
        Đang mở trình soạn thảo…
      </div>
    );
  return (
    <div className="rich-editor">
      <div
        className="rich-toolbar"
        role="toolbar"
        aria-label="Định dạng nội dung"
      >
        <select
          aria-label="Kiểu đoạn văn"
          value={
            editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
                ? "h3"
                : "p"
          }
          onChange={(e) =>
            e.target.value === "p"
              ? editor.chain().focus().setParagraph().run()
              : editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: e.target.value === "h2" ? 2 : 3 })
                  .run()
          }
        >
          <option value="p">Đoạn văn</option>
          <option value="h2">Tiêu đề lớn</option>
          <option value="h3">Tiêu đề nhỏ</option>
        </select>
        <select
          aria-label="Cỡ chữ"
          value={editor.getAttributes("textStyle").fontSize || "16px"}
          onChange={(e) =>
            editor.chain().focus().setFontSize(e.target.value).run()
          }
        >
          {[12, 14, 16, 18, 20, 24, 28, 32].map((n) => (
            <option key={n} value={`${n}px`}>
              {n}px
            </option>
          ))}
        </select>
        {tool(
          "In đậm",
          <Bold size={16} />,
          () => editor.chain().focus().toggleBold().run(),
          editor.isActive("bold"),
        )}
        {tool(
          "In nghiêng",
          <Italic size={16} />,
          () => editor.chain().focus().toggleItalic().run(),
          editor.isActive("italic"),
        )}
        {tool(
          "Gạch chân",
          <Underline size={16} />,
          () => editor.chain().focus().toggleUnderline().run(),
          editor.isActive("underline"),
        )}
        {tool(
          "Gạch ngang",
          <Strikethrough size={16} />,
          () => editor.chain().focus().toggleStrike().run(),
          editor.isActive("strike"),
        )}
        <label className="rich-color" title="Màu chữ">
          <span className="sr-only">Màu chữ</span>
          <input
            type="color"
            aria-label="Màu chữ"
            value={
              /^#[0-9a-f]{6}$/i.test(
                editor.getAttributes("textStyle").color || "",
              )
                ? editor.getAttributes("textStyle").color
                : "#19334d"
            }
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
          />
        </label>
        <span className="rich-divider" />
        {tool(
          "Danh sách chấm",
          <List size={16} />,
          () => editor.chain().focus().toggleBulletList().run(),
          editor.isActive("bulletList"),
        )}
        {tool(
          "Danh sách đánh số",
          <ListOrdered size={16} />,
          () => editor.chain().focus().toggleOrderedList().run(),
          editor.isActive("orderedList"),
        )}
        {tool(
          "Trích dẫn",
          <Quote size={16} />,
          () => editor.chain().focus().toggleBlockquote().run(),
          editor.isActive("blockquote"),
        )}
        {tool(
          "Căn trái",
          <AlignLeft size={16} />,
          () => editor.chain().focus().setTextAlign("left").run(),
          editor.isActive({ textAlign: "left" }),
        )}
        {tool(
          "Căn giữa",
          <AlignCenter size={16} />,
          () => editor.chain().focus().setTextAlign("center").run(),
          editor.isActive({ textAlign: "center" }),
        )}
        {tool(
          "Căn phải",
          <AlignRight size={16} />,
          () => editor.chain().focus().setTextAlign("right").run(),
          editor.isActive({ textAlign: "right" }),
        )}
        <span className="rich-divider" />
        {tool(
          "Chèn liên kết",
          <Link2 size={16} />,
          () => showPanel("link"),
          editor.isActive("link"),
        )}
        {tool(
          "Bỏ liên kết",
          <Unlink size={16} />,
          () => editor.chain().focus().unsetLink().run(),
          false,
          !editor.isActive("link"),
        )}
        {tool(
          "Chèn ảnh",
          <ImagePlus size={16} />,
          () => showPanel("image"),
          panel === "image",
        )}
        {tool(
          "Chèn video",
          <Video size={16} />,
          () => showPanel("video"),
          panel === "video",
        )}
        {tool("Bỏ định dạng", <RemoveFormatting size={16} />, () =>
          editor.chain().focus().unsetAllMarks().clearNodes().run(),
        )}
        {tool(
          "Hoàn tác",
          <Undo2 size={16} />,
          () => editor.chain().focus().undo().run(),
          false,
          !editor.can().undo(),
        )}
        {tool(
          "Làm lại",
          <Redo2 size={16} />,
          () => editor.chain().focus().redo().run(),
          false,
          !editor.can().redo(),
        )}
      </div>
      {panel && (
        <fieldset className="rich-insert-panel" disabled={uploading}>
          <legend>
            {panel === "image"
              ? "Chèn ảnh"
              : panel === "video"
                ? "Chèn video"
                : "Chèn liên kết"}
          </legend>
          <label>
            {panel === "image"
              ? "Liên kết ảnh HTTPS"
              : panel === "video"
                ? "Liên kết video HTTPS"
                : "Địa chỉ liên kết"}
            <input
              aria-label={
                panel === "image"
                  ? "Liên kết ảnh trong bài"
                  : panel === "video"
                    ? "Liên kết video trong bài"
                    : "Địa chỉ liên kết trong bài"
              }
              type="url"
              value={url}
              onChange={(e) => setURL(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insert();
                }
              }}
              placeholder="https://…"
            />
          </label>
          {panel === "image" && (
            <label>
              Mô tả ảnh
              <input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Mô tả ngắn cho người đọc"
              />
            </label>
          )}
          {panel === "video" && (
            <p className="field-hint">
              YouTube, Vimeo và video MP4/WebM/OGG có thể phát trong bài. Liên
              kết Facebook/TikTok mở tại trang nguồn.
            </p>
          )}
          <div className="rich-insert-actions">
            <button type="button" className="btn secondary" onClick={insert}>
              Chèn vào bài
            </button>
            {panel === "image" && (
              <button
                type="button"
                className="btn outline"
                onClick={() => file.current?.click()}
              >
                <Upload size={14} />
                {uploading ? "Đang tải…" : "Tải ảnh từ máy"}
              </button>
            )}
            <button
              type="button"
              className="table-action"
              onClick={() => setPanel(null)}
              aria-label="Đóng khung chèn nội dung"
            >
              <X size={16} />
            </button>
          </div>
        </fieldset>
      )}
      <input
        ref={file}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        style={{ display: "none" }}
        aria-label="Tải ảnh vào bài viết"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <EditorContent editor={editor} />
      <p className="rich-editor-hint">
        Định dạng văn bản, chèn ảnh hoặc video tại vị trí con trỏ. Chọn
        ảnh/video rồi nhấn Delete để xóa.
      </p>
    </div>
  );
}
