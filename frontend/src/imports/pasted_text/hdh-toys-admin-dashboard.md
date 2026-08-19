# Figma AI Prompt — HDH Toys Admin Management System

Design a complete **admin-only retail management dashboard** for a toy store brand named **HDH Toys**.

The system is used only by **authorized internal staff** such as:

* Admin
* Manager
* Accountant
* Inventory Staff

This is **NOT a customer-facing e-commerce website**.

Customers do not log in, browse products, add items to cart, or purchase products from this website.

The main purpose of the system is to help HDH Toys administrators:

* Track current business performance
* Monitor orders
* Manage inventory
* Manage product information
* Store and search customer information
* View customer purchase history
* Track active customer orders
* Manage invoices
* Monitor revenue
* Manage income and expenses
* Review accounting information
* View business reports
* Monitor important alerts and operational issues

The overall UI should be inspired by professional **iPOS-style Vietnamese retail management systems**.

The interface should feel:

* Professional
* Compact
* Operational
* Data-heavy
* Easy to scan
* Fast to navigate
* Suitable for daily internal business use

Do not design this as a landing page or marketing website.

---

# 1. Brand Identity

Brand name:

**HDH Toys**

Create a simple and professional HDH Toys logo.

Logo direction:

* Typography + simple geometric icon
* HDH lettermark
* Toy cube
* Building block
* Star
* Simple toy-related geometric symbol

The brand should feel friendly because it is a toy business, but the admin system itself should remain professional.

Suggested visual style:

* Primary color: Blue
* Secondary accent: Orange or yellow
* Main background: White / very light gray
* Subtle borders
* Light shadows
* Medium rounded corners
* Compact enterprise layout

Avoid:

* Large illustrations
* Marketing banners
* Excessive gradients
* Glassmorphism
* Huge typography
* Excessive empty space
* Childish cartoon UI
* Customer shopping UI

Use Vietnamese throughout the interface.

Currency format:

**1.250.000 VNĐ**

Date format:

**DD/MM/YYYY**

Time format:

**HH:mm**

---

# 2. Design System

Use a desktop-first layout.

Main desktop frame:

**1440 × 1024**

Recommended:

* Sidebar: 220–240 px
* Header: 64 px
* 8 px spacing system
* Auto Layout throughout the design
* Responsive constraints for smaller desktop screens

Typography should be modern, readable, and suitable for dense admin interfaces.

Use consistent:

* Buttons
* Inputs
* Filters
* Tables
* Cards
* Status badges
* Modals
* Drawers
* Toast notifications

---

# 3. Login Screen

Create a dedicated login screen for internal HDH Toys users.

Header / logo:

**HDH Toys**

Title:

**Đăng nhập hệ thống**

Subtitle:

**HDH Toys Management System**

Fields:

* Email hoặc tên đăng nhập
* Mật khẩu
* Show / hide password

Options:

* Ghi nhớ đăng nhập
* Quên mật khẩu

Primary CTA:

**Đăng nhập**

Example prototype credentials:

Email:

`admin@hdhtoys.vn`

Password:

`••••••••`

Show a small security message:

**Chỉ dành cho nhân viên được ủy quyền của HDH Toys**

Do NOT include:

* Customer registration
* Sign up
* Social login
* Customer account creation

Create login states:

* Default
* Focused input
* Loading
* Empty field validation
* Invalid credentials
* Login success

Example error:

**Email hoặc mật khẩu không chính xác.**

Login prototype flow:

**Login → Dashboard / Tổng quan**

---

# 4. Forgot Password

Create a simple internal password recovery screen.

Title:

**Quên mật khẩu**

Subtitle:

**Nhập email của bạn để nhận liên kết đặt lại mật khẩu.**

Field:

* Email

CTA:

**Gửi liên kết đặt lại mật khẩu**

Success state:

**Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.**

Secondary action:

**Quay lại đăng nhập**

---

# 5. Main Admin Layout

After login, use a consistent admin dashboard layout.

## Left Sidebar

Fixed and collapsible sidebar.

Top:

HDH Toys logo

Navigation:

* Tổng quan
* Đơn hàng
* Kho hàng
* Sản phẩm
* Khách hàng
* Hóa đơn
* Doanh thu
* Thu / Chi
* Kế toán
* Báo cáo
* Cài đặt

Bottom:

* Store / branch selector
* Admin profile
* Đăng xuất

Example profile:

**Admin HDH Toys**
Administrator

Clearly show:

