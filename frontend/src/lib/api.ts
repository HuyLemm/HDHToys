const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api'

const TOKEN_KEY = 'hdh_token'

let authToken: string | null = localStorage.getItem(TOKEN_KEY)

export function setToken(token: string | null) {
  authToken = token
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function getToken() {
  return authToken
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.error ?? message
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function get<T>(path: string): Promise<T> {
  return request<T>(path)
}
function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined })
}
function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined })
}
function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}

/**
 * Multipart upload — không dùng request() vì đó luôn set Content-Type:
 * application/json + JSON.stringify body. Với FormData, fetch tự set đúng
 * Content-Type kèm boundary — không set tay ở đây.
 */
async function uploadFile<T>(path: string, fieldName: string, file: File): Promise<T> {
  const formData = new FormData()
  formData.append(fieldName, file)
  const headers: Record<string, string> = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: formData, headers })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.error ?? message
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/**
 * Opening the PDF endpoint's URL directly (window.open, <a href>) sends no
 * Authorization header, so the protected route 401s. Fetch it with the
 * bearer token instead, then show the resulting blob.
 *
 * The tab is opened synchronously (before the first `await`) so browsers
 * still attribute it to the click that triggered this call — opening it
 * only after the fetch resolves gets treated as an unrequested popup and
 * silently blocked.
 */
async function openAuthenticatedPdf(path: string) {
  const win = window.open('', '_blank')
  if (win) win.document.write('<p style="font-family:sans-serif;padding:2rem;color:#666">Đang tải hóa đơn...</p>')

  const headers: Record<string, string> = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  try {
    const res = await fetch(`${API_BASE}${path}`, { headers })
    if (!res.ok) {
      let message = res.statusText
      try {
        const body = await res.json()
        message = body.error ?? message
      } catch {
        // no JSON body
      }
      throw new ApiError(res.status, message)
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    if (win) win.location.href = url
    else window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    win?.close()
    throw err
  }
}

/**
 * Fetches a protected binary endpoint (e.g. the QR payment image) as a Blob,
 * for embedding inline (<img src={URL.createObjectURL(blob)}>) — same reason
 * as openAuthenticatedPdf: a plain <img src="..."> sends no Authorization
 * header, so the protected route would 401.
 */
async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(`${API_BASE}${path}`, { headers })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body.error ?? message
    } catch {
      // no JSON body
    }
    throw new ApiError(res.status, message)
  }
  return res.blob()
}

function qs(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return ''
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') s.set(k, String(v))
  }
  const str = s.toString()
  return str ? `?${str}` : ''
}

// ─── Types ────────────────────────────────────────────────────────────────

export type StaffRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'INVENTORY_STAFF'
export type Staff = {
  id: string
  hoTen: string
  email: string
  vaiTro: StaffRole
  trangThai?: 'ACTIVE' | 'LOCKED'
  createdAt?: string
}

export type ProductStatus = 'CON_HANG' | 'SAP_HET' | 'HET_HANG' | 'NGUNG_KINH_DOANH'
export type LoaiSanPham = 'CO_SAN' | 'PRE_ORDER'
export type Product = {
  id: string
  sku: string
  ten: string
  barcode?: string | null
  danhMuc: string
  nhaCungCap: string
  anhUrl?: string | null
  giaVon: number
  phiVanChuyen: number
  giaBan: number
  tonKho: number
  tonKhoToiThieu: number
  daBan: number
  trangThai: ProductStatus
  loaiSanPham: LoaiSanPham
  ngayDuKienVe?: string | null
  nhacHang: boolean
  createdAt: string
  updatedAt: string
  coTheBan?: number
  giaTriTon?: number
}

export type CustomerTier = 'NEW' | 'MEMBER' | 'VIP'
export type Customer = {
  id: string
  hoTen: string
  sdt: string
  email?: string | null
  ngaySinh?: string | null
  diaChi?: string | null
  luuY?: string | null
  linkFacebook?: string | null
  nguonKhachHang: SalesChannel
  hangKhachHang: CustomerTier
  diemTichLuy: number
  createdAt: string
  updatedAt: string
}

