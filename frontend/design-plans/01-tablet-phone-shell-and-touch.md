# Khung ứng dụng và thao tác chạm thân thiện cho iPad / điện thoại

Written against: 05bd171

## Evidence chain

- Surface: mọi màn hình sau đăng nhập, đo thực tế bằng Playwright ở 390×844 (điện thoại) và 820×1180 (iPad dọc).
- Problem:
  - iPad dọc 820px vẫn dùng sidebar cố định 208px (mốc `md` = 768px) nên vùng nội dung chỉ còn 612px.
  - Vùng bấm nhỏ: `TinyBtn` (`text-[10px] px-1.5 py-1`, icon 12px), nút `‹ ›` phân trang, nút icon header.
  - Ô nhập `text-xs` (12px): iOS Safari tự phóng to trang khi focus vào ô nhập có chữ < 16px.
  - Khung dùng `h-screen` (100vh) nên thanh địa chỉ của Safari iOS che mất phần đáy.
- Design evidence: `ui-ux-pro-max` (Touch: 8px gap, 44pt iOS / 24px WCAG 2.2 AA; Responsive: mobile-first), `web-design-guidelines` (`touch-action: manipulation`, `overscroll-behavior: contain`, safe-area).
- Owner: `src/App.tsx`, `src/components/Layout.tsx`, `src/components/ui.tsx`, `src/index.css`
- Scope and affected surfaces: toàn bộ màn hình (các thay đổi nằm ở component dùng chung).
- Uncertainty: chưa thử trên thiết bị iOS thật, chỉ giả lập bằng Chromium. Cần xác nhận hành vi tự phóng to và thanh địa chỉ trên Safari.

## Design decision

Giữ nguyên bản sắc hiện tại (màu, sidebar tối, Inter), chỉ đổi hành vi theo kích thước màn hình và loại con trỏ. Ở 768–1023px sidebar mặc định là thanh icon 56px. Dưới 768px vẫn là ngăn kéo. Với con trỏ cảm ứng (`pointer: coarse`), mọi điều khiển tương tác có vùng bấm ≥ 44px và ô nhập ≥ 16px.

## Reuse

- Trạng thái `collapsed` và chế độ thanh icon 56px đã có sẵn trong `Sidebar`.
- `useIsMobile` ở `src/lib/responsive.ts` (mốc 767px) cho ngăn kéo.
- Exemplar: `src/components/Layout.tsx` (nhánh `collapsed`).

## Changes

1. `src/App.tsx`
   - Change: khởi tạo `collapsed` bằng `window.matchMedia('(max-width: 1023px)').matches`. Thay `h-screen` bằng `h-dvh`.
   - Preserve: nút thu gọn/mở rộng vẫn hoạt động; cuộn nội dung ở `<main>`.
   - Verify: ở 820px nội dung rộng khoảng 764px, sidebar là thanh icon.
2. `src/components/Layout.tsx`
   - Change: `Sidebar` dùng `h-dvh`. Nút icon header, nút thu gọn có kích thước chạm ≥ 44px khi `pointer: coarse`. Khi đang thu gọn trên tablet vẫn có đường đăng xuất (biểu tượng `LogOut` ở đáy).
   - Preserve: tên truy cập đã thêm (aria-label).
   - Verify: không thể bấm trượt giữa các nút liền kề.
3. `src/components/ui.tsx`
   - Change: `TinyBtn`, nút phân trang, nút đóng `Modal`, `Btn small` thêm lớp `[@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11` (giữ khoảng cách ≥ 8px). `Modal` thêm `overscroll-contain`.
   - Preserve: kích thước hiện tại cho chuột/desktop.
   - Verify: trên cảm ứng các nút trong bảng không còn nhỏ hơn 44px.
4. `src/index.css`
   - Change: thêm `@media (pointer: coarse) { input, select, textarea { font-size: 16px; } }`, `button, a, [role=tab] { touch-action: manipulation; }`, và `.tabular-nums` áp dụng cho ô tiền/số lượng. Mã đơn `whitespace-nowrap`.
   - Preserve: cỡ chữ `text-xs` trên desktop.
   - Verify: iOS không tự phóng to khi focus ô nhập.

## Scope

- Inherit: tất cả màn hình dùng `Sidebar`, `Header`, `Modal`, `TinyBtn`, `Pagination`.
- Verify: Login (không có sidebar), Modal chồng modal (`DialogProvider`).
- Exclude: dark mode, đổi bảng màu, đổi typography.

## Validation

- Product: nhân viên chuyển giữa Đơn hàng, Kho, Khách hàng bằng ngón tay trên iPad dọc, không bấm nhầm.
- Interface: 390×844, 744×1133, 820×1180, 1024×768, 1280×800; hướng dọc và ngang.
- System: không tạo thêm biến thể sidebar mới, chỉ dùng chế độ `collapsed` có sẵn.
- Repository: `npm test` → pass; `npx vite build` → thành công.

## Stop conditions

- Dừng nếu `pointer-coarse` / media query tùy biến làm hỏng bố cục desktop ở cảm ứng lai (laptop có màn hình cảm ứng): khi đó chỉ áp dụng theo chiều rộng thay vì loại con trỏ.

## Design documentation

- Sau khi nghiệm thu: ghi quy ước "tablet 768–1023px = sidebar thu gọn; cảm ứng = chạm ≥ 44px, ô nhập ≥ 16px" vào tài liệu thiết kế của frontend (hiện chưa có).
