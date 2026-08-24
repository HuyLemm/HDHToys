import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { BackBtn, FilterBar, SearchInput, Select, Table, Pagination, Spinner, TinyBtn, ErrorBox } from '../components/ui'
import { api, ApiError, type InventoryTransaction, type InventoryTransactionType } from '../lib/api'
import { inventoryTransactionTypeLabel, reverseLookup } from '../lib/labels'
import { useAuth } from '../lib/auth'
import { useDialog } from '../lib/dialog'

const typeColor: Record<string, string> = {
  'Nhập kho': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Xuất kho': 'bg-blue-50 text-blue-700 border-blue-200',
  'Điều chỉnh': 'bg-amber-50 text-amber-700 border-amber-200',
  'Trả hàng': 'bg-purple-50 text-purple-700 border-purple-200',
}

export function InventoryHistoryScreen({ onBack }: { onBack: () => void }) {
  const dialog = useDialog()
  const { staff } = useAuth()
  const [items, setItems] = useState<InventoryTransaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [loai, setLoai] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const pageSize = 15

  function reload() {
    setLoading(true)
    api.inventory.history({
      loai: (reverseLookup(inventoryTransactionTypeLabel, loai) as InventoryTransactionType) || undefined,
      page, pageSize,
    }).then(res => {
      const filtered = q
        ? res.items.filter(h => h.product.ten.toLowerCase().includes(q.toLowerCase()) || h.product.sku.toLowerCase().includes(q.toLowerCase()))
        : res.items
      setItems(filtered)
      setTotal(res.total)
      setLoading(false)
    })
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, loai, page])

  async function handleDelete(h: InventoryTransaction) {
    if (!(await dialog.confirm(`Xóa giao dịch kho "${h.maGiaoDich}"? Chỉ xóa được nếu đây là giao dịch gần nhất của sản phẩm này. Không thể hoàn tác.`))) return
    setDeleteError(null)
    try {
      await api.inventory.deleteTransaction(h.id)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể xóa giao dịch kho.')
    }
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <BackBtn label="Quay lại kho hàng" onClick={onBack} />
        <h1 className="text-base font-bold text-slate-800">Lịch sử kho</h1>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <ErrorBox message={deleteError} />
        <FilterBar>
          <Select placeholder="Loại giao dịch" options={Object.values(inventoryTransactionTypeLabel)} value={loai} onChange={v => { setLoai(v); setPage(1) }} />
          <SearchInput placeholder="Tìm sản phẩm hoặc SKU..." value={q} onChange={v => { setQ(v); setPage(1) }} />
        </FilterBar>
        {loading ? <Spinner /> : items.length === 0 ? (
          <div className="text-xs text-slate-400 py-12 text-center">Chưa có giao dịch kho nào</div>
        ) : (
          <Table
            cols={[...(staff?.vaiTro === 'ADMIN' ? ['Thao tác'] : []), 'Thời gian', 'Mã GD', 'SKU', 'Sản phẩm', 'Loại', 'Thay đổi', 'Tồn trước', 'Tồn sau', 'Người thực hiện', 'Tham chiếu', 'Ghi chú']}
            rows={items.map(h => [
              ...(staff?.vaiTro === 'ADMIN' ? [<TinyBtn danger title="Xóa" onClick={() => handleDelete(h)}><Trash2 size={12} strokeWidth={1.75} /></TinyBtn>] : []),
              <span className="text-[10px] text-slate-500">{new Date(h.createdAt).toLocaleString('vi-VN')}</span>,
              <span className="font-mono text-[10px] font-semibold text-slate-700">{h.maGiaoDich}</span>,
              <span className="font-mono text-[10px] text-slate-500">{h.product.sku}</span>,
              <span className="text-xs font-medium text-slate-800">{h.product.ten}</span>,
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeColor[inventoryTransactionTypeLabel[h.loai]] ?? ''}`}>{inventoryTransactionTypeLabel[h.loai]}</span>,
              <span className={`font-bold text-xs ${h.soLuongThayDoi > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{h.soLuongThayDoi > 0 ? '+' : ''}{h.soLuongThayDoi}</span>,
              String(h.tonTruoc), String(h.tonSau), h.nguoiThucHien.hoTen,
              <span className="font-mono text-[10px]" style={{ color: '#1a56db' }}>{h.thamChieu ?? '—'}</span>,
              <span className="text-[10px] text-slate-500">{h.ghiChu ?? '—'}</span>,
            ])}
          />
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </div>
    </div>
  )
}
