import { useEffect, useState } from 'react'
import { FileDown, Printer } from 'lucide-react'
import { BackBtn, Btn, HdhLogo, Spinner } from '../components/ui'
import { api, ApiError, type Invoice } from '../lib/api'
import { paymentMethodLabel } from '../lib/labels'

export function InvoiceDetailScreen({ invoiceId, onBack, onViewOrder }: {
  invoiceId: string; onBack: () => void; onViewOrder: (orderId: string) => void
}) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)

  useEffect(() => { api.invoices.get(invoiceId).then(setInvoice) }, [invoiceId])

  if (!invoice) return <Spinner />
  const d = new Date(invoice.createdAt)
  const { order } = invoice

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3 flex-wrap">
        <BackBtn label="Quay lại hóa đơn" onClick={onBack} />
        <div className="ml-auto flex gap-2">
          <Btn variant="secondary" small onClick={() => api.invoices.openPdf(invoice.id).catch(err => alert(err instanceof ApiError ? err.message : 'Không thể tải hóa đơn.'))}>
            <FileDown size={13} strokeWidth={1.75} /> Xuất PDF
          </Btn>
          <Btn variant="secondary" small onClick={() => api.invoices.openPdf(invoice.id).catch(err => alert(err instanceof ApiError ? err.message : 'Không thể tải hóa đơn.'))}>
            <Printer size={13} strokeWidth={1.75} /> In hóa đơn
          </Btn>
          <Btn small onClick={() => onViewOrder(order.id)}>Xem đơn hàng</Btn>
        </div>
      </div>

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
                  <td className="py-2 font-medium text-slate-800">{item.product.ten}</td>
                  <td className="py-2 text-center font-mono text-slate-500">{item.product.sku}</td>
                  <td className="py-2 text-center">{item.soLuong}</td>
                  <td className="py-2 text-right">{item.donGia.toLocaleString('vi-VN')} VNĐ</td>
                  <td className="py-2 text-right font-semibold">{item.thanhTien.toLocaleString('vi-VN')} VNĐ</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-5">
            <div className="w-52 text-xs space-y-1.5">
              {[['Tạm tính', order.tamTinh], ['Giảm giá', order.giamGia], ['VAT', order.vat]].map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-slate-600"><span>{k}</span><span>{(v as number).toLocaleString('vi-VN')} VNĐ</span></div>
              ))}
              <div className="flex justify-between font-bold text-base pt-2 border-t-2 border-slate-300">
                <span>Tổng cộng</span>
                <span style={{ color: '#1a56db' }}>{order.tongCong.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 text-center">
            Phương thức thanh toán: <strong>{paymentMethodLabel[order.phuongThucThanhToan]}</strong>
          </div>

          <div className="mt-4 text-center text-xs text-slate-400">
            Cảm ơn quý khách đã tin tưởng và mua sắm tại HDH Toys!
          </div>
        </div>
      </div>
    </div>
  )
}
