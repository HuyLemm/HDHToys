import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Btn, SectionHeader, Table, Pagination, Spinner } from '../components/ui'
import { FileDown } from 'lucide-react'
import { api, ApiError, type RangeKey } from '../lib/api'
import { paymentMethodLabel } from '../lib/labels'
import { useDialog } from '../lib/dialog'

const COLORS = ['#1a56db', '#f97316', '#10b981', '#a855f7', '#f59e0b']

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'hom_nay', label: 'Hôm nay' },
  { key: 'hom_qua', label: 'Hôm qua' },
  { key: '7_ngay', label: '7 ngày' },
  { key: '30_ngay', label: '30 ngày' },
  { key: 'thang_nay', label: 'Tháng này' },
  { key: 'quy_nay', label: 'Quý này' },
  { key: 'nam_nay', label: 'Năm nay' },
]

export function RevenueScreen() {
  const dialog = useDialog()
  const [range, setRange] = useState<RangeKey>('30_ngay')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof api.revenue.summary>> | null>(null)
  const [projected, setProjected] = useState<Awaited<ReturnType<typeof api.revenue.projectedSummary>> | null>(null)
  const [byTime, setByTime] = useState<{ ngay: string; doanhThu: number; soDon: number }[]>([])
  const [byPayment, setByPayment] = useState<{ phuongThuc: string; doanhThu: number; soDon: number }[]>([])
  const [byProduct, setByProduct] = useState<Awaited<ReturnType<typeof api.revenue.byProduct>>['items']>([])
  const [turnover, setTurnover] = useState<Awaited<ReturnType<typeof api.revenue.inventoryTurnover>>['items']>([])
  const [repeatCustomers, setRepeatCustomers] = useState<Awaited<ReturnType<typeof api.revenue.repeatCustomers>> | null>(null)
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.revenue.detail>> | null>(null)
  const pageSize = 10

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.revenue.summary({ range }),
      api.revenue.projectedSummary({ range }),
      api.revenue.byTime({ range }),
      api.revenue.byPaymentMethod({ range }),
      api.revenue.byProduct({ range }),
      api.revenue.inventoryTurnover({ range }),
      api.revenue.repeatCustomers({ range }),
    ]).then(([s, proj, t, p, bp, inv, rc]) => {
      setSummary(s); setProjected(proj); setByTime(t.items); setByPayment(p.items); setByProduct(bp.items); setTurnover(inv.items); setRepeatCustomers(rc); setLoading(false)
    })
    setPage(1)
  }, [range])

  useEffect(() => {
    api.revenue.detail({ range, page, pageSize }).then(setDetail)
  }, [range, page])

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {RANGE_OPTIONS.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`text-xs px-2.5 py-1.5 rounded cursor-pointer transition-colors border ${range === r.key ? 'text-white border-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              style={range === r.key ? { background: '#1a56db' } : undefined}>{r.label}</button>
          ))}
        </div>
        <Btn variant="secondary" small onClick={() => api.revenue.downloadExport({ range }).catch(err => dialog.alert(err instanceof ApiError ? err.message : 'Không thể xuất báo cáo CSV.'))}>
          <FileDown size={13} strokeWidth={1.75} /> Xuất CSV
        </Btn>
      </div>

      {loading || !summary || !projected ? <Spinner /> : (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-amber-700 mb-2">Doanh thu dự kiến (đơn Mới + Đang xử lý + Hoàn thành — chưa chắc đã thu đủ tiền)</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="bg-white rounded-lg border border-amber-100 px-4 py-3"><div className="text-xs text-slate-500">Tổng doanh thu</div><div className="text-sm font-bold mt-1">{projected.tongDoanhThu.toLocaleString('vi-VN')} VNĐ</div></div>
              <div className="bg-white rounded-lg border border-amber-100 px-4 py-3"><div className="text-xs text-slate-500">Tổng số đơn</div><div className="text-sm font-bold mt-1">{projected.tongSoDon} đơn</div></div>
              <div className="bg-white rounded-lg border border-amber-100 px-4 py-3"><div className="text-xs text-slate-500">Giá trị đơn TB</div><div className="text-sm font-bold mt-1">{projected.giaTriDonTrungBinh.toLocaleString('vi-VN')} VNĐ</div></div>
              <div className="bg-white rounded-lg border border-amber-100 px-4 py-3"><div className="text-xs text-slate-500">Lợi nhuận gộp</div><div className="text-sm font-bold mt-1">{projected.loiNhuanGop.toLocaleString('vi-VN')} VNĐ</div></div>
              <div className="bg-white rounded-lg border border-amber-100 px-4 py-3"><div className="text-xs text-slate-500">Tổng giảm giá</div><div className="text-sm font-bold mt-1">{projected.tongGiamGia.toLocaleString('vi-VN')} VNĐ</div></div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-emerald-700 mb-2">Doanh thu thực nhận (chỉ đơn đã Hoàn thành)</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white rounded-lg border border-emerald-100 px-4 py-3"><div className="text-xs text-slate-500">Tổng doanh thu</div><div className="text-sm font-bold mt-1">{summary.tongDoanhThu.toLocaleString('vi-VN')} VNĐ</div></div>
              <div className="bg-white rounded-lg border border-emerald-100 px-4 py-3"><div className="text-xs text-slate-500">Tổng số đơn</div><div className="text-sm font-bold mt-1">{summary.tongSoDon} đơn</div></div>
              <div className="bg-white rounded-lg border border-emerald-100 px-4 py-3"><div className="text-xs text-slate-500">Giá trị đơn TB</div><div className="text-sm font-bold mt-1">{summary.giaTriDonTrungBinh.toLocaleString('vi-VN')} VNĐ</div></div>
              <div className="bg-white rounded-lg border border-emerald-100 px-4 py-3"><div className="text-xs text-slate-500">Lợi nhuận gộp</div><div className="text-sm font-bold mt-1">{summary.loiNhuanGop.toLocaleString('vi-VN')} VNĐ</div></div>
              <div className="bg-white rounded-lg border border-emerald-100 px-4 py-3"><div className="text-xs text-slate-500">Tổng giảm giá</div><div className="text-sm font-bold mt-1">{summary.tongGiamGia.toLocaleString('vi-VN')} VNĐ</div></div>
              <div className="bg-white rounded-lg border border-emerald-100 px-4 py-3"><div className="text-xs text-slate-500">Tổng hoàn tiền</div><div className="text-sm font-bold mt-1">{summary.tongHoanTien.toLocaleString('vi-VN')} VNĐ</div></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 p-4">
              <SectionHeader title="Doanh thu theo thời gian" />
              {byTime.length === 0 ? <div className="text-xs text-slate-400 py-12 text-center">Chưa có dữ liệu</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={byTime} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="ngay" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} />
                    <Tooltip formatter={(v: any) => [Number(v).toLocaleString('vi-VN') + ' VNĐ', 'Doanh thu']} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Line type="monotone" dataKey="doanhThu" stroke="#1a56db" strokeWidth={2} dot={{ r: 3, fill: '#1a56db' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <SectionHeader title="Phương thức thanh toán" />
              {byPayment.length === 0 ? <div className="text-xs text-slate-400 py-12 text-center">Chưa có dữ liệu</div> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={byPayment} dataKey="doanhThu" nameKey="phuongThuc" cx="50%" cy="45%" outerRadius={75} paddingAngle={2}>
                      {byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`${Number(v).toLocaleString('vi-VN')} VNĐ`]} contentStyle={{ fontSize: 11 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(v: string) => paymentMethodLabel[v] ?? v} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <SectionHeader title="Chi tiết doanh thu" />
            {!detail ? <Spinner /> : detail.items.length === 0 ? (
              <div className="text-xs text-slate-400 py-8 text-center">Chưa có dữ liệu</div>
            ) : (
              <Table
                cols={['Ngày', 'Số đơn', 'Doanh thu', 'Giảm giá', 'Hoàn tiền', 'Giá vốn', 'Lợi nhuận gộp']}
                rows={detail.items.map(d => [
                  d.ngay, `${d.soDon} đơn`,
                  <span className="font-semibold">{d.doanhThu.toLocaleString('vi-VN')} VNĐ</span>,
                  `${d.giamGia.toLocaleString('vi-VN')} VNĐ`, `${d.hoanTien.toLocaleString('vi-VN')} VNĐ`, `${d.giaVon.toLocaleString('vi-VN')} VNĐ`,
                  <span className="font-semibold text-emerald-600">{d.loiNhuanGop.toLocaleString('vi-VN')} VNĐ</span>,
                ])}
              />
            )}
            {detail && <Pagination total={detail.total} page={page} pageSize={pageSize} onChange={setPage} />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <SectionHeader title="Lợi nhuận theo sản phẩm" />
              {byProduct.length === 0 ? <div className="text-xs text-slate-400 py-8 text-center">Chưa có dữ liệu</div> : (
                <Table
                  cols={['Sản phẩm', 'SL bán', 'Doanh thu', 'Giá vốn', 'Lợi nhuận']}
                  rows={[...byProduct].sort((a, b) => b.loiNhuan - a.loiNhuan).slice(0, 10).map(p => [
                    <span className="font-medium text-slate-800">{p.ten}</span>, String(p.soLuong),
                    `${p.doanhThu.toLocaleString('vi-VN')} VNĐ`, `${p.giaVon.toLocaleString('vi-VN')} VNĐ`,
                    <span className="font-semibold text-emerald-600">{p.loiNhuan.toLocaleString('vi-VN')} VNĐ</span>,
                  ])}
                />
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <SectionHeader title="Vòng quay tồn kho (sản phẩm bán chậm nhất)" />
              <div className="text-[11px] text-slate-400 mb-2">Ước tính = số lượng bán trong kỳ / tồn kho hiện tại — chỉ để so sánh tương đối, không phải số liệu kế toán.</div>
              {turnover.length === 0 ? <div className="text-xs text-slate-400 py-8 text-center">Chưa có dữ liệu</div> : (
                <Table
                  cols={['Sản phẩm', 'Tồn kho', 'Đã bán', 'Vòng quay']}
                  rows={turnover.filter(t => t.vongQuay !== null).slice(0, 10).map(t => [
                    <span className="font-medium text-slate-800">{t.ten}</span>, String(t.tonKho), String(t.soLuongBan),
                    <span className={t.vongQuay! < 0.2 ? 'font-semibold text-red-500' : 'text-slate-700'}>{t.vongQuay}</span>,
                  ])}
                />
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <SectionHeader title="Khách mua lại" />
            {!repeatCustomers ? <Spinner /> : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Tổng khách có đơn</div><div className="text-sm font-bold mt-1">{repeatCustomers.tongKhachHang}</div></div>
                  <div className="bg-slate-50 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Khách mua lại (≥2 đơn)</div><div className="text-sm font-bold mt-1">{repeatCustomers.khachMuaLai}</div></div>
                  <div className="bg-slate-50 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Tỷ lệ mua lại</div><div className="text-sm font-bold mt-1">{repeatCustomers.tyLeMuaLai}%</div></div>
                </div>
                {repeatCustomers.items.length === 0 ? <div className="text-xs text-slate-400 py-8 text-center">Chưa có khách mua lại trong kỳ này</div> : (
                  <Table
                    cols={['Khách hàng', 'SĐT', 'Số đơn', 'Tổng chi tiêu']}
                    rows={repeatCustomers.items.slice(0, 10).map(c => [
                      <span className="block max-w-[140px] truncate font-medium text-slate-800" title={c.hoTen}>{c.hoTen}</span>,
                      <span className="block max-w-[110px] truncate" title={c.sdt ?? undefined}>{c.sdt || '—'}</span>,
                      `${c.soDon} đơn`,
                      `${c.tongChiTieu.toLocaleString('vi-VN')} VNĐ`,
                    ])}
                  />
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
