import { useEffect, useState } from 'react'
import { Package, Plus } from 'lucide-react'
import { Btn, FilterBar, SearchInput, Select, Table, Pagination, TinyBtn, Badge, Spinner, Modal, Field, Input, ErrorBox } from '../components/ui'
import { api, ApiError, type Product, type ProductStatus } from '../lib/api'
import { productStatusLabel, reverseLookup } from '../lib/labels'

export function ProductsScreen({ onDetail }: { onDetail: (id: string) => void }) {
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [danhMuc, setDanhMuc] = useState('')
  const [trangThai, setTrangThai] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const pageSize = 10

  function reload() {
    setLoading(true)
    api.products.list({
      q: q || undefined,
      danhMuc: danhMuc || undefined,
      trangThai: (reverseLookup(productStatusLabel, trangThai) as ProductStatus) || undefined,
      page, pageSize,
    }).then(res => {
      setItems(res.items)
      setTotal(res.total)
      setLoading(false)
    })
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, danhMuc, trangThai, page])

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          <Btn small onClick={() => setShowCreate(true)}><Plus size={13} strokeWidth={2} /> Thêm sản phẩm</Btn>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <FilterBar>
          <SearchInput placeholder="Tìm theo tên sản phẩm, SKU hoặc barcode..." width="w-64" value={q} onChange={v => { setQ(v); setPage(1) }} />
          <Select placeholder="Trạng thái" options={Object.values(productStatusLabel)} value={trangThai} onChange={v => { setTrangThai(v); setPage(1) }} />
        </FilterBar>
        {loading ? <Spinner /> : (
          <Table
            cols={['Ảnh', 'SKU', 'Tên sản phẩm', 'Danh mục', 'Nhà cung cấp', 'Giá vốn', 'Giá bán', 'Tồn kho', 'Đã bán', 'Trạng thái', 'Thao tác']}
            rows={items.map(p => [
              <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex-shrink-0"><Package size={16} className="m-auto mt-1 text-slate-300" strokeWidth={1.5} /></div>,
              <span className="font-mono text-[10px] font-semibold text-slate-600">{p.sku}</span>,
              <button onClick={() => onDetail(p.id)} className="font-medium text-slate-800 hover:underline cursor-pointer text-left max-w-36 truncate block">{p.ten}</button>,
              p.danhMuc, p.nhaCungCap, `${p.giaVon.toLocaleString('vi-VN')} VNĐ`, `${p.giaBan.toLocaleString('vi-VN')} VNĐ`,
              <span className={`font-bold ${p.tonKho === 0 ? 'text-red-500' : p.tonKho <= p.tonKhoToiThieu ? 'text-amber-600' : 'text-slate-800'}`}>{p.tonKho}</span>,
              p.daBan, <Badge label={productStatusLabel[p.trangThai]} />,
              <TinyBtn onClick={() => onDetail(p.id)}>Xem</TinyBtn>,
            ])}
          />
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </div>

      {showCreate && <CreateProductModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); reload() }} />}
    </div>
  )
}

function CreateProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [sku, setSku] = useState('')
  const [ten, setTen] = useState('')
  const [danhMuc, setDanhMuc] = useState('')
  const [nhaCungCap, setNhaCungCap] = useState('')
  const [giaVon, setGiaVon] = useState(0)
  const [giaBan, setGiaBan] = useState(0)
  const [tonKho, setTonKho] = useState(0)
  const [tonKhoToiThieu, setTonKhoToiThieu] = useState(5)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!sku || !ten || !danhMuc || !nhaCungCap) { setError('Vui lòng nhập đầy đủ SKU, tên, danh mục, nhà cung cấp.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await api.products.create({ sku, ten, danhMuc, nhaCungCap, giaVon, giaBan, tonKho, tonKhoToiThieu })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo sản phẩm.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Thêm sản phẩm mới" onClose={onClose}>
      <ErrorBox message={error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU"><Input value={sku} onChange={e => setSku(e.target.value)} placeholder="LEGO-60320" /></Field>
        <Field label="Tên sản phẩm"><Input value={ten} onChange={e => setTen(e.target.value)} /></Field>
        <Field label="Danh mục"><Input value={danhMuc} onChange={e => setDanhMuc(e.target.value)} placeholder="LEGO" /></Field>
        <Field label="Nhà cung cấp"><Input value={nhaCungCap} onChange={e => setNhaCungCap(e.target.value)} /></Field>
        <Field label="Giá vốn"><Input type="number" min={0} value={giaVon} onChange={e => setGiaVon(Number(e.target.value))} /></Field>
        <Field label="Giá bán"><Input type="number" min={0} value={giaBan} onChange={e => setGiaBan(Number(e.target.value))} /></Field>
        <Field label="Tồn kho ban đầu"><Input type="number" min={0} value={tonKho} onChange={e => setTonKho(Number(e.target.value))} /></Field>
        <Field label="Ngưỡng tồn tối thiểu"><Input type="number" min={0} value={tonKhoToiThieu} onChange={e => setTonKhoToiThieu(Number(e.target.value))} /></Field>
      </div>
      <div className="flex gap-2 mt-2">
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu sản phẩm'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>
    </Modal>
  )
}
