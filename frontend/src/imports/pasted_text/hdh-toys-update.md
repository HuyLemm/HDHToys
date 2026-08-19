# Figma AI Update Prompt — Complete Missing HDH Toys Admin Features

Update the existing **HDH Toys Management System** design.

Do **not** redesign the entire application from scratch.

Keep the current:

* Sidebar
* Top navigation
* Color palette
* Typography
* Table style
* Card style
* Spacing system
* Overall iPOS-inspired admin layout

Only complete and improve the missing or incomplete screens and interactions described below.

The system remains an **admin-only internal business management system**.

Customers do NOT log in or purchase through this website.

---

# 1. Complete Product Management Screen

The current **Quản lý sản phẩm** screen is only a placeholder.

Replace the placeholder with a complete product management interface.

Header:

**Quản lý sản phẩm**

Top-right actions:

* * Thêm sản phẩm
* Import Excel
* Xuất Excel

Search bar:

**Tìm theo tên sản phẩm, SKU hoặc barcode**

Filters:

* Danh mục
* Nhà cung cấp
* Trạng thái
* Tồn kho

Create a data table with:

* Ảnh
* SKU
* Tên sản phẩm
* Danh mục
* Nhà cung cấp
* Giá vốn
* Giá bán
* Tồn kho
* Đã bán
* Trạng thái
* Thao tác

Example rows:

LEGO-60320
LEGO City Fire Station
LEGO
LEGO Vietnam
750.000 VNĐ
850.000 VNĐ
3
42
Sắp hết

LEGO-42141
LEGO Technic McLaren
LEGO
LEGO Vietnam
2.200.000 VNĐ
2.500.000 VNĐ
7
26
Còn hàng

GUN-RX78
Gundam RX-78
Gundam
Bandai
1.600.000 VNĐ
1.800.000 VNĐ
1
18
Sắp hết

PKM-SV-01
Pokémon Booster Pack
Pokémon
Pokémon Company
270.000 VNĐ
300.000 VNĐ
0
58
Hết hàng

Statuses:

* Còn hàng
* Sắp hết
* Hết hàng
* Ngừng kinh doanh

Actions:

* Xem
* Sửa
* Xem kho

Add pagination at the bottom.

---

# 2. Add Product Detail Screen

Create a new Product Detail screen.

Example:

**LEGO Technic McLaren**

SKU: LEGO-42141

Display summary information:

* Product image
* Product name
* SKU
* Barcode
* Category
* Supplier
* Cost price
* Selling price
* Current inventory
* Minimum stock threshold
* Total units sold
* Total revenue

Top KPI cards:

* Tồn kho: 7
* Đang nhập: 5
* Có thể bán: 12
* Đã bán: 26
* Doanh thu: 65.000.000 VNĐ

Tabs:

* Thông tin chung
* Kho hàng
* Lịch sử bán
* Lịch sử giá
* Ghi chú

Actions:

* Chỉnh sửa
* Điều chỉnh tồn kho
* Ngừng kinh doanh

---

# 3. Improve Inventory Screen

Keep the existing inventory screen layout.

Add the following:

### New action button

**Lịch sử kho**

Place it near:

* Xuất kho
* Nhập kho

Final action group:

* Lịch sử kho
* Xuất kho
* Nhập kho

---

# 4. Add Inventory History Screen

Create a new page:

**Lịch sử kho**

Purpose:

Allow administrators to understand exactly why inventory quantities changed.

Filters:

* Khoảng ngày
* Sản phẩm
* Loại giao dịch
* Nhân viên

Transaction types:

* Nhập kho
* Xuất kho
* Điều chỉnh
* Trả hàng

Create table:

* Thời gian
* Mã giao dịch
* SKU
* Sản phẩm
* Loại
* Thay đổi
* Tồn trước
* Tồn sau
* Người thực hiện
* Tham chiếu
* Ghi chú

Example:

18/08/2026 14:35
XK-00128
LEGO-60320
LEGO City Fire Station
Xuất kho
-2
5
3
Trần Hùng
HDH-2026-00128
Xuất theo đơn hàng