export type CustomerNote = { id: string; customerId: string; noiDung: string; nguoiTaoId: string; createdAt: string }

export type OrderStatus = 'MOI' | 'DANG_XU_LY' | 'HOAN_THANH' | 'DA_HUY' | 'HOAN_TIEN'
export type PaymentMethod = 'TIEN_MAT' | 'CHUYEN_KHOAN' | 'THE' | 'QR_CODE'
export type SalesChannel = 'TAI_CUA_HANG' | 'DIEN_THOAI' | 'FACEBOOK' | 'ZALO' | 'TIKTOK' | 'KHAC'
export type DeliveryMethod = 'KHACH_TOI_LAY' | 'SHIP'
export type ShippingCarrier = 'SPX' | 'GRAB' | 'KHAC'

export type OrderItem = {
  id: string
  productId: string
  soLuong: number
  donGia: number
  giaVon: number
  giamGia: number
  thanhTien: number
  product: { id: string; sku: string; ten: string; loaiSanPham: LoaiSanPham }
}

/** Đối soát thanh toán QR ngân hàng (SRS mục 3.16 / SDS mục 5.8) — tính động, không lưu DB. */
export type QrPaymentInfo = {
  configured: boolean
  payload: string | null
  expiresAt: string | null
  expired: boolean
}

export type Order = {
  id: string
  ma: string
  khachHangId: string
  nhanVienId: string
  kenhBan: SalesChannel
  phuongThucThanhToan: PaymentMethod
  trangThai: OrderStatus
  tamTinh: number
  giamGia: number
  phiShip: number
  tongCong: number
  tienCoc: number
  daThanhToan: boolean
  phuongThucNhanHang: DeliveryMethod
  donViVanChuyen?: ShippingCarrier | null
  maVanDon?: string | null
  ghiChu?: string | null
  items: OrderItem[]
  khachHang: { id: string; hoTen: string; sdt: string; email?: string | null }
  nhanVien: { id: string; hoTen: string }
  /** Chỉ có trên GET /orders/:id (không có ở danh sách) — null nếu không áp dụng (không phải QR/đã xử lý xong). */
  qrCode?: QrPaymentInfo | null
  createdAt: string
  updatedAt: string
}

export type PaymentReconciliationStatus = 'KHOP' | 'KHONG_KHOP' | 'SAI_SO_TIEN'
export type PaymentTransaction = {
  id: string
  maGiaoDichNganHang: string
  orderId?: string | null
  soTienNhan: number
  noiDungChuyenKhoan: string
  trangThaiDoiSoat: PaymentReconciliationStatus
  createdAt: string
  order?: { id: string; ma: string; tongCong: number; khachHang?: { hoTen: string } } | null
}

export type InventoryTransactionType = 'NHAP' | 'XUAT' | 'DIEU_CHINH' | 'TRA_HANG'
export type InventoryTransaction = {
  id: string
  maGiaoDich: string
  productId: string
  loai: InventoryTransactionType
  soLuongThayDoi: number
  tonTruoc: number
  tonSau: number
  nguoiThucHienId: string
  thamChieu?: string | null
  ghiChu?: string | null
  createdAt: string
  product: { id: string; sku: string; ten: string }
  nguoiThucHien: { id: string; hoTen: string }
}

export type Invoice = {
  id: string
  soHoaDon: string
  orderId: string
  nguoiTaoId: string
  createdAt: string
  nguoiTao: { id: string; hoTen: string }
  /** preorder chỉ có khi hóa đơn này được chuyển từ một đơn "Đặt trước" (dùng để hiện mã PO tham chiếu) — số tiền cọc lấy từ order.tienCoc, không phụ thuộc preorder còn tồn tại hay không. */
  order: Order & { preorder?: { ma: string } | null }
}

