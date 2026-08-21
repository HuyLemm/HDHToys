import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Btn, FilterBar, SearchInput, Select, Table, Pagination, TinyBtn, Badge, Spinner, Modal, Field, Input, ErrorBox } from '../components/ui'
import { api, ApiError, type LoaiSanPham, type Product, type ProductStatus } from '../lib/api'
import { loaiSanPhamLabel, productStatusLabel, reverseLookup } from '../lib/labels'
import { useDialog } from '../lib/dialog'
import { ProductThumb } from './ProductDetail'

export function ProductsScreen({ onDetail }: { onDetail: (id: string) => void }) {
  const dialog = useDialog()
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [danhMuc, setDanhMuc] = useState('')
  const [trangThai, setTrangThai] = useState('')
  const [loaiSanPham, setLoaiSanPham] = useState('')
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
            cols={['Ảnh', 'SKU', 'Tên sản phẩm', 'Danh mục', 'Nhà cung cấp', 'Giá vốn', 'Giá bán', 'Tồn kho', 'Đã bán', 'Loại', 'Trạng thái', 'Thao tác']}
            rows={items.map(p => [
              <ProductThumb productId={p.id} />,
              <span className="font-mono text-[10px] font-semibold text-slate-600">{p.sku}</span>,
              <button onClick={() => onDetail(p.id)} className="font-medium text-slate-800 hover:underline cursor-pointer text-left max-w-36 truncate block">{p.ten}</button>,
              p.danhMuc, p.nhaCungCap, `${p.giaVon.toLocaleString('vi-VN')} VNĐ`, `${p.giaBan.toLocaleString('vi-VN')} VNĐ`,
              <span className={`font-bold ${p.tonKho === 0 ? 'text-red-500' : p.tonKho <= p.tonKhoToiThieu ? 'text-amber-600' : 'text-slate-800'}`}>{p.tonKho}</span>,
              p.daBan, <Badge label={loaiSanPhamLabel[p.loaiSanPham]} />, <Badge label={productStatusLabel[p.trangThai]} />,
              <div className="flex gap-1">
                <TinyBtn onClick={() => onDetail(p.id)}>Xem</TinyBtn>
                <TinyBtn danger onClick={() => handleDelete(p)}>Xóa</TinyBtn>
              </div>,
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
  const [phiVanChuyen, setPhiVanChuyen] = useState(0)
  const [giaBan, setGiaBan] = useState(0)
  const [tonKho, setTonKho] = useState(0)
  const [tonKhoToiThieu, setTonKhoToiThieu] = useState(5)
  const [loaiSanPham, setLoaiSanPham] = useState<LoaiSanPham>('CO_SAN')
  const [ngayDuKienVe, setNgayDuKienVe] = useState('')
  const [nhacHang, setNhacHang] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!sku || !ten || !danhMuc || !nhaCungCap) { setError('Vui lòng nhập đầy đủ SKU, tên, danh mục, nhà cung cấp.'); return }
    if (giaVon <= 0 || giaBan <= 0) { setError('Giá vốn và giá bán phải lớn hơn 0.'); return }
    if (loaiSanPham === 'PRE_ORDER' && !ngayDuKienVe) { setError('Sản phẩm Pre-order cần nhập ngày dự kiến hàng về.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await api.products.create({
        sku, ten, danhMuc, nhaCungCap, giaVon, phiVanChuyen, giaBan, tonKho, tonKhoToiThieu,
        loaiSanPham,
        ngayDuKienVe: loaiSanPham === 'PRE_ORDER' && ngayDuKienVe ? new Date(ngayDuKienVe).toISOString() : undefined,
        nhacHang: loaiSanPham === 'PRE_ORDER' ? nhacHang : undefined,
      })
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
        <Field label="SKU" required><Input value={sku} onChange={e => setSku(e.target.value)} placeholder="LEGO-60320" /></Field>
        <Field label="Tên sản phẩm" required><Input value={ten} onChange={e => setTen(e.target.value)} /></Field>
        <Field label="Danh mục" required><Input value={danhMuc} onChange={e => setDanhMuc(e.target.value)} placeholder="LEGO" /></Field>
        <Field label="Nhà cung cấp" required><Input value={nhaCungCap} onChange={e => setNhaCungCap(e.target.value)} /></Field>
        <Field label="Giá vốn" required><Input type="number" min={0} value={giaVon === 0 ? '' : giaVon} onChange={e => setGiaVon(Number(e.target.value))} /></Field>
        <Field label="Phí vận chuyển"><Input type="number" min={0} value={phiVanChuyen === 0 ? '' : phiVanChuyen} onChange={e => setPhiVanChuyen(Number(e.target.value))} /></Field>
        <Field label="Giá bán" required><Input type="number" min={0} value={giaBan === 0 ? '' : giaBan} onChange={e => setGiaBan(Number(e.target.value))} /></Field>
        <Field label="Tồn kho ban đầu"><Input type="number" min={0} value={tonKho === 0 ? '' : tonKho} onChange={e => setTonKho(Number(e.target.value))} /></Field>
        <Field label="Ngưỡng tồn tối thiểu"><Input type="number" min={0} value={tonKhoToiThieu === 0 ? '' : tonKhoToiThieu} onChange={e => setTonKhoToiThieu(Number(e.target.value))} /></Field>
        <Field label="Loại sản phẩm" required>
          <Select placeholder="Loại sản phẩm" options={['Có sẵn', 'Pre-order']} value={loaiSanPhamLabel[loaiSanPham]}
            onChange={v => setLoaiSanPham(v === 'Pre-order' ? 'PRE_ORDER' : 'CO_SAN')} />
        </Field>
        {loaiSanPham === 'PRE_ORDER' && (
          <Field label="Thời gian hàng về (dự kiến)" required>
            <Input type="date" value={ngayDuKienVe} onChange={e => setNgayDuKienVe(e.target.value)} />
          </Field>
        )}
      </div>
      {loaiSanPham === 'PRE_ORDER' && (
        <label className="flex items-center gap-2 text-xs text-slate-600 mb-2 px-1 cursor-pointer">
          <input type="checkbox" checked={nhacHang} onChange={e => setNhacHang(e.target.checked)} />
          Nhắc khi tới/qua ngày dự kiến hàng về (hiện cảnh báo ở Tổng quan)
        </label>
      )}
      <div className="text-xs text-slate-500 mb-2 flex justify-between px-1">
        <span>Tổng giá vốn (giá vốn + phí vận chuyển)</span>
        <span className="font-semibold text-slate-800">{(giaVon + phiVanChuyen).toLocaleString('vi-VN')} VNĐ</span>
      </div>
      <div className="flex gap-2 mt-2">
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu sản phẩm'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>
    </Modal>
  )
}
