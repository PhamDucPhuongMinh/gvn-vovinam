export type Student = {
  id: string;
  name: string;
  joined: string;
  status: "active" | "inactive";
  left?: string;
  birthday?: string;
  parent?: string;
  phone?: string;
  belt?: string;
  beltBeforeExams?: string;
  notes?: string;
  classId?: string;
};
export type Bill = {
  id: string;
  studentId: string;
  month: string;
  amount: number;
};
export type Entry = {
  id: string;
  kind:
    "tuition" | "income" | "expense" | "purchase" | "sale" | "legacy_margin";
  category: string;
  description: string;
  amount: number;
  date: string;
  month: string;
  studentId?: string;
  allocations?: { billId: string; amount: number }[];
  cost?: number;
  quantity?: number;
  voided?: boolean;
  review?: string;
  source?: string;
  legacy?: boolean;
  original?: { amount: number; month: string; kind: Entry["kind"] };
};
export type ClubClass = {
  id: string;
  name: string;
  schedule: string;
  location: string;
  coach: string;
};
export type Coach = {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
};
export type Exam = {
  id: string;
  name: string;
  date: string;
  location: string;
  organizer: string;
  results: {
    studentId: string;
    passed: boolean;
    belt: string;
    honor: string;
  }[];
};
export type Lead = {
  id: string;
  name: string;
  phone: string;
  studentName: string;
  age: number;
  notes: string;
  status: string;
  createdAt: string;
};
export type Post = {
  id: string;
  title: string;
  slug: string;
  body: string;
  bodyFormat?: "text" | "html";
  image: string;
  published: boolean;
  date: string;
};
export type Media = {
  id: string;
  title: string;
  url: string;
  type: "image" | "video";
  thumbnail?: string;
};
export type Settings = {
  name: string;
  address: string;
  phone: string;
  schedule: string;
  intro: string;
  heroTitle: string;
  heroDescription: string;
  logo: string;
  heroImage: string;
  facebook: string;
  tiktok: string;
  monthlyFee: number;
  dueDay: number;
  billingStart: string;
  achievements: string;
};
export type Audit = {
  id: string;
  at: string;
  action: string;
  detail: string;
  before?: Entry;
  after?: Entry;
};
export type ClubState = {
  revision: number;
  students: Student[];
  bills: Bill[];
  entries: Entry[];
  classes: ClubClass[];
  coaches: Coach[];
  exams: Exam[];
  leads: Lead[];
  posts: Post[];
  media: Media[];
  settings: Settings;
  audit: Audit[];
};
