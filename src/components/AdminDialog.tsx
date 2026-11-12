"use client";
import { useEffect, useRef, useState } from "react";
import FieldLabel from "./FieldLabel";
import dynamic from "next/dynamic";
import { toEditorHTML } from "@/lib/post-content";
const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => <p role="status">Đang mở trình soạn thảo…</p>,
});
import { X, Upload, Plus, Trash2 } from "lucide-react";
import type { ClubState, Exam } from "@/lib/types";
import DateInput from "./DateInput";
import { BELTS } from "@/lib/constants";
import { money, today, currentMonth } from "@/lib/utils";
export type DialogSpec = { kind: string; item?: Record<string, unknown> };
type Props = {
  spec: DialogSpec;
  state: ClubState;
  close: () => void;
  save: (action: string, data: unknown) => Promise<boolean>;
};
export function ImageField({
  name,
  label,
  initial = "",
  required = false,
}: {
  name: string;
  label: string;
  initial?: string;
  required?: boolean;
}) {
  const [url, setUrl] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  async function upload(f: File) {
    setBusy(true);
    setError("");
    try {
      const data = new FormData();
      data.set("file", f);
      const r = await fetch("/api/upload", { method: "POST", body: data });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setUrl(j.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <label>
        <FieldLabel required={required}>{label}</FieldLabel>
        <div className="upload-field">
          <input
            name={name}
            type="url"
            required={required}
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="button"
            className="btn secondary"
            disabled={busy}
            onClick={() => file.current?.click()}
          >
            <Upload size={14} />
            {busy ? "Đang tải…" : "Tải ảnh"}
          </button>
        </div>
      </label>
      <input
        ref={file}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        aria-label={`Chọn ${label}`}
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {url && <img className="upload-preview" src={url} alt="Ảnh đã chọn" />}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export default function AdminDialog({
  spec: { kind, item },
  state: s,
  close,
  save,
}: Props) {
  const [postBody, setPostBody] = useState(() =>
    toEditorHTML(
      String(item?.body || ""),
      item?.bodyFormat as "text" | "html" | undefined,
    ),
  );
  const [editorBusy, setEditorBusy] = useState(false);
  const [mediaType, setMediaType] = useState(String(item?.type || "image"));
  const locked = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [payStudent, setPayStudent] = useState(
      String(
        item?.studentId ||
          s.students.find((x) => x.status === "active")?.id ||
          "",
      ),
    ),
    [period, setPeriod] = useState(String(item?.month || currentMonth())),
    [months, setMonths] = useState(1),
    [payAmount, setPayAmount] = useState(s.settings.monthlyFee);
  const [entryKind, setEntryKind] = useState(
    String(item?.kind || (kind === "payment" ? "tuition" : "expense")),
  );
  const [editStudent, setEditStudent] = useState(String(item?.studentId || ""));
  const [allocations, setAllocations] = useState<
    { month: string; amount: number }[]
  >(
    (
      (item?.allocations as { billId: string; amount: number }[] | undefined) ||
      []
    ).map((a) => ({
      month: s.bills.find((b) => b.id === a.billId)?.month || currentMonth(),
      amount: a.amount,
    })),
  );
  const [results, setResults] = useState<Exam["results"]>(
    (item?.results as Exam["results"]) || [],
  );
  const [csv, setCsv] = useState(""),
    [preview, setPreview] = useState<Record<string, string>[]>([]);
  locked.current = busy || editorBusy;
  const val = (name: string, fallback: unknown = "") =>
    String(item?.[name] ?? fallback);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current
      ?.querySelector<HTMLElement>("input,select,textarea,button")
      ?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape" && !locked.current) close();
      if (e.key === "Tab") {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not([type=hidden]):not([style*="display: none"]),select,textarea,[href]',
          ) || [],
        ).filter((n) => n.offsetParent !== null);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", key);
      prior?.focus();
    };
  }, [close]);
  function input(
    name: string,
    label: string,
    type = "text",
    fallback: unknown = "",
    required = true,
  ) {
    if (type === "date" || type === "month")
      return (
        <label>
          <FieldLabel required={required}>{label}</FieldLabel>
          <DateInput
            name={name}
            label={label}
            mode={type}
            defaultValue={val(name, fallback)}
            required={required}
          />
        </label>
      );
    return (
      <label>
        <FieldLabel required={required}>{label}</FieldLabel>
        <input
          name={name}
          type={type}
          defaultValue={val(name, fallback)}
          required={required}
          min={type === "number" ? 0 : undefined}
          maxLength={type === "text" ? 500 : undefined}
        />
      </label>
    );
  }
  function area(name: string, label: string, rows = 3) {
    return (
      <label>
        {label}
        <textarea name={name} defaultValue={val(name)} rows={rows} />
      </label>
    );
  }
  function studentOptions() {
    return s.students.map((st) => (
      <option key={st.id} value={st.id}>
        {st.name}
        {st.status === "inactive" ? " · Đã nghỉ" : ""}
      </option>
    ));
  }
  function parseCsv() {
    try {
      const rows = csv.trim().split(/\r?\n/).filter(Boolean);
      const delimiter = rows[0]?.includes("\t") ? "\t" : ";";
      if (rows.length < 2)
        throw new Error("Cần một dòng tiêu đề và ít nhất một dòng dữ liệu.");
      const values = rows.slice(1).map((line, i) => {
        const [name, joined, status, notes = ""] = line
          .split(delimiter)
          .map((v) => v.trim());
        if (
          !name ||
          !/^20\d{2}-(0[1-9]|1[0-2])$/.test(joined) ||
          !["Đang học", "Đã nghỉ"].includes(status)
        )
          throw new Error(
            `Dòng ${i + 2}: kiểm tra tên, tháng YYYY-MM và trạng thái.`,
          );
        return {
          name,
          joined,
          status: status === "Đang học" ? "active" : "inactive",
          notes,
        };
      });
      setPreview(values);
      setError("");
    } catch (e) {
      setPreview([]);
      setError((e as Error).message);
    }
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editorBusy) {
      setError("Vui lòng đợi tải ảnh hoàn tất.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data: Record<string, unknown> = Object.fromEntries(
        new FormData(e.currentTarget),
      );
      if (item?.id) data.id = item.id;
      let action = `save_${kind}`;
      if ((kind === "payment" || kind === "entry") && entryKind === "tuition") {
        action = "pay";
        data.studentId = payStudent;
        data.period = period;
        data.months = months;
        data.totalAmount = payAmount;
      }
      if ((kind === "entry" || kind === "payment") && entryKind !== "tuition") {
        data.kind = entryKind;
        if (entryKind === "income") data.category = "Tiền khác";
        if (entryKind === "purchase") data.category = "Nhập hàng";
        if (entryKind === "sale") data.category = "Bán hàng";
        action = "entry";
        data.amount = Number(data.amount);
        data.cost = Number(data.cost || 0);
        data.quantity = Number(data.quantity || 1);
      }
      if (kind === "generate") {
        action = "generate_bills";
        data.amount = Number(data.amount);
        delete data.id;
      }
      if (kind === "edit_entry") {
        action = "edit_entry";
        data.entryId = item?.id;
        delete data.id;
        data.kind = entryKind;
        if (entryKind !== item?.kind) {
          if (entryKind === "income") data.category = "Tiền khác";
          if (entryKind === "purchase") data.category = "Nhập hàng";
          if (entryKind === "sale") data.category = "Bán hàng";
        }
        data.amount =
          entryKind === "tuition"
            ? allocations.reduce((sum, a) => sum + a.amount, 0)
            : Number(data.amount);
        data.cost = Number(data.cost || 0);
        data.quantity = Number(data.quantity || 1);
        if (entryKind === "tuition") {
          data.studentId = editStudent;
          data.periods = allocations;
        }
      }
      if (kind === "post") data.published = data.published === "on";
      if (kind === "exam") data.results = results;
      if (kind === "student" && !data.left) delete data.left;
      if (kind === "import") {
        if (!preview.length)
          throw new Error("Vui lòng kiểm tra dữ liệu trước khi nhập.");
        action = "import_students";
      }
      if (kind === "adjust") {
        action = "adjust_bill";
        data.billId = item?.id;
        data.amount = Number(data.amount);
        delete data.id;
      }
      if (kind === "resolve") {
        action = "resolve_date";
        data.entryId = item?.id;
        delete data.id;
      }
      if (kind === "void") {
        action = "void_entry";
        data.entryId = item?.id;
        delete data.id;
      }
      const ok = await save(action, kind === "import" ? preview : data);
      if (ok) close();
      else
        setError("Chưa lưu được. Xem thông báo lỗi và kiểm tra lại thông tin.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const titles: Record<string, string> = {
    student: item ? "Chỉnh sửa võ sinh" : "Thêm võ sinh",
    payment: "Thêm giao dịch",
    entry: "Thêm giao dịch",
    edit_entry: "Chỉnh sửa giao dịch",
    generate: "Lập khoản phải thu",
    class: "Thông tin lớp học",
    coach: "Thông tin huấn luyện viên",
    post: "Biên tập bài viết",
    media: "Thêm ảnh / video",
    exam: "Khóa thi lên đai",
    import: "Nhập danh sách võ sinh",
    adjust: "Điều chỉnh khoản phải thu",
    resolve: "Bổ sung ngày giao dịch",
    void: "Hủy giao dịch",
  };
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy && !editorBusy) close();
      }}
    >
      <div
        ref={ref}
        className={`modal ${["exam", "import", "post"].includes(kind) ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="modal-head">
          <h2 id="dialog-title">{titles[kind] || "Chỉnh sửa"}</h2>
          <button
            type="button"
            onClick={close}
            disabled={busy || editorBusy}
            aria-label="Đóng hộp thoại"
          >
            <X size={20} />
          </button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          {kind === "student" && (
            <>
              {input("name", "Họ tên võ sinh")}
              <div className="form-row">
                {input("joined", "Tháng tham gia", "month", currentMonth())}
                <label>
                  <FieldLabel>Trạng thái</FieldLabel>
                  <select
                    required
                    name="status"
                    defaultValue={val("status", "active")}
                  >
                    <option value="active">Đang học</option>
                    <option value="inactive">Đã nghỉ</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                {input("birthday", "Ngày sinh", "date", "", false)}
                {input("left", "Tháng nghỉ (nếu biết)", "month", "", false)}
              </div>
              <div className="form-row">
                {input("parent", "Họ tên phụ huynh", "text", "", false)}
                {input("phone", "Số điện thoại", "tel", "", false)}
              </div>
              <div className="form-row">
                <label>
                  <FieldLabel>Cấp đai hiện tại</FieldLabel>
                  <select
                    required
                    name="belt"
                    defaultValue={val("belt", "Nhập môn")}
                  >
                    {BELTS.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Lớp học
                  <select
                    name="classId"
                    defaultValue={val("classId", s.classes[0]?.id || "")}
                  >
                    <option value="">Chưa xếp lớp</option>
                    {s.classes.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {area("notes", "Ghi chú")}
            </>
          )}
          {(kind === "entry" || kind === "payment") && (
            <label>
              <FieldLabel>Nguồn tiền</FieldLabel>
              <select
                required
                value={entryKind}
                onChange={(e) => setEntryKind(e.target.value)}
              >
                <option value="tuition">Học phí</option>
                <option value="expense">Chi phí</option>
                <option value="income">Tiền khác</option>
                <option value="purchase">Nhập hàng</option>
                <option value="sale">Bán hàng</option>
              </select>
            </label>
          )}
          {(kind === "payment" || kind === "entry") &&
            entryKind === "tuition" && (
              <>
                <label>
                  <FieldLabel>Võ sinh</FieldLabel>
                  <select
                    name="studentId"
                    value={payStudent}
                    onChange={(e) => setPayStudent(e.target.value)}
                    required
                  >
                    {studentOptions()}
                  </select>
                </label>
                <div className="form-row">
                  <label>
                    <FieldLabel>Từ tháng</FieldLabel>
                    <DateInput
                      name="period"
                      label="Từ tháng"
                      mode="month"
                      value={period}
                      onChange={(v) => v && setPeriod(v)}
                      required
                    />
                  </label>
                  <label>
                    <FieldLabel>Số tháng đóng</FieldLabel>
                    <input
                      name="months"
                      type="number"
                      min={1}
                      max={24}
                      required
                      value={months}
                      onChange={(e) => {
                        const count = Math.max(
                          1,
                          Math.min(24, Number(e.target.value) || 1),
                        );
                        setMonths(count);
                        setPayAmount(s.settings.monthlyFee * count);
                      }}
                    />
                  </label>
                </div>
                <label>
                  <FieldLabel>Số tiền đóng (đ)</FieldLabel>
                  <input
                    name="totalAmount"
                    type="number"
                    min={months}
                    max={1000000000}
                    step={1}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                  />
                </label>
                <p className="field-hint">
                  Mặc định {money(s.settings.monthlyFee)} / tháng; có thể nhập
                  tổng tiền khác. Tổng tiền được chia đều cho {months} tháng từ
                  tháng bắt đầu; tiền lẻ được cộng vào các tháng đầu.
                  {payAmount >= months && Number.isInteger(payAmount) && (
                    <>
                      {" "}
                      Mỗi tháng khoảng {money(Math.floor(payAmount / months))}.
                    </>
                  )}
                </p>
                {input("date", "Ngày nhận tiền", "date", today())}
                {input("description", "Nội dung", "text", "", false)}
                <p className="field-hint">
                  Để trống để tự tạo nội dung “Học phí{" "}
                  {s.students.find((student) => student.id === payStudent)
                    ?.name || "[tên võ sinh]"}
                  ”.
                </p>
                {area("notes", "Ghi chú", 2)}
                <div className="admin-note">
                  Tổng dự kiến: <b>{money(payAmount)}</b>. Thu đủ từng tháng,
                  không thu từng phần. Giao dịch trùng tháng đã thanh toán sẽ bị
                  từ chối.
                </div>
              </>
            )}
          {(kind === "entry" || kind === "payment") &&
            entryKind !== "tuition" && (
              <>
                {entryKind === "expense" && (
                  <label>
                    <FieldLabel>Danh mục chi phí</FieldLabel>
                    <select required name="category" defaultValue="Sân bãi">
                      <option>Sân bãi</option>
                      <option>Lương trợ giảng</option>
                      <option>Dụng cụ</option>
                      <option>Khác</option>
                    </select>
                  </label>
                )}
                {input(
                  "description",
                  entryKind === "purchase" || entryKind === "sale"
                    ? "Tên hàng / nội dung"
                    : "Nội dung",
                )}
                {input(
                  "amount",
                  entryKind === "purchase"
                    ? "Tổng tiền nhập hàng (đ)"
                    : entryKind === "sale"
                      ? "Tổng tiền bán hàng (đ)"
                      : "Số tiền (đ)",
                  "number",
                  0,
                )}
                {(entryKind === "purchase" || entryKind === "sale") &&
                  input("quantity", "Số lượng", "number", 1)}
                {entryKind === "sale" && (
                  <p className="field-hint">
                    Giá nhập được ghi riêng ở mục Nhập hàng. Chỉ nhập tổng tiền
                    bán tại đây.
                  </p>
                )}
                <div className="form-row">
                  {input("date", "Ngày giao dịch", "date", today())}
                  {input("month", "Tháng hạch toán", "month", currentMonth())}
                </div>
              </>
            )}
          {kind === "generate" && (
            <>
              {input("period", "Tháng học phí", "month", currentMonth())}
              {input(
                "amount",
                "Mức học phí mặc định cho mỗi võ sinh (đ)",
                "number",
                s.settings.monthlyFee,
              )}
              <p className="field-hint">
                Chỉ tạo khoản chưa tồn tại. Các khoản đã lập giữ nguyên; từng võ
                sinh có thể được điều chỉnh riêng.
              </p>
            </>
          )}
          {kind === "edit_entry" && (
            <>
              <div className="admin-note">
                Chỉnh sửa có lưu dữ liệu trước / sau. Học phí được phân bổ đủ
                theo từng tháng, không thu từng phần.
              </div>
              <label>
                <FieldLabel>Loại giao dịch</FieldLabel>
                <select
                  required
                  value={entryKind}
                  disabled={
                    item?.kind === "tuition" || item?.kind === "legacy_margin"
                  }
                  onChange={(e) => setEntryKind(e.target.value)}
                >
                  {[
                    ["income", "Tiền khác"],
                    ["expense", "Chi phí"],
                    ["purchase", "Nhập hàng"],
                    ["sale", "Bán hàng"],
                    ...(item?.kind === "tuition"
                      ? [["tuition", "Học phí"]]
                      : []),
                    ...(item?.kind === "legacy_margin"
                      ? [["legacy_margin", "Lợi nhuận bán hàng lịch sử"]]
                      : []),
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {input("description", "Nội dung")}
              {area("notes", "Ghi chú", 2)}
              {entryKind === "expense" ? (
                <label>
                  <FieldLabel>Danh mục chi phí</FieldLabel>
                  <select
                    required
                    name="category"
                    defaultValue={String(item?.category || "Sân bãi")}
                  >
                    {Array.from(
                      new Set([
                        "Sân bãi",
                        "Lương trợ giảng",
                        "Dụng cụ",
                        "Khác",
                        ...(item?.kind === "expense" && item?.category
                          ? [String(item.category)]
                          : []),
                      ]),
                    ).map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>
              ) : (
                input("category", "Danh mục")
              )}
              {entryKind === "tuition" ? (
                <>
                  <label>
                    <FieldLabel>Võ sinh</FieldLabel>
                    <select
                      value={editStudent}
                      onChange={(e) => setEditStudent(e.target.value)}
                      required
                    >
                      {studentOptions()}
                    </select>
                  </label>
                  {allocations.map((a, i) => (
                    <div className="allocation-row" key={i}>
                      <label>
                        <FieldLabel>Tháng học phí</FieldLabel>
                        <DateInput
                          label={`Tháng học phí ${i + 1}`}
                          mode="month"
                          value={a.month}
                          onChange={(v) =>
                            setAllocations((prev) =>
                              prev.map((p, n) =>
                                n === i ? { ...p, month: v } : p,
                              ),
                            )
                          }
                          required
                        />
                      </label>
                      <label>
                        <FieldLabel>Mức thu (đ)</FieldLabel>
                        <input
                          type="number"
                          min={1}
                          value={a.amount}
                          required
                          onChange={(e) =>
                            setAllocations((prev) =>
                              prev.map((p, n) =>
                                n === i
                                  ? { ...p, amount: Number(e.target.value) }
                                  : p,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="table-action"
                        aria-label="Bỏ tháng học phí"
                        disabled={allocations.length <= 1}
                        onClick={() =>
                          setAllocations((prev) =>
                            prev.filter((_, n) => n !== i),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn secondary"
                    type="button"
                    disabled={allocations.length >= 24}
                    onClick={() => {
                      const last = allocations.at(-1)?.month || currentMonth();
                      const [y, m] = last.split("-").map(Number);
                      setAllocations([
                        ...allocations,
                        {
                          month: new Date(Date.UTC(y, m, 1))
                            .toISOString()
                            .slice(0, 7),
                          amount: s.settings.monthlyFee,
                        },
                      ]);
                    }}
                  >
                    Thêm tháng
                  </button>
                  <p className="admin-note" style={{ marginTop: 15 }}>
                    Tổng tiền:{" "}
                    <b>
                      {money(allocations.reduce((sum, a) => sum + a.amount, 0))}
                    </b>
                    . Chuyển thanh toán sang tháng khác sẽ mở lại công nợ của
                    tháng cũ.
                  </p>
                </>
              ) : (
                <>
                  {entryKind === "legacy_margin" ? (
                    <label>
                      <FieldLabel>Lợi nhuận bán hàng (đ)</FieldLabel>
                      <input
                        name="amount"
                        type="number"
                        required
                        defaultValue={val("amount")}
                      />
                    </label>
                  ) : (
                    input(
                      "amount",
                      entryKind === "sale" ? "Tổng giá bán (đ)" : "Số tiền (đ)",
                      "number",
                    )
                  )}
                  {(entryKind === "sale" || entryKind === "purchase") && (
                    <div className="form-row">
                      {entryKind === "sale" &&
                        Number(item?.cost) > 0 &&
                        input(
                          "cost",
                          "Giá nhập đã ghi trong giao dịch cũ (đ)",
                          "number",
                          0,
                        )}
                      {input("quantity", "Số lượng", "number", 1)}
                    </div>
                  )}
                </>
              )}
              <div className="form-row">
                {input(
                  "date",
                  "Ngày giao dịch",
                  "date",
                  today(),
                  Boolean(item?.date) || !item?.legacy,
                )}
                {input("month", "Tháng hạch toán", "month", currentMonth())}
              </div>
              {input("reason", "Lý do chỉnh sửa")}
            </>
          )}
          {kind === "class" && (
            <>
              {input("name", "Tên lớp")}
              {input(
                "schedule",
                "Lịch tập",
                "text",
                "Thứ 7 & Chủ nhật · 07:30–09:00",
              )}
              {input("location", "Địa điểm", "text", s.settings.address)}
              {input("coach", "Huấn luyện viên", "text", "", false)}
            </>
          )}
          {kind === "coach" && (
            <>
              {input("name", "Họ tên")}
              {input("role", "Vai trò / cấp đai")}
              {area("bio", "Giới thiệu")}
              <ImageField
                name="image"
                label="Ảnh huấn luyện viên"
                initial={val("image")}
              />
            </>
          )}
          {kind === "post" && (
            <>
              {input("title", "Tiêu đề")}
              {input("slug", "Đường dẫn (ví dụ: lich-tap-thang-11)")}
              {input("date", "Ngày bài viết", "date", today())}
              <ImageField
                name="image"
                label="Ảnh đại diện"
                initial={val("image")}
              />
              <div className="rich-editor-field">
                <span className="field-label">Nội dung bài viết</span>
                <input type="hidden" name="body" value={postBody} />
                <input type="hidden" name="bodyFormat" value="html" />
                <RichTextEditor
                  value={postBody}
                  onChange={setPostBody}
                  onPendingChange={setEditorBusy}
                />
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={Boolean(item?.published)}
                />
                Xuất bản trên website
              </label>
            </>
          )}
          {kind === "media" && (
            <>
              {input("title", "Chú thích")}
              <label>
                <FieldLabel>Loại nội dung</FieldLabel>
                <select
                  required
                  name="type"
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value)}
                >
                  <option value="image">Ảnh</option>
                  <option value="video">Video (liên kết)</option>
                </select>
              </label>
              {mediaType === "video" ? (
                <>
                  {input("url", "Liên kết video HTTPS", "url")}
                  <ImageField
                    name="thumbnail"
                    label="Thumbnail video"
                    initial={val("thumbnail")}
                  />
                  <p className="field-hint">
                    Thumbnail hiển thị ở thư viện trên website. Video được mở
                    bằng liên kết gốc khi người xem nhấn vào ảnh.
                  </p>
                </>
              ) : (
                <>
                  <ImageField
                    name="url"
                    label="Ảnh"
                    initial={val("url")}
                    required
                  />
                  <input type="hidden" name="thumbnail" value="" />
                </>
              )}
            </>
          )}
          {kind === "exam" && (
            <>
              {input("name", "Tên / khóa thi")}
              <div className="form-row">
                {input("date", "Ngày thi", "date", today())}
                {input("location", "Địa điểm")}
              </div>
              {input("organizer", "Đơn vị tổ chức")}
              <h3>Kết quả võ sinh</h3>
              {results.map((r, i) => (
                <div className="result-row" key={i}>
                  <select
                    aria-label={`Võ sinh ${i + 1}`}
                    value={r.studentId}
                    onChange={(e) =>
                      setResults((rs) =>
                        rs.map((v, n) =>
                          n === i ? { ...v, studentId: e.target.value } : v,
                        ),
                      )
                    }
                  >
                    {studentOptions()}
                  </select>
                  <select
                    aria-label="Kết quả"
                    value={String(r.passed)}
                    onChange={(e) =>
                      setResults((rs) =>
                        rs.map((v, n) =>
                          n === i
                            ? {
                                ...v,
                                passed: e.target.value === "true",
                                honor: "",
                              }
                            : v,
                        ),
                      )
                    }
                  >
                    <option value="true">Đạt</option>
                    <option value="false">Không đạt</option>
                  </select>
                  <label className="result-belt-field">
                    <FieldLabel required={r.passed}>
                      Cấp đai đạt được
                    </FieldLabel>
                    <select
                      aria-label="Cấp đai đạt được"
                      value={r.belt}
                      required={r.passed}
                      onChange={(e) =>
                        setResults((rs) =>
                          rs.map((v, n) =>
                            n === i ? { ...v, belt: e.target.value } : v,
                          ),
                        )
                      }
                    >
                      {BELTS.map((b) => (
                        <option key={b}>{b}</option>
                      ))}
                    </select>
                  </label>
                  <select
                    aria-label="Danh hiệu"
                    value={r.honor}
                    disabled={!r.passed}
                    onChange={(e) =>
                      setResults((rs) =>
                        rs.map((v, n) =>
                          n === i ? { ...v, honor: e.target.value } : v,
                        ),
                      )
                    }
                  >
                    <option value="">Không danh hiệu</option>
                    <option>Á khoa</option>
                    <option>Thủ khoa</option>
                  </select>
                  <button
                    type="button"
                    className="table-action"
                    aria-label="Xóa kết quả"
                    onClick={() =>
                      setResults((rs) => rs.filter((_, n) => n !== i))
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn secondary"
                style={{ marginTop: 16 }}
                disabled={!s.students.length}
                onClick={() =>
                  setResults([
                    ...results,
                    {
                      studentId: s.students[0]?.id,
                      passed: true,
                      belt: "Nhập môn",
                      honor: "",
                    },
                  ])
                }
              >
                <Plus size={16} />
                Thêm kết quả
              </button>
              <p className="field-hint" style={{ marginTop: 16 }}>
                Cấp đai hiện tại cập nhật từ kết quả đạt mới nhất theo ngày thi.
              </p>
            </>
          )}
          {kind === "import" && (
            <>
              <div className="admin-note">
                Dán bảng từ Excel/Google Sheets hoặc nội dung CSV phân cách bằng
                dấu chấm phẩy. Cột theo thứ tự:{" "}
                <b>Tên; Tham gia; Trạng thái; Ghi chú</b>. Tháng dạng YYYY-MM,
                trạng thái “Đang học” hoặc “Đã nghỉ”.
              </div>
              <label>
                <FieldLabel>Dữ liệu</FieldLabel>
                <textarea
                  required
                  rows={8}
                  value={csv}
                  onChange={(e) => {
                    setCsv(e.target.value);
                    setPreview([]);
                  }}
                  placeholder={
                    "Tên;Tham gia;Trạng thái;Ghi chú\nNguyễn Minh;2026-11;Đang học;"
                  }
                />
              </label>
              <button
                type="button"
                className="btn secondary"
                onClick={parseCsv}
              >
                Kiểm tra dữ liệu
              </button>
              {preview.length > 0 && (
                <div className="admin-note" style={{ marginTop: 16 }}>
                  {preview.length} dòng hợp lệ. Bỏ qua hồ sơ có cùng tên và
                  tháng tham gia.
                  <ul>
                    {preview.slice(0, 10).map((v, i) => (
                      <li key={i}>
                        {v.name} · {v.joined} ·{" "}
                        {v.status === "active" ? "Đang học" : "Đã nghỉ"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          {kind === "adjust" && (
            <>
              <p className="muted">
                Điều chỉnh học phí tháng {val("month")}. Không sửa giao dịch đã
                thu.
              </p>
              {input("amount", "Số tiền phải thu (đ)", "number")}
              {input("reason", "Lý do điều chỉnh")}
            </>
          )}
          {kind === "resolve" && (
            <>
              <p>{val("description")}</p>
              {input("date", "Ngày giao dịch chính xác", "date", today())}
            </>
          )}
          {kind === "void" && (
            <>
              <div className="admin-note warning">
                Hủy giao dịch “{val("description")}”. Bản ghi gốc vẫn được giữ
                trong lịch sử; khoản học phí liên quan sẽ trở về chưa thanh
                toán.
              </div>
              {input("reason", "Lý do hủy")}
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="btn outline"
              onClick={close}
              disabled={busy || editorBusy}
            >
              Đóng
            </button>
            <button
              type="submit"
              className={`btn ${kind === "void" ? "danger" : "primary"}`}
              disabled={
                busy || editorBusy || (kind === "import" && !preview.length)
              }
            >
              {busy
                ? "Đang lưu…"
                : kind === "payment"
                  ? "Xác nhận đã nhận tiền"
                  : kind === "import"
                    ? "Nhập dữ liệu"
                    : kind === "void"
                      ? "Hủy giao dịch"
                      : "Lưu thông tin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
