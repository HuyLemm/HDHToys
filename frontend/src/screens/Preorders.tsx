import { useEffect, useState } from 'react'
import { Plus, Search, Eye, Trash2 } from 'lucide-react'
import { Btn, FilterBar, SearchInput, Select, Table, Pagination, TinyBtn, Badge, Spinner, KpiCard, Modal, Field, Input, ErrorBox } from '../components/ui'
import { api, ApiError, type Customer, type Preorder, type PreorderStatus, type Product } from '../lib/api'
import { preorderStatusLabel, reverseLookup } from '../lib/labels'
import { useDialog } from '../lib/dialog'
import { NewCustomerModal } from './CreateOrder'

export function PreordersScreen({ onDetail }: { onDetail: (id: string) => void }) {
  const dialog = useDialog()
  const [items, setItems] = useState<Preorder[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [trangThai, setTrangThai] = useState('')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof api.preorders.summary>> | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const pageSize = 10

  async function handleDelete(p: Preorder) {
    const warning = p.trangThai === 'DA_CHUYEN_DON'
      ? `Xóa đơn đặt trước "${p.ma}"? Đơn hàng thật đã tạo ra từ đơn này vẫn được giữ nguyên, chỉ mất bản ghi đặt trước. Không thể hoàn tác.`
      : `Xóa đơn đặt trước "${p.ma}"? Không thể hoàn tác.`
    if (!(await dialog.confirm(warning))) return
    setDeleteError(null)
    try {
      await api.preorders.delete(p.id)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể xóa đơn đặt trước.')
    }
  }

  function reload() {
    setLoading(true)
    api.preorders.list({
      q: q || undefined,
      trangThai: (reverseLookup(preorderStatusLabel, trangThai) as PreorderStatus) || undefined,
      page,
      pageSize,
    }).then(res => { setItems(res.items); setTotal(res.total); setLoading(false) })
    api.preorders.summary().then(setSummary)
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, trangThai, page])

  return (
    <div className="p-5 space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KpiCard label="Đang chờ hàng" value={String(summary.dangChoHang)} />
          <KpiCard label="Sẵn sàng giao" value={String(summary.sanSangGiao)} />
          <KpiCard label="Tổng tiền cọc đang giữ" value={`${summary.tongTienCocDangGiu.toLocaleString('vi-VN')} VNĐ`} />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div />
        <Btn small onClick={() => setShowCreate(true)}><Plus size={13} strokeWidth={2} /> Tạo đặt trước</Btn>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <ErrorBox message={deleteError} />
        <FilterBar>
          <SearchInput placeholder="Tìm theo mã, tên khách hàng, sản phẩm..." width="w-64" value={q} onChange={v => { setQ(v); setPage(1) }} />
          <Select placeholder="Trạng thái" options={Object.values(preorderStatusLabel)} value={trangThai} onChange={v => { setTrangThai(v); setPage(1) }} />
        </FilterBar>

        {loading ? <Spinner /> : items.length === 0 ? (
          <div className="text-xs text-slate-400 py-8 text-center">Chưa có đơn đặt trước nào</div>
        ) : (
          <Table
            cols={['Thao tác', 'Mã', 'Khách hàng', 'Sản phẩm', 'SL', 'Giá dự kiến', 'Tiền cọc', 'Trạng thái', 'Ngày tạo']}
            rows={items.map(p => [
              <div className="flex gap-1">
                <TinyBtn title="Xem" onClick={() => onDetail(p.id)}><Eye size={12} strokeWidth={1.75} /></TinyBtn>
                <TinyBtn danger title="Xóa" onClick={() => handleDelete(p)}><Trash2 size={12} strokeWidth={1.75} /></TinyBtn>
              </div>,
              <span className="font-mono text-xs font-semibold text-slate-700">{p.ma}</span>,
              <div className="max-w-[140px]">
                <div className="font-medium text-slate-800 truncate" title={p.khachHang.hoTen}>{p.khachHang.hoTen}</div>
                <div className="text-[10px] text-slate-400 truncate" title={p.khachHang.sdt}>{p.khachHang.sdt}</div>
              </div>,
              p.product ? p.product.ten : <span>{p.tenSanPhamMoi} <span className="text-[10px] text-blue-500">(SP mới)</span></span>,
              String(p.soLuong),
              `${p.donGiaDuKien.toLocaleString('vi-VN')} VNĐ`,
              p.tienCoc > 0 ? `${p.tienCoc.toLocaleString('vi-VN')} VNĐ` : '—',
              <Badge label={preorderStatusLabel[p.trangThai]} />,
              new Date(p.createdAt).toLocaleDateString('vi-VN'),
            ])}
          />
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </div>

      {showCreate && <CreatePreorderModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); reload() }} />}
    </div>
  )
}

function CreatePreorderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)

  const [productMode, setProductMode] = useState<'existing' | 'new'>('existing')
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [tenSanPhamMoi, setTenSanPhamMoi] = useState('')

  const [soLuong, setSoLuong] = useState(1)
  const [donGiaDuKien, setDonGiaDuKien] = useState(0)
  const [tienCoc, setTienCoc] = useState(0)
  const [ngayDuKienCo, setNgayDuKienCo] = useState('')
  const [ghiChu, setGhiChu] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (customer || customerQuery.trim().length < 2) { setCustomerResults([]); return }
    const handle = setTimeout(() => { api.customers.list({ q: customerQuery, pageSize: 5 }).then(res => setCustomerResults(res.items)) }, 250)
    return () => clearTimeout(handle)
  }, [customerQuery, customer])

  useEffect(() => {
    if (product || productQuery.trim().length < 2) { setProductResults([]); return }
    const handle = setTimeout(() => { api.products.list({ q: productQuery, pageSize: 5 }).then(res => setProductResults(res.items)) }, 250)
    return () => clearTimeout(handle)
  }, [productQuery, product])

  function pickProduct(p: Product) {
    setProduct(p)
    setDonGiaDuKien(p.giaBan)
    setProductQuery('')
    setProductResults([])
  }

  async function handleSubmit() {
    if (!customer) { setError('Vui lòng chọn khách hàng.'); return }
    if (productMode === 'existing' && !product) { setError('Vui lòng chọn sản phẩm có sẵn.'); return }
    if (productMode === 'new' && !tenSanPhamMoi.trim()) { setError('Vui lòng nhập tên sản phẩm mới.'); return }
    if (soLuong < 1) { setError('Số lượng phải lớn hơn 0.'); return }
    if (tienCoc > soLuong * donGiaDuKien) { setError('Tiền cọc không được vượt quá tổng giá trị dự kiến.'); return }

    setError(null)
    setSubmitting(true)
    try {
      await api.preorders.create({
        khachHangId: customer.id,
        productId: productMode === 'existing' ? product!.id : undefined,
        tenSanPhamMoi: productMode === 'new' ? tenSanPhamMoi.trim() : undefined,
        soLuong,
        donGiaDuKien,
        tienCoc: tienCoc || undefined,
        ngayDuKienCo: ngayDuKienCo || undefined,
        ghiChu: ghiChu || undefined,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo đơn đặt trước.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Tạo đơn đặt trước" onClose={onClose}>
      <ErrorBox message={error} />

      <Field label="Khách hàng">
        {!customer ? (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                <input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400"
                  placeholder="Tìm theo tên hoặc số điện thoại..." />
              </div>
              <Btn variant="secondary" small onClick={() => setShowNewCustomer(true)}>+ Mới</Btn>
            </div>
            {customerResults.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                {customerResults.map(c => (
                  <button key={c.id} onClick={() => { setCustomer(c); setCustomerQuery('') }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs cursor-pointer">
                    <span className="font-semibold text-slate-800">{c.hoTen}</span> · {c.sdt}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between p-2 border border-blue-200 rounded-md bg-blue-50/30 text-xs">
            <span><span className="font-semibold text-slate-800">{customer.hoTen}</span> · {customer.sdt}</span>
            <button onClick={() => setCustomer(null)} className="text-slate-400 hover:text-red-500 cursor-pointer">✕</button>
          </div>
        )}
      </Field>

      <Field label="Sản phẩm">
        <div className="flex gap-3 mb-2 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={productMode === 'existing'} onChange={() => { setProductMode('existing'); setTenSanPhamMoi('') }} /> Sản phẩm có sẵn (hết/sắp hết hàng)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" checked={productMode === 'new'} onChange={() => { setProductMode('new'); setProduct(null) }} /> Sản phẩm mới (chưa nhập)
          </label>
        </div>

        {productMode === 'existing' ? (
          !product ? (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                <input value={productQuery} onChange={e => setProductQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400"
                  placeholder="Tìm theo tên, SKU hoặc barcode..." />
              </div>
              {productResults.length > 0 && (
                <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {productResults.map(p => (
                    <button key={p.id} onClick={() => pickProduct(p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs cursor-pointer flex justify-between">
                      <span><span className="font-semibold text-slate-800">{p.ten}</span> · {p.sku}</span>
                      <span>{p.giaBan.toLocaleString('vi-VN')} VNĐ · Tồn {p.tonKho}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between p-2 border border-blue-200 rounded-md bg-blue-50/30 text-xs">
              <span><span className="font-semibold text-slate-800">{product.ten}</span> · {product.sku} · Tồn {product.tonKho}</span>
              <button onClick={() => setProduct(null)} className="text-slate-400 hover:text-red-500 cursor-pointer">✕</button>
            </div>
          )
        ) : (
          <Input value={tenSanPhamMoi} onChange={e => setTenSanPhamMoi(e.target.value)} placeholder="VD: LEGO Technic 2027 (chưa nhập hàng)" />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Số lượng"><Input type="number" min={1} value={soLuong === 0 ? '' : soLuong} onChange={e => setSoLuong(Math.max(1, Number(e.target.value)))} /></Field>
        <Field label="Giá dự kiến (VNĐ)"><Input type="number" min={0} value={donGiaDuKien === 0 ? '' : donGiaDuKien} onChange={e => setDonGiaDuKien(Math.max(0, Number(e.target.value)))} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tiền cọc (VNĐ, tùy chọn)"><Input type="number" min={0} value={tienCoc === 0 ? '' : tienCoc} onChange={e => setTienCoc(Math.max(0, Number(e.target.value)))} /></Field>
        <Field label="Ngày dự kiến có hàng (tùy chọn)"><Input type="date" value={ngayDuKienCo} onChange={e => setNgayDuKienCo(e.target.value)} /></Field>
      </div>
      <Field label="Ghi chú (tùy chọn)"><Input value={ghiChu} onChange={e => setGhiChu(e.target.value)} placeholder="Ghi chú nội bộ..." /></Field>

      <div className="flex justify-between text-xs text-slate-500 mt-1 mb-2">
        <span>Tổng giá trị dự kiến</span>
        <span className="font-semibold text-slate-800">{(soLuong * donGiaDuKien).toLocaleString('vi-VN')} VNĐ</span>
      </div>

      <div className="flex gap-2 mt-2">
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang lưu...' : 'Tạo đặt trước'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>

      {showNewCustomer && (
        <NewCustomerModal onClose={() => setShowNewCustomer(false)} onCreated={c => { setCustomer(c); setShowNewCustomer(false) }} />
      )}
    </Modal>
  )
}