17/08/2026 10:20
NK-00045
LEGO-60320
LEGO City Fire Station
Nhập kho
+10
2
12
Nguyễn Mai
PO-00031
Nhập từ nhà cung cấp

Use:

* Green text for positive inventory movement
* Red text for negative inventory movement

Clicking a reference such as an Order ID should open the related record.

---

# 5. Add Customer 360 Screen

This is a **high-priority requirement**.

The current Customer Management table should remain.

When the admin clicks:

**Xem hồ sơ**

open a complete customer profile page.

Example customer:

# Nguyễn Văn Minh

Badge:

**VIP**

Basic information:

* SĐT: 0909 123 456
* Email: [minh@gmail.com](mailto:minh@gmail.com)
* Ngày sinh: 12/03/1998
* Khách hàng từ: 13/01/2024
* Hạng khách hàng: VIP
* Điểm tích lũy: 3.480

Create KPI cards:

### Tổng chi tiêu

34.800.000 VNĐ

### Tổng đơn

18 đơn

### Giá trị đơn trung bình

1.933.000 VNĐ

### Tổng sản phẩm đã mua

32 sản phẩm

### Đơn đang xử lý

1 đơn

---

## Customer Tabs

Create tabs:

* Tổng quan
* Lịch sử mua hàng
* Đơn đang xử lý
* Sản phẩm đã mua
* Hóa đơn
* Ghi chú

---

## Tổng quan Tab

Show:

* Recent order
* Favorite categories
* Purchase frequency
* Most purchased product
* Current active order

Example:

Danh mục thường mua:

* LEGO
* Gundam

Lần mua gần nhất:

18/08/2026

---

## Lịch sử mua hàng Tab

Table:

* Mã đơn
* Ngày
* Số sản phẩm
* Tổng tiền
* Thanh toán
* Trạng thái

Example:

HDH-2026-00128
18/08/2026
3 sản phẩm
2.850.000 VNĐ
Chuyển khoản
Hoàn thành

HDH-2026-00110
02/08/2026
2 sản phẩm
1.500.000 VNĐ
Tiền mặt
Hoàn thành

Clicking an order opens Order Detail.

---

## Đơn đang xử lý Tab

Display currently active customer orders.

Example card:

**HDH-2026-00132**

18/08/2026

Products:

* LEGO Technic McLaren × 1
* Gundam RX-78 × 2

Total:

6.100.000 VNĐ

Status:

**Đang xử lý**

Button:

**Xem đơn hàng**

---

## Sản phẩm đã mua Tab

Create table:

* Sản phẩm
* SKU
* Tổng số lượng đã mua
* Số lần mua
* Lần mua gần nhất
* Tổng chi tiêu

Example:

LEGO City Fire Station
LEGO-60320
4
3 lần
18/08/2026
3.400.000 VNĐ

Gundam RX-78
GUN-RX78
2
2 lần
02/08/2026
3.600.000 VNĐ

This tab is important because the original requirement explicitly asks to see **what products the customer has purchased before**.

---

## Hóa đơn Tab

Show all invoices associated with this customer.

Columns:

* Số hóa đơn
* Ngày
* Mã đơn
* Tổng tiền
* Phương thức
* Thao tác

---

## Ghi chú Tab

Allow internal staff notes.

Example:

**Khách thường mua LEGO và Gundam. Ưu tiên liên hệ qua điện thoại.**

Add:

**+ Thêm ghi chú**

---

# 6. Improve Global Search

Keep the current global search input.

Add a dropdown state when the admin searches.

Example search:

**Nguyễn Văn Minh**

Show grouped search results.

### Khách hàng

Nguyễn Văn Minh
0909 123 456
VIP · 18 đơn

Action:

**Xem hồ sơ**

---

### Đơn hàng

HDH-2026-00128
18/08/2026
2.850.000 VNĐ
Hoàn thành

---

### Hóa đơn

HDH-INV-2026-00128
18/08/2026
2.850.000 VNĐ

---

The interaction should be:

Global Search
→ Customer Result
→ Customer 360
→ Purchase History / Active Order / Invoice

Also support search by:

* Customer name
* Phone number
* Email
* Product
* SKU
* Barcode
* Order ID
* Invoice ID

