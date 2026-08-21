// Maps backend enum values to the Vietnamese display labels the UI (and the
// Badge color map in components/ui.tsx) expect.

export const orderStatusLabel: Record<string, string> = {
  MOI: 'Mới',
  DANG_XU_LY: 'Đang xử lý',
  HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy',
  HOAN_TIEN: 'Hoàn tiền',
}

export const productStatusLabel: Record<string, string> = {
  CON_HANG: 'Còn hàng',
  SAP_HET: 'Sắp hết',
  HET_HANG: 'Hết hàng',
  NGUNG_KINH_DOANH: 'Ngừng kinh doanh',
}

export const customerTierLabel: Record<string, string> = {
  NEW: 'New',
  MEMBER: 'Member',
  VIP: 'VIP',
}

export const debtStatusLabel: Record<string, string> = {
  CHUA_DEN_HAN: 'Chưa đến hạn',
  SAP_DEN_HAN: 'Sắp đến hạn',
  QUA_HAN: 'Quá hạn',
  DA_THANH_TOAN: 'Đã thanh toán',
}

export const debtTypeLabel: Record<string, string> = {
  PHAI_THU: 'Phải thu',
  PHAI_TRA: 'Phải trả',
}

export const paymentMethodLabel: Record<string, string> = {
  TIEN_MAT: 'Tiền mặt',
  CHUYEN_KHOAN: 'Chuyển khoản',
  THE: 'Thẻ',
  QR_CODE: 'QR Code',
}

export const salesChannelLabel: Record<string, string> = {
  TAI_CUA_HANG: 'Tại cửa hàng',
  DIEN_THOAI: 'Điện thoại',
  FACEBOOK: 'Facebook',
  ZALO: 'Zalo',
  TIKTOK: 'TikTok',
  KHAC: 'Khác',
}

export const staffRoleLabel: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
  INVENTORY_STAFF: 'Inventory Staff',
}

export const staffStatusLabel: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Tạm khóa',
}

export const inventoryTransactionTypeLabel: Record<string, string> = {
  NHAP: 'Nhập kho',
  XUAT: 'Xuất kho',
  DIEU_CHINH: 'Điều chỉnh',
  TRA_HANG: 'Trả hàng',
}

export const incomeExpenseCategoryLabel: Record<string, string> = {
  BAN_HANG: 'Bán hàng',
  NHAP_HANG: 'Nhập hàng',
  VAN_CHUYEN: 'Vận chuyển',
  LUONG: 'Lương',
  DIEN_NUOC: 'Điện nước',
  MARKETING: 'Marketing',
  KHAC: 'Khác',
}

export const transactionKindLabel: Record<string, string> = {
  THU: 'Thu',
  CHI: 'Chi',
}

export const paymentReconciliationStatusLabel: Record<string, string> = {
  KHOP: 'Đã khớp',
  KHONG_KHOP: 'Không khớp',
  SAI_SO_TIEN: 'Sai số tiền',
}

export const deliveryMethodLabel: Record<string, string> = {
  KHACH_TOI_LAY: 'Khách tới lấy',
  SHIP: 'Ship',
}

export const shippingCarrierLabel: Record<string, string> = {
  SPX: 'SPX (Shopee Express)',
  GRAB: 'GrabExpress',
  KHAC: 'Khác',
}

export const loaiSanPhamLabel: Record<string, string> = {
  CO_SAN: 'Có sẵn',
  PRE_ORDER: 'Pre-order',
}

export const preorderStatusLabel: Record<string, string> = {
  CHO_HANG: 'Chờ hàng',
  SAN_SANG: 'Sẵn sàng giao',
  DA_CHUYEN_DON: 'Đã chuyển đơn',
  DA_HUY: 'Đã hủy',
}

export function reverseLookup(map: Record<string, string>, label: string): string | undefined {
  return Object.entries(map).find(([, v]) => v === label)?.[0]
}
