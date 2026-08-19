import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Btn, FilterBar, SearchInput, Select, Table, Pagination, TinyBtn, Badge, Spinner } from '../components/ui'
import { api, type Order, type OrderStatus, type PaymentMethod } from '../lib/api'
import { orderStatusLabel, paymentMethodLabel, reverseLookup } from '../lib/labels'

export function OrdersScreen({ onDetail, onCreate }: { onDetail: (id: string) => void; onCreate: () => void }) {
  const [items, setItems] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [trangThai, setTrangThai] = useState('')
  const [phuongThuc, setPhuongThuc] = useState('')
  const [loading, setLoading] = useState(true)
  const pageSize = 10

  useEffect(() => {
    setLoading(true)
    const handle = setTimeout(() => {
      api.orders.list({
        q: q || undefined,
        trangThai: (reverseLookup(orderStatusLabel, trangThai) as OrderStatus) || undefined,
        phuongThucThanhToan: (reverseLookup(paymentMethodLabel, phuongThuc) as PaymentMethod) || undefined,
        page,
        pageSize,
      }).then(res => {
        setItems(res.items)
        setTotal(res.total)
        setLoading(false)
      })
    }, 250)
    return () => clearTimeout(handle)
  }, [q, trangThai, phuongThuc, page])

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          <Btn small onClick={onCreate}><Plus size={13} strokeWidth={2} /> Tạo đơn hàng</Btn>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <FilterBar>
          <SearchInput placeholder="Tìm theo mã đơn, tên khách hàng hoặc SĐT..." width="w-64" value={q} onChange={v => { setQ(v); setPage(1) }} />
          <Select placeholder="Trạng thái" options={Object.values(orderStatusLabel)} value={trangThai} onChange={v => { setTrangThai(v); setPage(1) }} />
          <Select placeholder="Thanh toán" options={Object.values(paymentMethodLabel)} value={phuongThuc} onChange={v => { setPhuongThuc(v); setPage(1) }} />
        </FilterBar>
        {loading ? <Spinner /> : items.length === 0 ? (
          <div className="text-xs text-slate-400 py-12 text-center">Không có đơn hàng nào</div>
        ) : (
          <Table
            cols={['Mã đơn', 'Ngày tạo', 'Khách hàng', 'SĐT', 'Số SP', 'Tổng tiền', 'Thanh toán', 'Trạng thái', 'Nhân viên', 'Thao tác']}
            rows={items.map(o => [
              <button onClick={() => onDetail(o.id)} className="font-mono text-[10px] font-semibold hover:underline cursor-pointer" style={{ color: '#1a56db' }}>{o.ma}</button>,
              new Date(o.createdAt).toLocaleDateString('vi-VN'), o.khachHang.hoTen, o.khachHang.sdt,
              <span className="font-semibold">{o.items.length}</span>,
              <span className="font-semibold">{o.tongCong.toLocaleString('vi-VN')} VNĐ</span>,
              paymentMethodLabel[o.phuongThucThanhToan], <Badge label={orderStatusLabel[o.trangThai]} />, o.nhanVien.hoTen,
              <TinyBtn onClick={() => onDetail(o.id)}>Xem</TinyBtn>,
            ])}
          />
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  )
}
