import { useEffect, useState } from 'react'
import { FileDown } from 'lucide-react'
import { BackBtn, Badge, Btn, KpiCard, Tabs, Table, Spinner, Field, Input, ErrorBox, TinyBtn, Modal } from '../components/ui'
import { api, ApiError, type Customer, type CustomerNote, type Order, type Invoice, type SalesChannel } from '../lib/api'
import { customerTierLabel, orderStatusLabel, paymentMethodLabel, salesChannelLabel } from '../lib/labels'
import { useDialog } from '../lib/dialog'

type Overview = {
  customer: Customer
  kpi: { tongChiTieu: number; tongDon: number; giaTriDonTrungBinh: number; tongSanPhamDaMua: number; donDangXuLy: number }
  danhMucThuongMua: string[]
  sanPhamMuaNhieuNhat: { ten: string; sku: string; soLuong: number } | null
  lanMuaGanNhat: string | null
  donDangXuLyHienTai: Order[]
}

export function CustomerDetailScreen({ customerId, onBack, onOrderDetail }: {
  customerId: string; onBack: () => void; onOrderDetail: (id: string) => void
}) {
  const dialog = useDialog()
  const [overview, setOverview] = useState<Overview | null>(null)
  const [tab, setTab] = useState('Tổng quan')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)

  function reload() {
    api.customers.overview(customerId).then(setOverview as (o: unknown) => void)
  }

  useEffect(reload, [customerId])

  async function handleDeleteCustomer() {
    if (!overview) return
    if (!(await dialog.confirm(`Xóa khách hàng "${overview.customer.hoTen}"? Không thể hoàn tác.`))) return
    setDeleteError(null)
    try {
      await api.customers.delete(customerId)
      onBack()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể xóa khách hàng.')
    }
  }

  if (!overview) return <Spinner />
  const { customer, kpi } = overview

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <BackBtn label="Danh sách khách hàng" onClick={onBack} />
        <div className="flex gap-2">
          <Btn small onClick={() => setShowEdit(true)}>Chỉnh sửa</Btn>
          <Btn variant="danger" small onClick={handleDeleteCustomer}>Xóa khách hàng</Btn>
        </div>
      </div>
      {deleteError && <ErrorBox message={deleteError} />}

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0" style={{ background: '#1a56db' }}>{customer.hoTen[0]}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">{customer.hoTen}</h2>
              <Badge label={customerTierLabel[customer.hangKhachHang]} />
              <Badge label={salesChannelLabel[customer.nguonKhachHang]} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3 text-xs">
              {[
                ['SĐT', customer.sdt], ['Email', customer.email || '—'],
                ['Ngày sinh', customer.ngaySinh ? new Date(customer.ngaySinh).toLocaleDateString('vi-VN') : '—'],
                ['Khách hàng từ', new Date(customer.createdAt).toLocaleDateString('vi-VN')],
                ['Điểm tích lũy', `${customer.diemTichLuy} điểm`],
                ['Địa chỉ', customer.diaChi || '—'],
                ['Facebook', customer.linkFacebook
                  ? <a href={customer.linkFacebook.startsWith('http') ? customer.linkFacebook : `https://${customer.linkFacebook}`} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: '#1a56db' }}>{customer.linkFacebook}</a>
                  : '—'],
              ].map(([k, v]) => (
                <div key={k as string}><div className="text-slate-400">{k}</div><div className="font-semibold text-slate-800 mt-0.5">{v}</div></div>
              ))}
            </div>
            {customer.luuY && (
              <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <span className="font-semibold">Lưu ý:</span> {customer.luuY}
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <EditCustomerModal customer={customer} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); reload() }} />
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Tổng chi tiêu" value={`${kpi.tongChiTieu.toLocaleString('vi-VN')} VNĐ`} />
        <KpiCard label="Tổng số đơn" value={`${kpi.tongDon} đơn`} />
        <KpiCard label="Giá trị đơn TB" value={`${kpi.giaTriDonTrungBinh.toLocaleString('vi-VN')} VNĐ`} />
        <KpiCard label="Sản phẩm đã mua" value={`${kpi.tongSanPhamDaMua} sp`} />
        <KpiCard label="Đang xử lý" value={`${kpi.donDangXuLy} đơn`} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <Tabs tabs={['Tổng quan', 'Lịch sử mua hàng', 'Đơn đang xử lý', 'Sản phẩm đã mua', 'Hóa đơn', 'Ghi chú']} active={tab} onChange={setTab} />
        <div className="p-4">
          {tab === 'Tổng quan' && <OverviewTab overview={overview} onOrderDetail={onOrderDetail} />}
          {tab === 'Lịch sử mua hàng' && <OrdersTab customerId={customerId} onOrderDetail={onOrderDetail} />}
          {tab === 'Đơn đang xử lý' && <ActiveOrdersTab orders={overview.donDangXuLyHienTai} onOrderDetail={onOrderDetail} />}
          {tab === 'Sản phẩm đã mua' && <ProductsBoughtTab customerId={customerId} />}
          {tab === 'Hóa đơn' && <InvoicesTab customerId={customerId} />}
          {tab === 'Ghi chú' && <NotesTab customerId={customerId} />}
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ overview, onOrderDetail }: { overview: Overview; onOrderDetail: (id: string) => void }) {
  const [recent, setRecent] = useState<Order[] | null>(null)
  useEffect(() => {
    api.customers.orders(overview.customer.id, { pageSize: 3 }).then(res => setRecent(res.items))
  }, [overview.customer.id])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="text-xs font-semibold text-slate-700 mb-2">Đơn mua gần đây</div>
        {!recent ? <Spinner /> : recent.length === 0 ? <div className="text-xs text-slate-400">Chưa có đơn hàng</div> : (
          <Table
            cols={['Mã đơn', 'Ngày', 'Tổng tiền', 'Trạng thái']}
            rows={recent.map(o => [
              <button onClick={() => onOrderDetail(o.id)} className="font-mono text-[10px] font-semibold hover:underline cursor-pointer" style={{ color: '#1a56db' }}>{o.ma}</button>,
              new Date(o.createdAt).toLocaleDateString('vi-VN'), `${o.tongCong.toLocaleString('vi-VN')} VNĐ`, <Badge label={orderStatusLabel[o.trangThai]} />,
            ])}
          />
        )}
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2">Thống kê hành vi mua sắm</div>
          <div className="space-y-2 text-xs">
            {[
              ['Danh mục thường mua', overview.danhMucThuongMua.length ? overview.danhMucThuongMua.join(', ') : '—'],
              ['Lần mua gần nhất', overview.lanMuaGanNhat ? new Date(overview.lanMuaGanNhat).toLocaleDateString('vi-VN') : '—'],
              ['Sản phẩm mua nhiều nhất', overview.sanPhamMuaNhieuNhat ? `${overview.sanPhamMuaNhieuNhat.ten} (${overview.sanPhamMuaNhieuNhat.soLuong})` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-slate-400 flex-shrink-0 w-36">{k}</span>
                <span className="font-medium text-slate-700">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function OrdersTab({ customerId, onOrderDetail }: { customerId: string; onOrderDetail: (id: string) => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null)
  useEffect(() => { api.customers.orders(customerId, { pageSize: 50 }).then(res => setOrders(res.items)) }, [customerId])
  if (!orders) return <Spinner />
  if (orders.length === 0) return <div className="text-xs text-slate-400 py-8 text-center">Chưa có lịch sử mua hàng</div>
  return (
    <Table
      cols={['Mã đơn', 'Ngày', 'Số sản phẩm', 'Tổng tiền', 'Thanh toán', 'Trạng thái']}
      rows={orders.map(o => [
        <button onClick={() => onOrderDetail(o.id)} className="font-mono text-[10px] font-semibold hover:underline cursor-pointer" style={{ color: '#1a56db' }}>{o.ma}</button>,
        new Date(o.createdAt).toLocaleDateString('vi-VN'), `${o.items.length} sản phẩm`, `${o.tongCong.toLocaleString('vi-VN')} VNĐ`,
        paymentMethodLabel[o.phuongThucThanhToan], <Badge label={orderStatusLabel[o.trangThai]} />,
      ])}
    />
  )
}

function ActiveOrdersTab({ orders, onOrderDetail }: { orders: Order[]; onOrderDetail: (id: string) => void }) {
  if (orders.length === 0) return <div className="text-xs text-slate-400 py-8 text-center">Không có đơn đang xử lý</div>
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {orders.map(o => (
        <div key={o.id} className="border border-slate-200 rounded-lg p-4 space-y-3 max-w-md">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold" style={{ color: '#1a56db' }}>{o.ma}</span>
            <Badge label={orderStatusLabel[o.trangThai]} />
          </div>
          <div className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString('vi-VN')} · {o.nhanVien.hoTen}</div>
          <div className="space-y-1 text-xs text-slate-700">
            {o.items.map(i => <div key={i.id}>• {i.product.ten} × {i.soLuong}</div>)}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="font-bold text-slate-900">{o.tongCong.toLocaleString('vi-VN')} VNĐ</span>
            <Btn small onClick={() => onOrderDetail(o.id)}>Xem đơn hàng</Btn>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProductsBoughtTab({ customerId }: { customerId: string }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.customers.products>>['items'] | null>(null)
  useEffect(() => { api.customers.products(customerId).then(res => setItems(res.items)) }, [customerId])
  if (!items) return <Spinner />
  if (items.length === 0) return <div className="text-xs text-slate-400 py-8 text-center">Chưa mua sản phẩm nào</div>
  return (
    <Table
      cols={['Sản phẩm', 'SKU', 'Tổng SL mua', 'Số lần mua', 'Lần mua gần nhất', 'Tổng chi tiêu']}
      rows={items.map(p => [
        <span className="font-medium text-slate-800">{p.ten}</span>, p.sku, String(p.tongSoLuong), `${p.soLanMua} lần`,
        new Date(p.lanMuaGanNhat).toLocaleDateString('vi-VN'), `${p.tongChiTieu.toLocaleString('vi-VN')} VNĐ`,
      ])}
    />
  )
}

function InvoicesTab({ customerId }: { customerId: string }) {
  const dialog = useDialog()
  const [items, setItems] = useState<Invoice[] | null>(null)
  useEffect(() => { api.customers.invoices(customerId).then(res => setItems(res.items)) }, [customerId])
  if (!items) return <Spinner />
  if (items.length === 0) return <div className="text-xs text-slate-400 py-8 text-center">Chưa có hóa đơn nào</div>
  return (
    <Table
      cols={['Thao tác', 'Số hóa đơn', 'Ngày', 'Mã đơn', 'Tổng tiền', 'Phương thức']}
      rows={items.map(inv => [
        <TinyBtn title="Xuất PDF" onClick={() => api.invoices.openPdf(inv.id).catch(err => dialog.alert(err instanceof ApiError ? err.message : 'Không thể tải hóa đơn.'))}><FileDown size={12} strokeWidth={1.75} /></TinyBtn>,
        <span className="font-mono text-[10px] font-semibold" style={{ color: '#1a56db' }}>{inv.soHoaDon}</span>,
        new Date(inv.createdAt).toLocaleDateString('vi-VN'), inv.order.ma, `${inv.order.tongCong.toLocaleString('vi-VN')} VNĐ`,
        paymentMethodLabel[inv.order.phuongThucThanhToan],
      ])}
    />
  )
}

function NotesTab({ customerId }: { customerId: string }) {
  const dialog = useDialog()
  const [notes, setNotes] = useState<CustomerNote[] | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reload() { api.customers.notes(customerId).then(setNotes) }
  useEffect(reload, [customerId])

  async function handleAdd() {
    if (!text.trim()) return
    setError(null)
    setSubmitting(true)
    try {
      await api.customers.addNote(customerId, text.trim())
      setText('')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể thêm ghi chú.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!(await dialog.confirm('Xóa ghi chú này?'))) return
    setError(null)
    try {
      await api.customers.deleteNote(customerId, noteId)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xóa ghi chú.')
    }
  }

  if (!notes) return <Spinner />
  return (
    <div className="space-y-3">
      <ErrorBox message={error} />
      {notes.length === 0 ? <div className="text-xs text-slate-400">Chưa có ghi chú nào</div> : notes.map(n => (
        <div key={n.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start justify-between gap-2">
          <div>
            <div className="text-amber-500 mb-1">{new Date(n.createdAt).toLocaleString('vi-VN')}</div>
            {n.noiDung}
          </div>
          <TinyBtn danger onClick={() => handleDeleteNote(n.id)}>Xóa</TinyBtn>
        </div>
      ))}
      <div className="flex gap-2">
        <Field label="">
          <Input value={text} onChange={e => setText(e.target.value)} placeholder="Thêm ghi chú nội bộ..." />
        </Field>
        <Btn small onClick={handleAdd} disabled={submitting}>+ Thêm ghi chú</Btn>
      </div>
    </div>
  )
}

function EditCustomerModal({ customer, onClose, onSaved }: { customer: Customer; onClose: () => void; onSaved: () => void }) {
  const [hoTen, setHoTen] = useState(customer.hoTen)
  const [email, setEmail] = useState(customer.email ?? '')
  const [ngaySinh, setNgaySinh] = useState(customer.ngaySinh ? customer.ngaySinh.slice(0, 10) : '')
  const [diaChi, setDiaChi] = useState(customer.diaChi ?? '')
  const [linkFacebook, setLinkFacebook] = useState(customer.linkFacebook ?? '')
  const [luuY, setLuuY] = useState(customer.luuY ?? '')
  const [nguonKhachHang, setNguonKhachHang] = useState<SalesChannel>(customer.nguonKhachHang)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!hoTen.trim()) { setError('Vui lòng nhập họ tên.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await api.customers.update(customer.id, {
        hoTen: hoTen.trim(),
        // null (không phải undefined) khi ô bị xóa trắng — undefined bị
        // JSON.stringify bỏ qua nên backend hiểu là "không đổi", còn null mới
        // thực sự xóa được giá trị cũ đã lưu (xem customers.service.ts#update).
        email: email || null,
        ngaySinh: ngaySinh || null,
        diaChi: diaChi || null,
        linkFacebook: linkFacebook || null,
        luuY: luuY || null,
        nguonKhachHang,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật khách hàng.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Chỉnh sửa khách hàng" onClose={onClose}>
      <ErrorBox message={error} />
      <Field label="Họ tên" required><Input value={hoTen} onChange={e => setHoTen(e.target.value)} /></Field>
      <Field label="Số điện thoại"><Input value={customer.sdt} disabled className="opacity-60 cursor-not-allowed" /></Field>
      <Field label="Email (tùy chọn)"><Input value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <Field label="Ngày sinh (tùy chọn)"><Input type="date" value={ngaySinh} onChange={e => setNgaySinh(e.target.value)} /></Field>
      <Field label="Địa chỉ (tùy chọn)"><Input value={diaChi} onChange={e => setDiaChi(e.target.value)} placeholder="Số nhà, đường, quận/huyện, tỉnh/TP" /></Field>
      <Field label="Link Facebook (tùy chọn)"><Input value={linkFacebook} onChange={e => setLinkFacebook(e.target.value)} placeholder="facebook.com/..." /></Field>
      <Field label="Nguồn khách hàng" required>
        <select value={nguonKhachHang} onChange={e => setNguonKhachHang(e.target.value as SalesChannel)}
          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white">
          {Object.entries(salesChannelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Lưu ý (tùy chọn)"><Input value={luuY} onChange={e => setLuuY(e.target.value)} placeholder="Ghi chú nhanh về khách hàng..." /></Field>
      <div className="flex gap-2 mt-2">
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu thay đổi'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>
    </Modal>
  )
}