* Default sidebar item
* Hover state
* Active state
* Collapsed state

---

# 6. Top Header

Include:

* Current page title
* Store / branch selector
* Global search
* Current date
* Notification icon
* Admin avatar
* User dropdown

Global search placeholder:

**Tìm khách hàng, sản phẩm, đơn hàng, hóa đơn...**

The search should work as a global administrative search across the system.

---

# 7. Dashboard — Tổng quan hệ thống

This is the first screen after login.

Header:

**Tổng quan hệ thống**

The admin should immediately understand the current state of the business.

Create KPI cards:

* Doanh thu hôm nay
* Đơn hàng hôm nay
* Tổng khách hàng
* Tổng sản phẩm
* Giá trị tồn kho
* Sản phẩm sắp hết
* Công nợ
* Lợi nhuận

Example KPI:

**Doanh thu hôm nay**

12.850.000 VNĐ

+12,4% so với hôm qua

---

## Revenue Overview

Create a large chart.

Filters:

* Hôm nay
* 7 ngày
* 30 ngày
* Tháng này
* Quý này
* Tùy chỉnh

Metrics:

* Doanh thu
* Số đơn

Use a clean line or bar chart.

---

## Inventory Alerts

Create a section:

**Cảnh báo tồn kho**

Example:

**LEGO City Fire Station**
SKU: LEGO-60320
Còn 3 sản phẩm
Sắp hết hàng

**Gundam RX-78**
Còn 1 sản phẩm
Sắp hết hàng

**Pokémon Booster Pack**
0 sản phẩm
Hết hàng

Allow:

**Xem kho hàng**

---

## Recent Orders

Section:

**Đơn hàng gần đây**

Columns:

* Mã đơn
* Ngày
* Khách hàng
* Tổng tiền
* Trạng thái
* Nhân viên

---

## Top-selling Products

Section:

**Sản phẩm bán chạy**

Columns:

* Sản phẩm
* SKU
* Đã bán
* Doanh thu
* Tồn kho

---

# 8. Order Management — Quản lý đơn hàng

This screen is used to track and manage existing orders.

Admin is NOT acting as a customer purchasing products.

Header:

**Quản lý đơn hàng**

Search:

**Tìm theo mã đơn, tên khách hàng hoặc số điện thoại**

Filters:

* Khoảng ngày
* Trạng thái
* Khách hàng
* Nhân viên
* Phương thức thanh toán

Table columns:

* Mã đơn
* Ngày tạo
* Khách hàng
* SĐT
* Số sản phẩm
* Tổng tiền
* Thanh toán
* Trạng thái
* Nhân viên
* Thao tác

Statuses:

* Mới
* Đang xử lý
* Hoàn thành
* Đã hủy
* Hoàn tiền

Admin actions:

* Xem chi tiết
* Cập nhật trạng thái
* In hóa đơn
* Xuất dữ liệu
* Hoàn tiền
* Hủy đơn

Use pagination.

---

# 9. Order Detail

Header:

**Đơn hàng #HDH-2026-00128**

Display:

* Mã đơn
* Ngày tạo
* Giờ tạo
* Khách hàng
* SĐT
* Email
* Nhân viên xử lý
* Trạng thái đơn
* Phương thức thanh toán
* Trạng thái thanh toán

Product table:

* Sản phẩm
* SKU
* Số lượng
* Đơn giá
* Thành tiền

Summary:

* Tạm tính
* Giảm giá
* VAT
* Tổng cộng

Actions:

* Cập nhật trạng thái
* In hóa đơn
* Xuất PDF
* Hoàn tiền
* Hủy đơn

Include an order activity / timeline section showing changes such as:

* Đơn được tạo
* Thanh toán thành công
* Đơn đang xử lý
* Hoàn thành

---

# 10. Inventory Dashboard — Kho hàng

This is one of the most important screens.

Header:

**Quản lý kho**

KPI cards:

* Tổng SKU
* Tổng số lượng tồn
* Giá trị tồn kho
* Sản phẩm sắp hết
* Sản phẩm hết hàng

Search:

**Tìm theo tên sản phẩm, SKU hoặc barcode**

Filters:

* Danh mục
* Nhà cung cấp
* Trạng thái tồn kho

Table:

* SKU
* Sản phẩm
* Danh mục
* Tồn kho
* Đang nhập
* Có thể bán
* Giá vốn
* Giá bán
* Giá trị tồn
* Trạng thái
* Thao tác

Statuses:

