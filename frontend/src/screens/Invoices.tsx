import { useEffect, useState } from 'react'
import { FilterBar, SearchInput, Table, Pagination, TinyBtn, Spinner, ErrorBox } from '../components/ui'
import { api, ApiError, type Invoice } from '../lib/api'
import { paymentMethodLabel } from '../lib/labels'
import { useAuth } from '../lib/auth'
import { useDialog } from '../lib/dialog'

export function InvoicesScreen({ onDetail }: { onDetail: (id: string) => void }) {
  const dialog = useDialog()
  const { staff } = useAuth()
  const [items, setItems] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const pageSize = 10

  function reload() {
    setLoading(true)
    api.invoices.list({ q: q || undefined, page, pageSize }).then(res => {
      setItems(res.items); setTotal(res.total); setLoading(false)
    })
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, page])

  async function handleDelete(inv: Invoice) {
    if (!(await dialog.confirm(`Xóa hóa đơn "${inv.soHoaDon}"? Đơn hàng gốc vẫn giữ nguyên. Không thể hoàn tác.`))) return
    setDeleteError(null)
    try {
      await api.invoices.delete(inv.id)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể xóa hóa đơn.')
    }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <ErrorBox message={deleteError} />
        <FilterBar>
          <SearchInput placeholder="Tìm mã hóa đơn, mã đơn hoặc khách hàng..." width="w-64" value={q} onChange={v => { setQ(v); setPage(1) }} />
        </FilterBar>
        {loading ? <Spinner /> : items.length === 0 ? (
          <div className="text-xs text-slate-400 py-12 text-center">Chưa có hóa đơn nào</div>
        ) : (
          <Table
            cols={['Số hóa đơn', 'Ngày', 'Giờ', 'Khách hàng', 'Mã đơn', 'Tổng tiền', 'Phương thức', 'Mã vận đơn', 'Người tạo', 'Thao tác']}
            rows={items.map(inv => {
              const d = new Date(inv.createdAt)
              return [
                <span className="font-mono text-[10px] font-semibold" style={{ color: '#1a56db' }}>{inv.soHoaDon}</span>,
                d.toLocaleDateString('vi-VN'), d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                <span className="font-medium text-slate-800">{inv.order.khachHang.hoTen}</span>,
                <span className="font-mono text-[10px] text-slate-600">{inv.order.ma}</span>,
                <span className="font-semibold">{inv.order.tongCong.toLocaleString('vi-VN')} VNĐ</span>,
                paymentMethodLabel[inv.order.phuongThucThanhToan],
                inv.order.maVanDon ? (
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-slate-700">{inv.order.maVanDon}</span>
                    <button onClick={() => navigator.clipboard.writeText(inv.order.maVanDon!)} className="text-[10px] text-blue-600 hover:underline cursor-pointer">Chép</button>
                  </div>
                ) : <span className="text-slate-300">—</span>,
                inv.nguoiTao.hoTen,
                <div className="flex gap-1">
                  <TinyBtn onClick={() => onDetail(inv.id)}>Xem</TinyBtn>
                  <TinyBtn onClick={() => api.invoices.openPdf(inv.id).catch(err => dialog.alert(err instanceof ApiError ? err.message : 'Không thể tải hóa đơn.'))}>PDF</TinyBtn>
                  {staff?.vaiTro === 'ADMIN' && <TinyBtn danger onClick={() => handleDelete(inv)}>Xóa</TinyBtn>}
                </div>,
              ]
            })}
          />
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  )
}
