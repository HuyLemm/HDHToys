import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { BackBtn, Btn, Table, TinyBtn, Badge, Modal, Field, Input, ErrorBox } from '../components/ui'
import { api, ApiError, type Customer, type Product, type PaymentMethod, type SalesChannel, type DeliveryMethod, type ShippingCarrier } from '../lib/api'
import { customerTierLabel, paymentMethodLabel, salesChannelLabel, deliveryMethodLabel, shippingCarrierLabel } from '../lib/labels'
import { computeOrderTotals } from '../lib/orderMath'

interface CartLine { product: Product; soLuong: number; giamGia: number }

export function CreateOrderScreen({ onBack, onCreated }: { onBack: () => void; onCreated: (orderId: string) => void }) {
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [showNewCustomer, setShowNewCustomer] = useState(false)

  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [cart, setCart] = useState<CartLine[]>([])

  const [kenhBan, setKenhBan] = useState<SalesChannel>('TAI_CUA_HANG')
  const [phuongThuc, setPhuongThuc] = useState<PaymentMethod>('TIEN_MAT')
  const [phuongThucNhanHang, setPhuongThucNhanHang] = useState<DeliveryMethod>('KHACH_TOI_LAY')
  const [donViVanChuyen, setDonViVanChuyen] = useState<ShippingCarrier>('SPX')
  const [phiShip, setPhiShip] = useState(0)
  const [tienCoc, setTienCoc] = useState(0)
  const [ghiChu, setGhiChu] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (customer || customerQuery.trim().length < 2) { setCustomerResults([]); return }
    const handle = setTimeout(() => {
      api.customers.list({ q: customerQuery, pageSize: 5 }).then(res => setCustomerResults(res.items))
    }, 250)
    return () => clearTimeout(handle)
  }, [customerQuery, customer])

  useEffect(() => {
    if (productQuery.trim().length < 2) { setProductResults([]); return }
    const handle = setTimeout(() => {
      api.products.list({ q: productQuery, pageSize: 5 }).then(res => setProductResults(res.items))
    }, 250)
    return () => clearTimeout(handle)
  }, [productQuery])

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(l => l.product.id === product.id)
      if (existing) return prev.map(l => l.product.id === product.id ? { ...l, soLuong: l.soLuong + 1 } : l)
      return [...prev, { product, soLuong: 1, giamGia: 0 }]
    })
    setProductQuery('')
    setProductResults([])
  }

  function updateLine(productId: string, patch: Partial<CartLine>) {
    setCart(prev => prev.map(l => l.product.id === productId ? { ...l, ...patch } : l))
  }

  function removeLine(productId: string) {
    setCart(prev => prev.filter(l => l.product.id !== productId))
  }

  const { tamTinh, giamGiaTong, phiShipApDung, tongCong } = computeOrderTotals(
    cart.map(l => ({ soLuong: l.soLuong, giaBan: l.product.giaBan, giamGia: l.giamGia })),
    phiShip,
    phuongThucNhanHang === 'SHIP',
    tienCoc,
  )

  async function handleSubmit() {
    if (!customer) { setError('Vui lòng chọn khách hàng.'); return }
    if (cart.length === 0) { setError('Vui lòng thêm ít nhất một sản phẩm.'); return }
    if (tienCoc > tongCong) { setError('Tiền cọc không được vượt quá tổng tiền đơn hàng.'); return }
    setError(null)
    setSubmitting(true)
    try {
      const order = await api.orders.create({
        khachHangId: customer.id,
        kenhBan,
        phuongThucThanhToan: phuongThuc,
        phuongThucNhanHang,
        donViVanChuyen: phuongThucNhanHang === 'SHIP' ? donViVanChuyen : undefined,
        phiShip: phiShipApDung || undefined,
        tienCoc: tienCoc || undefined,
        ghiChu: ghiChu || undefined,
        items: cart.map(l => ({ productId: l.product.id, soLuong: l.soLuong, giamGia: l.giamGia })),
      })
      onCreated(order.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo đơn hàng.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <BackBtn label="Quay lại đơn hàng" onClick={onBack} />
        <h1 className="text-base font-bold text-slate-800">Tạo đơn hàng</h1>
        <span className="text-xs text-slate-400">— Nhập thủ công đơn hàng nội bộ</span>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Khách hàng</h3>
            {!customer ? (
              <>
                <div className="flex gap-2 relative">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
                    <input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400"
                      placeholder="Tìm khách hàng theo tên hoặc số điện thoại..." />
                  </div>
                  <Btn variant="secondary" small onClick={() => setShowNewCustomer(true)}>+ Thêm khách mới</Btn>
                </div>
                {customerResults.length > 0 && (
                  <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {customerResults.map(c => (
                      <button key={c.id} onClick={() => { setCustomer(c); setCustomerQuery('') }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs cursor-pointer">
                        <span className="font-semibold text-slate-800">{c.hoTen}</span> · {c.sdt} · <Badge label={customerTierLabel[c.hangKhachHang]} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#1a56db' }}>{customer.hoTen[0]}</div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{customer.hoTen}</div>
                    <div className="text-xs text-slate-500">{customer.sdt} · <Badge label={customerTierLabel[customer.hangKhachHang]} /></div>
                  </div>
                  <button onClick={() => setCustomer(null)} className="ml-auto text-[10px] text-slate-400 hover:text-red-500 cursor-pointer">✕ Xóa</button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Sản phẩm</h3>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
              <input value={productQuery} onChange={e => setProductQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400"
                placeholder="Tìm sản phẩm theo tên, SKU hoặc barcode..." />
            </div>
            {productResults.length > 0 && (
              <div className="mt-2 border border-slate-200 rounded-lg divide-y divide-slate-100 mb-3">
                {productResults.map(p => (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs cursor-pointer flex justify-between">
                    <span><span className="font-semibold text-slate-800">{p.ten}</span> · {p.sku}</span>
                    <span>{p.giaBan.toLocaleString('vi-VN')} VNĐ · Tồn {p.tonKho}</span>
                  </button>
                ))}
              </div>
            )}
            {cart.length > 0 && (
              <Table
                cols={['Sản phẩm', 'SKU', 'Số lượng', 'Đơn giá', 'Giảm giá', 'Thành tiền', '']}
                rows={cart.map(l => [
                  <span className="font-medium text-slate-800">{l.product.ten}</span>,
                  <span className="font-mono text-[10px] text-slate-500">{l.product.sku}</span>,
                  <input type="number" min={1} value={l.soLuong === 0 ? '' : l.soLuong} onChange={e => updateLine(l.product.id, { soLuong: Math.max(1, Number(e.target.value)) })}
                    className="w-14 text-center text-xs border border-slate-200 rounded px-1 py-0.5" />,
                  <span>{l.product.giaBan.toLocaleString('vi-VN')} VNĐ</span>,
                  <input type="number" min={0} max={l.soLuong * l.product.giaBan} value={l.giamGia === 0 ? '' : l.giamGia}
                    onChange={e => updateLine(l.product.id, { giamGia: Math.min(l.soLuong * l.product.giaBan, Math.max(0, Number(e.target.value))) })}
                    className="w-20 text-center text-xs border border-slate-200 rounded px-1 py-0.5" />,
                  <span className="font-semibold">{(l.soLuong * l.product.giaBan - l.giamGia).toLocaleString('vi-VN')} VNĐ</span>,
                  <TinyBtn danger onClick={() => removeLine(l.product.id)}>✕</TinyBtn>,
                ])}
              />
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Thông tin đơn hàng</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">Kênh bán hàng</label>
                <select value={kenhBan} onChange={e => setKenhBan(e.target.value as SalesChannel)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400">
                  {Object.entries(salesChannelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Phương thức thanh toán</label>
                <select value={phuongThuc} onChange={e => setPhuongThuc(e.target.value as PaymentMethod)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400">
                  {Object.entries(paymentMethodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Phương thức nhận hàng</label>
                <select value={phuongThucNhanHang} onChange={e => setPhuongThucNhanHang(e.target.value as DeliveryMethod)}
                  className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400">
                  {Object.entries(deliveryMethodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {phuongThucNhanHang === 'SHIP' && (
                <div>
                  <label className="block text-slate-500 mb-1">Đơn vị vận chuyển</label>
                  <select value={donViVanChuyen} onChange={e => setDonViVanChuyen(e.target.value as ShippingCarrier)}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400">
                    {Object.entries(shippingCarrierLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}
              {phuongThucNhanHang === 'SHIP' && (
                <div>
                  <label className="block text-slate-500 mb-1">Phí vận chuyển (khách trả, tùy chọn)</label>
                  <input type="number" min={0} value={phiShip === 0 ? '' : phiShip}
                    onChange={e => setPhiShip(Math.max(0, Number(e.target.value)))}
                    className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-400" placeholder="0" />
                </div>
              )}
              <div>
                <label className="block text-slate-500 mb-1">Tiền cọc (tùy chọn)</label>
                <input type="number" min={0} value={tienCoc === 0 ? '' : tienCoc}
                  onChange={e => setTienCoc(Math.max(0, Number(e.target.value)))}
                  className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-400" placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="block text-slate-500 mb-1">Ghi chú</label>
                <input value={ghiChu} onChange={e => setGhiChu(e.target.value)} className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-md focus:outline-none focus:border-blue-400" placeholder="Ghi chú nội bộ..." />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Tổng kết</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600"><span>Tổng tiền hàng</span><span>{(tamTinh - giamGiaTong).toLocaleString('vi-VN')} VNĐ</span></div>
              {phiShipApDung > 0 && (
                <div className="flex justify-between text-slate-600"><span>Phí vận chuyển</span><span>{phiShipApDung.toLocaleString('vi-VN')} VNĐ</span></div>
              )}
              <div className="flex justify-between text-emerald-600"><span>Tiền khách đã thanh toán</span><span>{tienCoc > 0 ? `-${tienCoc.toLocaleString('vi-VN')}` : '0'} VNĐ</span></div>
              <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-200">
                <span className="text-sm">Thanh toán cuối cùng</span><span className="text-sm" style={{ color: '#1a56db' }}>{(tongCong - tienCoc).toLocaleString('vi-VN')} VNĐ</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang tạo...' : 'Tạo đơn hàng'}</Btn>
              <Btn variant="secondary" onClick={onBack}>Hủy</Btn>
            </div>
          </div>
        </div>
      </div>

      {showNewCustomer && (
        <NewCustomerModal onClose={() => setShowNewCustomer(false)} onCreated={c => { setCustomer(c); setShowNewCustomer(false) }} />
      )}
    </div>
  )
}

export function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Customer) => void }) {
  const [hoTen, setHoTen] = useState('')
  const [sdt, setSdt] = useState('')
  const [email, setEmail] = useState('')
  const [diaChi, setDiaChi] = useState('')
  const [linkFacebook, setLinkFacebook] = useState('')
  const [luuY, setLuuY] = useState('')
  const [nguonKhachHang, setNguonKhachHang] = useState<SalesChannel>('KHAC')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!hoTen) { setError('Vui lòng nhập tên khách hàng.'); return }
    setError(null)
    setSubmitting(true)
    try {
      const customer = await api.customers.create({
        hoTen,
        sdt: sdt || undefined,
        email: email || undefined,
        diaChi: diaChi || undefined,
        linkFacebook: linkFacebook || undefined,
        luuY: luuY || undefined,
        nguonKhachHang,
      })
      onCreated(customer)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo khách hàng.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Thêm khách hàng mới" onClose={onClose}>
      <ErrorBox message={error} />
      <Field label="Họ tên" required><Input value={hoTen} onChange={e => setHoTen(e.target.value)} placeholder="Nguyễn Văn A" /></Field>
      <Field label="Số điện thoại (tùy chọn)"><Input value={sdt} onChange={e => setSdt(e.target.value)} placeholder="09xxxxxxxx" /></Field>
      <Field label="Email (tùy chọn)"><Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></Field>
      <Field label="Địa chỉ (tùy chọn)"><Input value={diaChi} onChange={e => setDiaChi(e.target.value)} placeholder="Số nhà, đường, quận/huyện, tỉnh/TP" /></Field>
      <Field label="Link Facebook (tùy chọn)"><Input value={linkFacebook} onChange={e => setLinkFacebook(e.target.value)} placeholder="facebook.com/..." /></Field>
      <Field label="Nguồn khách hàng" required>
        <select value={nguonKhachHang} onChange={e => setNguonKhachHang(e.target.value as SalesChannel)}
          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white">
          {Object.entries(salesChannelLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Lưu ý (tùy chọn)"><Input value={luuY} onChange={e => setLuuY(e.target.value)} placeholder="Ghi chú nhanh về khách hàng..." /></Field>
      <div className="flex gap-2 mt-4">
        <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu khách hàng'}</Btn>
        <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
      </div>
    </Modal>
  )
}
