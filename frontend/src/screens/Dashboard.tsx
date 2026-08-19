import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { KpiCard, SectionHeader, LinkBtn, Badge, Table, Spinner } from '../components/ui'
import { api, type Order, type RangeKey } from '../lib/api'
import { orderStatusLabel } from '../lib/labels'
import type { Screen } from '../types'

const COLORS = ['#1a56db', '#f97316', '#10b981', '#a855f7', '#f59e0b']

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'hom_nay', label: 'Hôm nay' },
  { key: '7_ngay', label: '7 ngày' },
  { key: '30_ngay', label: '30 ngày' },
  { key: 'thang_nay', label: 'Tháng này' },
  { key: 'quy_nay', label: 'Quý này' },
]

function pctChange(today: number, yesterday: number) {
  if (yesterday === 0) return today > 0 ? 100 : 0
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10
}

export function DashboardScreen({ onNav }: { onNav: (s: Screen, id?: string) => void }) {
  const [range, setRange] = useState<RangeKey>('7_ngay')
  const [loading, setLoading] = useState(true)
  const [kpi, setKpi] = useState<{
    doanhThuHomNay: number; doanhThuChange: number
    donHomNay: number; donChange: number
    tongKhachHang: number; tongSanPham: number
    giaTriTonKho: number; sanPhamSapHet: number
    congNoPhaiThu: number; loiNhuanThang: number
  } | null>(null)
  const [byTime, setByTime] = useState<{ ngay: string; doanhThu: number; soDon: number }[]>([])
  const [byCategory, setByCategory] = useState<{ danhMuc: string; doanhThu: number }[]>([])
  const [alerts, setAlerts] = useState<{ id: string; ten: string; sku: string; tonKho: number; trangThai: string }[]>([])
  const [topProducts, setTopProducts] = useState<{ ten: string; sku: string; soLuong: number; doanhThu: number }[]>([])
  const [recentOrders, setRecentOrders] = useState<Order[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      api.revenue.summary({ range: 'hom_nay' }),
      api.revenue.summary({ range: 'hom_qua' }),
      api.customers.list({ pageSize: 1 }),
      api.products.list({ pageSize: 1 }),
      api.inventory.summary(),
      api.debts.summary(),
      api.accounting.overview(),
      api.revenue.byTime({ range }),
      api.revenue.byCategory({ range }),
      api.inventory.list({ pageSize: 100 }),
      api.revenue.byProduct({ range }),
      api.orders.list({ pageSize: 5 }),
    ]).then(([
      todayRev, yesterdayRev, customers, products, invSummary, debtSummary, accOverview,
      timeData, categoryData, inventoryList, productData, orders,
    ]) => {
      if (cancelled) return
      setKpi({
        doanhThuHomNay: todayRev.tongDoanhThu,
        doanhThuChange: pctChange(todayRev.tongDoanhThu, yesterdayRev.tongDoanhThu),
        donHomNay: todayRev.tongSoDon,
        donChange: pctChange(todayRev.tongSoDon, yesterdayRev.tongSoDon),
        tongKhachHang: customers.total,
        tongSanPham: products.total,
        giaTriTonKho: invSummary.giaTriTonKho,
        sanPhamSapHet: invSummary.sanPhamSapHet,
        congNoPhaiThu: debtSummary.tongPhaiThu,
        loiNhuanThang: accOverview.loiNhuanThang,
      })
      setByTime(timeData.items)
      setByCategory(categoryData.items)
      setAlerts(
        inventoryList.items
          .filter(p => p.trangThai === 'SAP_HET' || p.trangThai === 'HET_HANG')
          .sort((a, b) => a.tonKho - b.tonKho)
          .slice(0, 4)
          .map(p => ({ id: p.id, ten: p.ten, sku: p.sku, tonKho: p.tonKho, trangThai: p.trangThai })),
      )
      setTopProducts(productData.items.slice(0, 5))
      setRecentOrders(orders.items)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [range])

  if (loading || !kpi) return <Spinner />

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Doanh thu hôm nay" value={`${kpi.doanhThuHomNay.toLocaleString('vi-VN')} VNĐ`}
          sub={`${kpi.doanhThuChange >= 0 ? '↑' : '↓'} ${kpi.doanhThuChange >= 0 ? '+' : ''}${kpi.doanhThuChange}% so với hôm qua`} subUp={kpi.doanhThuChange >= 0} />
        <KpiCard label="Đơn hàng hôm nay" value={`${kpi.donHomNay} đơn`}
          sub={`${kpi.donChange >= 0 ? '↑' : '↓'} ${kpi.donChange >= 0 ? '+' : ''}${kpi.donChange}% so với hôm qua`} subUp={kpi.donChange >= 0} />
        <KpiCard label="Tổng khách hàng" value={`${kpi.tongKhachHang}`} />
        <KpiCard label="Tổng sản phẩm" value={`${kpi.tongSanPham} SKU`} />
        <KpiCard label="Giá trị tồn kho" value={`${kpi.giaTriTonKho.toLocaleString('vi-VN')} VNĐ`} />
        <KpiCard label="Sản phẩm sắp hết" value={`${kpi.sanPhamSapHet} sản phẩm`} sub={kpi.sanPhamSapHet > 0 ? '↓ Cần nhập hàng' : undefined} subUp={false} />
        <KpiCard label="Công nợ phải thu" value={`${kpi.congNoPhaiThu.toLocaleString('vi-VN')} VNĐ`} />
        <KpiCard label="Lợi nhuận tháng" value={`${kpi.loiNhuanThang.toLocaleString('vi-VN')} VNĐ`} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800">Tổng quan doanh thu</h2>
          <div className="flex gap-1">
            {RANGE_OPTIONS.map(r => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={`text-xs px-2.5 py-1 rounded cursor-pointer transition-colors ${range === r.key ? 'text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                style={range === r.key ? { background: '#1a56db' } : undefined}>{r.label}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byTime} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="ngay" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} />
            <Tooltip formatter={(v: any) => [Number(v).toLocaleString('vi-VN') + ' VNĐ', 'Doanh thu']} contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }} />
            <Bar dataKey="doanhThu" fill="#1a56db" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <SectionHeader title="Doanh thu theo danh mục" />
          {byCategory.length === 0 ? <div className="text-xs text-slate-400 py-8 text-center">Chưa có dữ liệu</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={byCategory} dataKey="doanhThu" nameKey="danhMuc" cx="50%" cy="50%" outerRadius={65} paddingAngle={2}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString('vi-VN')} VNĐ`]} contentStyle={{ fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <SectionHeader title="Cảnh báo tồn kho" action={<LinkBtn onClick={() => onNav('inventory')}>Xem kho →</LinkBtn>} />
          {alerts.length === 0 ? <div className="text-xs text-slate-400 py-8 text-center">Không có cảnh báo</div> : (
            <div className="space-y-2">
              {alerts.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <div className="text-xs font-medium text-slate-800">{item.ten}</div>
                    <div className="text-[10px] text-slate-400">{item.sku}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs font-bold text-slate-700">{item.tonKho} sp</div>
                    <Badge label={item.trangThai === 'HET_HANG' ? 'Hết hàng' : 'Sắp hết'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <SectionHeader title="Sản phẩm bán chạy" action={<LinkBtn onClick={() => onNav('products')}>Xem tất cả →</LinkBtn>} />
          {topProducts.length === 0 ? <div className="text-xs text-slate-400 py-8 text-center">Chưa có dữ liệu</div> : topProducts.map((p, i) => (
            <div key={p.sku} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: i === 0 ? '#f97316' : '#e2e8f0', color: i === 0 ? '#fff' : '#64748b' }}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-800 truncate">{p.ten}</div>
                <div className="text-[10px] text-slate-400">{p.soLuong} đã bán</div>
              </div>
              <div className="text-xs font-semibold text-slate-700 text-right flex-shrink-0">{p.doanhThu.toLocaleString('vi-VN')} VNĐ</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <SectionHeader title="Đơn hàng gần đây" action={<LinkBtn onClick={() => onNav('orders')}>Xem tất cả →</LinkBtn>} />
        {recentOrders.length === 0 ? <div className="text-xs text-slate-400 py-8 text-center">Chưa có đơn hàng</div> : (
          <Table
            cols={['Mã đơn', 'Ngày', 'Khách hàng', 'Tổng tiền', 'Trạng thái', 'Nhân viên']}
            rows={recentOrders.map(o => [
              <button onClick={() => onNav('order-detail', o.id)} className="font-mono text-[10px] font-semibold hover:underline cursor-pointer" style={{ color: '#1a56db' }}>{o.ma}</button>,
              new Date(o.createdAt).toLocaleDateString('vi-VN'), o.khachHang.hoTen, `${o.tongCong.toLocaleString('vi-VN')} VNĐ`,
              <Badge label={orderStatusLabel[o.trangThai]} />, o.nhanVien.hoTen,
            ])}
          />
        )}
      </div>
    </div>
  )
}