* Còn hàng
* Sắp hết
* Hết hàng
* Ngừng kinh doanh

Actions:

* Nhập kho
* Xuất kho
* Điều chỉnh tồn
* Kiểm kho
* Xem lịch sử

---

# 11. Inventory Transaction History

Create a screen:

**Lịch sử kho**

Filters:

* Khoảng ngày
* Loại giao dịch
* Sản phẩm
* Nhân viên

Transaction types:

* Nhập kho
* Xuất kho
* Điều chỉnh
* Trả hàng

Table:

* Thời gian
* Mã giao dịch
* Sản phẩm
* SKU
* Loại
* Số lượng thay đổi
* Tồn trước
* Tồn sau
* Người thực hiện
* Ghi chú

This page should help admins audit inventory changes.

---

# 12. Stock Entry

Create an internal stock receipt form.

Title:

**Nhập kho**

Fields:

* Mã phiếu nhập
* Ngày nhập
* Nhà cung cấp
* Người thực hiện
* Ghi chú

Product table:

* Sản phẩm
* SKU
* Số lượng
* Giá nhập
* Thành tiền
* Xóa

Summary:

* Tổng số lượng
* Tổng giá trị nhập

Actions:

* Hoàn tất nhập kho
* Lưu nháp
* Hủy

---

# 13. Product Management — Sản phẩm

Header:

**Quản lý sản phẩm**

Actions:

* * Thêm sản phẩm
* Import Excel
* Export Excel

Search:

**Tìm theo tên sản phẩm, SKU hoặc barcode**

Filters:

* Danh mục
* Nhà cung cấp
* Trạng thái
* Kho hàng

Table:

* Ảnh
* SKU
* Tên sản phẩm
* Danh mục
* Giá vốn
* Giá bán
* Tồn kho
* Đã bán
* Trạng thái
* Thao tác

Admin actions:

* Xem
* Chỉnh sửa
* Ngừng kinh doanh
* Xem tồn kho
* Xem lịch sử bán

---

# 14. Product Detail

Example product:

**LEGO Technic McLaren Formula 1**

SKU:

**LEGO-42141**

Display:

* Product image
* Product name
* SKU
* Barcode
* Category
* Supplier
* Cost price
* Selling price
* Current inventory
* Minimum inventory threshold
* Total units sold
* Revenue generated

Tabs:

* Thông tin chung
* Kho hàng
* Lịch sử bán
* Lịch sử giá
* Ghi chú

---

# 15. Customer Management — Khách hàng

This is an internal customer database.

Customers DO NOT access this admin dashboard.

Header:

**Quản lý khách hàng**

Search:

**Tìm theo tên, số điện thoại hoặc email**

Filters:

* Hạng khách hàng
* Tổng chi tiêu
* Trạng thái
* Ngày mua gần nhất

Table:

* Khách hàng
* SĐT
* Email
* Tổng số đơn
* Tổng chi tiêu
* Đơn gần nhất
* Đơn đang xử lý
* Hạng khách hàng
* Thao tác

Example:

**Nguyễn Văn Minh**

0909 123 456

[minh@gmail.com](mailto:minh@gmail.com)

18 đơn

34.800.000 VNĐ

15/08/2026

1 đơn đang xử lý

VIP

Customer tiers:

* New
* Member
* VIP

---

# 16. Customer 360 — Chi tiết khách hàng

This is a critical screen.

When the admin searches for a customer, all relevant information should be visible in one centralized profile.

Header:

**Nguyễn Văn Minh**

Profile:

* Số điện thoại
* Email
* Ngày sinh
* Ngày tạo khách hàng
* Hạng thành viên
* Điểm tích lũy

KPI cards:

* Tổng chi tiêu
* Tổng số đơn
* Giá trị đơn trung bình
* Tổng sản phẩm đã mua
* Đơn đang xử lý

Tabs:

## Tổng quan

Show summarized customer information and recent activity.

## Lịch sử mua hàng

Table:

* Mã đơn
* Ngày
* Số sản phẩm
* Tổng tiền
* Trạng thái

## Đơn đang xử lý

Show all active orders belonging to this customer.

## Sản phẩm đã mua

Table:

* Sản phẩm
* Tổng số lượng đã mua
* Lần mua gần nhất
* Tổng tiền đã chi

## Hóa đơn

Show customer invoices.

## Ghi chú

Internal admin notes.

Example:

**Khách thường mua LEGO và Gundam.**

The admin should be able to quickly answer:

