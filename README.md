# Vovinam phường Gò Vấp

Website giới thiệu và dashboard quản lý CLB, sử dụng Next.js App Router, TypeScript, API Node.js và MongoDB Atlas. Giao diện tiếng Việt, màu chủ đạo `#0063cd`.

## Chạy cục bộ

Yêu cầu Node.js >=20.19 (khuyến nghị Node.js 22).

```sh
npm install
npm run dev
```

- Trang chủ: http://127.0.0.1:3000
- Quản trị: http://127.0.0.1:3000/admin
- Khi chưa cấu hình MongoDB, môi trường development tự dùng dữ liệu xem thử lưu trong `.data/club.json`. Tài khoản **admin / demo12345**. Chế độ này luôn bị vô hiệu hóa trong production hoặc trên Netlify.
- Cả chế độ cục bộ và MongoDB mới đều khởi tạo trống: không có võ sinh, giao dịch, lớp học hay nội dung mẫu. Dữ liệu đã cung cấp trước đây đã được gỡ khỏi dự án.

## Kết nối dữ liệu thật

1. Tạo MongoDB Atlas Free cluster, tạo database user chỉ có quyền đọc/ghi database của CLB, cấu hình Network Access phù hợp với nơi chạy ứng dụng.
2. Sao chép `.env.example` thành `.env.local`, điền `MONGODB_URI`, `MONGODB_DB`, `ADMIN_USERNAME`, `ADMIN_PASSWORD` (ít nhất 12 ký tự), `SESSION_SECRET` (ít nhất 32 ký tự ngẫu nhiên). Không commit file này và không gửi mật khẩu qua chat.
3. Khởi động lại ứng dụng. Cơ sở dữ liệu thật bắt đầu rỗng về võ sinh/tài chính; không tự đưa dữ liệu cá nhân vào môi trường công khai.
4. Đăng nhập dashboard, cấu hình CLB và tự thêm dữ liệu. Không có lệnh seed để nhập lại dữ liệu cũ.

## Tư liệu hình ảnh

Dashboard → Cài đặt CLB cho phép chỉnh logo, ảnh trang chủ, nội dung, liên hệ và mức học phí. Dashboard → Nội dung website quản lý huấn luyện viên, bài viết, ảnh/video. Ban đầu không có ảnh thật, danh hiệu hoặc tiểu sử bịa đặt; wordmark chữ V và ảnh minh họa là tài sản tạm thời.

Có thể dán URL ảnh HTTPS. Để tải ảnh trực tiếp từ máy trong dashboard, cấu hình tài khoản Cloudinary riêng:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Máy chủ ký yêu cầu tải ảnh; khóa bí mật không gửi về trình duyệt. Chấp nhận JPG, PNG, WebP tối đa 5 MB. Không có thông tin Cloudinary vẫn dùng được URL ảnh. Video được lưu bằng liên kết, không tải video lớn vào MongoDB.

## Triển khai Netlify

1. Đưa repository lên tài khoản Git của bạn và kết nối trong Netlify.
2. Netlify đọc `netlify.toml`: build `npm run build`, output `.next`, Node.js 22. Dự án khai báo rõ `@netlify/plugin-nextjs` để tạo server functions và routing cho Next.js.
3. Trong Environment Variables, khai báo các biến database và đăng nhập nêu trên, cùng biến Cloudinary nếu dùng tải ảnh. Không đặt các biến bí mật dưới tiền tố `NEXT_PUBLIC_`.
4. Deploy và kiểm tra: trang chủ, đăng ký học thử, đăng nhập, thao tác quản trị, dữ liệu tồn tại sau lần deploy tiếp theo, đăng xuất và truy cập API khi chưa đăng nhập.

Cấu hình tài khoản thực tế qua biến môi trường của bạn; không commit hoặc đưa các khóa này vào log. Free tier có giới hạn; theo dõi usage của các dịch vụ. Website không dùng email hoặc thanh toán online.

Nếu build thành công nhưng tất cả route trả 404: kiểm tra log có chạy `@netlify/plugin-nextjs` và đóng gói server function hay chưa. Không đặt `NETLIFY_NEXT_PLUGIN_SKIP=true` hoặc `1`. Giữ publish directory `.next`, không thêm rewrite SPA về `/index.html`. Sau khi sửa cấu hình, deploy lại từ nhánh `main`.

## Quy tắc tài chính

- Mặc định 400.000đ/tháng, hạn ngày 15; quá hạn từ ngày 16, theo múi giờ Việt Nam.
- Lập khoản phải thu hàng loạt cho tháng hiện tại/tương lai; lặp lại không tạo trùng.
- Chỉ tính công nợ từ khoản phải thu đã lập. Không suy nợ quá khứ từ ô trống; hồ sơ đã nghỉ giữ lịch sử.
- Thu đủ từng tháng, có thể thu trước tối đa 24 tháng. Một giao dịch tiền được phân bổ cho nhiều tháng, không nhân ba tiền nhận. Mỗi tháng đều mặc định theo mức chung 400.000đ/võ sinh và cho nhập mức khác, kể cả các tháng đóng trước. Mức xác nhận sẽ cập nhật khoản phải thu để không tạo công nợ giả.
- Không bảo lưu, học bù hoặc thanh toán từng phần.
- Form nguồn tiền có 5 nhóm: Học phí, Chi phí (Sân bãi / Lương trợ giảng / Dụng cụ / Khác), Tiền khác, Nhập hàng và Bán hàng. Học phí nhập tổng tiền và số tháng (1–24), phân bổ đều theo VND; tiền lẻ cộng vào các tháng đầu. Mặc định 400.000đ/tháng và có thể đổi tổng tiền.
- Nhập hàng ghi chi phí riêng; Bán hàng ghi tổng tiền bán và số lượng, không nhập lại giá vốn để tránh tính hai lần. Giao dịch bán cũ có giá nhập gộp vẫn được giữ và chỉnh sửa. Không quản lý tồn kho.
- Bán hàng lịch sử: chỉ có lãi/lỗ thuần; không suy ngược doanh thu/giá vốn. Tổng sổ không phải số dư tiền mặt hoặc lợi nhuận kế toán. Chưa có số dư quỹ đầu kỳ.
- Lưu riêng tháng hạch toán và ngày thực nhận/chi (có thể hạch toán một tháng và thanh toán ở tháng khác).
- Giao dịch được chỉnh sửa kèm lý do và ảnh chụp dữ liệu trước/sau trong lịch sử. Học phí cập nhật nguyên tử cả khoản phải thu và phân bổ; chuyển tháng thanh toán sẽ mở lại nợ tháng cũ và không được trùng giao dịch khác. Số liệu nhập gốc được giữ riêng để đối soát. Giao dịch không bị xóa: hủy kèm lý do, giữ bản ghi và nhật ký. Hủy thanh toán mở lại khoản phải thu.

