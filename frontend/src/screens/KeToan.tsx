import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { CircleCheck, RefreshCw } from 'lucide-react'
import { SectionHeader, Tabs, Table, Badge, Spinner, Btn, Field, Input, ErrorBox, TinyBtn } from '../components/ui'
import { api, type Debt, type DebtType, type PaymentTransaction, ApiError } from '../lib/api'
import { debtStatusLabel, debtTypeLabel, reverseLookup, paymentReconciliationStatusLabel } from '../lib/labels'
import { useDialog } from '../lib/dialog'

export function KeToanScreen() {
  const [tab, setTab] = useState('Tổng quan')

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <div className="bg-white rounded-lg border border-slate-200">
        <Tabs tabs={['Tổng quan', 'Công nợ', 'Cân đối kế toán', 'Đối soát QR']} active={tab} onChange={setTab} />
        <div className="p-4">
          {tab === 'Tổng quan' && <OverviewTab />}
          {tab === 'Công nợ' && <DebtsTab />}
          {tab === 'Cân đối kế toán' && <BalanceSheetTab />}
          {tab === 'Đối soát QR' && <PaymentReconciliationTab />}
        </div>
      </div>
    </div>
  )
}

/**
 * Danh sách các giao dịch báo có từ webhook đối soát thanh toán QR mà hệ
 * thống KHÔNG tự khớp được với đơn hàng nào (SRS FR-PAY.5) — nhân viên kế
 * toán tra soát và xử lý tay ở đây (ví dụ: khách ghi sai nội dung chuyển
 * khoản, chuyển thiếu/dư tiền...).
 */
function PaymentReconciliationTab() {
  const [items, setItems] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)

  function reload() {
    setLoading(true)
    api.payments.unmatched({ pageSize: 50 }).then(res => setItems(res.items)).finally(() => setLoading(false))
  }
  useEffect(reload, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 max-w-2xl">
          Các giao dịch chuyển khoản QR ngân hàng mà hệ thống chưa tự khớp được với đơn hàng nào — do nội dung chuyển khoản không đọc được mã đơn, hoặc số tiền không khớp. Đơn hàng liên quan (nếu có) vẫn giữ nguyên trạng thái, chưa tự Hoàn thành.
        </p>
        <button onClick={reload} className="shrink-0 text-xs px-2.5 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 cursor-pointer flex items-center gap-1.5">
          <RefreshCw size={12} strokeWidth={1.75} /> Làm mới
        </button>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <div className="text-xs text-slate-400 py-8 text-center">Không có giao dịch nào cần xử lý — mọi thanh toán QR gần đây đều đã đối soát khớp.</div>
      ) : (
        <Table
          cols={['Thời gian', 'Mã giao dịch NH', 'Số tiền nhận', 'Đơn hàng liên quan', 'Trạng thái']}
          rows={items.map(p => [
            new Date(p.createdAt).toLocaleString('vi-VN'),
            p.maGiaoDichNganHang,
            <span className="font-semibold">{p.soTienNhan.toLocaleString('vi-VN')} VNĐ</span>,
            p.order ? `${p.order.ma} (${p.order.tongCong.toLocaleString('vi-VN')} VNĐ)` : <span className="text-slate-400">Không xác định</span>,
            <Badge label={paymentReconciliationStatusLabel[p.trangThaiDoiSoat]} />,
          ])}
        />
      )}
    </div>
  )
}

function OverviewTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.accounting.overview>> | null>(null)
  useEffect(() => { api.accounting.overview().then(setData) }, [])
  if (!data) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Tiền mặt</div><div className="text-sm font-bold mt-1">{data.tienMat.toLocaleString('vi-VN')} VNĐ</div></div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Tiền ngân hàng</div><div className="text-sm font-bold mt-1">{data.tienNganHang.toLocaleString('vi-VN')} VNĐ</div></div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Công nợ phải thu</div><div className="text-sm font-bold mt-1">{data.congNoPhaiThu.toLocaleString('vi-VN')} VNĐ</div></div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Công nợ phải trả</div><div className="text-sm font-bold mt-1">{data.congNoPhaiTra.toLocaleString('vi-VN')} VNĐ</div></div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Giá trị tồn kho</div><div className="text-sm font-bold mt-1">{data.giaTriTonKho.toLocaleString('vi-VN')} VNĐ</div></div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Lợi nhuận tháng</div><div className="text-sm font-bold mt-1">{data.loiNhuanThang.toLocaleString('vi-VN')} VNĐ</div></div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <SectionHeader title="Tình hình tài chính" />
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.tinhHinhTaiChinh} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="thang" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000000).toFixed(0) + 'M'} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} formatter={(v: any) => Number(v).toLocaleString('vi-VN') + ' VNĐ'} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="thu" name="Thu" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="chi" name="Chi" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Bar dataKey="loiNhuan" name="Lợi nhuận" fill="#1a56db" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function DebtsTab() {
  const dialog = useDialog()
  const [subTab, setSubTab] = useState<'Tất cả' | 'Phải thu' | 'Phải trả'>('Tất cả')
  const [items, setItems] = useState<Debt[]>([])
  const [summary, setSummary] = useState<{ tongPhaiThu: number; quaHanPhaiThu: number; tongPhaiTra: number; quaHanPhaiTra: number } | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete(d: Debt) {
    if (!(await dialog.confirm(`Xóa khoản công nợ "${d.doiTuong}"? Không thể hoàn tác.`))) return
    setDeleteError(null)
    try {
      await api.debts.delete(d.id)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Không thể xóa khoản công nợ.')
    }
  }

  function reload() {
    api.debts.list({
      loai: subTab === 'Tất cả' ? undefined : (reverseLookup(debtTypeLabel, subTab) as DebtType),
      pageSize: 50,
    }).then(res => setItems(res.items))
    api.debts.summary().then(setSummary)
  }
  useEffect(reload, [subTab])

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Tổng phải thu</div><div className="text-sm font-bold mt-1">{summary.tongPhaiThu.toLocaleString('vi-VN')} VNĐ</div></div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Quá hạn phải thu</div><div className="text-sm font-bold mt-1 text-red-500">{summary.quaHanPhaiThu.toLocaleString('vi-VN')} VNĐ</div></div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Tổng phải trả</div><div className="text-sm font-bold mt-1">{summary.tongPhaiTra.toLocaleString('vi-VN')} VNĐ</div></div>
          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3"><div className="text-xs text-slate-500">Quá hạn phải trả</div><div className="text-sm font-bold mt-1 text-red-500">{summary.quaHanPhaiTra.toLocaleString('vi-VN')} VNĐ</div></div>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          {(['Tất cả', 'Phải thu', 'Phải trả'] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)} className="text-xs px-3 py-2 border-b-2 cursor-pointer transition-colors"
              style={{ borderBottomColor: subTab === t ? '#1a56db' : 'transparent', color: subTab === t ? '#1a56db' : '#64748b' }}>{t}</button>
          ))}
        </div>
        <Btn small onClick={() => setShowCreate(true)}>+ Thêm công nợ</Btn>
      </div>

      <ErrorBox message={deleteError} />
      {items.length === 0 ? <div className="text-xs text-slate-400 py-8 text-center">Chưa có công nợ nào</div> : (
        <Table
          cols={['Đối tượng', 'Loại', 'Ngày phát sinh', 'Ngày đến hạn', 'Tổng tiền', 'Đã thanh toán', 'Còn lại', 'Trạng thái', 'Thao tác']}
          rows={items.map(d => [
            <span className="font-medium text-slate-800">{d.doiTuong}</span>,
            <span className={`text-xs font-semibold ${d.loai === 'PHAI_THU' ? 'text-emerald-600' : 'text-red-500'}`}>{debtTypeLabel[d.loai]}</span>,
            new Date(d.ngayPhatSinh).toLocaleDateString('vi-VN'), new Date(d.ngayDenHan).toLocaleDateString('vi-VN'),
            <span className="font-semibold">{d.soTien.toLocaleString('vi-VN')} VNĐ</span>,
            `${d.daThanhToan.toLocaleString('vi-VN')} VNĐ`, `${d.conLai.toLocaleString('vi-VN')} VNĐ`,
            <Badge label={debtStatusLabel[d.trangThai]} />,
            <div className="flex gap-1 items-center">
              {d.conLai > 0 && <PaymentButton debt={d} onDone={reload} />}
              <TinyBtn danger onClick={() => handleDelete(d)}>Xóa</TinyBtn>
            </div>,
          ])}
        />
      )}

      {showCreate && <CreateDebtModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); reload() }} />}
    </div>
  )
}

