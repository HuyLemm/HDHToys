# Bảng dữ liệu thích ứng: thẻ trên điện thoại, ưu tiên cột trên iPad

Written against: 05bd171

## Evidence chain

- Surface: `Orders`, `Products`, `Inventory`, `InventoryHistory`, `Invoices`, `Customers`, `ThuChi` (và các bảng còn lại). Toàn bộ dùng chung một component `Table` (`src/components/ui.tsx`) nhận `cols: string[]` và `rows: ReactNode[][]`, 24 chỗ dùng.
- Problem (đo thực tế):
  - Orders 14 cột rộng 1236px; Products 12 cột 941px; Inventory 9 cột 637px.
  - Vùng nhìn thấy: 390px (điện thoại) và 612px (iPad dọc, khi sidebar 208px).
  - Điện thoại thấy khoảng 4 cột, iPad khoảng 6 cột; Tổng tiền, Trạng thái, Thanh toán nằm ngoài tầm nhìn.
  - Thanh lọc xếp 4 hàng trên điện thoại; bảng "Khách mua nhiều nhất" xếp 5 thẻ dọc đẩy danh sách xuống dưới màn hình đầu.
- Design evidence: `ui-ux-pro-max` (Responsive "Table Handling": dùng cuộn ngang hoặc bố cục thẻ; mobile-first; "Horizontal Scroll" mức High), `web-design-guidelines` (flex con cần `min-w-0`, chữ dài phải `truncate`/`break-words`, filter/phân trang nên nằm trong URL), stack React (composition, generic component).
- Owner: `src/components/ui.tsx` (`Table`, `FilterBar`, `Pagination`).
- Scope and affected surfaces: các màn hình ở trên.
- Uncertainty: cần chốt với người dùng cột nào "quan trọng" cho từng màn (đề xuất bên dưới là suy ra từ tác vụ tra cứu đơn).

## Design decision

Mở rộng `Table` theo hướng tương thích ngược (không truyền thêm gì thì hành vi y như cũ):

- **Mức ưu tiên cột** (`priority`: 1 luôn hiện, 2 từ ≥ 768px, 3 từ ≥ 1024px). Cột "Thao tác" luôn ghim như hiện tại.
- **Bố cục thẻ** (`renderCard`) khi `useIsMobile()` (< 768px): mỗi bản ghi là một thẻ chạm được, cả thẻ mở chi tiết.
- **Thanh lọc gọn** (`FilterBar` có prop `search` + `activeCount`): trên điện thoại hiện ô tìm kiếm cộng nút "Bộ lọc (n)" mở bảng lọc kéo từ dưới lên; từ 768px hiện nguyên như cũ.

Lý do chọn thẻ thay cho cuộn ngang trên điện thoại: tác vụ chính là tra cứu và mở chi tiết, không phải so sánh nhiều cột. Trên iPad bảng vẫn hữu ích nên giữ bảng nhưng chỉ hiện cột ưu tiên để khỏi phải cuộn.

## Reuse

- `Table`, `FilterBar`, `SearchInput`, `Select`, `Badge`, `Modal`, `Pagination`, `useIsMobile`, `useScreenState` (lưu trang/bộ lọc khi quay lại).
- Exemplar: `src/screens/Orders.tsx` (màn mẫu thí điểm).

Primitive mới: `FilterSheet` (bảng lọc dạng bottom sheet) đặt trong `ui.tsx`, dùng chung cho mọi màn có `FilterBar`. `Modal` hiện tại căn giữa nên không dùng được cho sheet cạnh dưới.

## Changes

1. `src/components/ui.tsx` — `Table`
   - Change: thêm prop tùy chọn `priority?: (1 | 2 | 3)[]`, `renderCard?: (rowIndex: number) => ReactNode`, `onRowClick?: (rowIndex: number) => void`. Ẩn cột theo `priority` bằng lớp `hidden md:table-cell` / `hidden lg:table-cell` cho cả `<th>` và `<td>`. Khi `useIsMobile()` và có `renderCard`, render danh sách thẻ thay cho `<table>`. Ô số/tiền thêm `tabular-nums`.
   - Preserve: ghim cột đầu, `scope="col"`, cuộn ngang trên desktop.
   - Verify: không truyền prop mới thì bảng giống hệt trước.
