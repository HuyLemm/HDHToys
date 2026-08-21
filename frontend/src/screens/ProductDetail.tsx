import { useEffect, useRef, useState } from 'react'
import { Package, AlertTriangle } from 'lucide-react'
import { BackBtn, Badge, Btn, KpiCard, Tabs, Table, Spinner, Modal, Field, Input, Select, ErrorBox } from '../components/ui'
import { api, ApiError, type Product, type InventoryTransaction, type LoaiSanPham } from '../lib/api'
import { productStatusLabel, inventoryTransactionTypeLabel, loaiSanPhamLabel } from '../lib/labels'
import { useDialog } from '../lib/dialog'
import { StockModal } from './Inventory'

const MAX_IMAGE_BYTES = 3 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/** Ảnh nhỏ dùng ở danh sách sản phẩm — tự rơi về icon khi chưa có ảnh (404) hoặc lỗi tải. */
export function ProductThumb({ productId, size = 32 }: { productId: string; size?: number }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    setImgUrl(null)
    api.products.imageBlob(productId)
      .then(blob => { objectUrl = URL.createObjectURL(blob); setImgUrl(objectUrl) })
      .catch(() => { /* chưa có ảnh — giữ icon mặc định */ })
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [productId])

  if (imgUrl) {
    return <img src={imgUrl} alt="" className="rounded object-cover flex-shrink-0" style={{ width: size, height: size }} />
  }
  return (
    <div className="rounded bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <Package size={Math.round(size * 0.5)} className="text-slate-300" strokeWidth={1.5} />
    </div>
  )
}