export type DebtType = 'PHAI_THU' | 'PHAI_TRA'
export type DebtStatus = 'CHUA_DEN_HAN' | 'SAP_DEN_HAN' | 'QUA_HAN' | 'DA_THANH_TOAN'
export type Debt = {
  id: string
  doiTuong: string
  loai: DebtType
  ngayPhatSinh: string
  ngayDenHan: string
  soTien: number
  daThanhToan: number
  conLai: number
  trangThai: DebtStatus
  createdAt: string
  updatedAt: string
}

export type TransactionKind = 'THU' | 'CHI'
export type IncomeExpenseCategory =
  | 'BAN_HANG'
  | 'NHAP_HANG'
  | 'VAN_CHUYEN'
  | 'LUONG'
  | 'DIEN_NUOC'
  | 'MARKETING'
  | 'KHAC'
export type IncomeExpense = {
  id: string
  maPhieu: string
  loai: TransactionKind
  danhMuc: IncomeExpenseCategory
  noiDung: string
  soTien: number
  nguoiTaoId: string
  createdAt: string
  nguoiTao: { id: string; hoTen: string }
}

export type PreorderStatus = 'CHO_HANG' | 'SAN_SANG' | 'DA_CHUYEN_DON' | 'DA_HUY'
export type Preorder = {
  id: string
  ma: string
  khachHangId: string
  nhanVienId: string
  productId?: string | null
  tenSanPhamMoi?: string | null
  soLuong: number
  donGiaDuKien: number
  tienCoc: number
  trangThai: PreorderStatus
  ngayDuKienCo?: string | null
  ghiChu?: string | null
  orderId?: string | null
  khachHang: { id: string; hoTen: string; sdt: string; email?: string | null }
  nhanVien: { id: string; hoTen: string }
  product?: { id: string; sku: string; ten: string; giaBan: number; tonKho: number } | null
  createdAt: string
  updatedAt: string
}

export type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number }

export type RangeKey = 'hom_nay' | 'hom_qua' | '7_ngay' | '30_ngay' | 'thang_nay' | 'quy_nay' | 'nam_nay' | 'tuy_chinh'

