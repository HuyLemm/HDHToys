# HDH Toys — Demo luồng nghiệp vụ E2E

Một luồng duy nhất, đi từ đầu đến cuối, chứng minh toàn bộ hệ thống (Sản phẩm → Khách hàng → Đơn hàng → Kho hàng → Hóa đơn → Doanh thu → Kế toán) hoạt động liền mạch trên dữ liệu thật.

**Kịch bản**: Khách mới ghé cửa hàng, mua 1 bộ LEGO, thanh toán tiền mặt.

---

## Bước 0 — Đăng nhập
`admin@hdhtoys.vn` / `admin123`

## Bước 1 — Thêm sản phẩm
**Sản phẩm → + Thêm sản phẩm**
```
SKU: LEGO-60320       Tên: LEGO City Fire Station
Danh mục: LEGO         Nhà cung cấp: LEGO Vietnam
Giá vốn: 750.000       Giá bán: 850.000
Tồn kho ban đầu: 10    Ngưỡng tối thiểu: 5
```
✅ Kiểm tra: **Kho hàng** → tồn kho = 10, giá trị tồn = 7.500.000 VNĐ, trạng thái "Còn hàng".

## Bước 2 — Thêm khách hàng
**Khách hàng → + Thêm khách hàng**
```
Họ tên: Nguyễn Văn Minh   SĐT: 0909123456   Email: minh@gmail.com
```

## Bước 3 — Tạo đơn hàng
**Đơn hàng → + Tạo đơn hàng**
- Tìm & chọn khách hàng vừa tạo
- Tìm & thêm sản phẩm LEGO City Fire Station, số lượng 1
- Phương thức thanh toán: Tiền mặt → **Tạo đơn hàng**

✅ Kiểm tra: chuyển thẳng sang **Chi tiết đơn hàng**, mã `HDH-2026-000xx`, trạng thái **Mới**, tổng cộng 850.000 VNĐ. Tồn kho **chưa** đổi (vẫn 10) — đơn chưa hoàn thành.

## Bước 4 — Xử lý & hoàn thành đơn
Trong **Chi tiết đơn hàng** → dropdown **Cập nhật trạng thái**:
1. Chọn **Đang xử lý**
2. Chọn tiếp **Hoàn thành**

✅ Kiểm tra ngay khi vừa Hoàn thành:
- Nút **Xuất PDF / In hóa đơn** xuất hiện (hóa đơn vừa tự sinh)
- **Kho hàng**: tồn kho LEGO-60320 giảm còn 9
- **Kho hàng → Lịch sử kho**: có dòng `XUAT`, tham chiếu = mã đơn, -1
- **Hóa đơn**: có `HDH-INV-2026-000xx` với ngày/giờ đầy đủ, bấm **PDF** ra file có dấu tiếng Việt đúng

## Bước 5 — Xem tác động lên báo cáo
- **Doanh thu** (7 ngày): Tổng doanh thu +850.000, lợi nhuận gộp +100.000 (850k − 750k giá vốn)
- **Kế toán → Tổng quan**: Giá trị tồn kho giảm đúng bằng 9 × 750.000 = 6.750.000 VNĐ
- **Khách hàng → Nguyễn Văn Minh → Xem hồ sơ**: tab Tổng quan hiện Tổng chi tiêu 850.000, 1 đơn, sản phẩm mua nhiều nhất = LEGO City Fire Station

---

**Kết quả chứng minh**: 1 giao dịch bán hàng lan tỏa đúng và tức thời qua 5 module khác nhau (Kho, Hóa đơn, Doanh thu, Kế toán, Customer 360) — không cần thao tác thủ công nào thêm ngoài việc tạo đơn và đổi trạng thái.