/** Ảnh lớn + tải lên/xóa ảnh, dùng ở trang Chi tiết sản phẩm. */
function ProductImagePanel({ productId }: { productId: string }) {
  const dialog = useDialog()
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [hasImage, setHasImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reloadImage() {
    let objectUrl: string | null = null
    api.products.imageBlob(productId)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setImgUrl(objectUrl)
        setHasImage(true)
      })
      .catch(() => { setImgUrl(null); setHasImage(false) })
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }

  useEffect(() => {
    const cleanup = reloadImage()
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setError('Chỉ hỗ trợ ảnh JPEG, PNG, WEBP hoặc GIF.'); return }
    if (file.size > MAX_IMAGE_BYTES) { setError('Ảnh vượt quá 3MB, vui lòng chọn ảnh nhỏ hơn.'); return }

    setError(null)
    setUploading(true)
    try {
      await api.products.uploadImage(productId, file)
      reloadImage()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tải ảnh lên.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteImage() {
    if (!(await dialog.confirm('Xóa ảnh sản phẩm này?'))) return
    setError(null)
    try {
      await api.products.deleteImage(productId)
      setImgUrl(null)
      setHasImage(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xóa ảnh.')
    }
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-32 h-32 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
        {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" /> : <Package size={40} className="text-slate-300" strokeWidth={1.25} />}
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileSelected} />
      <div className="flex gap-2 mt-2">
        <Btn variant="secondary" small disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          {uploading ? 'Đang tải...' : hasImage ? 'Đổi ảnh' : 'Tải ảnh lên'}
        </Btn>
        {hasImage && <Btn variant="danger" small onClick={handleDeleteImage}>Xóa ảnh</Btn>}
      </div>
      {error && <div className="text-[10px] text-red-500 mt-1 text-center max-w-32">{error}</div>}
    </div>
  )
}

export function ProductDetailScreen({ productId, onBack }: { productId: string; onBack: () => void }) {
  const dialog = useDialog()
  const [product, setProduct] = useState<Product | null>(null)
  const [tab, setTab] = useState('Thông tin chung')
  const [history, setHistory] = useState<InventoryTransaction[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function reload() {
    api.products.get(productId).then(setProduct)
  }

  useEffect(reload, [productId])

  async function handleDelete() {
    if (!product) return
    if (!(await dialog.confirm(`Xóa sản phẩm "${product.ten}"? Toàn bộ lịch sử nhập/xuất kho của sản phẩm này cũng sẽ bị xóa theo. Không thể hoàn tác.`))) return
    setDeleteError(null)
    try {
      await api.products.delete(product.id)
      onBack()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể xóa sản phẩm.')
    }
  }

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
        <Badge label={loaiSanPhamLabel[product.loaiSanPham]} />
        <div className="ml-auto flex gap-2">
          <Btn variant="secondary" small onClick={() => setShowAdjust(true)}>Điều chỉnh tồn kho</Btn>
          {product.trangThai === 'NGUNG_KINH_DOANH' ? (
            <Btn small onClick={() => api.products.reactivate(product.id).then(reload)}>Mở bán lại</Btn>
          ) : (
            <Btn variant="danger" small onClick={() => api.products.discontinue(product.id).then(reload)}>Ngừng kinh doanh</Btn>
          )}
          <Btn small onClick={() => setShowEdit(true)}>Chỉnh sửa</Btn>
          <Btn variant="danger" small onClick={handleDelete}>Xóa sản phẩm</Btn>
        </div>
      </div>

      {deleteError && <ErrorBox message={deleteError} />}

      {product.loaiSanPham === 'PRE_ORDER' && product.nhacHang && product.ngayDuKienVe && new Date(product.ngayDuKienVe) <= new Date() && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <AlertTriangle size={14} strokeWidth={2} className="flex-shrink-0" />
          Đã tới/qua ngày dự kiến hàng về ({new Date(product.ngayDuKienVe).toLocaleDateString('vi-VN')}) — kiểm tra hàng pre-order này.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Tồn kho" value={`${product.tonKho} sp`} />
        <KpiCard label="Đã bán" value={`${product.daBan} sp`} />
        <KpiCard label="Giá trị tồn" value={`${(product.tonKho * (product.giaVon + product.phiVanChuyen)).toLocaleString('vi-VN')} VNĐ`} />
        <KpiCard label="Doanh thu tạo ra" value={`${(product.daBan * product.giaBan).toLocaleString('vi-VN')} VNĐ`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col items-center">
          <ProductImagePanel productId={product.id} />
          <div className="text-center mt-3">
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
                  ['Phí vận chuyển', `${product.phiVanChuyen.toLocaleString('vi-VN')} VNĐ`],
                  ['Tổng giá vốn', `${(product.giaVon + product.phiVanChuyen).toLocaleString('vi-VN')} VNĐ`],
                  ['Giá bán', `${product.giaBan.toLocaleString('vi-VN')} VNĐ`],
                  ['Tồn kho hiện tại', `${product.tonKho} sản phẩm`],
                  ['Ngưỡng tồn tối thiểu', `${product.tonKhoToiThieu} sản phẩm`],
                  ['Tổng đã bán', `${product.daBan} sản phẩm`],
                  ['Trạng thái', productStatusLabel[product.trangThai]],
                  ['Loại sản phẩm', loaiSanPhamLabel[product.loaiSanPham]],
                  ...(product.loaiSanPham === 'PRE_ORDER'
                    ? [
                        ['Thời gian hàng về (dự kiến)', product.ngayDuKienVe ? new Date(product.ngayDuKienVe).toLocaleDateString('vi-VN') : 'Chưa xác định'],
                        ['Nhắc hàng về', product.nhacHang ? 'Có' : 'Không'],
                      ]
                    : []),
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
  const [phiVanChuyen, setPhiVanChuyen] = useState(product.phiVanChuyen)
  const [giaBan, setGiaBan] = useState(product.giaBan)
  const [tonKhoToiThieu, setTonKhoToiThieu] = useState(product.tonKhoToiThieu)
  const [loaiSanPham, setLoaiSanPham] = useState<LoaiSanPham>(product.loaiSanPham)
  const [ngayDuKienVe, setNgayDuKienVe] = useState(product.ngayDuKienVe ? product.ngayDuKienVe.slice(0, 10) : '')
  const [nhacHang, setNhacHang] = useState(product.nhacHang)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!ten || !danhMuc || !nhaCungCap) { setError('Vui lòng nhập đầy đủ tên, danh mục, nhà cung cấp.'); return }
    if (giaVon <= 0 || giaBan <= 0) { setError('Giá vốn và giá bán phải lớn hơn 0.'); return }
    if (loaiSanPham === 'PRE_ORDER' && !ngayDuKienVe) { setError('Sản phẩm Pre-order cần nhập ngày dự kiến hàng về.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await api.products.update(product.id, {
        ten, danhMuc, nhaCungCap, giaVon, phiVanChuyen, giaBan, tonKhoToiThieu,
        loaiSanPham,
        ngayDuKienVe: loaiSanPham === 'PRE_ORDER' && ngayDuKienVe ? new Date(ngayDuKienVe).toISOString() : undefined,
        nhacHang: loaiSanPham === 'PRE_ORDER' ? nhacHang : undefined,
      })
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
        <Field label="Tên sản phẩm" required><Input value={ten} onChange={e => setTen(e.target.value)} /></Field>
        <Field label="Danh mục" required><Input value={danhMuc} onChange={e => setDanhMuc(e.target.value)} /></Field>
        <Field label="Nhà cung cấp" required><Input value={nhaCungCap} onChange={e => setNhaCungCap(e.target.value)} /></Field>
        <Field label="Ngưỡng tồn tối thiểu"><Input type="number" min={0} value={tonKhoToiThieu === 0 ? '' : tonKhoToiThieu} onChange={e => setTonKhoToiThieu(Number(e.target.value))} /></Field>
        <Field label="Giá vốn" required><Input type="number" min={0} value={giaVon === 0 ? '' : giaVon} onChange={e => setGiaVon(Number(e.target.value))} /></Field>
        <Field label="Phí vận chuyển"><Input type="number" min={0} value={phiVanChuyen === 0 ? '' : phiVanChuyen} onChange={e => setPhiVanChuyen(Number(e.target.value))} /></Field>
        <Field label="Giá bán" required><Input type="number" min={0} value={giaBan === 0 ? '' : giaBan} onChange={e => setGiaBan(Number(e.target.value))} /></Field>
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
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu thay đổi'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>
    </Modal>
  )
}