---

# 7. Improve Invoice Management

Keep the current Invoice Management table.

The existing date and time format is correct.

Do not remove:

* Ngày
* Giờ
* Customer name
* Order ID
* Total amount

Keep:

**DD/MM/YYYY**

and:

**HH:mm**

---

# 8. Add Invoice Detail / Print Preview

When clicking:

**Xem**

open an invoice detail page.

Create a professional invoice preview.

Header:

**HDH TOYS**

Invoice number:

**HDH-INV-2026-00128**

Business information area:

* HDH Toys
* Store phone
* Store address
* Tax information if applicable

Invoice information:

* Ngày: 18/08/2026
* Giờ: 14:35
* Nhân viên: Trần Hùng
* Mã đơn: HDH-2026-00128

Customer:

* Nguyễn Văn Minh
* 0909 123 456

Products table:

* Sản phẩm
* SKU
* SL
* Đơn giá
* Thành tiền

Example:

LEGO City Fire Station
LEGO-60320
2
850.000 VNĐ
1.700.000 VNĐ

Hot Wheels Premium
HW-PREM-01
1
350.000 VNĐ
350.000 VNĐ

Summary:

* Tạm tính
* Giảm giá
* VAT
* Tổng cộng

Display payment method:

**Chuyển khoản**

Actions above the invoice:

* In hóa đơn
* Xuất PDF
* Xem đơn hàng

Create a print-friendly layout.

---

# 9. Improve Revenue Dashboard

Keep the existing Revenue screen and charts.

Do NOT redesign the entire screen.

Fix KPI cards where monetary values are currently truncated.

Do NOT display values like:

**428.50...**

or:

**128.50...**

Always display the complete value.

Examples:

**428.500.000 VNĐ**

**128.500.000 VNĐ**

If needed:

* Slightly reduce font size
* Increase card width
* Use two-line labels
* Adjust spacing

Never truncate important financial values.

---

# 10. Add Revenue Data Table

The original requirement asks for a **bảng doanh thu**, so the Revenue screen should contain both charts AND a detailed table.

Below the existing charts add:

## Chi tiết doanh thu

Columns:

* Ngày
* Số đơn
* Doanh thu
* Giảm giá
* Hoàn tiền
* Giá vốn
* Lợi nhuận gộp

Example:

18/08/2026
21
12.850.000 VNĐ
350.000 VNĐ
0 VNĐ
8.200.000 VNĐ
4.650.000 VNĐ

17/08/2026
28
15.000.000 VNĐ
450.000 VNĐ
200.000 VNĐ
9.800.000 VNĐ
5.000.000 VNĐ

Add:

* Pagination
* Sort
* Export Excel
* Export PDF

---

# 11. Complete Income / Expense Screen

The current **Quản lý thu / chi** page is only a placeholder.

Replace it with a complete page.

Header:

**Quản lý thu / chi**

Top KPI cards:

### Tổng thu

428.500.000 VNĐ

### Tổng chi

285.200.000 VNĐ

### Dòng tiền ròng

143.300.000 VNĐ

Add date filters:

* Hôm nay
* 7 ngày
* 30 ngày
* Tháng này
* Tùy chỉnh

Filters:

* Loại
* Danh mục
* Người tạo

Actions:

* * Phiếu thu
* * Phiếu chi
* Xuất Excel

Table:

* Ngày
* Mã phiếu
* Loại
* Danh mục
* Nội dung
* Số tiền
* Người tạo
* Thao tác

Example:

18/08/2026
PT-00128
Thu
Bán hàng
Doanh thu bán hàng
+12.850.000 VNĐ
Trần Hùng

18/08/2026
PC-00042
Chi
Nhập hàng
Thanh toán LEGO Vietnam
-5.200.000 VNĐ
Lê Tuấn

Use:

* Green for income
* Red for expense

---

# 12. Complete Accounting Screen

The current **Kế toán** page is only a placeholder.

This is a critical requirement.

Replace it with a complete accounting dashboard.

Header:

**Kế toán**

Create tabs:

* Tổng quan
* Công nợ
* Cân đối kế toán

---

# 13. Accounting Overview Tab

