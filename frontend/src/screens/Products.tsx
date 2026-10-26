import { useEffect, useState } from 'react'
import { Plus, Eye, Trash2 } from 'lucide-react'
import { Btn, FilterBar, SearchInput, Select, Table, Pagination, TinyBtn, Badge, Spinner, Modal, Field, Input, ErrorBox } from '../components/ui'
import { api, ApiError, type LoaiSanPham, type Product, type ProductStatus } from '../lib/api'
import { loaiSanPhamLabel, productStatusLabel, reverseLookup } from '../lib/labels'
import { useDialog } from '../lib/dialog'
import { useScreenState } from '../lib/screenState'
import { ProductThumb } from './ProductDetail'

export function ProductsScreen({ onDetail }: { onDetail: (id: string) => void }) {
  const dialog = useDialog()
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useScreenState('products.page', 1)
  const [q, setQ] = useScreenState('products.q', '')
  const [danhMuc, setDanhMuc] = useScreenState('products.danhMuc', '')
  const [trangThai, setTrangThai] = useScreenState('products.trangThai', '')
  const [loaiSanPham, setLoaiSanPham] = useScreenState('products.loaiSanPham', '')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const pageSize = 10

  async function handleDelete(p: Product) {
    if (!(await dialog.confirm(`Xóa sản phẩm "${p.ten}"? Toàn bộ lịch sử nhập/xuất kho của sản phẩm này cũng sẽ bị xóa theo. Không thể hoàn tác.`))) return
    setDeleteError(null)
    try {
      await api.products.delete(p.id)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể xóa sản phẩm.')
    }
  }

  function reload() {
    setLoading(true)
    api.products.list({
      q: q || undefined,
      danhMuc: danhMuc || undefined,
      trangThai: (reverseLookup(productStatusLabel, trangThai) as ProductStatus) || undefined,
      loaiSanPham: (reverseLookup(loaiSanPhamLabel, loaiSanPham) as LoaiSanPham) || undefined,
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
  }, [q, danhMuc, trangThai, loaiSanPham, page])

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div />
        <div className="flex gap-2">
          <Btn small onClick={() => setShowCreate(true)}><Plus size={13} strokeWidth={2} /> Thêm sản phẩm</Btn>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <ErrorBox message={deleteError} />
        <FilterBar>
          <SearchInput placeholder="Tìm theo tên sản phẩm, SKU hoặc barcode..." width="w-64" value={q} onChange={v => { setQ(v); setPage(1) }} />
          <Select placeholder="Trạng thái" options={Object.values(productStatusLabel)} value={trangThai} onChange={v => { setTrangThai(v); setPage(1) }} />
          <Select placeholder="Loại sản phẩm" options={Object.values(loaiSanPhamLabel)} value={loaiSanPham} onChange={v => { setLoaiSanPham(v); setPage(1) }} />
        </FilterBar>
        {loading ? <Spinner /> : (
          <Table
            cols={['Thao tác', 'Ảnh', 'SKU', 'Tên sản phẩm', 'Danh mục', 'Nhà cung cấp', 'Giá vốn', 'Giá bán', 'Tồn kho', 'Đã bán', 'Loại', 'Trạng thái']}
            rows={items.map(p => [
              <div className="flex gap-1">
                <TinyBtn title="Xem" onClick={() => onDetail(p.id)}><Eye size={12} strokeWidth={1.75} /></TinyBtn>
                <TinyBtn danger title="Xóa" onClick={() => handleDelete(p)}><Trash2 size={12} strokeWidth={1.75} /></TinyBtn>
              </div>,
              <ProductThumb productId={p.id} />,
              <span className="font-mono text-[10px] font-semibold text-slate-600">{p.sku}</span>,
              <button onClick={() => onDetail(p.id)} className="font-medium text-slate-800 hover:underline cursor-pointer text-left max-w-36 truncate block">{p.ten}</button>,
              p.danhMuc, p.nhaCungCap, `${p.giaVon.toLocaleString('vi-VN')} VNĐ`, `${p.giaBan.toLocaleString('vi-VN')} VNĐ`,
              <span className={`font-bold ${p.tonKho === 0 ? 'text-red-500' : p.tonKho <= p.tonKhoToiThieu ? 'text-amber-600' : 'text-slate-800'}`}>{p.tonKho}</span>,
              p.daBan, <Badge label={loaiSanPhamLabel[p.loaiSanPham]} />, <Badge label={productStatusLabel[p.trangThai]} />,
            ])}
          />
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </div>

      {showCreate && <CreateProductModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); reload() }} />}
    </div>
  )
}

