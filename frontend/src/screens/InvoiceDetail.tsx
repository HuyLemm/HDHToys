import { useEffect, useState } from 'react'
import { FileDown } from 'lucide-react'
import { BackBtn, Badge, Btn, HdhLogo, Spinner, ErrorBox } from '../components/ui'
import { api, ApiError, type Invoice } from '../lib/api'
import { paymentMethodLabel, loaiSanPhamLabel, deliveryMethodLabel, shippingCarrierLabel, salesChannelLabel } from '../lib/labels'
import { useAuth } from '../lib/auth'
import { useDialog } from '../lib/dialog'
import { ProductThumb } from './ProductDetail'

export function InvoiceDetailScreen({ invoiceId, onBack, onViewOrder }: {
  invoiceId: string; onBack: () => void; onViewOrder: (orderId: string) => void
}) {
  const dialog = useDialog()
  const { staff } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { api.invoices.get(invoiceId).then(setInvoice) }, [invoiceId])

  async function handleDelete() {
    if (!invoice) return
    if (!(await dialog.confirm(`Xóa hóa đơn "${invoice.soHoaDon}"? Đơn hàng gốc vẫn giữ nguyên. Không thể hoàn tác.`))) return
    setError(null)
    try {
      await api.invoices.delete(invoiceId)
      onBack()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xóa hóa đơn.')
    }
  }

  if (!invoice) return <Spinner />
  const d = new Date(invoice.createdAt)
  const { order } = invoice

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3 flex-wrap">
        <BackBtn label="Quay lại hóa đơn" onClick={onBack} />
        <div className="ml-auto flex gap-2">
          <Btn variant="secondary" small onClick={() => api.invoices.openPdf(invoice.id).catch(err => dialog.alert(err instanceof ApiError ? err.message : 'Không thể tải hóa đơn.'))}>
            <FileDown size={13} strokeWidth={1.75} /> Xuất PDF
          </Btn>
          <Btn small onClick={() => onViewOrder(order.id)}>Xem đơn hàng</Btn>
          {staff?.vaiTro === 'ADMIN' && <Btn variant="danger" small onClick={handleDelete}>Xóa hóa đơn</Btn>}
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="max-w-2xl mx-auto bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 text-center border-b border-slate-200" style={{ background: '#0f2952' }}>
          <HdhLogo />
        </div>

        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">HÓA ĐƠN BÁN HÀNG</h2>
              <div className="font-mono text-sm font-semibold mt-1" style={{ color: '#1a56db' }}>{invoice.soHoaDon}</div>
            </div>
            <div className="text-right text-xs text-slate-600 space-y-0.5">
              <div><span className="font-semibold">Ngày:</span> {d.toLocaleDateString('vi-VN')}</div>
              <div><span className="font-semibold">Giờ:</span> {d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
              <div><span className="font-semibold">Nhân viên:</span> {order.nhanVien.hoTen}</div>
              <div><span className="font-semibold">Mã đơn:</span> {order.ma}</div>
            </div>
          </div>

          <div className="mb-5 p-3 bg-slate-50 rounded-lg text-xs">
            <div className="font-semibold text-slate-700 mb-1">Khách hàng</div>
            <div className="text-slate-800 font-medium">{order.khachHang.hoTen}</div>
            <div className="text-slate-500">{order.khachHang.sdt}</div>
          </div>

          <table className="w-full text-xs mb-5">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-2 font-semibold text-slate-600">Sản phẩm</th>
                <th className="text-center py-2 font-semibold text-slate-600">SKU</th>
                <th className="text-center py-2 font-semibold text-slate-600">SL</th>
                <th className="text-right py-2 font-semibold text-slate-600">Đơn giá</th>
                <th className="text-right py-2 font-semibold text-slate-600">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ProductThumb productId={item.product.id} size={32} />
                      <span className="min-w-0">{item.product.ten}</span>
                      {item.product.loaiSanPham === 'PRE_ORDER' && <Badge label={loaiSanPhamLabel.PRE_ORDER} />}
                    </div>
                  </td>
                  <td className="py-2 text-center font-mono text-slate-500">{item.product.sku}</td>
                  <td className="py-2 text-center">{item.soLuong}</td>
                  <td className="py-2 text-right">{item.donGia.toLocaleString('vi-VN')} VNĐ</td>
                  <td className="py-2 text-right font-semibold">{item.thanhTien.toLocaleString('vi-VN')} VNĐ</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-5">
            <div className="w-60 text-xs space-y-1.5">
              {[['Tạm tính', order.tamTinh], ['Giảm giá', order.giamGia], ['Phí vận chuyển', order.phiShip]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-slate-600"><span>{k}</span><span>{(v as number).toLocaleString('vi-VN')} VNĐ</span></div>
              ))}
              <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-slate-300">
                <span>Tổng cộng</span>
                <span style={{ color: '#1a56db' }}>{order.tongCong.toLocaleString('vi-VN')} VNĐ</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Tiền đã cọc</span>
                <span>{order.tienCoc > 0 ? `-${order.tienCoc.toLocaleString('vi-VN')}` : '0'} VNĐ</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-slate-300">
                <span>Thanh toán cuối cùng</span>
                <span style={{ color: '#1a56db' }}>{(order.tongCong - order.tienCoc).toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 text-center">
            Phương thức thanh toán: <strong>{paymentMethodLabel[order.phuongThucThanhToan]}</strong> · Kênh bán: <strong>{salesChannelLabel[order.kenhBan]}</strong>
          </div>

          {order.ghiChu && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
              <div className="font-semibold text-amber-700 mb-1">Ghi chú</div>
              <div className="text-amber-800">{order.ghiChu}</div>
            </div>
          )}

          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs">
            <div className="font-semibold text-slate-700 mb-1">Thông tin giao hàng</div>
            <div className="text-slate-600">
              Hình thức nhận hàng: <span className="font-medium text-slate-800">{deliveryMethodLabel[order.phuongThucNhanHang]}</span>
            </div>
            {order.phuongThucNhanHang === 'SHIP' && (
              <>
                {order.donViVanChuyen && (
                  <div className="text-slate-600">
                    Đơn vị vận chuyển: <span className="font-medium text-slate-800">{shippingCarrierLabel[order.donViVanChuyen]}</span>
                  </div>
                )}
                <div className="text-slate-600 flex items-center gap-1.5">
                  Mã vận đơn: {order.maVanDon ? (
                    <>
                      <span className="font-mono font-medium text-slate-800">{order.maVanDon}</span>
                      <button onClick={() => navigator.clipboard.writeText(order.maVanDon!)} className="text-[10px] text-blue-600 hover:underline cursor-pointer">Chép mã</button>
                    </>
                  ) : <span className="text-slate-400">Chưa có</span>}
                </div>
              </>
            )}
          </div>

          <div className="mt-4 text-center text-xs text-slate-400">
            Cảm ơn quý khách đã tin tưởng và mua sắm tại HDH Toys!
          </div>
        </div>
      </div>
    </div>
  )
}
