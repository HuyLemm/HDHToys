# HDH Toys — Backend Feature List (Phase 1)

Nguồn: UI hiện có ở `frontend/src/App.tsx` (toàn bộ đang là mock data, chưa có API nào). Phase 1 chỉ tập trung 6 nhóm chức năng dưới đây, theo phong cách iPOS.

---

## Thứ tự triển khai

Sắp theo phụ thuộc dữ liệu (cái sau cần cái trước mới chạy được):

1. **Setup dự án backend** — chọn stack, khởi tạo DB, migration cơ bản
2. **Auth + Staff** — cần có trước để biết "nhân viên xử lý", "người thực hiện" cho mọi bảng ghi log sau này
3. **Product (Sản phẩm)** — danh mục, nhà cung cấp, giá vốn/giá bán — nền cho Kho hàng, Order, Doanh thu
4. **Customer (Khách hàng)** — CRUD cơ bản, chưa cần 360 — cần có trước Order
5. **Order + OrderItem** — lõi giao dịch; mọi thứ ở bước 6-9 đều tính toán dựa trên Order
6. **Kho hàng (Inventory)** — tồn kho + InventoryTransaction; xuất kho tự động khi Order hoàn thành
7. **Hóa đơn (Invoice)** — sinh từ Order hoàn thành, có ngày/giờ, xuất PDF/in
8. **Customer 360** — các endpoint tổng hợp (lịch sử mua, đơn đang xử lý, sản phẩm đã mua, hóa đơn) — cần Order + Invoice đã có dữ liệu
9. **Global Search** — search chung Customer/Order/Invoice/Product — cần tất cả bảng ở trên
10. **Bảng doanh thu (Revenue)** — aggregate từ Order/Invoice/Inventory
11. **Thu/Chi (Income/Expense)** — độc lập, nhưng cần trước Kế toán vì là input của dòng tiền
12. **Công nợ (Debt)** — độc lập, cần trước Bảng cân đối kế toán
13. **Kế toán tổng quan + Cân đối kế toán (Balance Sheet)** — tổng hợp cuối cùng, cần Inventory (giá trị tồn), Debt, Thu/Chi đã có dữ liệu
14. **Logo mới** — chỉ ở frontend, làm độc lập bất kỳ lúc nào, không phụ thuộc backend

---

## 1. Kho hàng (Inventory)

**Mục tiêu**: theo dõi tồn kho theo SKU, lịch sử nhập/xuất/điều chỉnh, cảnh báo sắp hết/hết hàng.

Entities:
- `Product` (sku, ten, danh_muc, nha_cung_cap, gia_von, gia_ban, ton_kho_toi_thieu, trang_thai)
- `InventoryTransaction` (id, san_pham_id, loai: NHAP|XUAT|DIEU_CHINH|TRA_HANG, so_luong_thay_doi, ton_truoc, ton_sau, nguoi_thuc_hien_id, tham_chieu (order_id/po_id), ghi_chu, thoi_gian)

API:
- `GET /api/inventory` — danh sách tồn kho (filter: danh_muc, ncc, trạng thái tồn; search theo tên/SKU/barcode)
- `GET /api/inventory/summary` — KPI: tổng SKU, tổng số lượng tồn, giá trị tồn kho, số sp sắp hết/hết hàng
- `POST /api/inventory/stock-in` — nhập kho (tạo phiếu nhập, cộng tồn kho, ghi InventoryTransaction loại NHAP)
- `POST /api/inventory/stock-out` — xuất kho thủ công (không qua order)
- `POST /api/inventory/adjust` — điều chỉnh tồn (kiểm kho thực tế)
- `GET /api/inventory/history` — lịch sử giao dịch kho (filter: khoảng ngày, sản phẩm, loại giao dịch, nhân viên)
- Tự động: khi `Order` chuyển trạng thái Hoàn thành → tạo `InventoryTransaction` loại XUẤT (trừ tồn); khi hủy/hoàn tiền → hoàn tồn.

