import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Btn, FilterBar, SearchInput, Select, Table, Pagination, Spinner, Modal, Field, Input, ErrorBox, TinyBtn } from '../components/ui'
import { api, ApiError, type IncomeExpense, type RangeKey, type TransactionKind, type IncomeExpenseCategory } from '../lib/api'
import { incomeExpenseCategoryLabel, transactionKindLabel, reverseLookup } from '../lib/labels'
import { useDialog } from '../lib/dialog'

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'hom_nay', label: 'Hôm nay' },
  { key: '7_ngay', label: '7 ngày' },
  { key: '30_ngay', label: '30 ngày' },
  { key: 'thang_nay', label: 'Tháng này' },
]

export function ThuChiScreen() {
  const dialog = useDialog()
  const [range, setRange] = useState<RangeKey>('30_ngay')
  const [items, setItems] = useState<IncomeExpense[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loai, setLoai] = useState('')
  const [danhMuc, setDanhMuc] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<{ tongThu: number; tongChi: number; dongTienRong: number } | null>(null)
  const [modal, setModal] = useState<TransactionKind | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const pageSize = 10

  async function handleDelete(t: IncomeExpense) {
    if (!(await dialog.confirm(`Xóa phiếu "${t.maPhieu}"? Không thể hoàn tác.`))) return
    setDeleteError(null)
    try {
      await api.incomeExpense.delete(t.id)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể xóa phiếu.')
    }
  }

  function reload() {
    setLoading(true)
    api.incomeExpense.list({
      q: q || undefined,
      range,
      loai: (reverseLookup(transactionKindLabel, loai) as TransactionKind) || undefined,
      danhMuc: (reverseLookup(incomeExpenseCategoryLabel, danhMuc) as IncomeExpenseCategory) || undefined,
      page, pageSize,
    }).then(res => {
      setItems(res.items); setTotal(res.total); setLoading(false)
    })
    api.incomeExpense.summary({ range }).then(setSummary)
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, loai, danhMuc, q, page])

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {RANGE_OPTIONS.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`text-xs px-2.5 py-1.5 rounded cursor-pointer transition-colors border ${range === r.key ? 'text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              style={range === r.key ? { background: '#1a56db' } : undefined}>{r.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <Btn small onClick={() => setModal('THU')}>+ Phiếu thu</Btn>
          <Btn variant="danger" small onClick={() => setModal('CHI')}>+ Phiếu chi</Btn>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Tổng thu</div><div className="text-sm font-bold mt-1 text-emerald-600">{summary.tongThu.toLocaleString('vi-VN')} VNĐ</div></div>
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Tổng chi</div><div className="text-sm font-bold mt-1 text-red-500">{summary.tongChi.toLocaleString('vi-VN')} VNĐ</div></div>
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Dòng tiền ròng</div><div className="text-sm font-bold mt-1">{summary.dongTienRong.toLocaleString('vi-VN')} VNĐ</div></div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <ErrorBox message={deleteError} />
        <FilterBar>
          <Select placeholder="Loại" options={Object.values(transactionKindLabel)} value={loai} onChange={v => { setLoai(v); setPage(1) }} />
          <Select placeholder="Danh mục" options={Object.values(incomeExpenseCategoryLabel)} value={danhMuc} onChange={v => { setDanhMuc(v); setPage(1) }} />
          <SearchInput placeholder="Tìm nội dung hoặc mã phiếu..." value={q} onChange={v => { setQ(v); setPage(1) }} />
        </FilterBar>
        {loading ? <Spinner /> : items.length === 0 ? (
          <div className="text-xs text-slate-400 py-12 text-center">Chưa có phiếu thu/chi nào</div>
        ) : (
          <Table
            cols={['Thao tác', 'Ngày', 'Mã phiếu', 'Loại', 'Danh mục', 'Nội dung', 'Số tiền', 'Người tạo']}
            rows={items.map(t => [
              <TinyBtn danger title="Xóa" onClick={() => handleDelete(t)}><Trash2 size={12} strokeWidth={1.75} /></TinyBtn>,
              new Date(t.createdAt).toLocaleDateString('vi-VN'),
              <span className="font-mono text-[10px] font-semibold text-slate-700">{t.maPhieu}</span>,
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${t.loai === 'THU' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{transactionKindLabel[t.loai]}</span>,
              incomeExpenseCategoryLabel[t.danhMuc], t.noiDung,
              <span className={`font-bold text-xs ${t.loai === 'THU' ? 'text-emerald-600' : 'text-red-500'}`}>{t.loai === 'THU' ? '+' : '-'}{t.soTien.toLocaleString('vi-VN')} VNĐ</span>,
              <span className="block max-w-[140px] truncate" title={t.nguoiTao.hoTen}>{t.nguoiTao.hoTen}</span>,
            ])}
          />
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </div>

      {modal && <CreateTransactionModal loai={modal} onClose={() => setModal(null)} onCreated={() => { setModal(null); reload() }} />}
    </div>
  )
}

function CreateTransactionModal({ loai, onClose, onCreated }: { loai: TransactionKind; onClose: () => void; onCreated: () => void }) {
  const [danhMuc, setDanhMuc] = useState<IncomeExpenseCategory>('KHAC')
  const [noiDung, setNoiDung] = useState('')
  const [soTien, setSoTien] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!noiDung || soTien <= 0) { setError('Vui lòng nhập nội dung và số tiền hợp lệ.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await api.incomeExpense.create({ loai, danhMuc, noiDung, soTien })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo phiếu.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={loai === 'THU' ? 'Tạo phiếu thu' : 'Tạo phiếu chi'} onClose={onClose}>
      <ErrorBox message={error} />
      <Field label="Danh mục">
        <select value={danhMuc} onChange={e => setDanhMuc(e.target.value as IncomeExpenseCategory)} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white">
          {Object.entries(incomeExpenseCategoryLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Nội dung"><Input value={noiDung} onChange={e => setNoiDung(e.target.value)} /></Field>
      <Field label="Số tiền"><Input type="number" min={1} value={soTien === 0 ? '' : soTien} onChange={e => setSoTien(Number(e.target.value))} /></Field>
      <div className="flex gap-2 mt-2">
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu phiếu'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>
    </Modal>
  )
}