* Khách hàng này là ai?
* Đã mua bao nhiêu lần?
* Đã chi bao nhiêu?
* Trước đây đã mua gì?
* Hiện tại đang có đơn nào?
* Hóa đơn nào liên quan?
* Lần mua gần nhất là khi nào?

---

# 17. Invoice Management — Hóa đơn

Header:

**Quản lý hóa đơn**

Search:

**Tìm mã hóa đơn, mã đơn hoặc khách hàng**

Filters:

* Khoảng ngày
* Khách hàng
* Phương thức thanh toán
* Người tạo

Table:

* Số hóa đơn
* Ngày
* Giờ
* Khách hàng
* Mã đơn
* Tổng tiền
* Phương thức thanh toán
* Người tạo
* Thao tác

Every invoice must clearly display:

**DD/MM/YYYY**

and:

**HH:mm**

Example:

HDH-INV-2026-00128
18/08/2026
14:35
Nguyễn Văn Minh
HDH-2026-00128
2.850.000 VNĐ

Actions:

* Xem
* In
* Xuất PDF

---

# 18. Invoice Detail

Create a professional internal invoice preview.

Header:

**HDH TOYS**

Invoice number:

**HDH-INV-2026-00128**

Show:

* Ngày: 18/08/2026
* Giờ: 14:35
* Nhân viên
* Khách hàng
* Số điện thoại
* Mã đơn

Products:

* Sản phẩm
* SL
* Đơn giá
* Thành tiền

Summary:

* Tạm tính
* Giảm giá
* VAT
* Tổng cộng

Payment information.

Actions:

* In hóa đơn
* Xuất PDF
* Xem đơn hàng liên quan

---

# 19. Revenue Dashboard — Doanh thu

Header:

**Doanh thu**

Filters:

* Hôm nay
* Hôm qua
* 7 ngày
* 30 ngày
* Tháng này
* Quý này
* Năm nay
* Tùy chỉnh

KPI:

* Tổng doanh thu
* Tổng số đơn
* Giá trị đơn trung bình
* Lợi nhuận gộp
* Tổng giảm giá
* Tổng hoàn tiền

Charts:

## Doanh thu theo thời gian

Use line or bar chart.

## Doanh thu theo danh mục

Examples:

* LEGO
* Gundam
* Hot Wheels
* Pokémon
* Board Game

## Doanh thu theo sản phẩm

## Doanh thu theo nhân viên

## Doanh thu theo phương thức thanh toán

* Tiền mặt
* Chuyển khoản
* Thẻ
* QR

Add a detailed table below charts.

Allow:

* Export Excel
* Export CSV
* Export PDF

---

# 20. Income & Expense — Thu / Chi

Header:

**Quản lý thu / chi**

KPI:

* Tổng thu
* Tổng chi
* Dòng tiền ròng

Search and filters:

* Khoảng ngày
* Loại
* Danh mục
* Người tạo

Table:

* Ngày
* Mã phiếu
* Loại
* Danh mục
* Nội dung
* Số tiền
* Người tạo
* Thao tác

Types:

* Thu
* Chi

Categories:

* Bán hàng
* Nhập hàng
* Vận chuyển
* Lương
* Điện nước
* Marketing
* Khác

Actions:

* * Tạo phiếu thu
* * Tạo phiếu chi
* Xem
* Chỉnh sửa
* Xuất báo cáo

---

# 21. Accounting Overview — Kế toán

Header:

**Kế toán**

Tabs:

* Tổng quan
* Thu / Chi
* Công nợ
* Cân đối kế toán

KPI:

* Tiền mặt
* Tiền ngân hàng
* Tổng phải thu
* Tổng phải trả
* Giá trị tồn kho
* Lợi nhuận

Add accounting period selector.

---

# 22. Receivables / Payables — Công nợ

Create a dedicated accounting screen.

Header:

**Công nợ**

Tabs:

* Phải thu
* Phải trả

KPI:

* Tổng phải thu
* Quá hạn phải thu
* Tổng phải trả
* Quá hạn phải trả

Table:

* Đối tượng
* Loại
* Ngày phát sinh
* Ngày đến hạn
* Số tiền
* Đã thanh toán
* Còn lại
* Trạng thái

Statuses:

* Chưa đến hạn
* Sắp đến hạn
* Quá hạn
* Đã thanh toán

---

# 23. Balance Sheet — Bảng cân đối kế toán

Header:

**Bảng cân đối kế toán**

Display:

**Thời điểm báo cáo: 18/08/2026**

