import { DEFAULT_TUITION } from "./constants";
import { currentMonth } from "./utils";
import type { ClubState } from "./types";

/** Fresh setup state: never populate student, financial or website content records. */
export function createEmptyState(): ClubState {
  return {
    revision: 0,
    students: [],
    bills: [],
    entries: [],
    classes: [],
    coaches: [],
    exams: [],
    leads: [],
    posts: [],
    media: [],
    audit: [],
    settings: {
      name: "Câu lạc bộ Vovinam phường Gò Vấp",
      address: "1A Nguyễn Oanh, phường Gò Vấp, TP. Hồ Chí Minh",
      phone: "0968969392",
      schedule: "Thứ 7 & Chủ nhật · 07:30–09:00",
      intro:
        "Một không gian rèn luyện, kết nối và trưởng thành. Câu lạc bộ Vovinam phường Gò Vấp chào đón người học từ 5 tuổi, cùng xây dựng nền tảng thể lực, tinh thần kỷ luật và sự tự tin qua từng buổi tập.",
      heroTitle: "Khỏe thể chất.\nVững tinh thần.",
      heroDescription:
        "Cùng Vovinam Gò Vấp khám phá sức mạnh bên trong. Một hành trình rèn luyện cho bạn và cả gia đình, bắt đầu từ những điều giản dị.",
      logo: "",
      heroImage: "",
      facebook: "https://www.facebook.com/profile.php?id=61589486648538",
      tiktok: "https://www.tiktok.com/@phamducphuongminh",
      monthlyFee: DEFAULT_TUITION,
      dueDay: 15,
      billingStart: currentMonth(),
      achievements: "",
    },
  };
}
