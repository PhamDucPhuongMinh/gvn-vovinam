"use client";
import { useCallback, useEffect, useState } from "react";
import FieldLabel from "./FieldLabel";
import Link from "next/link";
import VideoThumbnail from "./VideoThumbnail";
import { postExcerpt } from "@/lib/post-content";
import Brand from "./Brand";
import DateInput from "./DateInput";
import FinancialChart from "./FinancialChart";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ArrowLeftRight,
  Award,
  CalendarDays,
  MessageSquare,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ArrowUpRight,
  ChevronRight,
  Plus,
  Download,
  Search,
  Bell,
  Clock3,
  MapPin,
  Menu,
  Info,
  History,
  Upload,
  Pencil,
  CheckCircle2,
  CircleAlert,
  ReceiptText,
  ExternalLink,
} from "lucide-react";
import type { ClubState, Entry, Student } from "@/lib/types";
import {
  money,
  currentMonth,
  today,
  displayDate,
  monthLabel,
} from "@/lib/utils";
import {
  monthSummary,
  financialTotals,
  outstanding,
  paidAmount,
  sourceValue,
  isOverdue,
} from "@/lib/finance";
import AdminDialog, { DialogSpec, ImageField } from "./AdminDialog";
const tabs = [
  { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { id: "students", label: "Võ sinh", icon: Users },
  { id: "billing", label: "Học phí & công nợ", icon: Wallet },
  { id: "finance", label: "Thu–chi", icon: ArrowLeftRight },
  { id: "classes", label: "Lớp học", icon: CalendarDays },
  { id: "exams", label: "Thi lên đai", icon: Award },
  { id: "leads", label: "Đăng ký học thử", icon: MessageSquare },
  { id: "content", label: "Nội dung website", icon: FileText },
  { id: "reports", label: "Báo cáo", icon: BarChart3 },
  { id: "settings", label: "Cài đặt CLB", icon: Settings },
  { id: "audit", label: "Lịch sử thao tác", icon: History },
];
function Empty({
  title = "Chưa có dữ liệu",
  description = "Thêm bản ghi đầu tiên để bắt đầu quản lý.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state">
      <ReceiptText size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function Badge({
  children,
  color = "blue",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return <span className={`badge ${color}`}>{children}</span>;
}
function StudentName({ student }: { student?: Student }) {
  return (
    <div className="student-cell">
      <span className="avatar">
        {student?.name
          .split(" ")
          .slice(-2)
          .map((n) => n[0])
          .join("") || "VS"}
      </span>
      <div>
        <b>{student?.name || "Chưa ghép võ sinh"}</b>
        <small>
          {student?.id.startsWith("vs-")
            ? student.id.toUpperCase()
            : "Võ sinh CLB"}
        </small>
      </div>
    </div>
  );
}
function download(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(v: unknown) {
  const s = String(v ?? "");
  return (
    '"' + (/^[=+\-@\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"'
  );
}
function csvDownload(name: string, rows: unknown[][]) {
  download(
    name,
    "\uFEFF" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
export default function Dashboard() {
  const [state, setState] = useState<ClubState | null>(null),
    [demo, setDemo] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview"),
    [period, setPeriod] = useState(currentMonth()),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [contentTab, setContentTab] = useState("posts"),
    [mobile, setMobile] = useState(false),
    [dialog, setDialog] = useState<DialogSpec | null>(null);
  const close = useCallback(() => setDialog(null), []);
  const load = useCallback(async () => {
    const r = await fetch("/api/admin", { cache: "no-store" });
    if (r.status === 401) {
      window.location.assign("/login");
      return;
    }
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setState(j.state);
    setDemo(j.demo);
  }, []);
  useEffect(() => {
    load().catch((e) => setError(e.message));
    const hash = () => {
      const id = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === id)) {
        setTab(id);
        setSearch("");
        setFilter("all");
      }
    };
    hash();
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  function navigate(id: string) {
    setTab(id);
    setSearch("");
    setFilter("all");
    setMobile(false);
    window.location.hash = id;
  }
  async function save(action: string, data: unknown) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await load();
      setToast("Đã lưu thay đổi.");
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function edit(kind: string, item?: object) {
    setDialog({ kind, item: item as Record<string, unknown> | undefined });
  }
  async function logout() {
    try {
      const r = await fetch("/api/auth/logout", { method: "POST" });
      if (!r.ok) throw new Error("Không thể đăng xuất. Vui lòng thử lại.");
      window.location.assign("/login");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!state)
    return (
      <div className="admin-loader">
        <div>
          {error ? (
            <>
              <p className="error" role="alert">
                {error}
              </p>
              <button
                className="btn primary"
                onClick={() => load().catch((e) => setError(e.message))}
              >
                Thử kết nối lại
              </button>{" "}
              <Link href="/">Về website</Link>
            </>
          ) : (
            <p>Đang mở không gian quản lý…</p>
          )}
        </div>
      </div>
    );
  const s = state,
    summary = monthSummary(s, period),
    studentsByJoined = [...s.students].sort((a, b) =>
      b.joined.localeCompare(a.joined),
    ),
    active = studentsByJoined.filter((st) => st.status === "active"),
    student = (id?: string) => s.students.find((st) => st.id === id);
  const monthBills = s.bills.filter((b) => b.month === period);
  const unpaid = monthBills.filter((b) => outstanding(s, b) > 0);
  const leads = s.leads.filter((l) => l.createdAt.slice(0, 7) === period);
  const visibleStudents = studentsByJoined.filter(
    (st) =>
      (filter === "all" || st.status === filter) &&
      `${st.name} ${st.parent || ""} ${st.phone || ""}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  const visibleEntries = s.entries.filter(
    (e) =>
      e.month === period &&
      (filter === "all" || filter === "review"
        ? filter !== "review" || !!e.review
        : e.kind === filter) &&
      `${e.description} ${e.notes || ""} ${e.kind === "legacy_margin" ? "Lợi nhuận bán hàng lịch sử" : e.category}`
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  const title = tabs.find((t) => t.id === tab)?.label || "Tổng quan";
  const dateString = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  function exportFinance() {
    csvDownload(`thu-chi-${period}.csv`, [
      [
        "Tháng hạch toán",
        "Ngày giao dịch",
        "Loại",
        "Danh mục",
        "Nội dung",
        "Số tiền",
        "Giá nhập",
        "Đã hủy",
        "Ghi chú",
        "Thông tin cần bổ sung",
      ],
      ...visibleEntries.map((e) => [
        e.month,
        e.date,
        e.kind,
        e.category,
        e.description,
        e.amount,
        e.cost || "",
        e.voided ? "Có" : "Không",
        e.notes || "",
        e.review || "",
      ]),
    ]);
  }
  function studentsTable(rows: Student[], overview = false) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Võ sinh</th>
              <th>Tham gia</th>
              <th>{overview ? "Học phí " + monthLabel(period) : "Cấp đai"}</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((st) => {
              const bill = monthBills.find((b) => b.studentId === st.id);
              return (
                <tr key={st.id}>
                  <td>
                    <StudentName student={st} />
                  </td>
                  <td>{monthLabel(st.joined)}</td>
                  <td>
                    {overview ? (
                      <Badge
                        color={
                          !bill
                            ? ""
                            : outstanding(s, bill) > 0
                              ? "orange"
                              : "green"
                        }
                      >
                        {!bill
                          ? "Chưa lập"
                          : outstanding(s, bill) > 0
                            ? "Chưa đóng"
                            : "Đã đóng"}
                      </Badge>
                    ) : (
                      st.belt || <span className="muted">Chưa bổ sung</span>
                    )}
                  </td>
                  <td>
                    <Badge color={st.status === "active" ? "green" : ""}>
                      {st.status === "active" ? "Đang học" : "Đã nghỉ"}
                    </Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="table-action"
                        onClick={() => edit("student", st)}
                        aria-label={`Sửa ${st.name}`}
                      >
                        <Pencil size={15} />
                      </button>
                      {st.status === "active" && (
                        <button
                          className="table-action"
                          onClick={() =>
                            edit("payment", { studentId: st.id, month: period })
                          }
                        >
                          Thu phí
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <Empty
            title="Không tìm thấy võ sinh"
            description="Thử tìm bằng tên khác hoặc thay đổi bộ lọc."
          />
        )}
      </div>
    );
  }
  const statCards = [
    {
      label: "Võ sinh đang học",
      value: String(active.length).padStart(2, "0"),
      foot: `${s.students.length} hồ sơ trong câu lạc bộ`,
      icon: Users,
    },
    {
      label: "Doanh thu học phí",
      value: money(summary.tuition),
      foot: `Theo giao dịch tháng ${monthLabel(period)}`,
      icon: Wallet,
    },
    {
      label: "Học phí chưa đóng",
      value: money(summary.debt),
      foot: `${unpaid.length} khoản phải thu chưa thanh toán`,
      icon: CircleAlert,
    },
    {
      label: "Đăng ký mới",
      value: String(leads.length).padStart(2, "0"),
      foot: `${s.leads.filter((l) => l.status === "Mới").length} đăng ký đang chờ liên hệ`,
      icon: MessageSquare,
    },
  ];
  return (
    <div className="admin-shell">
      <button
        className={`sidebar-scrim ${mobile ? "open" : ""}`}
        aria-label="Đóng menu"
        onClick={() => setMobile(false)}
      />
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Brand logo={s.settings.logo} />
        <span className="sidebar-label">QUẢN LÝ CÂU LẠC BỘ</span>
        <nav
          aria-label="Quản trị câu lạc bộ"
          style={{ overflowY: "auto", minHeight: 0 }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => navigate(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <t.icon size={17} />
              {t.label}
              {t.id === "leads" && s.leads.some((l) => l.status === "Mới") && (
                <span className="live-dot" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            Xem website CLB <ArrowUpRight size={15} />
          </Link>
          <div className="admin-identity">
            <span className="avatar">AD</span>
            <div>
              <b>Quản trị viên</b>
              <small>Vovinam Gò Vấp</small>
            </div>
            <button onClick={logout} aria-label="Đăng xuất">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-mobile-trigger"
            onClick={() => setMobile(!mobile)}
            aria-label="Mở menu quản trị"
            aria-expanded={mobile}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Không gian quản lý <ChevronRight size={13} />
            <b>{title}</b>
          </div>
          <div>
            <span>{dateString}</span>
            <button
              className="table-action"
              onClick={() => navigate("leads")}
              aria-label="Xem đăng ký học thử"
            >
              <Bell size={18} />
            </button>
            <span className="avatar">AD</span>
          </div>
        </header>
        <main className="admin-content">
          {demo && (
            <div className="demo-banner">
              CHẾ ĐỘ XEM THỬ CỤC BỘ · Dữ liệu lưu trên máy này. Kết nối MongoDB
              và đặt mật khẩu riêng trước khi triển khai.
            </div>
          )}
          <div className="page-heading">
            <div>
              <h1>{tab === "overview" ? "Một ngày tốt lành!" : title}</h1>
              <p>
                {tab === "overview"
                  ? "Cùng nhìn lại hoạt động câu lạc bộ của bạn."
                  : `Quản lý ${title.toLocaleLowerCase("vi")} của Vovinam Gò Vấp.`}
              </p>
            </div>
            <div className="heading-actions">
              {["overview", "billing", "finance", "reports"].includes(tab) && (
                <label className="report-month-field">
                  <FieldLabel>Tháng báo cáo</FieldLabel>
                  <DateInput
                    label="Tháng báo cáo"
                    mode="month"
                    value={period}
                    onChange={(v) => v && setPeriod(v)}
                    required
                  />
                </label>
              )}
              <>
                {tab === "overview" && (
                  <button
                    className="btn primary"
                    onClick={() => edit("student")}
                  >
                    <Plus size={16} />
                    Thêm võ sinh
                  </button>
                )}
                {tab === "students" && (
                  <>
                    <button
                      className="btn outline"
                      onClick={() => edit("import")}
                    >
                      <Upload size={15} />
                      Nhập danh sách
                    </button>
                    <button
                      className="btn primary"
                      onClick={() => edit("student")}
                    >
                      <Plus size={15} />
                      Thêm võ sinh
                    </button>
                  </>
                )}
                {tab === "billing" && (
                  <button
                    className="btn primary"
                    onClick={() => edit("payment")}
                    disabled={!s.students.length}
                  >
                    <Plus size={15} />
                    Thu học phí
                  </button>
                )}
                {tab === "finance" && (
                  <>
                    <button className="btn outline" onClick={exportFinance}>
                      <Download size={15} />
                      Xuất CSV
                    </button>
                    <button
                      className="btn primary"
                      onClick={() => edit("entry")}
                    >
                      <Plus size={15} />
                      Thêm giao dịch
                    </button>
                  </>
                )}
                {tab === "classes" && (
                  <button className="btn primary" onClick={() => edit("class")}>
                    <Plus size={15} />
                    Thêm lớp
                  </button>
                )}
                {tab === "exams" && (
                  <button className="btn primary" onClick={() => edit("exam")}>
                    <Plus size={15} />
                    Thêm khóa thi
                  </button>
                )}
                {tab === "content" && (
                  <button
                    className="btn primary"
                    onClick={() =>
                      edit(
                        (
                          {
                            posts: "post",
                            coaches: "coach",
                            media: "media",
                          } as Record<string, string>
                        )[contentTab],
                      )
                    }
                  >
                    <Plus size={15} />
                    Thêm nội dung
                  </button>
                )}
                {tab === "reports" && (
                  <button
                    className="btn outline"
                    onClick={() =>
                      download(
                        `vovinam-backup-${today()}.json`,
                        JSON.stringify(s, null, 2),
                      )
                    }
                  >
                    <Download size={15} />
                    Sao lưu toàn bộ
                  </button>
                )}
              </>
            </div>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {tab === "overview" && (
            <>
              <div className="stat-grid">
                {statCards.map((card) => (
                  <article className="stat-card" key={card.label}>
                    <div className="stat-top">
                      <span>{card.label}</span>
                      <div className="stat-icon">
                        <card.icon size={16} />
                      </div>
                    </div>
                    <div className="stat-value">{card.value}</div>
                    <small>{card.foot}</small>
                  </article>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Hoạt động tài chính</h2>
                      <p>Doanh thu, chi phí và lợi nhuận theo tháng</p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => navigate("reports")}
                    >
                      Chi tiết <ChevronRight size={13} />
                    </button>
                  </div>
                  <div className="panel-body">
                    <FinancialChart state={s} period={period} />
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-head">
                    <h2>Lịch tập câu lạc bộ</h2>
                    <CalendarDays size={16} color="#0063cd" />
                  </div>
                  <div className="panel-body">
                    {s.classes[0] ? (
                      <div className="quick-class">
                        <span className="pill">LỚP CUỐI TUẦN</span>
                        <h3>{s.classes[0].name}</h3>
                        <p>
                          <Clock3 size={15} />
                          {s.classes[0].schedule}
                        </p>
                        <p>
                          <MapPin size={15} />
                          {s.classes[0].location}
                        </p>
                        <div className="class-foot">
                          <span>
                            <b>{active.length}</b> võ sinh đang học
                          </span>
                          <button
                            className="text-link"
                            onClick={() => navigate("classes")}
                          >
                            Xem lớp <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Empty title="Chưa có lớp học" />
                    )}
                    <div className="callout">
                      <Info size={16} />
                      <span>
                        Đừng quên kiểm tra đăng ký học thử và liên hệ với các
                        gia đình đang chờ tư vấn.
                      </span>
                    </div>
                  </div>
                </section>
              </div>
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Võ sinh câu lạc bộ</h2>
                    <p>Hồ sơ và tình hình học phí tháng {monthLabel(period)}</p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => navigate("students")}
                  >
                    Xem tất cả <ChevronRight size={13} />
                  </button>
                </div>
                {studentsTable(active.slice(0, 6), true)}
              </section>
            </>
          )}
          {tab === "students" && (
            <section className="panel">
              <div className="table-toolbar">
                <div className="search-field">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Tìm võ sinh"
                    placeholder="Tìm tên, phụ huynh, số điện thoại…"
                  />
                </div>
                <div className="filter-tabs">
                  {[
                    ["all", `Tất cả (${s.students.length})`],
                    ["active", `Đang học (${active.length})`],
                    ["inactive", "Đã nghỉ"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className={filter === id ? "active" : ""}
                      onClick={() => setFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  className="table-action"
                  onClick={() =>
                    csvDownload("vo-sinh.csv", [
                      [
                        "Mã",
                        "Tên",
                        "Tham gia",
                        "Trạng thái",
                        "Phụ huynh",
                        "Điện thoại",
                        "Cấp đai",
                        "Ghi chú",
                      ],
                      ...visibleStudents.map((st) => [
                        st.id,
                        st.name,
                        st.joined,
                        st.status === "active" ? "Đang học" : "Đã nghỉ",
                        st.parent,
                        st.phone,
                        st.belt,
                        st.notes,
                      ]),
                    ])
                  }
                >
                  <Download size={16} />
                </button>
              </div>
              {studentsTable(visibleStudents)}
            </section>
          )}
          {tab === "billing" && (
            <>
              <div className="stat-grid">
                {[
                  {
                    label: "Phải thu trong tháng",
                    value: money(
                      monthBills.reduce((sum, b) => sum + b.amount, 0),
                    ),
                  },
                  {
                    label: "Đã phân bổ cho tháng",
                    value: money(
                      monthBills.reduce(
                        (sum, b) => sum + paidAmount(s, b.id),
                        0,
                      ),
                    ),
                  },
                  { label: "Còn phải thu", value: money(summary.debt) },
                  { label: "Hạn đóng", value: `Ngày ${s.settings.dueDay}` },
                ].map((c) => (
                  <div className="stat-card" key={c.label}>
                    <div className="stat-top">
                      <span>{c.label}</span>
                    </div>
                    <div className="stat-value">{c.value}</div>
                  </div>
                ))}
              </div>
              <div className="admin-note">
                Chỉ khoản phải thu đã lập mới được tính công nợ. Không suy công
                nợ từ ô trống trong bảng cũ. Đóng trước nhiều tháng được phân bổ
                theo từng tháng, tiền thực thu ghi theo ngày nhận.
              </div>
              <section className="panel">
                <div className="panel-head">
                  <div>
                    <h2>Học phí tháng {monthLabel(period)}</h2>
                    <p>Mức chung {money(s.settings.monthlyFee)} / tháng</p>
                  </div>
                  <button
                    className="btn secondary"
                    disabled={
                      busy ||
                      period < currentMonth() ||
                      period < s.settings.billingStart
                    }
                    onClick={() => edit("generate", { period })}
                  >
                    <Plus size={14} />
                    Lập khoản phải thu
                  </button>
                </div>
                {monthBills.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Võ sinh</th>
                          <th>Phải thu</th>
                          <th>Đã đóng</th>
                          <th>Còn thiếu</th>
                          <th>Trạng thái</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthBills.map((b) => {
                          const debt = outstanding(s, b);
                          return (
                            <tr key={b.id}>
                              <td>
                                <StudentName student={student(b.studentId)} />
                              </td>
                              <td>{money(b.amount)}</td>
                              <td>{money(paidAmount(s, b.id))}</td>
                              <td className={debt ? "negative" : "muted"}>
                                {money(debt)}
                              </td>
                              <td>
                                <Badge
                                  color={
                                    !debt
                                      ? "green"
                                      : isOverdue(
                                            b.month,
                                            s.settings.dueDay,
                                            today(),
                                          )
                                        ? "red"
                                        : "orange"
                                  }
                                >
                                  {!debt
                                    ? "Đã hoàn tất"
                                    : isOverdue(
                                          b.month,
                                          s.settings.dueDay,
                                          today(),
                                        )
                                      ? "Quá hạn"
                                      : "Chưa đóng"}
                                </Badge>
                              </td>
                              <td>
                                <div className="row-actions">
                                  {!!debt && (
                                    <button
                                      className="table-action"
                                      onClick={() =>
                                        edit("payment", {
                                          studentId: b.studentId,
                                          month: b.month,
                                        })
                                      }
                                    >
                                      Thu phí
                                    </button>
                                  )}
                                  {!paidAmount(s, b.id) && (
                                    <button
                                      className="table-action"
                                      onClick={() => edit("adjust", b)}
                                    >
                                      Điều chỉnh
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="Chưa có khoản phải thu tháng này"
                    description="Chọn Lập khoản phải thu để tạo cho võ sinh đang học. Tháng cũ chỉ hiển thị dữ liệu đã đối soát."
                  />
                )}
              </section>
            </>
          )}
          {tab === "finance" && (
            <>
              <div className="admin-note warning">
                “Lợi nhuận bán hàng lịch sử” là lợi nhuận sau chi phí nhập hàng,
                chưa có doanh thu. Tổng sổ giữ đúng bảng cũ; không dùng làm số
                dư tiền mặt. Giao dịch thiếu ngày cần bổ sung để báo cáo theo
                ngày chính xác.
              </div>
              <section className="panel">
                <div className="table-toolbar">
                  <div className="search-field">
                    <Search size={15} />
                    <input
                      aria-label="Tìm giao dịch"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Tìm nội dung hoặc danh mục…"
                    />
                  </div>
                  <select
                    aria-label="Loại giao dịch"
                    style={{
                      width: "auto",
                      minWidth: 170,
                      margin: 0,
                      fontSize: 11,
                    }}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">Tất cả giao dịch</option>
                    <option value="tuition">Học phí</option>
                    <option value="sale">Bán hàng</option>
                    <option value="purchase">Nhập hàng</option>
                    <option value="legacy_margin">
                      Lợi nhuận bán hàng lịch sử
                    </option>
                    <option value="income">Tiền khác</option>
                    <option value="expense">Chi phí</option>
                    <option value="review">Cần bổ sung</option>
                  </select>
                </div>
                {visibleEntries.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Ngày giao dịch</th>
                          <th>Nội dung</th>
                          <th>Danh mục</th>
                          <th>Giá trị sổ</th>
                          <th>Trạng thái</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleEntries.map((e) => (
                          <tr
                            key={e.id}
                            style={{ opacity: e.voided ? 0.45 : 1 }}
                          >
                            <td>{displayDate(e.date)}</td>
                            <td>
                              <b style={{ fontWeight: 500 }}>{e.description}</b>
                              {e.notes && (
                                <small className="transaction-notes">
                                  Ghi chú: {e.notes}
                                </small>
                              )}
                              {e.kind === "sale" && Number(e.cost) > 0 && (
                                <small
                                  style={{
                                    display: "block",
                                    color: "#63758a",
                                    fontSize: 9,
                                  }}
                                >
                                  Giá bán {money(e.amount)} · Giá nhập{" "}
                                  {money(e.cost || 0)}
                                </small>
                              )}
                            </td>
                            <td>
                              <Badge
                                color={
                                  e.kind === "legacy_margin"
                                    ? "orange"
                                    : e.kind === "expense" ||
                                        e.kind === "purchase"
                                      ? ""
                                      : "blue"
                                }
                              >
                                {e.kind === "legacy_margin"
                                  ? "Lợi nhuận bán hàng lịch sử"
                                  : e.category}
                              </Badge>
                            </td>
                            <td
                              className={`currency ${sourceValue(e) < 0 ? "negative" : "positive"}`}
                            >
                              {money(sourceValue(e))}
                            </td>
                            <td>
                              {e.voided ? (
                                <Badge color="red">Đã hủy</Badge>
                              ) : e.review ? (
                                <Badge color="orange">Cần bổ sung ngày</Badge>
                              ) : (
                                <Badge color="green">Đã ghi nhận</Badge>
                              )}
                            </td>
                            <td>
                              <div className="row-actions">
                                {!e.date && !e.voided && (
                                  <button
                                    className="table-action"
                                    onClick={() => edit("resolve", e)}
                                  >
                                    Bổ sung ngày
                                  </button>
                                )}
                                {!e.voided && (
                                  <button
                                    className="table-action"
                                    onClick={() => edit("edit_entry", e)}
                                  >
                                    Chỉnh sửa
                                  </button>
                                )}
                                {!e.voided && (
                                  <button
                                    className="table-action"
                                    onClick={() => edit("void", e)}
                                  >
                                    Hủy
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title="Không có giao dịch phù hợp" />
                )}
              </section>
            </>
          )}
          {tab === "classes" && (
            <div className="content-grid">
              {s.classes.map((c) => (
                <article className="content-card" key={c.id}>
                  <div>
                    <span className="pill">LỚP HỌC</span>
                    <h3 style={{ marginTop: 17 }}>{c.name}</h3>
                    <p>
                      <Clock3 size={14} style={{ verticalAlign: "middle" }} />{" "}
                      {c.schedule}
                    </p>
                    <p>{c.location}</p>
                    <p>Huấn luyện viên: {c.coach || "Chưa bổ sung"}</p>
                    <p>
                      {
                        s.students.filter(
                          (st) => st.classId === c.id && st.status === "active",
                        ).length
                      }{" "}
                      võ sinh đang học
                    </p>
                    <button
                      className="btn secondary"
                      onClick={() => edit("class", c)}
                    >
                      <Pencil size={14} />
                      Chỉnh sửa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {tab === "exams" && (
            <>
              {!s.exams.length ? (
                <section className="panel">
                  <Empty
                    title="Lưu lại từng cột mốc trưởng thành"
                    description="Thêm khóa thi, kết quả đạt/không đạt, cấp đai và danh hiệu của võ sinh."
                  />
                </section>
              ) : (
                s.exams
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((ex) => (
                    <section className="panel" key={ex.id}>
                      <div className="panel-head">
                        <div>
                          <h2>{ex.name}</h2>
                          <p>
                            {displayDate(ex.date)} · {ex.location} ·{" "}
                            {ex.organizer}
                          </p>
                        </div>
                        <button
                          className="btn secondary"
                          onClick={() => edit("exam", ex)}
                        >
                          <Pencil size={14} />
                          Chỉnh sửa
                        </button>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Võ sinh</th>
                              <th>Kết quả</th>
                              <th>Cấp đai đạt được</th>
                              <th>Danh hiệu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ex.results.map((r) => (
                              <tr key={r.studentId}>
                                <td>
                                  <StudentName student={student(r.studentId)} />
                                </td>
                                <td>
                                  <Badge color={r.passed ? "green" : "red"}>
                                    {r.passed ? "Đạt" : "Không đạt"}
                                  </Badge>
                                </td>
                                <td>{r.passed ? r.belt : "—"}</td>
                                <td>{r.honor || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))
              )}
            </>
          )}
          {tab === "leads" && (
            <section className="panel">
              <div className="panel-head">
                <h2>Danh sách đăng ký học thử</h2>
                <Badge>{s.leads.length} đăng ký</Badge>
              </div>
              {!s.leads.length ? (
                <Empty
                  title="Sẵn sàng đón những gương mặt mới"
                  description="Đăng ký từ website sẽ hiển thị tại đây để bạn liên hệ tư vấn."
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Ngày đăng ký</th>
                        <th>Người liên hệ</th>
                        <th>Người học</th>
                        <th>Lời nhắn</th>
                        <th>Xử lý</th>
                        <th>Nhập học</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.leads.map((l) => (
                        <tr key={l.id}>
                          <td>{displayDate(l.createdAt.slice(0, 10))}</td>
                          <td>
                            <b>{l.name}</b>
                            <br />
                            <a className="text-link" href={`tel:${l.phone}`}>
                              {l.phone}
                            </a>
                          </td>
                          <td>
                            {l.studentName} · {l.age} tuổi
                          </td>
                          <td
                            style={{
                              whiteSpace: "normal",
                              minWidth: 170,
                              maxWidth: 250,
                            }}
                          >
                            {l.notes || "—"}
                          </td>
                          <td>
                            <select
                              aria-label={`Trạng thái đăng ký ${l.name}`}
                              value={l.status}
                              style={{ fontSize: 11, margin: 0 }}
                              disabled={busy}
                              onChange={(e) =>
                                save("lead_status", {
                                  leadId: l.id,
                                  status: e.target.value,
                                })
                              }
                            >
                              {[
                                "Mới",
                                "Đã liên hệ",
                                "Hẹn học thử",
                                "Đã nhập học",
                                "Không tiếp tục",
                              ].map((v) => (
                                <option key={v}>{v}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              className="table-action"
                              onClick={() =>
                                edit("student", {
                                  name: l.studentName,
                                  parent: l.name,
                                  phone: l.phone,
                                  joined: currentMonth(),
                                  status: "active",
                                  notes: l.notes,
                                })
                              }
                            >
                              Tạo hồ sơ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {tab === "content" && (
            <>
              <div className="section-tabs">
                {[
                  ["posts", "Bài viết"],
                  ["coaches", "Huấn luyện viên"],
                  ["media", "Ảnh / video"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={contentTab === id ? "active" : ""}
                    onClick={() => setContentTab(id)}
                  >
                    {label}
                  </button>
                ))}
                <button onClick={() => navigate("settings")}>
                  Thông tin & giao diện CLB <ArrowUpRight size={12} />
                </button>
              </div>
              {contentTab === "posts" && (
                <>
                  {!s.posts.length ? (
                    <section className="panel">
                      <Empty
                        title="Chia sẻ câu chuyện của câu lạc bộ"
                        description="Bài viết có thể lưu nháp hoặc xuất bản lên website."
                      />
                    </section>
                  ) : (
                    <div className="content-grid">
                      {s.posts.map((p) => (
                        <article className="content-card" key={p.id}>
                          {p.image && <img src={p.image} alt={p.title} />}
                          <div>
                            <Badge color={p.published ? "green" : ""}>
                              {p.published ? "Đã xuất bản" : "Bản nháp"}
                            </Badge>
                            <h3 style={{ marginTop: 14 }}>{p.title}</h3>
                            <p>{postExcerpt(p.body, p.bodyFormat)}…</p>
                            <button
                              className="btn secondary"
                              onClick={() => edit("post", p)}
                            >
                              <Pencil size={14} />
                              Biên tập
                            </button>
                            {p.published && (
                              <Link
                                className="table-action"
                                target="_blank"
                                href={`/tin-tuc/${p.slug}`}
                              >
                                Xem bài <ExternalLink size={12} />
                              </Link>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
              {contentTab === "coaches" && (
                <>
                  {!s.coaches.length ? (
                    <section className="panel">
                      <Empty
                        title="Giới thiệu người đồng hành"
                        description="Thêm ảnh, cấp đai và phần giới thiệu huấn luyện viên."
                      />
                    </section>
                  ) : (
                    <div className="content-grid">
                      {s.coaches.map((c) => (
                        <article className="content-card" key={c.id}>
                          {c.image && <img src={c.image} alt={c.name} />}
                          <div>
                            <small>{c.role}</small>
                            <h3>{c.name}</h3>
                            <p>{c.bio}</p>
                            <button
                              className="btn secondary"
                              onClick={() => edit("coach", c)}
                            >
                              <Pencil size={14} />
                              Chỉnh sửa
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
              {contentTab === "media" && (
                <>
                  {!s.media.length ? (
                    <section className="panel">
                      <Empty
                        title="Những khoảnh khắc đáng nhớ"
                        description="Tải ảnh thực tế của CLB hoặc thêm liên kết video để hiển thị trên website."
                      />
                    </section>
                  ) : (
                    <div className="content-grid">
                      {s.media.map((m) => (
                        <article className="content-card" key={m.id}>
                          {m.type === "image" ? (
                            <img src={m.url} alt={m.title} />
                          ) : (
                            <VideoThumbnail
                              url={m.url}
                              thumbnail={m.thumbnail}
                              title={m.title}
                            />
                          )}
                          <div>
                            <h3>{m.title}</h3>
                            <a
                              className="text-link"
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Mở nội dung <ArrowUpRight size={14} />
                            </a>
                            <br />
                            <button
                              className="btn secondary"
                              style={{ marginTop: 15 }}
                              onClick={() => edit("media", m)}
                            >
                              Chỉnh sửa
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {tab === "reports" && (
            <>
              <div className="report-totals">
                <div>
                  <small>Doanh thu</small>
                  <b>{money(summary.revenue)}</b>
                </div>
                <div>
                  <small>Chi phí</small>
                  <b>{money(summary.cost)}</b>
                </div>
                <div>
                  <small>Lợi nhuận</small>
                  <b>{money(summary.profit)}</b>
                </div>
              </div>
              <div className="admin-note warning">
                Dữ liệu bán hàng lịch sử chỉ có lợi nhuận, chưa đủ doanh thu và
                chi phí gốc. Báo cáo sử dụng các khoản đã ghi nhận; lợi nhuận
                không phải số dư tiền mặt.
              </div>
              <section className="panel">
                <div className="panel-head">
                  <h2>Thu–chi theo ngày giao dịch · {monthLabel(period)}</h2>
                </div>
                <div className="panel-body">
                  {(() => {
                    const rows = s.entries.filter(
                      (e) => !e.voided && e.date.startsWith(period),
                    );
                    const totals = financialTotals(rows);
                    const incomplete =
                      rows.some((e) => e.kind === "legacy_margin") ||
                      s.entries.some(
                        (e) => !e.voided && e.month === period && !e.date,
                      );
                    return (
                      <>
                        <div className="report-totals">
                          <div>
                            <small>Doanh thu</small>
                            <b>{money(totals.revenue)}</b>
                          </div>
                          <div>
                            <small>Chi phí</small>
                            <b>{money(totals.cost)}</b>
                          </div>
                          <div>
                            <small>Lợi nhuận</small>
                            <b>{money(totals.profit)}</b>
                          </div>
                        </div>
                        <p className="chart-foot">
                          {incomplete
                            ? "Doanh thu và chi phí chưa đầy đủ do dữ liệu bán hàng lịch sử chỉ có lợi nhuận. Giao dịch thiếu ngày chưa được tính."
                            : "Doanh thu và chi phí của đơn bán mới được ghi nhận theo ngày giao dịch."}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </section>
              <section className="panel">
                <div className="panel-head">
                  <h2>Học phí, công nợ và đăng ký theo tháng</h2>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Tháng</th>
                        <th>Doanh thu học phí</th>
                        <th>Phải thu đã lập</th>
                        <th>Công nợ</th>
                        <th>Đăng ký học thử mới</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 6 }, (_, i) => {
                        const [y, m] = period.split("-").map(Number);
                        const p = new Date(Date.UTC(y, m - 6 + i, 1))
                          .toISOString()
                          .slice(0, 7);
                        const v = monthSummary(s, p);
                        return (
                          <tr key={p}>
                            <td>{monthLabel(p)}</td>
                            <td>{money(v.tuition)}</td>
                            <td>
                              {money(
                                s.bills
                                  .filter((b) => b.month === p)
                                  .reduce((a, b) => a + b.amount, 0),
                              )}
                            </td>
                            <td>{money(v.debt)}</td>
                            <td>
                              {
                                s.leads.filter(
                                  (l) => l.createdAt.slice(0, 7) === p,
                                ).length
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          {tab === "settings" && (
            <section className="panel">
              <div className="panel-body">
                <form
                  className="settings-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const values = Object.fromEntries(
                      new FormData(e.currentTarget),
                    );
                    await save("settings", {
                      ...values,
                      monthlyFee: Number(values.monthlyFee),
                      dueDay: Number(values.dueDay),
                    });
                  }}
                >
                  <h3>Thông tin câu lạc bộ</h3>
                  <div className="settings-grid">
                    {[
                      ["name", "Tên câu lạc bộ"],
                      ["phone", "Điện thoại / Zalo"],
                      ["address", "Địa chỉ"],
                      ["schedule", "Lịch tập"],
                    ].map(([key, label]) => (
                      <label key={key}>
                        <FieldLabel>{label}</FieldLabel>
                        <input
                          name={key}
                          defaultValue={String(
                            s.settings[key as keyof typeof s.settings],
                          )}
                          required
                        />
                      </label>
                    ))}
                    <label className="wide">
                      Giới thiệu
                      <textarea
                        name="intro"
                        defaultValue={s.settings.intro}
                        rows={4}
                      />
                    </label>
                  </div>
                  <h3>Trang chủ & nhận diện</h3>
                  <div className="settings-grid">
                    <div>
                      <ImageField
                        name="logo"
                        label="Logo"
                        initial={s.settings.logo}
                      />
                    </div>
                    <div>
                      <ImageField
                        name="heroImage"
                        label="Ảnh nổi bật trang chủ"
                        initial={s.settings.heroImage}
                      />
                    </div>
                    <label>
                      <FieldLabel>
                        Tiêu đề chính (xuống dòng để chia dòng)
                      </FieldLabel>
                      <textarea
                        name="heroTitle"
                        defaultValue={s.settings.heroTitle}
                        required
                      />
                    </label>
                    <label>
                      Mô tả trang chủ
                      <textarea
                        name="heroDescription"
                        defaultValue={s.settings.heroDescription}
                      />
                    </label>
                    <label className="wide">
                      Thành tích câu lạc bộ
                      <textarea
                        name="achievements"
                        defaultValue={s.settings.achievements}
                        placeholder="Nhập những thành tích đã được xác minh. Để trống để ẩn phần này."
                        rows={4}
                      />
                    </label>
                    <label>
                      Facebook
                      <input
                        name="facebook"
                        type="url"
                        defaultValue={s.settings.facebook}
                      />
                    </label>
                    <label>
                      TikTok
                      <input
                        name="tiktok"
                        type="url"
                        defaultValue={s.settings.tiktok}
                      />
                    </label>
                  </div>
                  <h3>Quy tắc học phí</h3>
                  <div className="settings-grid">
                    <label>
                      <FieldLabel>Học phí chung (đ/tháng)</FieldLabel>
                      <input
                        name="monthlyFee"
                        type="number"
                        min={0}
                        defaultValue={s.settings.monthlyFee}
                        required
                      />
                    </label>
                    <label>
                      <FieldLabel>Ngày đến hạn hàng tháng</FieldLabel>
                      <input
                        name="dueDay"
                        type="number"
                        min={1}
                        max={28}
                        defaultValue={s.settings.dueDay}
                        required
                      />
                    </label>
                    <label>
                      <FieldLabel>Tháng bắt đầu lập công nợ mới</FieldLabel>
                      <DateInput
                        name="billingStart"
                        label="Tháng bắt đầu lập công nợ mới"
                        mode="month"
                        defaultValue={s.settings.billingStart}
                        required
                      />
                    </label>
                  </div>
                  <div className="admin-note">
                    Thay đổi mức chung chỉ áp dụng cho khoản phải thu tạo sau
                    đó. Các khoản đã lập và lịch sử thanh toán giữ nguyên.
                  </div>
                  <button className="btn primary" disabled={busy}>
                    {busy ? "Đang lưu…" : "Lưu cài đặt"}
                  </button>
                </form>
              </div>
            </section>
          )}
          {tab === "audit" && (
            <section className="panel">
              <div className="panel-head">
                <h2>Lịch sử thay đổi</h2>
                <small className="muted">{s.audit.length} thao tác</small>
              </div>
              <div className="audit-list">
                {s.audit.map((a) => (
                  <article className="audit-item" key={a.id}>
                    <b>{a.action}</b>
                    <p>{a.detail}</p>
                    {a.before && a.after && (
                      <details className="audit-change">
                        <summary>Xem nội dung trước / sau chỉnh sửa</summary>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Thông tin</th>
                                <th>Trước</th>
                                <th>Sau</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(
                                [
                                  ["description", "Nội dung"],
                                  ["notes", "Ghi chú"],
                                  ["category", "Danh mục"],
                                  ["amount", "Số tiền"],
                                  ["cost", "Giá nhập"],
                                  ["date", "Ngày giao dịch"],
                                  ["month", "Tháng hạch toán"],
                                ] as const
                              ).map(([key, label]) => (
                                <tr key={key}>
                                  <td>{label}</td>
                                  <td>
                                    {key === "amount" || key === "cost"
                                      ? money(Number(a.before?.[key] || 0))
                                      : String(a.before?.[key] || "—")}
                                  </td>
                                  <td>
                                    {key === "amount" || key === "cost"
                                      ? money(Number(a.after?.[key] || 0))
                                      : String(a.after?.[key] || "—")}
                                  </td>
                                </tr>
                              ))}
                              {(a.before.kind === "tuition" ||
                                a.after.kind === "tuition") && (
                                <>
                                  <tr>
                                    <td>Võ sinh</td>
                                    <td>
                                      {student(a.before.studentId)?.name || "—"}
                                    </td>
                                    <td>
                                      {student(a.after.studentId)?.name || "—"}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>Phân bổ học phí</td>
                                    <td>
                                      {a.before.allocations
                                        ?.map(
                                          (v) =>
                                            `${monthLabel(s.bills.find((b) => b.id === v.billId)?.month || "")} · ${money(v.amount)}`,
                                        )
                                        .join("; ") || "—"}
                                    </td>
                                    <td>
                                      {a.after.allocations
                                        ?.map(
                                          (v) =>
                                            `${monthLabel(s.bills.find((b) => b.id === v.billId)?.month || "")} · ${money(v.amount)}`,
                                        )
                                        .join("; ") || "—"}
                                    </td>
                                  </tr>
                                </>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                    <small>
                      {new Intl.DateTimeFormat("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(a.at))}
                    </small>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
      {dialog && (
        <AdminDialog spec={dialog} state={s} close={close} save={save} />
      )}{" "}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2
            size={15}
            style={{ verticalAlign: "middle", marginRight: 8 }}
          />
          {toast}
        </div>
      )}
    </div>
  );
}