function PaymentButton({ debt, onDone }: { debt: Debt; onDone: () => void }) {
  const [amount, setAmount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (amount === null) {
    return <button onClick={() => setAmount(debt.conLai)} className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer">Thanh toán</button>
  }

  async function submit() {
    setError(null)
    try {
      await api.debts.payment(debt.id, amount!)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lỗi thanh toán.')
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input type="number" value={amount === 0 ? '' : amount} onChange={e => setAmount(Number(e.target.value))} className="w-20 text-[10px] border border-slate-200 rounded px-1 py-0.5" />
      <button onClick={submit} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white cursor-pointer">OK</button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  )
}

function CreateDebtModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [doiTuong, setDoiTuong] = useState('')
  const [loai, setLoai] = useState<DebtType>('PHAI_TRA')
  const [ngayPhatSinh, setNgayPhatSinh] = useState('')
  const [ngayDenHan, setNgayDenHan] = useState('')
  const [soTien, setSoTien] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!doiTuong || !ngayPhatSinh || !ngayDenHan || soTien <= 0) { setError('Vui lòng nhập đầy đủ thông tin.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await api.debts.create({ doiTuong, loai, ngayPhatSinh, ngayDenHan, soTien })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo công nợ.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-semibold text-slate-800">Thêm khoản công nợ</div>
        <div className="p-4">
          <ErrorBox message={error} />
          <Field label="Loại">
            <select value={loai} onChange={e => setLoai(e.target.value as DebtType)} className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white">
              <option value="PHAI_TRA">Phải trả</option>
              <option value="PHAI_THU">Phải thu</option>
            </select>
          </Field>
          <Field label="Đối tượng"><Input value={doiTuong} onChange={e => setDoiTuong(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày phát sinh"><Input type="date" value={ngayPhatSinh} onChange={e => setNgayPhatSinh(e.target.value)} /></Field>
            <Field label="Ngày đến hạn"><Input type="date" value={ngayDenHan} onChange={e => setNgayDenHan(e.target.value)} /></Field>
          </div>
          <Field label="Số tiền"><Input type="number" min={1} value={soTien === 0 ? '' : soTien} onChange={e => setSoTien(Number(e.target.value))} /></Field>
          <div className="flex gap-2 mt-2">
            <Btn onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu'}</Btn>
            <Btn variant="secondary" onClick={onClose}>Hủy</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

function BalanceSheetTab() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.accounting.balanceSheet>> | null>(null)
  useEffect(() => { api.accounting.balanceSheet().then(setData) }, [])
  if (!data) return <Spinner />

  const { taiSan, nguonVon } = data

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">Bảng cân đối kế toán</h3>
        <div className="text-xs text-slate-500 mt-0.5">Tại ngày {new Date(data.thoiDiem).toLocaleDateString('vi-VN')}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 font-bold text-sm text-white" style={{ background: '#1a56db' }}>TÀI SẢN</div>
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Tài sản ngắn hạn</div>
          {[
            ['Tiền mặt', taiSan.taiSanNganHan.tienMat],
            ['Tiền gửi ngân hàng', taiSan.taiSanNganHan.tienGuiNganHang],
            ['Công nợ phải thu', taiSan.taiSanNganHan.congNoPhaiThu],
            ['Hàng tồn kho', taiSan.taiSanNganHan.hangTonKho],
            ['Tài sản khác', taiSan.taiSanNganHan.taiSanKhac],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between px-4 py-2 text-xs border-b border-slate-100 hover:bg-slate-50">
              <span className="text-slate-600">{k}</span><span className="font-medium text-slate-800">{(v as number).toLocaleString('vi-VN')} VNĐ</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 text-xs font-bold border-t-2 border-slate-300 bg-blue-50">
            <span style={{ color: '#1a56db' }}>TỔNG TÀI SẢN</span>
            <span style={{ color: '#1a56db' }}>{taiSan.tongTaiSan.toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 font-bold text-sm text-white" style={{ background: '#0f2952' }}>NGUỒN VỐN</div>
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">Nợ phải trả</div>
          {[
            ['Công nợ nhà cung cấp', nguonVon.noPhaiTra.congNoNhaCungCap],
            ['Chi phí chưa thanh toán', nguonVon.noPhaiTra.chiPhiChuaThanhToan],
            ['Khoản phải trả khác', nguonVon.noPhaiTra.khoanPhaiTraKhac],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between px-4 py-2 text-xs border-b border-slate-100 hover:bg-slate-50">
              <span className="text-slate-600">{k}</span><span className="font-medium text-slate-800">{(v as number).toLocaleString('vi-VN')} VNĐ</span>
            </div>
          ))}
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 border-t">Vốn chủ sở hữu</div>
          {[
            ['Vốn chủ sở hữu', nguonVon.vonChuSoHuu.vonChuSoHuu],
            ['Lợi nhuận giữ lại', nguonVon.vonChuSoHuu.loiNhuanGiuLai],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between px-4 py-2 text-xs border-b border-slate-100 hover:bg-slate-50">
              <span className="text-slate-600">{k}</span><span className="font-medium text-slate-800">{(v as number).toLocaleString('vi-VN')} VNĐ</span>
            </div>
          ))}
          <div className="flex justify-between px-4 py-3 text-xs font-bold border-t-2 border-slate-300 bg-slate-50">
            <span className="text-slate-700">TỔNG NGUỒN VỐN</span>
            <span className="text-slate-800">{nguonVon.tongNguonVon.toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>
      </div>

      {data.canDoi && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-center gap-3 text-sm">
          <CircleCheck size={20} className="text-emerald-500 flex-shrink-0" strokeWidth={1.75} />
          <div className="text-emerald-700 text-center">
            <div className="font-semibold">Bảng cân đối kế toán cân bằng</div>
            <div className="text-xs mt-0.5">Tổng tài sản = Nợ phải trả + Vốn chủ sở hữu</div>
            <div className="font-bold mt-0.5">{taiSan.tongTaiSan.toLocaleString('vi-VN')} VNĐ = {nguonVon.tongNguonVon.toLocaleString('vi-VN')} VNĐ</div>
          </div>
        </div>
      )}
    </div>
  )
}