Create KPI cards:

### Tiền mặt

80.000.000 VNĐ

### Tiền ngân hàng

250.000.000 VNĐ

### Công nợ phải thu

15.200.000 VNĐ

### Công nợ phải trả

90.000.000 VNĐ

### Giá trị tồn kho

428.500.000 VNĐ

### Lợi nhuận tháng

42.300.000 VNĐ

Add:

**Tình hình tài chính**

with a compact chart comparing:

* Thu
* Chi
* Lợi nhuận

---

# 14. Add Receivables / Payables

Under:

**Công nợ**

create two tabs:

* Phải thu
* Phải trả

KPI cards:

* Tổng phải thu
* Quá hạn phải thu
* Tổng phải trả
* Quá hạn phải trả

Table:

* Đối tượng
* Loại
* Ngày phát sinh
* Ngày đến hạn
* Tổng tiền
* Đã thanh toán
* Còn lại
* Trạng thái

Statuses:

* Chưa đến hạn
* Sắp đến hạn
* Quá hạn
* Đã thanh toán

---

# 15. Add Balance Sheet

Create a dedicated tab:

**Cân đối kế toán**

This is a required feature.

Header:

# Bảng cân đối kế toán

Show:

**Tại ngày 18/08/2026**

Add period selector:

* Tháng này
* Quý này
* Năm nay
* Tùy chỉnh

Use a professional accounting table layout.

---

## TÀI SẢN

### Tài sản ngắn hạn

| Khoản mục          | Giá trị         |
| ------------------ | --------------- |
| Tiền mặt           | 80.000.000 VNĐ  |
| Tiền gửi ngân hàng | 250.000.000 VNĐ |
| Công nợ phải thu   | 15.200.000 VNĐ  |
| Hàng tồn kho       | 428.500.000 VNĐ |
| Tài sản khác       | 0 VNĐ           |

Highlight:

**TỔNG TÀI SẢN: 773.700.000 VNĐ**

---

## NGUỒN VỐN

### Nợ phải trả

| Khoản mục               | Giá trị        |
| ----------------------- | -------------- |
| Công nợ nhà cung cấp    | 90.000.000 VNĐ |
| Chi phí chưa thanh toán | 20.000.000 VNĐ |
| Khoản phải trả khác     | 0 VNĐ          |

### Vốn chủ sở hữu

| Khoản mục         | Giá trị         |
| ----------------- | --------------- |
| Vốn chủ sở hữu    | 600.000.000 VNĐ |
| Lợi nhuận giữ lại | 63.700.000 VNĐ  |

Highlight:

**TỔNG NGUỒN VỐN: 773.700.000 VNĐ**

At the bottom display a clearly visible validation:

**Tổng tài sản = Nợ phải trả + Vốn chủ sở hữu**

**773.700.000 VNĐ = 773.700.000 VNĐ ✓**

Use a green success state when balanced.

Add:

* Export Excel
* Export PDF
* Print

---

# 16. Improve Order Management

Keep the current Order Management screen.

The existing button:

**+ Tạo đơn hàng**

should remain.

This is still an internal admin feature.

It means internal staff can manually record an order received:

* At the physical store
* By phone
* Through Facebook
* Through another sales channel

It does NOT mean customers are using this website.

---

# 17. Add Create Order Internal Screen

When clicking:

**+ Tạo đơn hàng**

open an internal order form.

Header:

**Tạo đơn hàng**

Customer section:

* Search existing customer
* Select customer
* * Thêm khách hàng mới

Product section:

* Search product by name / SKU / barcode
* Add product
* Quantity
* Price

Table:

* Product
* SKU
* Quantity
* Unit price
* Discount
* Total

Order information:

* Sales channel
* Employee
* Note
* Payment method

Sales channel:

* Tại cửa hàng
* Điện thoại
* Facebook
* Khác

Summary:

* Tạm tính
* Giảm giá
* Tổng cộng

Actions:

* Tạo đơn
* Hủy

This is an internal data-entry screen, NOT a customer checkout interface.

---

# 18. Improve Reports

Keep the current Reports page because its layout is already suitable.

Make sure each report card is clickable and connects to a detailed report.

