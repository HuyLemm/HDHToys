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

/**
 * Cho tạo nhiều sản phẩm trong 1 lượt, kiểu tab trình duyệt: mỗi sản phẩm
 * đang nhập dở là 1 tab riêng, bấm "+" mở tab mới trống, bấm qua lại các tab
 * cũ vẫn xem/sửa được bình thường — không bắt phải điền xong 1 cái mới được
 * mở cái tiếp theo. "Tạo tất cả" validate rồi gửi lần lượt từng tab.
 */
function CreateProductModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [drafts, setDrafts] = useState<ProductDraft[]>([emptyProductDraft()])
  const [activeIndex, setActiveIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const active = drafts[activeIndex]

  function update(patch: Partial<ProductDraft>) {
    setDrafts(prev => prev.map((d, i) => i === activeIndex ? { ...d, ...patch } : d))
  }

  function handleAddTab() {
    setDrafts(prev => [...prev, emptyProductDraft()])
    setActiveIndex(drafts.length)
    setError(null)
  }

  function handleCloseTab(index: number) {
    if (drafts.length === 1) return
    setDrafts(prev => prev.filter((_, i) => i !== index))
    setActiveIndex(prev => {
      if (index < prev) return prev - 1
      if (index === prev) return Math.max(0, prev - (index === drafts.length - 1 ? 1 : 0))
      return prev
    })
  }

  async function handleSubmitAll() {
    for (let i = 0; i < drafts.length; i++) {
      const err = validateProductDraft(drafts[i])
      if (err) { setActiveIndex(i); setError(drafts.length > 1 ? `Sản phẩm ở tab ${i + 1}: ${err}` : err); return }
    }

    setError(null)
    setSubmitting(true)
    try {
      for (const d of drafts) {
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
      <div className="flex items-center gap-1 mb-3 border-b border-slate-200">
        <div className="flex items-center min-w-0 flex-1">
          {drafts.map((d, i) => (
            <button key={i} onClick={() => setActiveIndex(i)}
              className={`flex items-center gap-1.5 px-2.5 py-2 text-xs border-b-2 cursor-pointer transition-colors min-w-0 flex-1 max-w-[160px] ${i === activeIndex ? 'border-blue-600 text-blue-700 font-medium' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <span className="truncate">{d.ten || d.sku || `Sản phẩm ${i + 1}`}</span>
              {drafts.length > 1 && (
                <span onClick={e => { e.stopPropagation(); handleCloseTab(i) }} className="hover:text-red-500 cursor-pointer flex-shrink-0">✕</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={handleAddTab} disabled={submitting} title="Thêm sản phẩm khác"
          className="px-2 py-2 text-slate-400 hover:text-slate-700 cursor-pointer flex-shrink-0">
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>
      <ErrorBox message={error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="SKU" required><Input value={active.sku} onChange={e => update({ sku: e.target.value })} placeholder="LEGO-60320" /></Field>
        <Field label="Tên sản phẩm" required><Input value={active.ten} onChange={e => update({ ten: e.target.value })} /></Field>
        <Field label="Danh mục" required><Input value={active.danhMuc} onChange={e => update({ danhMuc: e.target.value })} placeholder="LEGO" /></Field>
        <Field label="Nhà cung cấp" required><Input value={active.nhaCungCap} onChange={e => update({ nhaCungCap: e.target.value })} /></Field>
        <Field label="Giá vốn" required><Input type="number" min={0} value={active.giaVon === 0 ? '' : active.giaVon} onChange={e => update({ giaVon: Number(e.target.value) })} /></Field>
        <Field label="Phí vận chuyển"><Input type="number" min={0} value={active.phiVanChuyen === 0 ? '' : active.phiVanChuyen} onChange={e => update({ phiVanChuyen: Number(e.target.value) })} /></Field>
        <Field label="Giá bán" required><Input type="number" min={0} value={active.giaBan === 0 ? '' : active.giaBan} onChange={e => update({ giaBan: Number(e.target.value) })} /></Field>
        <Field label="Tồn kho ban đầu"><Input type="number" min={0} value={active.tonKho === 0 ? '' : active.tonKho} onChange={e => update({ tonKho: Number(e.target.value) })} /></Field>
        <Field label="Ngưỡng tồn tối thiểu"><Input type="number" min={0} value={active.tonKhoToiThieu === 0 ? '' : active.tonKhoToiThieu} onChange={e => update({ tonKhoToiThieu: Number(e.target.value) })} /></Field>
        <Field label="Loại sản phẩm" required>
          <Select placeholder="Loại sản phẩm" options={['Có sẵn', 'Pre-order']} value={loaiSanPhamLabel[active.loaiSanPham]}
            onChange={v => update({ loaiSanPham: v === 'Pre-order' ? 'PRE_ORDER' : 'CO_SAN' })} />
        </Field>
        {active.loaiSanPham === 'PRE_ORDER' && (
          <Field label="Thời gian hàng về (dự kiến)">
            <Input type="date" value={active.ngayDuKienVe} onChange={e => update({ ngayDuKienVe: e.target.value })} />
          </Field>
        )}
      </div>
      <div className="text-xs text-slate-500 mb-2 flex justify-between px-1">
        <span>Tổng giá vốn (giá vốn + phí vận chuyển)</span>
        <span className="font-semibold text-slate-800">{(active.giaVon + active.phiVanChuyen).toLocaleString('vi-VN')} VNĐ</span>
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        <Btn onClick={handleSubmitAll} disabled={submitting}>{submitting ? 'Đang lưu...' : drafts.length > 1 ? `Tạo tất cả (${drafts.length})` : 'Lưu sản phẩm'}</Btn>
        <Btn variant="secondary" onClick={onClose} disabled={submitting}>Hủy</Btn>
      </div>
    </Modal>
  )
}
