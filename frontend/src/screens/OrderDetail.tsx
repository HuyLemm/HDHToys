import { useEffect, useState } from 'react'
import { FileDown, Printer } from 'lucide-react'
import { BackBtn, Badge, Btn, Table, Spinner, ErrorBox } from '../components/ui'
import { api, ApiError, type Order, type OrderStatus } from '../lib/api'
import { orderStatusLabel, paymentMethodLabel, salesChannelLabel } from '../lib/labels'

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  MOI: ['DANG_XU_LY', 'DA_HUY'],
  DANG_XU_LY: ['HOAN_THANH', 'DA_HUY'],
  HOAN_THANH: ['HOAN_TIEN'],
}

export function OrderDetailScreen({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

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
        <div className="ml-auto flex gap-2 items-center">
          {invoiceId && (
            <>
              <Btn variant="secondary" small onClick={() => api.invoices.openPdf(invoiceId).catch(err => alert(err instanceof ApiError ? err.message : 'Không thể tải hóa đơn.'))}>
                <FileDown size={13} strokeWidth={1.75} /> Xuất PDF
              </Btn>
              <Btn variant="secondary" small onClick={() => api.invoices.openPdf(invoiceId).catch(err => alert(err instanceof ApiError ? err.message : 'Không thể tải hóa đơn.'))}>
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
                i.product.ten, i.product.sku, String(i.soLuong),
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
      </div>
    </div>
  )
}