2. `src/components/ui.tsx` — `FilterBar` + `FilterSheet`
   - Change: `FilterBar` nhận `search?: ReactNode` và `activeCount?: number`. Dưới 768px: render `search` + nút "Bộ lọc (activeCount)"; bấm mở `FilterSheet` chứa `children`, có nút "Áp dụng" và "Xóa lọc". Từ 768px: render `search` và `children` như cũ.
   - Preserve: màn nào không truyền `search` giữ nguyên hành vi cũ.
   - Verify: `overscroll-contain`, Esc và bấm nền đều đóng; focus được giữ trong sheet (dùng lại logic của `Modal`).
3. `src/screens/Orders.tsx` (thí điểm)
   - Change: `priority = [1,1,2,1,3,3,3,1,2,1,3,3,2,3]` cho các cột `Thao tác, Mã đơn, Ngày tạo, Khách hàng, SĐT, Sản phẩm, Số SP, Tổng tiền, Thanh toán, Trạng thái, Đã thu tiền, Trạng thái cọc, Nhận hàng, Mã vận đơn`. `renderCard`: dòng 1 = Mã đơn + Badge trạng thái; dòng 2 = Khách hàng · SĐT; dòng 3 = Tổng tiền (đậm) + Ngày; hàng Badge = Thanh toán, Đã thu tiền, Nhận hàng; hành động PDF bên dưới (nút ≥ 44px). `TopCustomersPanel`: `flex overflow-x-auto snap-x md:grid md:grid-cols-5`, thẻ rộng cố định trên điện thoại. Thêm hàng chip lọc nhanh Trạng thái (Tất cả, Mới, Đang xử lý, Hoàn thành) chạy cuộn ngang, dùng lại `trangThai` trong `useScreenState`.
   - Preserve: toàn bộ bộ lọc, sắp xếp, phân trang, xử lý lỗi vừa thêm.
   - Verify: trên 390px thấy danh sách đơn ngay trong màn hình đầu; trên 820px thấy 7 cột mà không cuộn ngang.
4. Nhân rộng (sau khi thí điểm được duyệt): `Products` (ưu tiên: Tên, Giá bán, Tồn kho, Trạng thái), `Inventory` (Sản phẩm, Tồn kho, Trạng thái), `Invoices` (Số hóa đơn, Khách, Tổng tiền), `Customers` (Khách hàng, SĐT, Hạng), `InventoryHistory`, `ThuChi`.
   - Preserve: nút xóa có xác nhận; quyền theo vai trò (ADMIN).
   - Verify: mỗi màn đúng quy tắc 1–2–3 ở trên.

## Scope

- Inherit: mọi màn dùng `Table` và `FilterBar` (24 bảng) vẫn hoạt động nhờ tương thích ngược.
- Verify: các bảng nhỏ trong thẻ chi tiết (`CustomerDetail`, `ProductDetail`, `OrderDetail`) không bị đổi hành vi ngoài ý muốn; bảng giỏ hàng ở `CreateOrder` có ô nhập số nên giữ bảng.
- Exclude: màn Tạo đơn hàng (xử lý ở kế hoạch riêng: chia bước + thanh tổng tiền cố định), biểu đồ, màn Kế toán/Doanh thu.

## Validation

- Product: nhân viên tìm một đơn theo SĐT, mở chi tiết, tải PDF, quay lại đúng trang đang xem, hoàn toàn bằng một tay trên điện thoại.
- Interface: 390×844, 744×1133, 820×1180, 1024×768, 1280×800; dữ liệu cực trị (tên khách rất dài, đơn có nhiều sản phẩm, không có SĐT, trạng thái lỗi tải, danh sách rỗng).
- System: không có bảng thứ hai song song; mọi thẻ dùng `Badge` hiện có.
- Repository: `npm test` → pass; `npx vite build` → thành công; kiểm tra tự động `document.documentElement.scrollWidth <= window.innerWidth` ở mọi viewport trên (không có cuộn ngang cấp trang).

## Stop conditions

- Dừng nếu người dùng cần so sánh nhiều cột cùng lúc trên iPad (khi đó giữ bảng đủ cột kèm bộ chọn "Cột hiển thị").
- Dừng nếu `Table` dùng chung bị phá vỡ ở một bảng ngoài danh sách trên; sửa tương thích ngược trước khi tiếp tục.

## Design documentation

- Sau khi nghiệm thu: ghi quy tắc "bảng ≥ 6 cột phải khai báo `priority` và `renderCard`; điện thoại dùng thẻ, tablet dùng cột ưu tiên" vào tài liệu thiết kế của frontend.