Allow selecting accounting period.

Use a professional two-column accounting layout.

## TÀI SẢN

### Tài sản ngắn hạn

* Tiền mặt
* Tiền ngân hàng
* Hàng tồn kho
* Công nợ phải thu
* Tài sản khác

Highlight:

**TỔNG TÀI SẢN**

---

## NGUỒN VỐN

### Nợ phải trả

* Công nợ nhà cung cấp
* Chi phí chưa thanh toán
* Khoản phải trả khác

### Vốn chủ sở hữu

* Vốn chủ sở hữu
* Lợi nhuận giữ lại

Highlight:

**TỔNG NGUỒN VỐN**

Clearly show:

**Tổng tài sản = Nợ phải trả + Vốn chủ sở hữu**

Add comparison:

* Kỳ hiện tại
* Kỳ trước
* Chênh lệch

---

# 24. Reports Center — Báo cáo

Header:

**Báo cáo**

Create compact report cards for:

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

Each report card should show:

* Report title
* Short description
* Last generated date
* Xem báo cáo
* Export

Export formats:

* Excel
* CSV
* PDF

---

# 25. Global Admin Search

Global search is an important feature.

Search across:

* Customers
* Phone numbers
* Emails
* Products
* SKU
* Barcode
* Orders
* Invoices

Example query:

**Nguyễn Văn Minh**

Show grouped search results.

## Khách hàng

Nguyễn Văn Minh
0909 123 456
18 đơn hàng

## Đơn hàng

HDH-2026-00128
18/08/2026
2.850.000 VNĐ

## Hóa đơn

HDH-INV-2026-00128
18/08/2026

Clicking a customer opens Customer 360.

Clicking an order opens Order Detail.

Clicking an invoice opens Invoice Detail.

---

# 26. Notification Center

Create an admin notification dropdown or drawer.

Example notifications:

## Sản phẩm sắp hết

LEGO City Fire Station chỉ còn 3 sản phẩm.

## Hết hàng

Pokémon Booster Pack đã hết hàng.

## Đơn hàng mới

Đơn HDH-2026-00132 vừa được ghi nhận.

## Công nợ

2 khoản công nợ sắp đến hạn.

## Doanh thu

Doanh thu hôm nay giảm 15% so với hôm qua.

Use notification severity:

* Information
* Warning
* Critical
* Success

Allow:

* Mark as read
* View related record
* Mark all as read

---

# 27. Settings

Create an admin settings area.

Sections:

* Thông tin cửa hàng
* Người dùng nội bộ
* Vai trò & phân quyền
* Danh mục sản phẩm
* Nhà cung cấp
* Phương thức thanh toán
* Cấu hình hóa đơn
* Cảnh báo tồn kho

---

# 28. Internal User Management

Create a screen for administrators to manage staff accounts.

Header:

**Người dùng hệ thống**

Table:

* Họ tên
* Email
* Vai trò
* Chi nhánh
* Trạng thái
* Đăng nhập gần nhất
* Thao tác

Roles:

* Administrator
* Manager
* Accountant
* Inventory Staff

Statuses:

* Hoạt động
* Tạm khóa

Actions:

* * Thêm người dùng
* Chỉnh sửa
* Đặt lại mật khẩu
* Khóa tài khoản

---

# 29. Role & Permission Management

Create a basic permissions interface.

Roles:

### Administrator

Full access.

### Manager

Access to:

* Dashboard
* Orders
* Products
* Customers
* Inventory
* Revenue
* Reports

### Accountant

Access to:

* Revenue
* Income / Expense
* Accounting
* Invoices
* Reports

### Inventory Staff

Access to:

* Inventory
* Products
* Stock history

Use a permission matrix with checkboxes.

---

# 30. Reusable Figma Components

Create reusable components and variants for:

* Sidebar
* Sidebar item
* Header
* Global search
* Search result
* Button
* Input
* Select
* Checkbox
* Date picker
* Filter chip
* Filter bar
* KPI card
* Chart container
* Table
* Table row
* Pagination
* Status badge
* Tabs
* Modal
* Drawer
* Toast
* Confirmation dialog
* Notification item
* Empty state
* Loading state
* Error state
* Customer card
* Product card
* Order status
* Payment status
* Avatar
* User dropdown

Create variants for:

* Default
* Hover
* Active
* Focus
* Selected
* Disabled
* Error
* Loading

---

# 31. Sample Data

Use realistic Vietnamese sample data.

Customers:

