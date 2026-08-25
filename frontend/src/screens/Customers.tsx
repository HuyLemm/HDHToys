import { useEffect, useState } from 'react'
import { Plus, Eye, Trash2 } from 'lucide-react'
import { Btn, FilterBar, SearchInput, Select, Table, Pagination, TinyBtn, Badge, Spinner, ErrorBox } from '../components/ui'
import { api, ApiError, type Customer, type CustomerTier, type SalesChannel } from '../lib/api'
import { customerTierLabel, salesChannelLabel, reverseLookup } from '../lib/labels'
import { useDialog } from '../lib/dialog'
import { NewCustomerModal } from './CreateOrder'

export function CustomersScreen({ onDetail }: { onDetail: (id: string) => void }) {
  const dialog = useDialog()
  const [items, setItems] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [hang, setHang] = useState('')
  const [nguon, setNguon] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const pageSize = 10

  async function handleDelete(c: Customer) {
    if (!(await dialog.confirm(`Xóa khách hàng "${c.hoTen}"? Không thể hoàn tác.`))) return
    setDeleteError(null)
    try {
      await api.customers.delete(c.id)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể xóa khách hàng.')
    }
  }

  function reload() {
    setLoading(true)
    api.customers.list({
      q: q || undefined,
      hangKhachHang: (reverseLookup(customerTierLabel, hang) as CustomerTier) || undefined,
      nguonKhachHang: (reverseLookup(salesChannelLabel, nguon) as SalesChannel) || undefined,
      page, pageSize,
    }).then(res => { setItems(res.items); setTotal(res.total); setLoading(false) })
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, hang, nguon, page])

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          <Btn small onClick={() => setShowCreate(true)}><Plus size={13} strokeWidth={2} /> Thêm khách hàng</Btn>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <ErrorBox message={deleteError} />
        <FilterBar>
          <SearchInput placeholder="Tìm theo tên, số điện thoại hoặc email..." width="w-64" value={q} onChange={v => { setQ(v); setPage(1) }} />
          <Select placeholder="Hạng khách hàng" options={Object.values(customerTierLabel)} value={hang} onChange={v => { setHang(v); setPage(1) }} />
          <Select placeholder="Nguồn khách hàng" options={Object.values(salesChannelLabel)} value={nguon} onChange={v => { setNguon(v); setPage(1) }} />
        </FilterBar>
        {loading ? <Spinner /> : (
          <Table
            cols={['Thao tác', 'Khách hàng', 'SĐT', 'Email', 'Điểm tích lũy', 'Hạng', 'Nguồn khách']}
            rows={items.map(c => [
              <div className="flex gap-1">
                <TinyBtn title="Xem" onClick={() => onDetail(c.id)}><Eye size={12} strokeWidth={1.75} /></TinyBtn>
                <TinyBtn danger title="Xóa" onClick={() => handleDelete(c)}><Trash2 size={12} strokeWidth={1.75} /></TinyBtn>
              </div>,
              <button onClick={() => onDetail(c.id)} className="block max-w-[140px] truncate font-semibold text-slate-800 hover:underline cursor-pointer text-left" title={c.hoTen}>{c.hoTen}</button>,
              c.sdt, c.email || '—',
              <span className="font-semibold" style={{ color: '#1a56db' }}>{c.diemTichLuy}</span>,
              <Badge label={customerTierLabel[c.hangKhachHang]} />,
              <Badge label={salesChannelLabel[c.nguonKhachHang]} />,
            ])}
          />
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </div>

      {showCreate && <NewCustomerModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); reload() }} />}
    </div>
  )
}