---

## 2. Xuất hóa đơn có ngày tháng năm (Invoicing)

**Mục tiêu**: mỗi đơn hàng hoàn thành sinh hóa đơn có số hóa đơn, ngày (DD/MM/YYYY) + giờ (HH:mm) rõ ràng, in/xuất PDF được.

Entities:
- `Invoice` (so_hoa_don, ngay_gio, don_hang_id, khach_hang_id, tong_tien, phuong_thuc_thanh_toan, nguoi_tao_id, tam_tinh, giam_gia, vat, tong_cong)

API:
- `GET /api/invoices` — danh sách (filter: khoảng ngày, khách hàng, phương thức TT, người tạo; search mã HĐ/mã đơn/khách hàng)
- `GET /api/invoices/:id` — chi tiết hóa đơn (kèm dòng sản phẩm)
- `POST /api/invoices` — tạo hóa đơn (thường tự động khi order hoàn tất thanh toán)
- `GET /api/invoices/:id/pdf` — xuất PDF hóa đơn (template có ngày/giờ đầy đủ)
- `GET /api/invoices/:id/print` — bản in-friendly (HTML)

Quy tắc: số hóa đơn sinh tự động dạng `HDH-INV-YYYY-NNNNN`, không cho sửa sau khi phát hành (chỉ hủy + tạo bản điều chỉnh nếu cần).

---

## 3. Lưu tên khách hàng + Database khách hàng (Customer 360)

**Mục tiêu**: lưu đầy đủ thông tin khách hàng; search ra full thông tin — đã mua gì, đơn đang xử lý, hóa đơn liên quan.

Entities:
- `Customer` (ho_ten, sdt, email, ngay_sinh, ngay_tao, hang: New|Member|VIP, diem_tich_luy, ghi_chu[])

API:
- `GET /api/customers` — danh sách + filter (hạng, tổng chi tiêu, trạng thái, ngày mua gần nhất) + search (tên/sdt/email)
- `POST /api/customers` — tạo khách hàng mới
- `PATCH /api/customers/:id` — cập nhật thông tin
- `GET /api/customers/:id` — hồ sơ 360:
  - thông tin cơ bản + KPI (tổng chi tiêu, tổng đơn, giá trị đơn TB, tổng SP đã mua, đơn đang xử lý)
  - `GET /api/customers/:id/orders` — lịch sử mua hàng
  - `GET /api/customers/:id/orders?trang_thai=active` — đơn đang xử lý
  - `GET /api/customers/:id/products` — sản phẩm đã mua (tổng SL, số lần mua, lần mua gần nhất, tổng chi)
  - `GET /api/customers/:id/invoices` — hóa đơn liên quan
  - `POST /api/customers/:id/notes` — thêm ghi chú nội bộ
- `GET /api/search?q=` — global search: trả về nhóm kết quả (khách hàng, đơn hàng, hóa đơn, sản phẩm) — dùng chung cho thanh search header

---

## 4. Bảng doanh thu (Revenue)

**Mục tiêu**: KPI + chart + bảng chi tiết doanh thu theo ngày, xuất báo cáo.

Entities: tính toán (aggregate) từ `Order`/`Invoice`/`InventoryTransaction`, không cần bảng riêng — có thể có bảng `DailyRevenueSnapshot` để cache nếu dữ liệu lớn.

