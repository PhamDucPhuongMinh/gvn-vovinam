import { z } from "zod";
import type { ClubState, Entry, Student } from "./types";
import { sanitizePostHTML } from "./rich-text";
import { BELTS } from "./constants";
import { splitTuition } from "./tuition";
import { outstanding } from "./finance";
import { currentMonth, today, uid } from "./utils";
const text = z.string().trim().max(5000);
const id = z.string().max(100);
const required = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập đủ thông tin.")
  .max(200);
const month = z
  .string()
  .regex(/^20\d{2}-(0[1-9]|1[0-2])$/, "Tháng không hợp lệ.");
const date = z
  .string()
  .regex(/^20\d{2}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Ngày không hợp lệ.",
  );
const money = z.number().int().min(0).max(1_000_000_000);
const url = z.union([
  z.literal(""),
  z
    .url()
    .max(2000)
    .refine(
      (v) => new URL(v).protocol === "https:",
      "Chỉ chấp nhận liên kết HTTPS.",
    ),
]);
const studentSchema = z.object({
  id: id.optional(),
  name: required,
  joined: month,
  status: z.enum(["active", "inactive"]),
  left: month.optional(),
  birthday: z.union([date, z.literal("")]).optional(),
  parent: text.optional(),
  phone: z.string().max(30).optional(),
  belt: z.enum(BELTS).default("Nhập môn"),
  notes: text.optional(),
  classId: id.optional(),
});
const schemas = {
  student: studentSchema,
  class: z.object({
    id: id.optional(),
    name: required,
    schedule: required,
    location: required,
    coach: text,
  }),
  coach: z.object({
    id: id.optional(),
    name: required,
    role: required,
    bio: text,
    image: url,
  }),
  post: z.object({
    id: id.optional(),
    title: required,
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(150),
    body: z.string().max(200000),
    bodyFormat: z.enum(["text", "html"]).optional(),
    image: url,
    published: z.boolean(),
    date,
  }),
  media: z.object({
    id: id.optional(),
    title: required,
    url: z
      .url()
      .max(2000)
      .refine((v) => new URL(v).protocol === "https:"),
    type: z.enum(["image", "video"]),
    thumbnail: url.optional().default(""),
  }),
  exam: z.object({
    id: id.optional(),
    name: required,
    date,
    location: required,
    organizer: required,
    results: z
      .array(
        z.object({
          studentId: id,
          passed: z.boolean(),
          belt: z.union([z.enum(BELTS), z.literal("")]),
          honor: z.enum(["", "Á khoa", "Thủ khoa"]),
        }),
      )
      .max(500),
  }),
};
function audit(s: ClubState, action: string, detail: string) {
  s.audit.unshift({ id: uid(), at: new Date().toISOString(), action, detail });
}
export function applyCommand(s: ClubState, raw: unknown) {
  const body = z.object({ action: required, data: z.unknown() }).parse(raw);
  const d = body.data;
  if (body.action === "save_student") {
    const value = schemas.student.parse(d);
    if (value.left && value.left < value.joined)
      throw new Error("Tháng nghỉ không thể trước tháng tham gia.");
    if (value.classId && !s.classes.some((c) => c.id === value.classId))
      throw new Error("Lớp không tồn tại.");
    const existing = value.id
      ? s.students.find((v) => v.id === value.id)
      : undefined;
    if (value.id && !existing) throw new Error("Không tìm thấy võ sinh.");
    if (existing) {
      Object.assign(existing, value);
      if ("beltBeforeExams" in existing && value.belt !== undefined)
        existing.beltBeforeExams = value.belt;
    } else s.students.push({ ...value, id: uid() });
    audit(s, "Lưu võ sinh", value.name);
    return;
  }
  if (body.action === "generate_bills") {
    const { period, amount: fee } = z
      .object({ period: month, amount: money.optional() })
      .parse(d);
    if (period < s.settings.billingStart || period < currentMonth())
      throw new Error(
        "Chỉ tạo hàng loạt cho tháng hiện tại hoặc tương lai. Công nợ cũ cần đối soát riêng.",
      );
    let count = 0;
    for (const student of s.students.filter(
      (x) =>
        x.status === "active" &&
        x.joined <= period &&
        (!x.left || x.left > period),
    )) {
      if (
        !s.bills.some((b) => b.studentId === student.id && b.month === period)
      ) {
        s.bills.push({
          id: uid(),
          studentId: student.id,
          month: period,
          amount: fee ?? s.settings.monthlyFee,
        });
        count++;
      }
    }
    audit(s, "Lập học phí", `${period}: ${count} khoản phải thu`);
    return;
  }
  if (body.action === "pay") {
    const value = z
      .object({
        studentId: id,
        period: month,
        months: z.number().int().min(1).max(24),
        firstAmount: money.optional(),
        totalAmount: money.optional(),
        amounts: z.array(money).min(1).max(24).optional(),
        date,
        description: text,
      })
      .parse(d);
    const student = s.students.find((x) => x.id === value.studentId);
    if (!student) throw new Error("Không tìm thấy võ sinh.");
    if (value.period < student.joined)
      throw new Error("Không thể thu trước tháng tham gia.");
    if (value.amounts && value.amounts.length !== value.months)
      throw new Error("Số mức thu phải khớp số tháng.");
    const totalAmounts =
      value.totalAmount === undefined
        ? undefined
        : splitTuition(value.totalAmount, value.months);
    if (totalAmounts && (value.amounts || value.firstAmount !== undefined))
      throw new Error("Chỉ nhập tổng tiền hoặc mức thu từng tháng.");
    const allocations = [];
    let amount = 0;
    for (let i = 0; i < value.months; i++) {
      const [y, m] = value.period.split("-").map(Number);
      const period = new Date(Date.UTC(y, m - 1 + i, 1))
        .toISOString()
        .slice(0, 7);
      let bill = s.bills.find(
        (b) => b.studentId === student.id && b.month === period,
      );
      const expected =
        totalAmounts?.[i] ??
        value.amounts?.[i] ??
        (i === 0 ? value.firstAmount : undefined) ??
        bill?.amount ??
        s.settings.monthlyFee;
      if (!bill) {
        if (student.status !== "active")
          throw new Error(
            "Võ sinh đã nghỉ: chỉ được thu khoản phải thu đã lập.",
          );
        bill = {
          id: uid(),
          studentId: student.id,
          month: period,
          amount: expected,
        };
        s.bills.push(bill);
      }
      if (
        outstanding(s, bill) !== bill.amount ||
        (bill.amount === 0 &&
          s.entries.some(
            (e) =>
              !e.voided && e.allocations?.some((a) => a.billId === bill!.id),
          ))
      )
        throw new Error(`Tháng ${period} đã thanh toán. Không thể thu trùng.`);
      if (expected <= 0)
        throw new Error(
          "Mức thu phải lớn hơn 0. Dùng điều chỉnh khoản phải thu để miễn học phí.",
        );
      if (bill.amount !== expected) {
        audit(
          s,
          "Điều chỉnh mức thu",
          `${student.name} / ${period}: ${bill.amount}đ → ${expected}đ`,
        );
        bill.amount = expected;
      }
      allocations.push({ billId: bill.id, amount: bill.amount });
      amount += bill.amount;
    }
    s.entries.unshift({
      id: uid(),
      kind: "tuition",
      category: "Học phí",
      description: value.description || `Học phí ${student.name}`,
      studentId: student.id,
      amount,
      date: value.date,
      month: value.date.slice(0, 7),
      allocations,
    });
    audit(
      s,
      "Thu học phí",
      `${student.name}: ${amount}đ / ${value.months} tháng`,
    );
    return;
  }
  if (body.action === "adjust_bill") {
    const { billId, amount, reason } = z
      .object({ billId: id, amount: money, reason: required })
      .parse(d);
    const bill = s.bills.find((b) => b.id === billId);
    if (!bill) throw new Error("Không tìm thấy khoản phải thu.");
    if (outstanding(s, bill) !== bill.amount)
      throw new Error(
        "Hãy hủy giao dịch thanh toán trước khi chỉnh khoản phải thu.",
      );
    bill.amount = amount;
    audit(s, "Điều chỉnh học phí", `${bill.month}: ${amount}đ; ${reason}`);
    return;
  }
  if (body.action === "entry") {
    const value = z
      .object({
        kind: z.enum(["income", "expense", "purchase", "sale"]),
        category: required,
        description: required,
        amount: money,
        date,
        month,
        cost: money.optional(),
        quantity: z.number().int().min(1).max(10000).optional(),
      })
      .parse(d);
    if (value.kind !== "sale" && value.amount === 0)
      throw new Error("Số tiền phải lớn hơn 0.");
    s.entries.unshift({
      ...value,
      cost: value.kind === "sale" ? value.cost || 0 : undefined,
      id: uid(),
    });
    audit(s, "Ghi nhận thu–chi", `${value.description}: ${value.amount}đ`);
    return;
  }
  if (body.action === "edit_entry") {
    const value = z
      .object({
        entryId: id,
        reason: required,
        kind: z.enum([
          "tuition",
          "income",
          "expense",
          "purchase",
          "sale",
          "legacy_margin",
        ]),
        category: required,
        description: required,
        amount: z.number().int().min(-1_000_000_000).max(1_000_000_000),
        date: z.union([date, z.literal("")]),
        month,
        cost: money.optional(),
        quantity: z.number().int().min(1).max(10000).optional(),
        studentId: id.optional(),
        periods: z
          .array(z.object({ month, amount: money }))
          .min(1)
          .max(24)
          .optional(),
      })
      .parse(d);
    const entry = s.entries.find((e) => e.id === value.entryId);
    if (!entry || entry.voided)
      throw new Error("Chỉ chỉnh sửa giao dịch còn hiệu lực.");
    if (
      ((entry.kind === "tuition" || entry.kind === "legacy_margin") &&
        entry.kind !== value.kind) ||
      (value.kind === "tuition" && entry.kind !== "tuition") ||
      (value.kind === "legacy_margin" && entry.kind !== "legacy_margin")
    )
      throw new Error("Không thể đổi loại học phí hoặc lãi bán hàng lịch sử.");
    if (!value.date && !(entry.legacy && !entry.date))
      throw new Error("Vui lòng chọn ngày giao dịch.");
    if (value.kind !== "legacy_margin" && value.amount < 0)
      throw new Error("Số tiền phải không âm.");
    if (!["sale", "legacy_margin"].includes(value.kind) && value.amount === 0)
      throw new Error("Số tiền phải lớn hơn 0.");
    const before = structuredClone(entry);
    // Stage every bill and allocation so a failed validation cannot leave partial edits.
    const draft = structuredClone(s);
    const edited = draft.entries.find((e) => e.id === entry.id)!;
    edited.voided = true;
    let allocations: Entry["allocations"];
    if (value.kind === "tuition") {
      const student = draft.students.find((st) => st.id === value.studentId);
      if (!student || !value.periods?.length)
        throw new Error("Chọn võ sinh và các tháng học phí.");
      if (
        new Set(value.periods.map((p) => p.month)).size !== value.periods.length
      )
        throw new Error("Không chọn trùng tháng học phí.");
      if (value.periods.reduce((sum, p) => sum + p.amount, 0) !== value.amount)
        throw new Error("Tổng tiền phải bằng tổng phân bổ từng tháng.");
      allocations = [];
      for (const period of value.periods) {
        if (period.month < student.joined || period.amount <= 0)
          throw new Error("Tháng và mức học phí chưa hợp lệ.");
        let bill = draft.bills.find(
          (b) => b.studentId === student.id && b.month === period.month,
        );
        if (
          bill &&
          draft.entries.some(
            (e) =>
              !e.voided && e.allocations?.some((a) => a.billId === bill!.id),
          )
        )
          throw new Error(
            `Tháng ${period.month} đã có giao dịch khác. Không thể thu trùng.`,
          );
        if (!bill) {
          bill = {
            id: uid(),
            studentId: student.id,
            month: period.month,
            amount: period.amount,
          };
          draft.bills.push(bill);
        }
        bill.amount = period.amount;
        allocations.push({ billId: bill.id, amount: period.amount });
      }
    }
    if (entry.legacy && !entry.original)
      edited.original = {
        amount: before.amount,
        month: before.month,
        kind: before.kind,
      };
    Object.assign(edited, {
      kind: value.kind,
      category: value.category,
      description: value.description,
      amount: value.amount,
      date: value.date,
      month: value.month,
      voided: false,
    });
    if (value.kind === "tuition") {
      edited.studentId = value.studentId;
      edited.allocations = allocations;
    }
    if (value.kind === "sale" || value.kind === "purchase") {
      if (value.kind === "sale") edited.cost = value.cost || 0;
      else delete edited.cost;
      edited.quantity = value.quantity || 1;
    } else {
      delete edited.cost;
      delete edited.quantity;
    }
    if (value.date) delete edited.review;
    draft.audit.unshift({
      id: uid(),
      at: new Date().toISOString(),
      action: "Chỉnh sửa giao dịch",
      detail: `${value.description}: ${value.reason}`,
      before,
      after: structuredClone(edited),
    });
    s.bills = draft.bills;
    s.entries = draft.entries;
    s.audit = draft.audit;
    return;
  }
  if (body.action === "void_entry") {
    const { entryId, reason } = z
      .object({ entryId: id, reason: required })
      .parse(d);
    const entry = s.entries.find((e) => e.id === entryId);
    if (!entry || entry.voided)
      throw new Error("Giao dịch không tồn tại hoặc đã hủy.");
    entry.voided = true;
    audit(s, "Hủy giao dịch", `${entry.description}: ${reason}`);
    return;
  }
  if (body.action === "resolve_date") {
    const { entryId, date: day } = z.object({ entryId: id, date }).parse(d);
    const e = s.entries.find((e) => e.id === entryId);
    if (!e || !e.legacy || e.date)
      throw new Error("Chỉ bổ sung ngày cho giao dịch lịch sử chưa có ngày.");
    e.date = day;
    e.review = undefined;
    audit(s, "Bổ sung ngày lịch sử", `${e.description}: ${day}`);
    return;
  }
  if (body.action === "lead_status") {
    const { leadId, status } = z
      .object({
        leadId: id,
        status: z.enum([
          "Mới",
          "Đã liên hệ",
          "Hẹn học thử",
          "Đã nhập học",
          "Không tiếp tục",
        ]),
      })
      .parse(d);
    const lead = s.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error("Không tìm thấy đăng ký.");
    lead.status = status;
    audit(s, "Xử lý đăng ký", `${lead.name}: ${status}`);
    return;
  }
  if (body.action === "settings") {
    const value = z
      .object({
        name: required,
        address: required,
        phone: z.string().min(8).max(30),
        schedule: required,
        intro: text,
        heroTitle: required,
        heroDescription: text,
        logo: url,
        heroImage: url,
        facebook: url,
        tiktok: url,
        monthlyFee: money,
        dueDay: z.number().int().min(1).max(28),
        billingStart: month,
        achievements: text,
      })
      .parse(d);
    s.settings = value;
    audit(s, "Cập nhật cấu hình", "Thông tin CLB, giao diện và học phí");
    return;
  }
  if (body.action === "import_students") {
    const students = z
      .array(studentSchema.omit({ id: true }))
      .min(1)
      .max(500)
      .parse(d);
    let count = 0;
    for (const v of students) {
      if (
        s.students.some(
          (x) =>
            x.name.normalize("NFC").toLocaleLowerCase("vi") ===
              v.name.normalize("NFC").toLocaleLowerCase("vi") &&
            x.joined === v.joined,
        )
      )
        continue;
      s.students.push({ ...v, id: uid() });
      count++;
    }
    audit(
      s,
      "Nhập danh sách",
      `${count} võ sinh mới; bỏ qua tên + tháng tham gia đã có`,
    );
    return;
  }
  const resource = body.action.replace("save_", "") as keyof typeof schemas;
  if (body.action.startsWith("save_") && resource in schemas) {
    const value = schemas[resource].parse(d);
    const key = (
      {
        class: "classes",
        coach: "coaches",
        post: "posts",
        media: "media",
        exam: "exams",
      } as const
    )[resource as "class" | "coach" | "post" | "media" | "exam"];
    if (!key) throw new Error("Loại dữ liệu không hợp lệ.");
    if (resource === "post") {
      const v = value as z.infer<typeof schemas.post>;
      if (v.bodyFormat === "html") v.body = sanitizePostHTML(v.body);
      if (s.posts.some((p) => p.slug === v.slug && p.id !== v.id))
        throw new Error("Đường dẫn bài viết đã tồn tại.");
    }
    if (resource === "exam") {
      const v = value as z.infer<typeof schemas.exam>;
      if (new Set(v.results.map((r) => r.studentId)).size !== v.results.length)
        throw new Error("Mỗi võ sinh chỉ có một kết quả trong khóa thi.");
      for (const r of v.results) {
        if (!s.students.some((st) => st.id === r.studentId))
          throw new Error("Võ sinh không tồn tại.");
        if (r.passed && !r.belt.trim())
          throw new Error("Kết quả đạt phải có cấp đai.");
        if (!r.passed && r.honor)
          throw new Error("Kết quả không đạt không có danh hiệu.");
      }
    }
    const previousExam =
      resource === "exam" ? s.exams.find((e) => e.id === value.id) : undefined;
    const affected =
      resource === "exam"
        ? new Set(
            [
              ...(previousExam?.results || []),
              ...(value as z.infer<typeof schemas.exam>).results,
            ].map((r) => r.studentId),
          )
        : new Set<string>();
    if (resource === "exam")
      for (const student of s.students.filter((st) => affected.has(st.id))) {
        if (student.beltBeforeExams === undefined)
          student.beltBeforeExams = student.belt || "";
      }
    const list = s[key] as unknown as { id: string }[];
    const index = list.findIndex((v) => v.id === value.id);
    if (value.id && index < 0) throw new Error("Không tìm thấy bản ghi.");
    const record = { ...value, id: value.id || uid() };
    if (index >= 0) list[index] = record;
    else list.push(record);
    if (resource === "exam")
      for (const student of s.students.filter((st) => affected.has(st.id))) {
        const passed = s.exams
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))
          .flatMap((e) =>
            e.results.filter((r) => r.studentId === student.id && r.passed),
          );
        student.belt = passed[0]?.belt || student.beltBeforeExams || "";
      }
    audit(s, `Lưu ${resource}`, "Cập nhật dữ liệu quản lý");
    return;
  }
  throw new Error("Thao tác không được hỗ trợ.");
}