// ─── API client ─────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, matKhau: string) =>
      post<{ token: string; staff: Staff }>('/auth/login', { email, matKhau }),
    me: () => get<Staff>('/auth/me'),
  },

  staff: {
    list: () => get<Staff[]>('/staff'),
    create: (data: { hoTen: string; email: string; matKhau: string; vaiTro: StaffRole }) =>
      post<Staff>('/staff', data),
    update: (id: string, data: Partial<Pick<Staff, 'hoTen' | 'vaiTro' | 'trangThai'>>) =>
      patch<Staff>(`/staff/${id}`, data),
    resetPassword: (id: string, matKhauMoi: string) => post(`/staff/${id}/reset-password`, { matKhauMoi }),
    /** Chỉ Admin — chỉ xóa được nếu tài khoản chưa tạo/xử lý dữ liệu gì. */
    delete: (id: string) => del<void>(`/staff/${id}`),
  },

  products: {
    list: (params?: {
      q?: string
      danhMuc?: string
      nhaCungCap?: string
      trangThai?: ProductStatus
      loaiSanPham?: LoaiSanPham
      page?: number
      pageSize?: number
    }) => get<Paginated<Product>>(`/products${qs(params)}`),
    get: (id: string) => get<Product>(`/products/${id}`),
    create: (data: Partial<Product>) => post<Product>('/products', data),
    update: (id: string, data: Partial<Product>) => patch<Product>(`/products/${id}`, data),
    discontinue: (id: string) => post<Product>(`/products/${id}/discontinue`),
    reactivate: (id: string) => post<Product>(`/products/${id}/reactivate`),
    /** Chỉ xóa được nếu SP chưa xuất hiện trong đơn hàng/kho/đặt trước nào. */
    delete: (id: string) => del<void>(`/products/${id}`),
    /** Ảnh sản phẩm (nếu có) — dùng với URL.createObjectURL để hiển thị; 404 nếu chưa có ảnh. */
    imageBlob: (id: string) => fetchAuthenticatedBlob(`/products/${id}/image`),
    uploadImage: (id: string, file: File) => uploadFile<{ ok: true }>(`/products/${id}/image`, 'image', file),
    deleteImage: (id: string) => del<void>(`/products/${id}/image`),
  },

  customers: {
    list: (params?: { q?: string; hangKhachHang?: CustomerTier; nguonKhachHang?: SalesChannel; page?: number; pageSize?: number }) =>
      get<Paginated<Customer>>(`/customers${qs(params)}`),
    get: (id: string) => get<Customer>(`/customers/${id}`),
    create: (data: {
      hoTen: string
      sdt: string
      email?: string
      ngaySinh?: string
      diaChi?: string
      luuY?: string
      linkFacebook?: string
      nguonKhachHang?: SalesChannel
      hangKhachHang?: CustomerTier
    }) => post<Customer>('/customers', data),
    update: (id: string, data: Partial<Customer>) => patch<Customer>(`/customers/${id}`, data),
    overview: (id: string) =>
      get<{
        customer: Customer
        kpi: { tongChiTieu: number; tongDon: number; giaTriDonTrungBinh: number; tongSanPhamDaMua: number; donDangXuLy: number }
        danhMucThuongMua: string[]
        sanPhamMuaNhieuNhat: { ten: string; sku: string; soLuong: number } | null
        lanMuaGanNhat: string | null
        donDangXuLyHienTai: Order[]
      }>(`/customers/${id}/overview`),
    orders: (id: string, params?: { trangThai?: string; page?: number; pageSize?: number }) =>
      get<Paginated<Order>>(`/customers/${id}/orders${qs(params)}`),
    products: (id: string) =>
      get<{
        items: { productId: string; ten: string; sku: string; tongSoLuong: number; soLanMua: number; lanMuaGanNhat: string; tongChiTieu: number }[]
        total: number
      }>(`/customers/${id}/products`),
    invoices: (id: string) => get<{ items: Invoice[]; total: number }>(`/customers/${id}/invoices`),
    notes: (id: string) => get<CustomerNote[]>(`/customers/${id}/notes`),
    addNote: (id: string, noiDung: string) => post<CustomerNote>(`/customers/${id}/notes`, { noiDung }),
    deleteNote: (id: string, noteId: string) => del<void>(`/customers/${id}/notes/${noteId}`),
    /** Chỉ xóa được nếu khách chưa có đơn hàng/đặt trước nào. */
    delete: (id: string) => del<void>(`/customers/${id}`),
  },

  orders: {
    list: (params?: {
      q?: string
      trangThai?: OrderStatus
      khachHangId?: string
      nhanVienId?: string
      phuongThucThanhToan?: PaymentMethod
      daThanhToan?: boolean
      phuongThucNhanHang?: DeliveryMethod
      coMaVanDon?: boolean
      sortBy?: 'createdAt' | 'tongCong'
      sortOrder?: 'asc' | 'desc'
      page?: number
      pageSize?: number
    }) => get<Paginated<Order>>(`/orders${qs(params)}`),
    /** Xếp hạng khách hàng theo tổng giá trị đơn Hoàn thành — tận dụng liên kết khachHangId có sẵn trên Order. */
    topCustomers: (limit?: number) =>
      get<{ items: { khachHang: { id: string; hoTen: string; sdt: string }; tongChiTieu: number; soDonHoanThanh: number }[] }>(`/orders/top-customers${qs({ limit })}`),
    get: (id: string) => get<Order>(`/orders/${id}`),
    create: (data: {
      khachHangId: string
      nhanVienId?: string
      kenhBan?: SalesChannel
      phuongThucThanhToan: PaymentMethod
      phuongThucNhanHang?: DeliveryMethod
      donViVanChuyen?: ShippingCarrier
      phiShip?: number
      tienCoc?: number
      ghiChu?: string
      items: { productId: string; soLuong: number; giaOverride?: number; giamGia?: number }[]
    }) => post<Order>('/orders', data),
    updateStatus: (id: string, trangThai: OrderStatus) => patch<Order>(`/orders/${id}/status`, { trangThai }),
    updatePaymentStatus: (id: string, daThanhToan: boolean) => patch<Order>(`/orders/${id}/payment-status`, { daThanhToan }),
    updateDelivery: (id: string, phuongThucNhanHang: DeliveryMethod, donViVanChuyen?: ShippingCarrier) =>
      patch<Order>(`/orders/${id}/delivery`, { phuongThucNhanHang, donViVanChuyen }),
    updateTrackingCode: (id: string, maVanDon: string) => patch<Order>(`/orders/${id}/tracking-code`, { maVanDon }),
    updateShippingFee: (id: string, phiShip: number) => patch<Order>(`/orders/${id}/shipping-fee`, { phiShip }),
    /** Ảnh QR VietQR (PNG) của đơn hàng — dùng với URL.createObjectURL để hiển thị inline. */
    qrImageBlob: (id: string) => fetchAuthenticatedBlob(`/orders/${id}/qr.png`),
    /** Chỉ Admin — chỉ xóa được đơn chưa có hóa đơn (chưa từng Hoàn thành). */
    delete: (id: string) => del<void>(`/orders/${id}`),
  },

  payments: {
    unmatched: (params?: { page?: number; pageSize?: number }) =>
      get<Paginated<PaymentTransaction>>(`/payments/unmatched${qs(params)}`),
  },

  preorders: {
    list: (params?: { q?: string; trangThai?: PreorderStatus; khachHangId?: string; productId?: string; page?: number; pageSize?: number }) =>
      get<Paginated<Preorder>>(`/preorders${qs(params)}`),
    summary: () =>
      get<{ dangChoHang: number; sanSangGiao: number; tongTienCocDangGiu: number }>('/preorders/summary'),
    get: (id: string) => get<Preorder>(`/preorders/${id}`),
    create: (data: {
      khachHangId: string
      productId?: string
      tenSanPhamMoi?: string
      soLuong: number
      donGiaDuKien: number
      tienCoc?: number
      ngayDuKienCo?: string
      ghiChu?: string
    }) => post<Preorder>('/preorders', data),
    update: (id: string, data: Partial<{ soLuong: number; donGiaDuKien: number; tienCoc: number; ngayDuKienCo: string; ghiChu: string }>) =>
      patch<Preorder>(`/preorders/${id}`, data),
    cancel: (id: string) => post<Preorder>(`/preorders/${id}/cancel`),
    convertToOrder: (id: string, data: { productId?: string; phuongThucThanhToan: PaymentMethod; kenhBan?: SalesChannel }) =>
      post<{ preorder: Preorder; order: Order }>(`/preorders/${id}/convert-to-order`, data),
    /** Không xóa được đơn đã DA_CHUYEN_DON (đã có Order thật liên kết). */
    delete: (id: string) => del<void>(`/preorders/${id}`),
  },

  inventory: {
    list: (params?: { q?: string; danhMuc?: string; nhaCungCap?: string; trangThai?: ProductStatus; page?: number; pageSize?: number }) =>
      get<Paginated<Product>>(`/inventory${qs(params)}`),
    summary: () =>
      get<{ tongSku: number; tongSoLuongTon: number; giaTriTonKho: number; sanPhamSapHet: number; sanPhamHetHang: number }>(
        '/inventory/summary',
      ),
    stockIn: (data: { productId: string; soLuong: number; thamChieu?: string; ghiChu?: string }) =>
      post<InventoryTransaction>('/inventory/stock-in', data),
    stockOut: (data: { productId: string; soLuong: number; thamChieu?: string; ghiChu?: string }) =>
      post<InventoryTransaction>('/inventory/stock-out', data),
    adjust: (data: { productId: string; tonKhoMoi: number; ghiChu?: string }) =>
      post<InventoryTransaction>('/inventory/adjust', data),
    history: (params?: {
      productId?: string
      loai?: InventoryTransactionType
      nguoiThucHienId?: string
      page?: number
      pageSize?: number
    }) => get<Paginated<InventoryTransaction>>(`/inventory/history${qs(params)}`),
    /** Chỉ Admin — chỉ xóa được giao dịch kho GẦN NHẤT của sản phẩm đó. */
    deleteTransaction: (id: string) => del<void>(`/inventory/history/${id}`),
  },

  invoices: {
    list: (params?: { q?: string; khachHangId?: string; phuongThucThanhToan?: PaymentMethod; page?: number; pageSize?: number }) =>
      get<Paginated<Invoice>>(`/invoices${qs(params)}`),
    get: (id: string) => get<Invoice>(`/invoices/${id}`),
    /** @deprecated not directly openable — the route requires a bearer token. Use openPdf(id) instead. */
    pdfUrl: (id: string) => `${API_BASE}/invoices/${id}/pdf`,
    openPdf: (id: string) => openAuthenticatedPdf(`/invoices/${id}/pdf`),
    /** Chỉ Admin. */
    delete: (id: string) => del<void>(`/invoices/${id}`),
  },

  search: (q: string) =>
    get<{
      khachHang: Customer[]
      donHang: (Order & { khachHang: { hoTen: string } })[]
      hoaDon: (Invoice & { order: { ma: string; tongCong: number; khachHang: { hoTen: string } } })[]
      sanPham: Product[]
    }>(`/search${qs({ q })}`),

  revenue: {
    summary: (params?: { range?: RangeKey; tuNgay?: string; denNgay?: string }) =>
      get<{ tongDoanhThu: number; tongSoDon: number; giaTriDonTrungBinh: number; loiNhuanGop: number; tongGiamGia: number; tongHoanTien: number }>(
        `/revenue/summary${qs(params)}`,
      ),
    byTime: (params?: { range?: RangeKey }) => get<{ items: { ngay: string; doanhThu: number; soDon: number }[] }>(`/revenue/by-time${qs(params)}`),
    byCategory: (params?: { range?: RangeKey }) =>
      get<{ items: { danhMuc: string; doanhThu: number; giaVon: number; loiNhuan: number }[] }>(`/revenue/by-category${qs(params)}`),
    byProduct: (params?: { range?: RangeKey }) =>
      get<{ items: { ten: string; sku: string; soLuong: number; doanhThu: number; giaVon: number; loiNhuan: number }[] }>(`/revenue/by-product${qs(params)}`),
    byStaff: (params?: { range?: RangeKey }) =>
      get<{ items: { hoTen: string; doanhThu: number; soDon: number }[] }>(`/revenue/by-staff${qs(params)}`),
    byPaymentMethod: (params?: { range?: RangeKey }) =>
      get<{ items: { phuongThuc: PaymentMethod; doanhThu: number; soDon: number }[] }>(`/revenue/by-payment-method${qs(params)}`),
    detail: (params?: { range?: RangeKey; page?: number; pageSize?: number }) =>
      get<
        Paginated<{ ngay: string; soDon: number; doanhThu: number; giamGia: number; hoanTien: number; giaVon: number; loiNhuanGop: number }>
      >(`/revenue/detail${qs(params)}`),
    inventoryTurnover: (params?: { range?: RangeKey }) =>
      get<{ items: { productId: string; sku: string; ten: string; tonKho: number; soLuongBan: number; vongQuay: number | null }[] }>(
        `/revenue/inventory-turnover${qs(params)}`,
      ),
    repeatCustomers: (params?: { range?: RangeKey }) =>
      get<{ tongKhachHang: number; khachMuaLai: number; tyLeMuaLai: number; items: { hoTen: string; sdt: string; soDon: number; tongChiTieu: number }[] }>(
        `/revenue/repeat-customers${qs(params)}`,
      ),
    exportUrl: (params?: { range?: RangeKey }) => `${API_BASE}/revenue/export${qs(params)}`,
  },

  incomeExpense: {
    list: (params?: { loai?: TransactionKind; danhMuc?: IncomeExpenseCategory; range?: RangeKey; page?: number; pageSize?: number }) =>
      get<Paginated<IncomeExpense>>(`/income-expense${qs(params)}`),
    summary: (params?: { range?: RangeKey }) =>
      get<{ tongThu: number; tongChi: number; dongTienRong: number }>(`/income-expense/summary${qs(params)}`),
    create: (data: { loai: TransactionKind; danhMuc: IncomeExpenseCategory; noiDung: string; soTien: number }) =>
      post<IncomeExpense>('/income-expense', data),
    update: (id: string, data: Partial<{ danhMuc: IncomeExpenseCategory; noiDung: string; soTien: number }>) =>
      patch<IncomeExpense>(`/income-expense/${id}`, data),
    delete: (id: string) => del<void>(`/income-expense/${id}`),
  },

  debts: {
    list: (params?: { loai?: DebtType; trangThai?: DebtStatus; q?: string; page?: number; pageSize?: number }) =>
      get<Paginated<Debt>>(`/debts${qs(params)}`),
    summary: () =>
      get<{ tongPhaiThu: number; quaHanPhaiThu: number; tongPhaiTra: number; quaHanPhaiTra: number }>('/debts/summary'),
    create: (data: { doiTuong: string; loai: DebtType; ngayPhatSinh: string; ngayDenHan: string; soTien: number; daThanhToan?: number }) =>
      post<Debt>('/debts', data),
    update: (id: string, data: Partial<{ doiTuong: string; ngayDenHan: string; soTien: number }>) =>
      patch<Debt>(`/debts/${id}`, data),
    payment: (id: string, soTien: number) => patch<Debt>(`/debts/${id}/payment`, { soTien }),
    delete: (id: string) => del<void>(`/debts/${id}`),
  },

  accounting: {
    overview: () =>
      get<{
        tienMat: number
        tienNganHang: number
        congNoPhaiThu: number
        congNoPhaiTra: number
        giaTriTonKho: number
        loiNhuanThang: number
        tinhHinhTaiChinh: { thang: string; thu: number; chi: number; loiNhuan: number }[]
      }>('/accounting/overview'),
    balance: () =>
      get<{
        tienMat: number
        tienNganHang: number
        vonChuSoHuu: number
        taiSanKhac: number
        chiPhiChuaThanhToan: number
        khoanPhaiTraKhac: number
      }>('/accounting/balance'),
    updateBalance: (data: Partial<{
      tienMat: number
      tienNganHang: number
      vonChuSoHuu: number
      taiSanKhac: number
      chiPhiChuaThanhToan: number
      khoanPhaiTraKhac: number
    }>) => patch('/accounting/balance', data),
    balanceSheet: () =>
      get<{
        thoiDiem: string
        taiSan: {
          taiSanNganHan: { tienMat: number; tienGuiNganHang: number; congNoPhaiThu: number; hangTonKho: number; taiSanKhac: number }
          tongTaiSan: number
        }
        nguonVon: {
          noPhaiTra: { congNoNhaCungCap: number; chiPhiChuaThanhToan: number; khoanPhaiTraKhac: number }
          vonChuSoHuu: { vonChuSoHuu: number; loiNhuanGiuLai: number }
          tongNoPhaiTra: number
          tongVonChuSoHuu: number
          tongNguonVon: number
        }
        canDoi: boolean
        chenhLech: number
      }>('/accounting/balance-sheet'),
  },
}