interface ProductDraft {
  sku: string; ten: string; danhMuc: string; nhaCungCap: string
  giaVon: number; phiVanChuyen: number; giaBan: number; tonKho: number; tonKhoToiThieu: number
  loaiSanPham: LoaiSanPham; ngayDuKienVe: string
}

function emptyProductDraft(): ProductDraft {
  return {
    sku: '', ten: '', danhMuc: '', nhaCungCap: '',
    giaVon: 0, phiVanChuyen: 0, giaBan: 0, tonKho: 0, tonKhoToiThieu: 5,
    loaiSanPham: 'CO_SAN', ngayDuKienVe: '',
  }
}

function validateProductDraft(d: ProductDraft): string | null {
  if (!d.sku || !d.ten || !d.danhMuc || !d.nhaCungCap) return 'Vui lòng nhập đầy đủ SKU, tên, danh mục, nhà cung cấp.'
  if (d.giaVon <= 0 || d.giaBan <= 0) return 'Giá vốn và giá bán phải lớn hơn 0.'
  return null
}

function isDraftEmpty(d: ProductDraft) {
  return !d.sku && !d.ten && !d.danhMuc && !d.nhaCungCap && d.giaVon === 0 && d.giaBan === 0
}

/**
 * Cho tạo nhiều sản phẩm trong 1 lượt — bấm "Thêm sản phẩm khác" để đưa sản
 * phẩm đang nhập vào danh sách chờ rồi mở form trống tiếp, thay vì phải lưu
 * xong, đóng modal, mở lại modal mới cho từng sản phẩm một. "Tạo tất cả" gửi
 * lần lượt từng sản phẩm đã chờ (gộp luôn sản phẩm đang nhập dở nếu có).
 */
function CreateProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [current, setCurrent] = useState<ProductDraft>(emptyProductDraft())
  const [staged, setStaged] = useState<ProductDraft[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function update(patch: Partial<ProductDraft>) {
    setCurrent(prev => ({ ...prev, ...patch }))
  }

  function handleAddAnother() {
    const err = validateProductDraft(current)
    if (err) { setError(err); return }
    setError(null)
    setStaged(prev => [...prev, current])
    setCurrent(emptyProductDraft())
  }

  function handleRemoveStaged(index: number) {
    setStaged(prev => prev.filter((_, i) => i !== index))
  }

  const currentHasData = !isDraftEmpty(current)
  const totalCount = staged.length + (currentHasData ? 1 : 0)

  async function handleSubmitAll() {
    let all = staged
    if (currentHasData) {
      const err = validateProductDraft(current)
      if (err) { setError(err); return }
      all = [...staged, current]
    }
    if (all.length === 0) { setError('Vui lòng nhập ít nhất một sản phẩm.'); return }

    setError(null)
    setSubmitting(true)
    try {
      for (const d of all) {
        await api.products.create({
          sku: d.sku, ten: d.ten, danhMuc: d.danhMuc, nhaCungCap: d.nhaCungCap,
          giaVon: d.giaVon, phiVanChuyen: d.phiVanChuyen, giaBan: d.giaBan, tonKho: d.tonKho, tonKhoToiThieu: d.tonKhoToiThieu,
          loaiSanPham: d.loaiSanPham,
          ngayDuKienVe: d.loaiSanPham === 'PRE_ORDER' && d.ngayDuKienVe ? new Date(d.ngayDuKienVe).toISOString() : undefined,
        })
      }
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo sản phẩm.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Thêm sản phẩm mới" onClose={onClose} width="max-w-lg">
      <ErrorBox message={error} />
      {staged.length > 0 && (
        <div className="mb-3 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-32 overflow-y-auto">
          {staged.map((d, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs">
              <span className="truncate"><span className="font-semibold text-slate-800">{d.ten || '(chưa đặt tên)'}</span> <span className="text-slate-400 font-mono">({d.sku || '—'})</span></span>
              <button onClick={() => handleRemoveStaged(i)} className="text-slate-400 hover:text-red-500 cursor-pointer flex-shrink-0 ml-2">✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU" required><Input value={current.sku} onChange={e => update({ sku: e.target.value })} placeholder="LEGO-60320" /></Field>
        <Field label="Tên sản phẩm" required><Input value={current.ten} onChange={e => update({ ten: e.target.value })} /></Field>
        <Field label="Danh mục" required><Input value={current.danhMuc} onChange={e => update({ danhMuc: e.target.value })} placeholder="LEGO" /></Field>
        <Field label="Nhà cung cấp" required><Input value={current.nhaCungCap} onChange={e => update({ nhaCungCap: e.target.value })} /></Field>
        <Field label="Giá vốn" required><Input type="number" min={0} value={current.giaVon === 0 ? '' : current.giaVon} onChange={e => update({ giaVon: Number(e.target.value) })} /></Field>
        <Field label="Phí vận chuyển"><Input type="number" min={0} value={current.phiVanChuyen === 0 ? '' : current.phiVanChuyen} onChange={e => update({ phiVanChuyen: Number(e.target.value) })} /></Field>
        <Field label="Giá bán" required><Input type="number" min={0} value={current.giaBan === 0 ? '' : current.giaBan} onChange={e => update({ giaBan: Number(e.target.value) })} /></Field>
        <Field label="Tồn kho ban đầu"><Input type="number" min={0} value={current.tonKho === 0 ? '' : current.tonKho} onChange={e => update({ tonKho: Number(e.target.value) })} /></Field>
        <Field label="Ngưỡng tồn tối thiểu"><Input type="number" min={0} value={current.tonKhoToiThieu === 0 ? '' : current.tonKhoToiThieu} onChange={e => update({ tonKhoToiThieu: Number(e.target.value) })} /></Field>
        <Field label="Loại sản phẩm" required>
          <Select placeholder="Loại sản phẩm" options={['Có sẵn', 'Pre-order']} value={loaiSanPhamLabel[current.loaiSanPham]}
            onChange={v => update({ loaiSanPham: v === 'Pre-order' ? 'PRE_ORDER' : 'CO_SAN' })} />
        </Field>
        {current.loaiSanPham === 'PRE_ORDER' && (
          <Field label="Thời gian hàng về (dự kiến)">
            <Input type="date" value={current.ngayDuKienVe} onChange={e => update({ ngayDuKienVe: e.target.value })} />
          </Field>
        )}
      </div>
      <div className="text-xs text-slate-500 mb-2 flex justify-between px-1">
        <span>Tổng giá vốn (giá vốn + phí vận chuyển)</span>
        <span className="font-semibold text-slate-800">{(current.giaVon + current.phiVanChuyen).toLocaleString('vi-VN')} VNĐ</span>
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        <Btn variant="secondary" small onClick={handleAddAnother} disabled={submitting}><Plus size={13} strokeWidth={2} /> Thêm sản phẩm khác</Btn>
        <Btn onClick={handleSubmitAll} disabled={submitting}>{submitting ? 'Đang lưu...' : totalCount > 1 ? `Tạo tất cả (${totalCount})` : 'Lưu sản phẩm'}</Btn>
        <Btn variant="secondary" onClick={onClose} disabled={submitting}>Hủy</Btn>
      </div>
    </Modal>
  )
}
