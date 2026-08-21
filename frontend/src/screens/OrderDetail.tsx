import { useEffect, useState } from 'react'
import { FileDown, Printer } from 'lucide-react'
import { BackBtn, Badge, Btn, Table, Spinner, ErrorBox, Input } from '../components/ui'
import { api, ApiError, type Order, type OrderStatus, type DeliveryMethod, type ShippingCarrier } from '../lib/api'
import { orderStatusLabel, paymentMethodLabel, salesChannelLabel, deliveryMethodLabel, shippingCarrierLabel, loaiSanPhamLabel } from '../lib/labels'
import { useAuth } from '../lib/auth'
import { useDialog } from '../lib/dialog'

// Bao lâu poll lại đơn hàng để phát hiện hệ thống tự hoàn thành qua đối soát
// thanh toán QR (SRS FR-PAY.4) — không có push/websocket nên dùng polling đơn giản.
const QR_POLL_INTERVAL_MS = 4000

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  MOI: ['DANG_XU_LY', 'DA_HUY'],
  DANG_XU_LY: ['HOAN_THANH', 'DA_HUY'],
  HOAN_THANH: ['HOAN_TIEN'],
}

export function OrderDetailScreen({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const dialog = useDialog()
  const { staff } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updatingPayment, setUpdatingPayment] = useState(false)

  useEffect(() => {
    api.orders.get(orderId).then(o => {
      setOrder(o)
      if (o.trangThai === 'HOAN_THANH' || o.trangThai === 'HOAN_TIEN') {
        api.invoices.list({ q: o.ma }).then(res => {
          const match = res.items.find(inv => inv.order.id === o.id)
          if (match) setInvoiceId(match.id)
        })
      }
    })
  }, [orderId])

  // Đơn đang chờ thanh toán QR: poll để phát hiện webhook đối soát tự hoàn
  // thành đơn (đổi trạng thái không qua nút bấm của nhân viên).
  useEffect(() => {
    if (!order) return
    if (order.phuongThucThanhToan !== 'QR_CODE') return
    if (order.trangThai !== 'MOI' && order.trangThai !== 'DANG_XU_LY') return

    const timer = setInterval(async () => {
      try {
        const fresh = await api.orders.get(orderId)
        if (fresh.trangThai !== order.trangThai) {
          setOrder(fresh)
          if (fresh.trangThai === 'HOAN_THANH') {
            const res = await api.invoices.list({ q: fresh.ma })
            const match = res.items.find(inv => inv.order.id === fresh.id)
            if (match) setInvoiceId(match.id)
          }
        }
      } catch {
        // bỏ qua lỗi poll lẻ tẻ (mất mạng tạm thời...), thử lại ở lượt sau
      }
    }, QR_POLL_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [orderId, order?.trangThai, order?.phuongThucThanhToan])

  async function handleDelete() {
    if (!order) return
    if (!(await dialog.confirm(`Xóa đơn hàng "${order.ma}"? Chỉ xóa được nếu đơn chưa từng Hoàn thành (chưa có hóa đơn). Không thể hoàn tác.`))) return
    setError(null)
    setDeleting(true)
    try {
      await api.orders.delete(orderId)
      onBack()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xóa đơn hàng.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleTogglePaymentStatus() {
    if (!order) return
    setError(null)
    setUpdatingPayment(true)
    try {
      const updated = await api.orders.updatePaymentStatus(orderId, !order.daThanhToan)
      setOrder(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật trạng thái thanh toán.')
    } finally {
      setUpdatingPayment(false)
    }
  }

  async function handleDeliveryChange(phuongThucNhanHang: DeliveryMethod, donViVanChuyen?: ShippingCarrier) {
    setError(null)
    try {
      const updated = await api.orders.updateDelivery(orderId, phuongThucNhanHang, donViVanChuyen)
      setOrder(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật phương thức nhận hàng.')
    }
  }

  async function handleStatusChange(next: OrderStatus) {
    setError(null)
    setUpdating(true)
    try {
      const updated = await api.orders.updateStatus(orderId, next)
      setOrder(updated)
      if (next === 'HOAN_THANH') {
        const res = await api.invoices.list({ q: updated.ma })
        const match = res.items.find(inv => inv.order.id === updated.id)
        if (match) setInvoiceId(match.id)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật trạng thái.')
    } finally {
      setUpdating(false)
    }
  }

  if (!order) return <Spinner />

  const nextOptions = NEXT_STATUS[order.trangThai] ?? []

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3 flex-wrap">
        <BackBtn label="Quay lại đơn hàng" onClick={onBack} />
        <h1 className="text-base font-bold text-slate-800">Đơn hàng #{order.ma}</h1>
        <Badge label={orderStatusLabel[order.trangThai]} />
        <Badge label={order.daThanhToan ? 'Đã thanh toán' : 'Chưa thanh toán'} />
        <Badge label={order.phuongThucNhanHang === 'SHIP' && order.donViVanChuyen ? shippingCarrierLabel[order.donViVanChuyen] : deliveryMethodLabel[order.phuongThucNhanHang]} />
        <div className="ml-auto flex gap-2 items-center">
          <Btn variant={order.daThanhToan ? 'secondary' : 'primary'} small disabled={updatingPayment} onClick={handleTogglePaymentStatus}>
            {updatingPayment ? 'Đang lưu...' : order.daThanhToan ? 'Đánh dấu chưa thanh toán' : 'Đánh dấu đã thanh toán'}
          </Btn>
          {invoiceId && (
            <>
              <Btn variant="secondary" small onClick={() => api.invoices.openPdf(invoiceId).catch(err => dialog.alert(err instanceof ApiError ? err.message : 'Không thể tải hóa đơn.'))}>
                <FileDown size={13} strokeWidth={1.75} /> Xuất PDF
              </Btn>
              <Btn variant="secondary" small onClick={() => api.invoices.openPdf(invoiceId).catch(err => dialog.alert(err instanceof ApiError ? err.message : 'Không thể tải hóa đơn.'))}>
                <Printer size={13} strokeWidth={1.75} /> In hóa đơn
              </Btn>
            </>
          )}
          {nextOptions.length > 0 && (
            <select
              disabled={updating}
              defaultValue=""
              onChange={e => e.target.value && handleStatusChange(e.target.value as OrderStatus)}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white cursor-pointer disabled:opacity-50"
            >
              <option value="" disabled>Cập nhật trạng thái</option>
              {nextOptions.map(s => <option key={s} value={s}>{orderStatusLabel[s]}</option>)}
            </select>
          )}
          {staff?.vaiTro === 'ADMIN' && (
            <Btn variant="danger" small disabled={deleting} onClick={handleDelete}>{deleting ? 'Đang xóa...' : 'Xóa đơn hàng'}</Btn>
          )}
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Thông tin đơn hàng</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[
                ['Mã đơn', order.ma],
                ['Ngày tạo', new Date(order.createdAt).toLocaleDateString('vi-VN')],
                ['Giờ tạo', new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })],
                ['Nhân viên', order.nhanVien.hoTen],
                ['Phương thức TT', paymentMethodLabel[order.phuongThucThanhToan]],
                ['Kênh bán', salesChannelLabel[order.kenhBan]],
                ['Ghi chú', order.ghiChu || '—'],
              ].map(([k, v]) => (
                <div key={k}><div className="text-slate-400">{k}</div><div className="font-semibold text-slate-800 mt-0.5">{v}</div></div>
              ))}
              <div>
                <div className="text-slate-400 mb-0.5">Nhận hàng</div>
                <select value={order.phuongThucNhanHang}
                  onChange={e => handleDeliveryChange(e.target.value as DeliveryMethod, e.target.value === 'SHIP' ? (order.donViVanChuyen ?? 'SPX') : undefined)}
                  className="text-xs px-1.5 py-1 border border-slate-200 rounded-md bg-white cursor-pointer font-semibold text-slate-800">
                  {Object.entries(deliveryMethodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {order.phuongThucNhanHang === 'SHIP' && (
                <div>
                  <div className="text-slate-400 mb-0.5">Đơn vị vận chuyển</div>
                  <select value={order.donViVanChuyen ?? 'SPX'}
                    onChange={e => handleDeliveryChange('SHIP', e.target.value as ShippingCarrier)}
                    className="text-xs px-1.5 py-1 border border-slate-200 rounded-md bg-white cursor-pointer font-semibold text-slate-800">
                    {Object.entries(shippingCarrierLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
              {order.phuongThucNhanHang === 'SHIP' && (
                <div className="col-span-3">
                  <div className="text-slate-400 mb-0.5">Mã vận đơn</div>
                  <TrackingCodeField order={order} onSaved={setOrder} />
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Khách hàng</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {[['Tên', order.khachHang.hoTen], ['Số điện thoại', order.khachHang.sdt], ['Email', order.khachHang.email || '—']].map(([k, v]) => (
                <div key={k}><div className="text-slate-400">{k}</div><div className="font-semibold text-slate-800 mt-0.5">{v}</div></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Sản phẩm</h3>
            <Table
              cols={['Sản phẩm', 'SKU', 'Số lượng', 'Đơn giá', 'Thành tiền']}
              rows={order.items.map(i => [
                <span className="flex items-center gap-1.5">
                  {i.product.ten}
                  {i.product.loaiSanPham === 'PRE_ORDER' && <Badge label={loaiSanPhamLabel.PRE_ORDER} />}
                </span>,
                i.product.sku, String(i.soLuong),
                `${i.donGia.toLocaleString('vi-VN')} VNĐ`, `${i.thanhTien.toLocaleString('vi-VN')} VNĐ`,
              ])}
            />
            <div className="mt-4 flex justify-end">
              <div className="w-56 text-xs space-y-1.5">
                {[
                  ['Tạm tính', order.tamTinh], ['Giảm giá', order.giamGia], ['VAT', order.vat],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between text-slate-600"><span>{k}</span><span>{(v as number).toLocaleString('vi-VN')} VNĐ</span></div>
                ))}
                <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                  <span>Tổng cộng</span><span>{order.tongCong.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <QrPaymentPanel order={order} />
        </div>
      </div>
    </div>
  )
}

/**
 * Hiển thị mã QR VietQR cho đơn thanh toán qua QR Code còn hiệu lực (SRS
 * FR-PAY.1/3.16). Ẩn hoàn toàn nếu không áp dụng (không phải QR Code, hoặc
 * đơn đã Hoàn thành/Đã hủy/Hoàn tiền — xem getQrPaymentInfo ở backend).
 */
function QrPaymentPanel({ order }: { order: Order }) {
  const qr = order.qrCode
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgError, setImgError] = useState<string | null>(null)

  useEffect(() => {
    if (!qr?.configured || !qr.payload || qr.expired) return
    let objectUrl: string | null = null
    api.orders.qrImageBlob(order.id)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setImgUrl(objectUrl)
      })
      .catch(err => setImgError(err instanceof ApiError ? err.message : 'Không thể tải mã QR.'))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, qr?.payload])

  if (!qr) return null

  if (!qr.configured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-700">
        Chưa cấu hình tài khoản ngân hàng nhận thanh toán QR (biến môi trường <code>VIETQR_BANK_BIN</code>/<code>VIETQR_ACCOUNT_NO</code> ở backend). Nhân viên vẫn có thể chuyển trạng thái đơn thủ công sau khi xác nhận đã nhận tiền qua phương thức khác.
      </div>
    )
  }

  if (qr.expired) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-500">
        Mã QR đã hết hạn{qr.expiresAt && ` lúc ${new Date(qr.expiresAt).toLocaleTimeString('vi-VN')}`}. Nếu khách đã chuyển khoản, hệ thống vẫn tự đối soát khi nhận được báo có từ ngân hàng; hoặc nhân viên có thể xác nhận thủ công qua ô "Cập nhật trạng thái".
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col items-center gap-2.5 text-center">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide self-start">Thanh toán qua QR ngân hàng</h3>
      {imgError && <ErrorBox message={imgError} />}
      {imgUrl ? (
        <img src={imgUrl} alt="Mã QR thanh toán VietQR" className="w-48 h-48 rounded-md border border-slate-100" />
      ) : (
        <div className="w-48 h-48 flex items-center justify-center"><Spinner /></div>
      )}
      <div className="text-xs text-slate-500">
        Số tiền: <span className="font-semibold text-slate-800">{order.tongCong.toLocaleString('vi-VN')} VNĐ</span>
      </div>
      {qr.expiresAt && (
        <div className="text-[11px] text-slate-400">Hết hạn lúc {new Date(qr.expiresAt).toLocaleTimeString('vi-VN')}</div>
      )}
      <div className="text-[11px] text-blue-600 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Đang chờ khách thanh toán — đơn sẽ tự Hoàn thành ngay khi hệ thống nhận được tiền
      </div>
    </div>
  )
}

/**
 * Mã vận đơn — chỉ áp dụng cho đơn Ship, thường điền sau khi đã gửi hàng
 * (hoặc sau khi khách chuyển khoản xong). Nhập tự do nên cần nút Lưu riêng,
 * khác với các dropdown lưu ngay khi đổi.
 */
function TrackingCodeField({ order, onSaved }: { order: Order; onSaved: (o: Order) => void }) {
  const [value, setValue] = useState(order.maVanDon ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setValue(order.maVanDon ?? '') }, [order.id, order.maVanDon])

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      const updated = await api.orders.updateTrackingCode(order.id, value.trim())
      onSaved(updated)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu mã vận đơn.')
    } finally {
      setSaving(false)
    }
  }

  const dirty = value.trim() !== (order.maVanDon ?? '')

  return (
    <div>
      <div className="flex gap-2 items-center">
        <Input value={value} onChange={e => setValue(e.target.value)} placeholder="VD: SPXVN012345678" className="max-w-xs" />
        <Btn small disabled={saving || !dirty} onClick={handleSave}>{saving ? 'Đang lưu...' : 'Lưu'}</Btn>
        {order.maVanDon && !dirty && (
          <button onClick={() => navigator.clipboard.writeText(order.maVanDon!)} className="text-[10px] text-slate-400 hover:text-blue-600 cursor-pointer">Chép mã</button>
        )}
      </div>
      {error && <div className="text-[10px] text-red-500 mt-1">{error}</div>}
    </div>
  )
}