Add detailed report for:

* Báo cáo doanh thu
* Báo cáo lợi nhuận
* Báo cáo đơn hàng
* Báo cáo tồn kho
* Báo cáo nhập / xuất kho
* Báo cáo sản phẩm
* Báo cáo khách hàng
* Báo cáo thu / chi
* Báo cáo công nợ
* Báo cáo kế toán

Keep:

* Xem báo cáo
* Excel
* PDF

---

# 19. Improve Logo

Keep the current HDH Toys brand colors.

Replace the simple orange square with the letter **H** with a more distinctive but simple vector logo.

Do NOT use AI-generated illustration.

Create the logo using simple Figma vector geometry.

Suggested direction:

### Option A — Toy Blocks

Use 3 geometric toy blocks arranged to subtly form:

**H D H**

### Option B — Cube H

Create a simple cube / building-block symbol containing an abstract letter H using negative space.

### Option C — HDH Lettermark

Create a minimal geometric combination of:

**H + D + H**

The logo should work in:

### Full version

[Symbol] HDH Toys
Management System

### Compact version

[Symbol]

for collapsed sidebar use.

Keep the existing orange + blue brand relationship if possible.

The logo should feel:

* Clean
* Unique
* Professional
* Slightly playful
* Easy to reproduce manually in Figma
* Suitable for a toy store
* Not childish

---

# 20. Preserve Existing Good Screens

Do NOT unnecessarily redesign these existing screens:

* Dashboard
* Order Management
* Inventory
* Customer Management
* Invoice Management
* Revenue
* Reports
* Settings

Their overall structure is already appropriate.

Only improve them according to the changes above.

---

# 21. Required Navigation Connections

Add prototype connections:

### Customer Flow

Khách hàng
→ Xem hồ sơ
→ Customer 360
→ Lịch sử mua hàng
→ Order Detail
→ Invoice Detail

### Search Flow

Global Search
→ Nguyễn Văn Minh
→ Customer 360

### Inventory Flow

Kho hàng
→ Product
→ Product Detail
→ Lịch sử kho

### Accounting Flow

Kế toán
→ Tổng quan
→ Công nợ
→ Cân đối kế toán

### Invoice Flow

Hóa đơn
→ Xem
→ Invoice Detail
→ In / PDF

### Revenue Flow

Doanh thu
→ Chart
→ Chi tiết doanh thu table

---

# 22. Final Requirement Checklist

Ensure the updated Figma clearly demonstrates ALL of the following requirements:

## 1. Kho hàng

✅ Inventory quantities
✅ Inventory value
✅ Low stock
✅ Out of stock
✅ Import stock
✅ Export stock
✅ Inventory history

## 2. Xuất hóa đơn có ngày tháng năm

✅ Invoice ID
✅ Customer
✅ Order
✅ Full DD/MM/YYYY date
✅ Time
✅ Invoice detail
✅ Print
✅ PDF

## 3. Lưu tên khách hàng

✅ Name
✅ Phone
✅ Email
✅ Customer tier
✅ Customer record

## 4. Customer Database

✅ Search customer
✅ Full customer information
✅ Purchase history
✅ Products previously purchased
✅ Active orders
✅ Related invoices
✅ Total spending

## 5. Bảng doanh thu

✅ KPI
✅ Revenue chart
✅ Payment method chart
✅ Detailed revenue table
✅ Export

## 6. Bảng cân đối kế toán

✅ Assets
✅ Liabilities
✅ Equity
✅ Total Assets
✅ Total Liabilities + Equity
✅ Accounting period
✅ Export

## 7. Logo mới

✅ HDH Toys logo
✅ Vector-based
✅ Professional
✅ Unique
✅ Full logo version
✅ Compact sidebar version

---

# Final Instruction

Do not create placeholder screens that say:

**“Màn hình này đang được phát triển”**

All major navigation items relevant to these requirements must have complete UI content.

Maintain the current HDH Toys visual design and extend it consistently.

Focus especially on completing:

**Customer 360 + Product Management + Inventory History + Invoice Detail + Revenue Table + Thu/Chi + Accounting + Balance Sheet**

These are the highest-priority missing features.
