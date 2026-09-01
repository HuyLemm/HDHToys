import { useEffect, useState } from 'react'
import { History, PackagePlus, PackageMinus, SlidersHorizontal } from 'lucide-react'
import { Btn, FilterBar, SearchInput, Select, Table, Pagination, TinyBtn, Badge, Spinner, Modal, Field, Input, ErrorBox } from '../components/ui'
import { api, ApiError, type Product, type ProductStatus } from '../lib/api'
import { productStatusLabel, reverseLookup } from '../lib/labels'
import type { Screen } from '../types'

type StockMode = 'in' | 'out' | 'adjust'

export function InventoryScreen({ onHistory }: { onHistory: () => void; onNav?: (s: Screen) => void }) {
  const [items, setItems] = useState<(Product & { giaTriTon: number })[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [danhMuc, setDanhMuc] = useState('')
  const [trangThai, setTrangThai] = useState('')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<{ tongSku: number; tongSoLuongTon: number; giaTriTonKho: number; sanPhamSapHet: number; sanPhamHetHang: number } | null>(null)
  const [modal, setModal] = useState<{ mode: StockMode; product?: Product } | null>(null)
  const pageSize = 10

  function reload() {
    setLoading(true)
    api.inventory.list({
      q: q || undefined,
      danhMuc: danhMuc || undefined,
      trangThai: (reverseLookup(productStatusLabel, trangThai) as ProductStatus) || undefined,
      page, pageSize,
    }).then(res => {
      setItems(res.items as (Product & { giaTriTon: number })[])
      setTotal(res.total)
      setLoading(false)
    })
    api.inventory.summary().then(setSummary)
  }

  useEffect(() => {
    const handle = setTimeout(reload, 250)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, danhMuc, trangThai, page])

  return (
    <div className="p-5 space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Tổng SKU</div><div className="text-sm font-bold mt-1">{summary.tongSku}</div></div>
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Tổng tồn kho</div><div className="text-sm font-bold mt-1">{summary.tongSoLuongTon} sp</div></div>
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Giá trị tồn kho</div><div className="text-sm font-bold mt-1">{summary.giaTriTonKho.toLocaleString('vi-VN')} VNĐ</div></div>
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Sắp hết hàng</div><div className="text-sm font-bold mt-1">{summary.sanPhamSapHet} SKU</div></div>
          <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Hết hàng</div><div className="text-sm font-bold mt-1">{summary.sanPhamHetHang} SKU</div></div>
        </div>
      )}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <FilterBar>
            <SearchInput placeholder="Tìm theo tên sản phẩm, SKU hoặc barcode..." width="w-64" value={q} onChange={v => { setQ(v); setPage(1) }} />
            <SearchInput placeholder="Danh mục..." width="w-36" value={danhMuc} onChange={v => { setDanhMuc(v); setPage(1) }} />
            <Select placeholder="Trạng thái" options={Object.values(productStatusLabel)} value={trangThai} onChange={v => { setTrangThai(v); setPage(1) }} />
          </FilterBar>
          <div className="flex gap-2">
            <Btn variant="secondary" small onClick={onHistory}><History size={13} strokeWidth={1.75} /> Lịch sử kho</Btn>
            <Btn variant="secondary" small onClick={() => setModal({ mode: 'out' })}><PackageMinus size={13} strokeWidth={1.75} /> Xuất kho</Btn>
            <Btn small onClick={() => setModal({ mode: 'in' })}><PackagePlus size={13} strokeWidth={1.75} /> Nhập kho</Btn>
          </div>
        </div>
        {loading ? <Spinner /> : (
          <Table
            cols={['Thao tác', 'SKU', 'Sản phẩm', 'Danh mục', 'Tồn kho', 'Giá vốn', 'Giá bán', 'Giá trị tồn', 'Trạng thái']}
            rows={items.map(i => [
              <div className="flex gap-1">
                <TinyBtn title="Nhập kho" onClick={() => setModal({ mode: 'in', product: i })}><PackagePlus size={12} strokeWidth={1.75} /></TinyBtn>
                <TinyBtn title="Điều chỉnh tồn kho" onClick={() => setModal({ mode: 'adjust', product: i })}><SlidersHorizontal size={12} strokeWidth={1.75} /></TinyBtn>
              </div>,
              <span className="font-mono text-[10px] font-semibold text-slate-600">{i.sku}</span>,
              <span className="font-medium text-slate-800">{i.ten}</span>,
              i.danhMuc,
              <span className={`font-bold ${i.tonKho === 0 ? 'text-red-500' : i.tonKho <= i.tonKhoToiThieu ? 'text-amber-600' : 'text-slate-800'}`}>{i.tonKho}</span>,
              `${i.giaVon.toLocaleString('vi-VN')} VNĐ`, `${i.giaBan.toLocaleString('vi-VN')} VNĐ`, `${i.giaTriTon.toLocaleString('vi-VN')} VNĐ`,
              <Badge label={productStatusLabel[i.trangThai]} />,
            ])}
          />
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
      </div>

      {modal && (
        <StockModal mode={modal.mode} initialProduct={modal.product} onClose={() => setModal(null)} onDone={() => { setModal(null); reload() }} />
      )}
    </div>
  )
}

export function StockModal({ mode, initialProduct, onClose, onDone }: {
  mode: StockMode; initialProduct?: Product; onClose: () => void; onDone: () => void
}) {
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [soLuong, setSoLuong] = useState(1)
  const [tonKhoMoi, setTonKhoMoi] = useState(0)
  const [ghiChu, setGhiChu] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (product) setTonKhoMoi(product.tonKho)
  }, [product])

  useEffect(() => {
    if (product || query.trim().length < 2) { setResults([]); return }
    const handle = setTimeout(() => api.products.list({ q: query, pageSize: 5 }).then(r => setResults(r.items)), 250)
    return () => clearTimeout(handle)
  }, [query, product])

  const title = mode === 'in' ? 'Nhập kho' : mode === 'out' ? 'Xuất kho' : 'Điều chỉnh tồn kho'

  async function handleSubmit() {
    if (!product) { setError('Vui lòng chọn sản phẩm.'); return }
    if (mode !== 'adjust' && soLuong < 1) { setError('Số lượng phải lớn hơn 0.'); return }
    if (mode === 'adjust' && tonKhoMoi < 0) { setError('Tồn kho thực tế không được âm.'); return }
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'in') await api.inventory.stockIn({ productId: product.id, soLuong, ghiChu: ghiChu || undefined })
      else if (mode === 'out') await api.inventory.stockOut({ productId: product.id, soLuong, ghiChu: ghiChu || undefined })
      else await api.inventory.adjust({ productId: product.id, tonKhoMoi, ghiChu: ghiChu || undefined })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể thực hiện thao tác.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <ErrorBox message={error} />
      {!product ? (
        <>
          <Field label="Sản phẩm">
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc SKU..." />
          </Field>
          {results.length > 0 && (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 mb-3">
              {results.map(p => (
                <button key={p.id} onClick={() => setProduct(p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs cursor-pointer">
                  {p.ten} · {p.sku} · Tồn: {p.tonKho}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mb-3 p-2 bg-slate-50 rounded-lg text-xs flex justify-between items-center">
          <span><span className="font-semibold">{product.ten}</span> ({product.sku}) — Tồn hiện tại: {product.tonKho}</span>
          {!initialProduct && <button onClick={() => setProduct(null)} className="text-slate-400 hover:text-red-500 cursor-pointer">✕</button>}
        </div>
      )}

      {mode === 'adjust' ? (
        <Field label="Tồn kho thực tế">
          <Input type="number" min={0} value={tonKhoMoi === 0 ? '' : tonKhoMoi} onChange={e => setTonKhoMoi(Number(e.target.value))} />
        </Field>
      ) : (
        <Field label="Số lượng">
          <Input type="number" min={1} value={soLuong === 0 ? '' : soLuong} onChange={e => setSoLuong(Number(e.target.value))} />
        </Field>
      )}
      <Field label="Ghi chú (tùy chọn)"><Input value={ghiChu} onChange={e => setGhiChu(e.target.value)} /></Field>

      <div className="flex gap-2 mt-4">
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang xử lý...' : 'Xác nhận'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>
    </Modal>
  )
}