API:
- `GET /api/revenue/summary?range=` — tổng doanh thu, tổng đơn, giá trị đơn TB, lợi nhuận gộp, tổng giảm giá, tổng hoàn tiền (range: hôm nay/7 ngày/30 ngày/tháng/quý/năm/tùy chỉnh)
- `GET /api/revenue/by-time?range=` — dữ liệu chart theo thời gian (ngày → doanh thu, số đơn)
- `GET /api/revenue/by-category?range=` — doanh thu theo danh mục sản phẩm
- `GET /api/revenue/by-product?range=` — doanh thu theo sản phẩm
- `GET /api/revenue/by-staff?range=` — doanh thu theo nhân viên
- `GET /api/revenue/by-payment-method?range=` — doanh thu theo phương thức TT
- `GET /api/revenue/detail?range=&page=` — bảng chi tiết (ngày, số đơn, doanh thu, giảm giá, hoàn tiền, giá vốn, lợi nhuận gộp) — hỗ trợ sort + pagination
- `GET /api/revenue/export?format=excel|csv|pdf` — xuất báo cáo

---

## 5. Bảng cân đối kế toán (Balance Sheet) + Công nợ

**Mục tiêu**: xem tình hình tài chính (tài sản/nguồn vốn) theo kỳ, và công nợ phải thu/phải trả.

Entities:
- `Debt` (doi_tuong, loai: PHAI_THU|PHAI_TRA, ngay_phat_sinh, ngay_den_han, so_tien, da_thanh_toan, con_lai, trang_thai)
- `AccountingSnapshot` hoặc tính động: tiền mặt, tiền ngân hàng, hàng tồn kho (từ Inventory), công nợ phải thu/trả (từ Debt), vốn chủ sở hữu, lợi nhuận giữ lại

API:
- `GET /api/accounting/overview?period=` — KPI: tiền mặt, tiền ngân hàng, tổng phải thu, tổng phải trả, giá trị tồn kho, lợi nhuận
- `GET /api/debts?loai=phai_thu|phai_trai` — danh sách công nợ + KPI (tổng, quá hạn)
- `POST /api/debts` — tạo khoản công nợ
- `PATCH /api/debts/:id/payment` — ghi nhận thanh toán một phần/toàn bộ
- `GET /api/accounting/balance-sheet?period=` — bảng cân đối:
  - Tài sản ngắn hạn (tiền mặt, tiền gửi NH, công nợ phải thu, hàng tồn kho, khác)
  - Nợ phải trả (công nợ NCC, chi phí chưa TT, khác)
  - Vốn chủ sở hữu (vốn CSH, lợi nhuận giữ lại)
  - Validate: Tổng tài sản = Nợ phải trả + Vốn chủ sở hữu
  - So sánh kỳ hiện tại vs kỳ trước
- `GET /api/accounting/balance-sheet/export?format=excel|pdf`

Liên quan: **Thu/Chi** (`IncomeExpense`: ngay, ma_phieu, loai: Thu|Chi, danh_muc, noi_dung, so_tien, nguoi_tao) — cần cho KPI dòng tiền ròng và làm input cho balance sheet:
- `GET /api/income-expense` (filter + KPI tổng thu/chi/dòng tiền ròng)
- `POST /api/income-expense` — tạo phiếu thu/chi

---

## 6. Logo mới

Không phải backend — xử lý ở frontend (`HdhLogo` component trong `App.tsx:178`), thay SVG hiện tại (hình vuông cam + chữ H) bằng logo vector mới tự thiết kế (không dùng ảnh AI generate). Có thể làm ở bước sau khi các API xong.

---

## Nền tảng chung cần có trước (Cross-cutting)

- **Auth**: `POST /api/auth/login`, JWT/session, bảng `Staff` (ho_ten, email, mat_khau_hash, vai_tro: Admin|Manager|Accountant|Inventory Staff, trang_thai)
- **Order** (chưa liệt kê chi tiết ở trên nhưng là nền cho Invoice/Inventory/Revenue): `Order`, `OrderItem` — CRUD + đổi trạng thái (Mới/Đang xử lý/Hoàn thành/Đã hủy/Hoàn tiền)
- Database: đề xuất PostgreSQL (dữ liệu quan hệ, cần transaction cho tồn kho/kế toán)
- Tiền tệ lưu dạng số nguyên (VNĐ không có phần thập phân), format ở frontend
