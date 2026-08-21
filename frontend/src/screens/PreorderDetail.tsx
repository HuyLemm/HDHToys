import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { BackBtn, Badge, Btn, Spinner, ErrorBox, Modal, Field, Input } from '../components/ui'
import { api, ApiError, type Preorder, type PaymentMethod, type SalesChannel, type Product } from '../lib/api'
import { preorderStatusLabel, paymentMethodLabel, salesChannelLabel } from '../lib/labels'
import { useDialog } from '../lib/dialog'

export function PreorderDetailScreen({ preorderId, onBack, onViewOrder }: {
  preorderId: string; onBack: () => void; onViewOrder: (orderId: string) => void
}) {
  const dialog = useDialog()
  const [preorder, setPreorder] = useState<Preorder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConvert, setShowConvert] = useState(false)
  const [canceling, setCanceling] = useState(false)

  function reload() {
    api.preorders.get(preorderId).then(setPreorder)
  }
  useEffect(reload, [preorderId])

  async function handleDelete() {
    if (!preorder) return
    const warning = preorder.trangThai === 'DA_CHUYEN_DON'
      ? `Xóa đơn đặt trước "${preorder.ma}"? Đơn hàng thật đã tạo ra từ đơn này vẫn được giữ nguyên, chỉ mất bản ghi đặt trước. Không thể hoàn tác.`
      : `Xóa đơn đặt trước "${preorder.ma}"? Không thể hoàn tác.`
    if (!(await dialog.confirm(warning))) return
    setError(null)
    try {
      await api.preorders.delete(preorderId)
      onBack()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xóa đơn đặt trước.')
    }
  }

  async function handleCancel() {
    if (!(await dialog.confirm('Hủy đơn đặt trước này? Không thể hoàn tác.', { confirmLabel: 'Hủy đơn' }))) return
    setError(null)
    setCanceling(true)
    try {
      const updated = await api.preorders.cancel(preorderId)
      setPreorder(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể hủy đơn đặt trước.')
    } finally {
      setCanceling(false)
    }
  }

  if (!preorder) return <Spinner />

  const tongGiaTriDuKien = preorder.soLuong * preorder.donGiaDuKien
  const canAct = preorder.trangThai === 'CHO_HANG' || preorder.trangThai === 'SAN_SANG'

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3 flex-wrap">
        <BackBtn label="Quay lại đặt trước" onClick={onBack} />
        <h1 className="text-base font-bold text-slate-800">Đặt trước #{preorder.ma}</h1>
        <Badge label={preorderStatusLabel[preorder.trangThai]} />
        {preorder.trangThai === 'SAN_SANG' && (
          <span className="text-[11px] text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Đã đủ hàng — có thể chuyển thành đơn hàng
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {preorder.trangThai === 'DA_CHUYEN_DON' && preorder.orderId && (
            <Btn variant="secondary" small onClick={() => onViewOrder(preorder.orderId!)}>Xem đơn hàng</Btn>
          )}
          {canAct && (
            <>
              <Btn variant="danger" small disabled={canceling} onClick={handleCancel}>{canceling ? 'Đang hủy...' : 'Hủy đặt trước'}</Btn>
              <Btn small onClick={() => setShowConvert(true)}>Chuyển thành đơn hàng</Btn>
            </>
          )}
          <Btn variant="danger" small onClick={handleDelete}>Xóa</Btn>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Thông tin đặt trước</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[
                ['Mã đặt trước', preorder.ma],
                ['Ngày tạo', new Date(preorder.createdAt).toLocaleDateString('vi-VN')],
                ['Nhân viên tạo', preorder.nhanVien.hoTen],
                ['Ngày dự kiến có hàng', preorder.ngayDuKienCo ? new Date(preorder.ngayDuKienCo).toLocaleDateString('vi-VN') : '—'],
                ['Ghi chú', preorder.ghiChu || '—'],
              ].map(([k, v]) => (
                <div key={k as string}><div className="text-slate-400">{k}</div><div className="font-semibold text-slate-800 mt-0.5">{v}</div></div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Khách hàng</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[['Tên', preorder.khachHang.hoTen], ['Số điện thoại', preorder.khachHang.sdt], ['Email', preorder.khachHang.email || '—']].map(([k, v]) => (
                <div key={k as string}><div className="text-slate-400">{k}</div><div className="font-semibold text-slate-800 mt-0.5">{v}</div></div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Sản phẩm</h3>
            {preorder.product ? (
              <div className="text-xs">
                <div className="font-semibold text-slate-800">{preorder.product.ten}</div>
                <div className="text-slate-500 mt-0.5">SKU: {preorder.product.sku} · Tồn kho hiện tại: {preorder.product.tonKho}</div>
              </div>
            ) : (
              <div className="text-xs">
                <div className="font-semibold text-slate-800">{preorder.tenSanPhamMoi}</div>
                <div className="text-blue-500 mt-0.5">Sản phẩm mới — chưa có trong catalog sản phẩm</div>
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <div className="w-64 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600"><span>Số lượng</span><span>{preorder.soLuong}</span></div>
                <div className="flex justify-between text-slate-600"><span>Giá dự kiến / SP</span><span>{preorder.donGiaDuKien.toLocaleString('vi-VN')} VNĐ</span></div>
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Tổng giá trị dự kiến</span><span>{tongGiaTriDuKien.toLocaleString('vi-VN')} VNĐ</span>
                </div>
                {preorder.tienCoc > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-600"><span>Đã đặt cọc</span><span>{preorder.tienCoc.toLocaleString('vi-VN')} VNĐ</span></div>
                    <div className="flex justify-between text-slate-600"><span>Còn lại khi giao hàng</span><span>{(tongGiaTriDuKien - preorder.tienCoc).toLocaleString('vi-VN')} VNĐ</span></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConvert && (
        <ConvertToOrderModal
          preorder={preorder}
          onClose={() => setShowConvert(false)}
          onConverted={(orderId) => { setShowConvert(false); reload(); onViewOrder(orderId) }}
        />
      )}
    </div>
  )
}

function ConvertToOrderModal({ preorder, onClose, onConverted }: {
  preorder: Preorder; onClose: () => void; onConverted: (orderId: string) => void
}) {
  const [phuongThuc, setPhuongThuc] = useState<PaymentMethod>('TIEN_MAT')
  const [kenhBan, setKenhBan] = useState<SalesChannel>('TAI_CUA_HANG')
  const [vat, setVat] = useState(0)

  const needsProduct = !preorder.productId
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [product, setProduct] = useState<Product | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!needsProduct || product || productQuery.trim().length < 2) { setProductResults([]); return }
    const handle = setTimeout(() => { api.products.list({ q: productQuery, pageSize: 5 }).then(res => setProductResults(res.items)) }, 250)
    return () => clearTimeout(handle)
  }, [productQuery, product, needsProduct])

  async function handleSubmit() {
    if (needsProduct && !product) { setError('Sản phẩm này chưa có trong catalog — hãy chọn sản phẩm vừa tạo (hoặc tạo mới ở màn Sản phẩm trước).'); return }
    setError(null)
    setSubmitting(true)
    try {
      const result = await api.preorders.convertToOrder(preorder.id, {
        productId: needsProduct ? product!.id : undefined,
        phuongThucThanhToan: phuongThuc,
        kenhBan,
        vat: vat || undefined,
      })
      onConverted(result.order.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể chuyển thành đơn hàng.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Chuyển đặt trước ${preorder.ma} thành đơn hàng`} onClose={onClose}>
      <ErrorBox message={error} />

      {preorder.tienCoc > 0 && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
          Khách đã đặt cọc <span className="font-semibold">{preorder.tienCoc.toLocaleString('vi-VN')} VNĐ</span> — đơn hàng tạo ra vẫn ghi tổng tiền đầy đủ, ghi chú đơn sẽ tự nhắc số tiền cần thu thêm.
        </div>
      )}

      {needsProduct && (
        <Field label="Sản phẩm (đơn đặt trước này chưa gắn sản phẩm — chọn sản phẩm đã tạo trong catalog)">
          {!product ? (
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
                    <button key={p.id} onClick={() => { setProduct(p); setProductQuery('') }} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs cursor-pointer">
                      <span className="font-semibold text-slate-800">{p.ten}</span> · {p.sku}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between p-2 border border-blue-200 rounded-md bg-blue-50/30 text-xs">
              <span><span className="font-semibold text-slate-800">{product.ten}</span> · {product.sku}</span>
              <button onClick={() => setProduct(null)} className="text-slate-400 hover:text-red-500 cursor-pointer">✕</button>
            </div>
          )}
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phương thức thanh toán">
          <select value={phuongThuc} onChange={e => setPhuongThuc(e.target.value as PaymentMethod)}
            className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400">
            {Object.entries(paymentMethodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Kênh bán hàng">
          <select value={kenhBan} onChange={e => setKenhBan(e.target.value as SalesChannel)}
            className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400">
            {Object.entries(salesChannelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      </div>
      <Field label="VAT (VNĐ, tùy chọn)"><Input type="number" min={0} value={vat === 0 ? '' : vat} onChange={e => setVat(Math.max(0, Number(e.target.value)))} /></Field>

      <div className="flex gap-2 mt-2">
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang chuyển...' : 'Xác nhận chuyển thành đơn hàng'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>
    </Modal>
  )
}