* Nguyễn Văn Minh
* Trần Gia Huy
* Lê Hoàng Anh
* Phạm Ngọc Linh
* Võ Minh Khang
* Nguyễn Minh Anh

Products:

* LEGO City Fire Station
* LEGO Technic McLaren
* Gundam RX-78
* Hot Wheels Premium
* Pokémon Scarlet & Violet Booster
* Barbie Dreamhouse
* UNO Card Game
* Nerf Elite 2.0

Example order IDs:

* HDH-2026-00125
* HDH-2026-00126
* HDH-2026-00127
* HDH-2026-00128

Invoice IDs:

* HDH-INV-2026-00125
* HDH-INV-2026-00126
* HDH-INV-2026-00127
* HDH-INV-2026-00128

---

# 32. Important Prototype Flows

Connect the important screens using Figma Prototype interactions.

## Flow 1 — Login

Login
→ Validate credentials
→ Dashboard

---

## Flow 2 — Customer Investigation

Dashboard
→ Global Search
→ Search customer
→ Customer 360
→ Purchase History
→ Order Detail
→ Invoice Detail

---

## Flow 3 — Inventory Monitoring

Dashboard
→ Inventory Alert
→ Inventory
→ Product Detail
→ Inventory History
→ Stock Adjustment

---

## Flow 4 — Track Order

Orders
→ Search / filter order
→ Order Detail
→ Update status
→ Invoice

---

## Flow 5 — Revenue Analysis

Dashboard
→ Revenue
→ Select date range
→ Analyze charts
→ View detailed table
→ Export report

---

## Flow 6 — Accounting

Dashboard
→ Accounting
→ Income / Expense
→ Receivables / Payables
→ Balance Sheet

---

## Flow 7 — Admin Settings

Settings
→ Internal Users
→ User Detail
→ Role & Permissions

---

# 33. Critical Scope Requirement

This is an:

**ADMIN-ONLY INTERNAL BUSINESS MANAGEMENT SYSTEM**

The system's purpose is:

**Track → Search → Manage → Analyze → Report**

Do NOT create any customer-facing shopping experience.

Do NOT create:

* Customer login
* Customer registration
* Customer storefront
* Product shopping page
* Add to cart
* Customer shopping cart
* Customer checkout
* Customer payment page
* Customer wishlist
* Customer account portal
* Marketing homepage
* Promotional storefront banners

Customers only exist as records in the admin system.

Products only exist as records being managed and tracked.

Orders represent transactions already recorded by the business and are monitored by internal staff.

Invoices are viewed, managed, printed, and exported by internal staff.

---

# 34. UX Direction

The UI should visually resemble the **back-office management side of iPOS**, not Shopify storefront or a generic SaaS dashboard.

Prioritize:

* Dense but readable information
* Compact tables
* Clear business metrics
* Strong filtering
* Fast global search
* Clear hierarchy
* Clear status colors
* Operational workflows
* Minimal clicks
* Easy record lookup
* Persistent navigation
* Consistent action placement

Use:

* Tables
* KPI cards
* Charts
* Filter bars
* Search fields
* Tabs
* Drawers
* Modals
* Status badges
* Pagination
* Date ranges
* Tooltips

Avoid excessive decorative elements.

The system should feel like software that an admin can keep open throughout the entire working day.

---

# 35. Final Goal

The finished Figma prototype should represent a realistic **HDH Toys internal retail management system**.

When an administrator opens the dashboard, they should immediately be able to understand:

* Hôm nay doanh thu bao nhiêu?
* Có bao nhiêu đơn hàng?
* Đơn nào đang xử lý?
* Khách hàng nào đang có đơn?
* Khách hàng trước đây đã mua những gì?
* Khách hàng đã chi bao nhiêu tiền?
* Sản phẩm nào đang bán tốt?
* Sản phẩm nào sắp hết hàng?
* Hiện tại còn bao nhiêu hàng trong kho?
* Giá trị tồn kho hiện tại là bao nhiêu?
* Doanh thu đang tăng hay giảm?
* Hôm nay thu và chi bao nhiêu?
* Có công nợ nào sắp hoặc đã quá hạn?
* Tình hình tài chính hiện tại như thế nào?
* Hóa đơn nào đã được phát hành?
* Có cảnh báo hoặc vấn đề nào admin cần xử lý?

The final design should be:

**Professional + Compact + Data-driven + Operational + Easy to Navigate + iPOS-inspired**

and clearly branded as:

**HDH Toys Management System**
