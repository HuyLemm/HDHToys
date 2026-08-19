import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { BackBtn, Badge, Btn, KpiCard, Tabs, Table, Spinner, Modal, Field, Input, ErrorBox } from '../components/ui'
import { api, ApiError, type Product, type InventoryTransaction } from '../lib/api'
import { productStatusLabel, inventoryTransactionTypeLabel } from '../lib/labels'
import { StockModal } from './Inventory'

export function ProductDetailScreen({ productId, onBack }: { productId: string; onBack: () => void }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [tab, setTab] = useState('Thông tin chung')
  const [history, setHistory] = useState<InventoryTransaction[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)

  function reload() {
    api.products.get(productId).then(setProduct)
  }

  useEffect(reload, [productId])

  useEffect(() => {
    if (tab === 'Lịch sử kho') {
      api.inventory.history({ productId, pageSize: 50 }).then(res => setHistory(res.items))
    }
  }, [tab, productId])

  if (!product) return <Spinner />

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3 flex-wrap">
        <BackBtn label="Quay lại sản phẩm" onClick={onBack} />
        <h1 className="text-base font-bold text-slate-800">{product.ten}</h1>
        <Badge label={productStatusLabel[product.trangThai]} />
        <div className="ml-auto flex gap-2">
          <Btn variant="secondary" small onClick={() => setShowAdjust(true)}>Điều chỉnh tồn kho</Btn>
          {product.trangThai === 'NGUNG_KINH_DOANH' ? (
            <Btn small onClick={() => api.products.reactivate(product.id).then(reload)}>Mở bán lại</Btn>
          ) : (
            <Btn variant="danger" small onClick={() => api.products.discontinue(product.id).then(reload)}>Ngừng kinh doanh</Btn>
          )}
          <Btn small onClick={() => setShowEdit(true)}>Chỉnh sửa</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Tồn kho" value={`${product.tonKho} sp`} />
        <KpiCard label="Đã bán" value={`${product.daBan} sp`} />
        <KpiCard label="Giá trị tồn" value={`${(product.tonKho * product.giaVon).toLocaleString('vi-VN')} VNĐ`} />
        <KpiCard label="Doanh thu tạo ra" value={`${(product.daBan * product.giaBan).toLocaleString('vi-VN')} VNĐ`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col items-center">
          <div className="w-32 h-32 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3"><Package size={40} className="text-slate-300" strokeWidth={1.25} /></div>
          <div className="text-center">
            <div className="font-mono text-xs text-slate-500 mb-1">{product.sku}</div>
            {product.barcode && <div className="text-[10px] text-slate-400">Barcode: {product.barcode}</div>}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200">
          <Tabs tabs={['Thông tin chung', 'Lịch sử kho']} active={tab} onChange={setTab} />
          <div className="p-4">
            {tab === 'Thông tin chung' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {[
                  ['Tên sản phẩm', product.ten],
                  ['SKU', product.sku],
                  ['Barcode', product.barcode || '—'],
                  ['Danh mục', product.danhMuc],
                  ['Nhà cung cấp', product.nhaCungCap],
                  ['Giá vốn', `${product.giaVon.toLocaleString('vi-VN')} VNĐ`],
                  ['Giá bán', `${product.giaBan.toLocaleString('vi-VN')} VNĐ`],
                  ['Tồn kho hiện tại', `${product.tonKho} sản phẩm`],
                  ['Ngưỡng tồn tối thiểu', `${product.tonKhoToiThieu} sản phẩm`],
                  ['Tổng đã bán', `${product.daBan} sản phẩm`],
                  ['Trạng thái', productStatusLabel[product.trangThai]],
                ].map(([k, v]) => (
                  <div key={k}><div className="text-slate-400">{k}</div><div className="font-semibold text-slate-800 mt-0.5">{v}</div></div>
                ))}
              </div>
            )}
            {tab === 'Lịch sử kho' && (
              history.length === 0 ? <div className="text-xs text-slate-400 py-8 text-center">Chưa có giao dịch kho nào</div> : (
                <Table
                  cols={['Thời gian', 'Mã GD', 'Loại', 'Thay đổi', 'Tồn trước', 'Tồn sau', 'Người thực hiện', 'Tham chiếu']}
                  rows={history.map(h => [
                    new Date(h.createdAt).toLocaleString('vi-VN'), h.maGiaoDich, inventoryTransactionTypeLabel[h.loai],
                    <span className={h.soLuongThayDoi > 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{h.soLuongThayDoi > 0 ? '+' : ''}{h.soLuongThayDoi}</span>,
                    String(h.tonTruoc), String(h.tonSau), h.nguoiThucHien.hoTen, h.thamChieu ?? '—',
                  ])}
                />
              )
            )}
          </div>
        </div>
      </div>

      {showAdjust && <StockModal mode="adjust" initialProduct={product} onClose={() => setShowAdjust(false)} onDone={() => { setShowAdjust(false); reload() }} />}
      {showEdit && <EditProductModal product={product} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); reload() }} />}
    </div>
  )
}

function EditProductModal({ product, onClose, onSaved }: { product: Product; onClose: () => void; onSaved: () => void }) {
  const [ten, setTen] = useState(product.ten)
  const [danhMuc, setDanhMuc] = useState(product.danhMuc)
  const [nhaCungCap, setNhaCungCap] = useState(product.nhaCungCap)
  const [giaVon, setGiaVon] = useState(product.giaVon)
  const [giaBan, setGiaBan] = useState(product.giaBan)
  const [tonKhoToiThieu, setTonKhoToiThieu] = useState(product.tonKhoToiThieu)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)
    try {
      await api.products.update(product.id, { ten, danhMuc, nhaCungCap, giaVon, giaBan, tonKhoToiThieu })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật sản phẩm.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Chỉnh sửa sản phẩm" onClose={onClose}>
      <ErrorBox message={error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tên sản phẩm"><Input value={ten} onChange={e => setTen(e.target.value)} /></Field>
        <Field label="Danh mục"><Input value={danhMuc} onChange={e => setDanhMuc(e.target.value)} /></Field>
        <Field label="Nhà cung cấp"><Input value={nhaCungCap} onChange={e => setNhaCungCap(e.target.value)} /></Field>
        <Field label="Ngưỡng tồn tối thiểu"><Input type="number" min={0} value={tonKhoToiThieu} onChange={e => setTonKhoToiThieu(Number(e.target.value))} /></Field>
        <Field label="Giá vốn"><Input type="number" min={0} value={giaVon} onChange={e => setGiaVon(Number(e.target.value))} /></Field>
        <Field label="Giá bán"><Input type="number" min={0} value={giaBan} onChange={e => setGiaBan(Number(e.target.value))} /></Field>
      </div>
      <div className="flex gap-2 mt-2">
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu thay đổi'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>
    </Modal>
  )
}
