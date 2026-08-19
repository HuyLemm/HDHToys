import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Btn, SectionHeader, Table, Pagination, Spinner } from '../components/ui'
import { FileDown } from 'lucide-react'
import { api, type RangeKey } from '../lib/api'
import { paymentMethodLabel } from '../lib/labels'

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
  const [range, setRange] = useState<RangeKey>('30_ngay')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof api.revenue.summary>> | null>(null)
  const [byTime, setByTime] = useState<{ ngay: string; doanhThu: number; soDon: number }[]>([])
  const [byPayment, setByPayment] = useState<{ phuongThuc: string; doanhThu: number; soDon: number }[]>([])
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.revenue.detail>> | null>(null)
  const pageSize = 10

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.revenue.summary({ range }),
      api.revenue.byTime({ range }),
      api.revenue.byPaymentMethod({ range }),
    ]).then(([s, t, p]) => {
      setSummary(s); setByTime(t.items); setByPayment(p.items); setLoading(false)
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
        <Btn variant="secondary" small onClick={() => window.open(api.revenue.exportUrl({ range }), '_blank')}>
          <FileDown size={13} strokeWidth={1.75} /> Xuất CSV
        </Btn>
      </div>

      {loading || !summary ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Tổng doanh thu</div><div className="text-sm font-bold mt-1">{summary.tongDoanhThu.toLocaleString('vi-VN')} VNĐ</div></div>
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Tổng số đơn</div><div className="text-sm font-bold mt-1">{summary.tongSoDon} đơn</div></div>
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Giá trị đơn TB</div><div className="text-sm font-bold mt-1">{summary.giaTriDonTrungBinh.toLocaleString('vi-VN')} VNĐ</div></div>
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Lợi nhuận gộp</div><div className="text-sm font-bold mt-1">{summary.loiNhuanGop.toLocaleString('vi-VN')} VNĐ</div></div>
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Tổng giảm giá</div><div className="text-sm font-bold mt-1">{summary.tongGiamGia.toLocaleString('vi-VN')} VNĐ</div></div>
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3"><div className="text-xs text-slate-500">Tổng hoàn tiền</div><div className="text-sm font-bold mt-1">{summary.tongHoanTien.toLocaleString('vi-VN')} VNĐ</div></div>
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
        </>
      )}
    </div>
  )
}
