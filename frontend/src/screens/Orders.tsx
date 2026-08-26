import { useEffect, useState } from 'react'
import { Plus, Trophy, Eye, FileDown } from 'lucide-react'
import { Btn, FilterBar, SearchInput, Select, Table, Pagination, TinyBtn, Badge, Spinner } from '../components/ui'
import { api, ApiError, type Order, type OrderStatus, type PaymentMethod, type DeliveryMethod } from '../lib/api'
import { orderStatusLabel, paymentMethodLabel, deliveryMethodLabel, shippingCarrierLabel, reverseLookup } from '../lib/labels'
import { useDialog } from '../lib/dialog'

const SORT_OPTIONS = {
  'Ngày mới nhất': { sortBy: 'createdAt', sortOrder: 'desc' },
  'Ngày cũ nhất': { sortBy: 'createdAt', sortOrder: 'asc' },
  'Giá trị cao nhất': { sortBy: 'tongCong', sortOrder: 'desc' },
  'Giá trị thấp nhất': { sortBy: 'tongCong', sortOrder: 'asc' },
} as const

/** Xếp hạng khách mua nhiều nhất (tổng đơn Hoàn thành) — tận dụng liên kết khachHangId có sẵn trên Order. */
function TopCustomersPanel({ onSelectCustomer }: { onSelectCustomer: (customerId: string) => void }) {
  const [items, setItems] = useState<{ khachHang: { id: string; hoTen: string; sdt: string | null }; tongChiTieu: number; soDonHoanThanh: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.orders.topCustomers(5).then(res => { setItems(res.items); setLoading(false) }) }, [])

  if (loading) return null
  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-700">
        <Trophy size={14} strokeWidth={2} className="text-amber-500" /> Khách mua nhiều nhất (đơn Hoàn thành)
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        {items.map((it, i) => (
          <button key={it.khachHang.id} onClick={() => onSelectCustomer(it.khachHang.id)}
            className="flex flex-col items-start p-2.5 rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer text-left transition-colors">
            <div className="flex items-center gap-1.5 w-full">
              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: i === 0 ? '#f97316' : '#e2e8f0', color: i === 0 ? '#fff' : '#64748b' }}>{i + 1}</span>
              <span className="text-xs font-medium text-slate-800 truncate">{it.khachHang.hoTen}</span>
            </div>
            <div className="text-sm font-bold mt-1" style={{ color: '#1a56db' }}>{it.tongChiTieu.toLocaleString('vi-VN')} VNĐ</div>
            <div className="text-[10px] text-slate-400">{it.soDonHoanThanh} đơn hoàn thành</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function OrdersScreen({ onDetail, onCreate, onViewCustomer }: {
  onDetail: (id: string) => void; onCreate: () => void; onViewCustomer?: (customerId: string) => void
}) {
  const dialog = useDialog()
  const [items, setItems] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [trangThai, setTrangThai] = useState('')
  const [phuongThuc, setPhuongThuc] = useState('')
  const [thanhToan, setThanhToan] = useState('')
  const [nhanHang, setNhanHang] = useState('')
  const [maVanDonFilter, setMaVanDonFilter] = useState('')
  const [sort, setSort] = useState<keyof typeof SORT_OPTIONS>('Ngày mới nhất')
  const [loading, setLoading] = useState(true)
  const pageSize = 10

  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(() => {
      api.orders.list({
        q: q || undefined,
        trangThai: (reverseLookup(orderStatusLabel, trangThai) as OrderStatus) || undefined,
        phuongThucThanhToan: (reverseLookup(paymentMethodLabel, phuongThuc) as PaymentMethod) || undefined,
        daThanhToan: thanhToan === 'Đã thanh toán' ? true : thanhToan === 'Chưa thanh toán' ? false : undefined,
        phuongThucNhanHang: (reverseLookup(deliveryMethodLabel, nhanHang) as DeliveryMethod) || undefined,
        coMaVanDon: maVanDonFilter === 'Đã có mã' ? true : maVanDonFilter === 'Chưa có mã' ? false : undefined,
        sortBy: SORT_OPTIONS[sort].sortBy,
        sortOrder: SORT_OPTIONS[sort].sortOrder,
        page,
        pageSize,
      }).then(res => {
        setItems(res.items)
        setTotal(res.total)
        setLoading(false)
      })
    }, 250)
    return () => clearTimeout(handle)
  }, [q, trangThai, phuongThuc, thanhToan, nhanHang, maVanDonFilter, sort, page])

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          <Btn small onClick={onCreate}><Plus size={13} strokeWidth={2} /> Tạo đơn hàng</Btn>
        </div>
      </div>

      {onViewCustomer && <TopCustomersPanel onSelectCustomer={onViewCustomer} />}

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <FilterBar>
          <SearchInput placeholder="Tìm theo mã đơn, tên khách hàng hoặc SĐT..." width="w-48" value={q} onChange={v => { setQ(v); setPage(1) }} />
          <Select placeholder="Trạng thái" width="w-28" options={Object.values(orderStatusLabel)} value={trangThai} onChange={v => { setTrangThai(v); setPage(1) }} />
          <Select placeholder="Thanh toán" width="w-28" options={Object.values(paymentMethodLabel)} value={phuongThuc} onChange={v => { setPhuongThuc(v); setPage(1) }} />
          <Select placeholder="Đã thanh toán?" width="w-32" options={['Đã thanh toán', 'Chưa thanh toán']} value={thanhToan} onChange={v => { setThanhToan(v); setPage(1) }} />
          <Select placeholder="Nhận hàng" width="w-28" options={Object.values(deliveryMethodLabel)} value={nhanHang} onChange={v => { setNhanHang(v); setPage(1) }} />
          <Select placeholder="Mã vận đơn" width="w-28" options={['Đã có mã', 'Chưa có mã']} value={maVanDonFilter} onChange={v => { setMaVanDonFilter(v); setPage(1) }} />
          <Select placeholder="Sắp xếp" width="w-36" options={Object.keys(SORT_OPTIONS)} value={sort} onChange={v => { setSort(v as keyof typeof SORT_OPTIONS); setPage(1) }} />
        </FilterBar>
        {loading ? <Spinner /> : items.length === 0 ? (
          <div className="text-xs text-slate-400 py-12 text-center">Không có đơn hàng nào</div>
        ) : (
          <Table
            cols={['Thao tác', 'Mã đơn', 'Ngày tạo', 'Khách hàng', 'SĐT', 'Số SP', 'Tổng tiền', 'Thanh toán', 'Trạng thái', 'Đã thu tiền', 'Nhận hàng', 'Mã vận đơn', 'Nhân viên']}
            rows={items.map(o => [
              <div className="flex gap-1">
                <TinyBtn title="Xem" onClick={() => onDetail(o.id)}><Eye size={12} strokeWidth={1.75} /></TinyBtn>
                {o.invoice ? (
                  <TinyBtn title="Xuất PDF" onClick={() => api.invoices.openPdf(o.invoice!.id).catch(err => dialog.alert(err instanceof ApiError ? err.message : 'Không thể tải hóa đơn.'))}>
                    <FileDown size={12} strokeWidth={1.75} />
                  </TinyBtn>
                ) : o.trangThai === 'DANG_XU_LY' && (
                  <TinyBtn title="Phiếu tạm tính" onClick={() => api.orders.openPreviewPdf(o.id).catch(err => dialog.alert(err instanceof ApiError ? err.message : 'Không thể tải phiếu tạm tính.'))}>
                    <FileDown size={12} strokeWidth={1.75} />
                  </TinyBtn>
                )}
              </div>,
              <button onClick={() => onDetail(o.id)} className="font-mono text-[10px] font-semibold hover:underline cursor-pointer" style={{ color: '#1a56db' }}>{o.ma}</button>,
              new Date(o.createdAt).toLocaleDateString('vi-VN'),
              <span className="block max-w-[140px] truncate" title={o.khachHang.hoTen}>{o.khachHang.hoTen}</span>,
              <span className="block max-w-[110px] truncate" title={o.khachHang.sdt ?? undefined}>{o.khachHang.sdt || '—'}</span>,
              <span className="font-semibold">{o.items.length}</span>,
              <span className="font-semibold">{o.tongCong.toLocaleString('vi-VN')} VNĐ</span>,
              paymentMethodLabel[o.phuongThucThanhToan], <Badge label={orderStatusLabel[o.trangThai]} />,
              <Badge label={o.daThanhToan ? 'Đã thanh toán' : 'Chưa thanh toán'} />,
              <Badge label={o.phuongThucNhanHang === 'SHIP' && o.donViVanChuyen ? shippingCarrierLabel[o.donViVanChuyen] : deliveryMethodLabel[o.phuongThucNhanHang]} />,
              o.maVanDon ? <span className="font-mono text-[10px] text-slate-700">{o.maVanDon}</span> : <span className="text-slate-300">—</span>,
              <span className="block max-w-[140px] truncate" title={o.nhanVien.hoTen}>{o.nhanVien.hoTen}</span>,
            ])}
          />
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  )
}