## Dữ liệu và an toàn truy cập

- API quản trị xác thực bằng JWT HS256 trong cookie HttpOnly, SameSite Strict, Secure trên production; phiên 8 giờ. Kiểm tra Origin cho các thao tác ghi.
- Giới hạn số lần đăng nhập và đăng ký theo IP/cửa sổ 15 phút; MongoDB lưu bộ đếm có TTL trên production. Netlify ưu tiên header IP do nền tảng cung cấp.
- Dữ liệu cá nhân/tài chính không được trả về API công khai; nội dung chỉ xuất hiện công khai khi được xuất bản. Bài viết hỗ trợ nội dung HTML có định dạng qua Tiptap. HTML được lọc khi lưu và khi hiển thị, chỉ giữ các thẻ/thuộc tính định dạng được cho phép. Script, event handler và liên kết thực thi bị loại bỏ; iframe giới hạn ở YouTube/Vimeo. Bài viết cũ dạng văn bản vẫn được hiển thị đúng.
- Mọi thay đổi trong MongoDB dùng revision và compare-and-swap trên một aggregate document `club_state`, giúp thanh toán + phân bổ + nhật ký được ghi nguyên tử mà không cần giao dịch nhiều collection. Xung đột được thử lại, chống hai người/thiết bị thu cùng tháng.
- Cấu trúc aggregate phù hợp CLB nhỏ. Có chặn trước 12 MB (giới hạn BSON 16 MB); nếu tăng mạnh quy mô hoặc lịch sử cần tách thành collection và dùng transactions.
- Dashboard → Báo cáo → Sao lưu toàn bộ tải JSON; danh sách võ sinh và thu–chi có xuất CSV. Có nhập võ sinh từ bảng dán Excel/Sheets/CSV dấu chấm phẩy (không phải trình đọc `.xlsx`). Khôi phục JSON hiện cần người quản trị kỹ thuật kiểm tra và nhập bằng công cụ MongoDB; chưa có khôi phục tự động trong UI.
- Nên xuất bản sao lưu định kỳ và cất riêng ở nơi chỉ admin truy cập được; Atlas Free không thay thế quy trình sao lưu.

## Kiểm tra

```sh
npm run typecheck
npm run test
npm run build
```

Bộ kiểm thử dùng dữ liệu giả độc lập, tập trung vào học phí đóng trước, chống thu trùng, hủy/điều chỉnh, mức tháng đầu, ngày quá hạn và kết quả lên đai. Kiểm tra trình duyệt và MongoDB thực tế được ghi trong `VALIDATION.md`.

## Cấp đai, lịch và logo

- Danh sách cấp đai được khai báo tập trung trong `src/lib/constants.ts`. Hồ sơ ban đầu và hồ sơ mới mặc định Nhập môn. Dữ liệu cũ thiếu cấp đai được chuẩn hóa khi đọc; không đặt lại cấp đai đã có kết quả thi.
- Tất cả ô ngày/tháng dùng `react-datepicker` với locale tiếng Việt, định dạng dd/MM/yyyy hoặc MM/yyyy. Giá trị lưu vẫn là YYYY-MM-DD / YYYY-MM, không chuyển qua UTC để tránh lệch ngày. `DateRangeInput` dùng cùng thư viện, sẵn cho bộ lọc khoảng ngày sau này.
- Logo cấu hình tại Cài đặt CLB được dùng chung bởi thành phần `Brand` ở đầu/chân trang, đăng nhập và dashboard. Không có logo dashboard riêng.

## Biên tập bài viết và thumbnail video

- Trình soạn thảo Tiptap có tiêu đề, cỡ/màu chữ, in đậm/nghiêng/gạch chân, căn lề, danh sách, trích dẫn, liên kết và hoàn tác/làm lại.
- Chèn ảnh từ URL HTTPS hoặc tải ảnh JPG/PNG/WebP tối đa 5 MB qua kho Cloudinary đã cấu hình.
- Chèn video YouTube, Vimeo, MP4/WebM/OGG để phát trong bài. Video nhúng có liên kết mở tại nguồn; Facebook/TikTok hiển thị liên kết tới nguồn. Khả năng phát nhúng còn tùy giới hạn của video và nhà cung cấp.
- Bài mới lưu `bodyFormat: html`; bài cũ không có thuộc tính này tiếp tục là văn bản thuần và được chuyển đổi an toàn khi mở trình soạn thảo.
- Thư viện video có trường thumbnail riêng (URL hoặc tải ảnh). Thumbnail được hiển thị ở cả dashboard và website, nhấn vào sẽ mở video gốc. Video cũ chưa có thumbnail vẫn có nút xem video.
