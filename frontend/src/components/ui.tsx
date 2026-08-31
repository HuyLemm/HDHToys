// ─── Shared presentational UI components ─────────────────────────────────────
// Extracted from the original single-file App.tsx so screens can import them
// independently once each screen moves to its own module.

import { Search, X } from 'lucide-react'
import logoUrl from '../assets/logo.jpg'

export const statusColor: Record<string, string> = {
  'Hoàn thành': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Đang xử lý': 'bg-blue-50 text-blue-700 border-blue-200',
  'Mới': 'bg-amber-50 text-amber-700 border-amber-200',
  'Đã hủy': 'bg-red-50 text-red-700 border-red-200',
  'Hoàn tiền': 'bg-purple-50 text-purple-700 border-purple-200',
  'Còn hàng': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Sắp hết': 'bg-amber-50 text-amber-700 border-amber-200',
  'Hết hàng': 'bg-red-50 text-red-700 border-red-200',
  'Ngừng kinh doanh': 'bg-slate-100 text-slate-500 border-slate-200',
  'VIP': 'bg-purple-50 text-purple-700 border-purple-200',
  'Member': 'bg-blue-50 text-blue-700 border-blue-200',
  'New': 'bg-slate-100 text-slate-600 border-slate-200',
  'Chưa đến hạn': 'bg-slate-100 text-slate-600 border-slate-200',
  'Sắp đến hạn': 'bg-amber-50 text-amber-700 border-amber-200',
  'Quá hạn': 'bg-red-50 text-red-700 border-red-200',
  'Đã thanh toán': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Chưa thanh toán': 'bg-red-50 text-red-700 border-red-200',
  'Hoạt động': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Tạm khóa': 'bg-red-50 text-red-700 border-red-200',
  'Đã khớp': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Không khớp': 'bg-slate-100 text-slate-500 border-slate-200',
  'Sai số tiền': 'bg-amber-50 text-amber-700 border-amber-200',
  'Chờ hàng': 'bg-amber-50 text-amber-700 border-amber-200',
  'Sẵn sàng giao': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Đã chuyển đơn': 'bg-blue-50 text-blue-700 border-blue-200',
  'Facebook': 'bg-blue-50 text-blue-700 border-blue-200',
  'Zalo': 'bg-sky-50 text-sky-700 border-sky-200',
  'TikTok': 'bg-slate-100 text-slate-700 border-slate-300',
  'Tại cửa hàng': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Điện thoại': 'bg-purple-50 text-purple-700 border-purple-200',
  'Khách tới lấy': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Ship': 'bg-blue-50 text-blue-700 border-blue-200',
  'SPX (Shopee Express)': 'bg-orange-50 text-orange-700 border-orange-200',
  'GrabExpress': 'bg-green-50 text-green-700 border-green-200',
  'Có sẵn': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Pre-order': 'bg-purple-50 text-purple-700 border-purple-200',
}

export function Badge({ label }: { label: string }) {
  const cls = statusColor[label] ?? 'bg-slate-100 text-slate-600 border-slate-200'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{label}</span>
}

export function HdhLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? 'justify-center' : ''}`}>
      <img src={logoUrl} alt="HDH Toys" width={32} height={32} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      {!compact && (
        <div>
          <div className="text-white font-bold text-sm leading-tight tracking-wide">HDH Toys</div>
          <div className="text-[10px] leading-tight whitespace-nowrap" style={{ color: '#7ba7d4' }}>Management System</div>
        </div>
      )}
    </div>
  )
}

export function KpiCard({ label, value, sub, subUp }: {
  label: string; value: string; sub?: string; subUp?: boolean; icon?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 min-w-0">
      <div className="text-xs text-slate-500 leading-tight">{label}</div>
      <div className="text-sm font-bold text-slate-900 mt-1 break-words leading-snug">{value}</div>
      {sub && (
        <div className={`text-xs mt-0.5 font-medium ${subUp ? 'text-emerald-600' : 'text-red-500'}`}>{sub}</div>
      )}
    </div>
  )
}

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      {action}
    </div>
  )
}

export function LinkBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-xs font-medium cursor-pointer hover:underline" style={{ color: '#1a56db' }}>
      {children}
    </button>
  )
}

export function Btn({ children, variant = 'primary', small, onClick, disabled }: {
  children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; small?: boolean; onClick?: () => void; disabled?: boolean
}) {
  const base = `inline-flex items-center gap-1 font-medium rounded cursor-pointer transition-colors whitespace-nowrap flex-shrink-0 ${small ? 'text-xs px-2.5 py-1.5' : 'text-sm px-3 py-1.5'}`
  const v = {
    primary: 'text-white hover:opacity-90',
    secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${v[variant]} disabled:opacity-50 disabled:cursor-not-allowed`} style={variant === 'primary' ? { background: '#1a56db' } : undefined}>
      {children}
    </button>
  )
}

export function TinyBtn({ children, danger, title, onClick }: { children: React.ReactNode; danger?: boolean; title?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`text-[10px] px-1.5 py-1 rounded border cursor-pointer whitespace-nowrap transition-colors inline-flex items-center justify-center
        ${danger ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
    >
      {children}
    </button>
  )
}

export function Table({ cols, rows }: { cols: string[]; rows: React.ReactNode[][] }) {
  // Cột đầu tiên (luôn là "Thao tác" theo quy ước toàn app) được ghim lại khi
  // cuộn ngang — bảng nào cũng có nhiều cột nên vẫn bấm được nút thao tác mà
  // không phải cuộn ngược về đầu bảng.
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            {cols.map((c, i) => (
              <th key={i} className={`text-left py-1.5 px-2 font-semibold text-slate-500 whitespace-nowrap ${i === 0 ? 'sticky left-0 z-20 bg-white' : ''}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className={`py-1.5 px-2 text-slate-700 ${ci === 0 ? 'sticky left-0 z-10 bg-white group-hover:bg-slate-50' : ''}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1.5 flex-wrap mb-3">{children}</div>
}

export function SearchInput({ placeholder, width = 'w-56', value, onChange }: {
  placeholder: string; width?: string; value?: string; onChange?: (v: string) => void
}) {
  return (
    <div className="relative">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
      <input
        value={value}
        onChange={e => onChange?.(e.target.value)}
        className={`pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400 ${width}`}
        placeholder={placeholder}
      />
    </div>
  )
}

export function Select({ placeholder, options, value, onChange, width }: {
  placeholder: string; options: string[]; value?: string; onChange?: (v: string) => void; width?: string
}) {
  return (
    <select
      value={value ?? ''}
      onChange={e => onChange?.(e.target.value)}
      className={`text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-600 focus:outline-none focus:border-blue-400 overflow-hidden text-ellipsis whitespace-nowrap ${width ?? ''}`}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}

const DOTS = '…'

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

/**
 * Trang đầu ... (lân cận trang hiện tại) ... trang cuối — thay vì chỉ hiện 3
 * trang liền kề như trước (không có cách nhảy nhanh tới đầu/cuối khi có
 * nhiều trang). siblingCount=1: luôn hiện 1 trang liền trước/sau trang hiện
 * tại, cộng trang 1 và trang cuối, dấu "…" thay cho khoảng bị bỏ qua.
 *
 * Ngưỡng "hiện đủ không cần dấu …" cố định ở 5 (không phải theo siblingCount)
 * — trước đó ngưỡng này trùng với độ rộng của nhánh rút gọn (7 với
 * siblingCount=1), nên đúng 7 trang lọt vào nhánh "hiện đủ" và không có dấu
 * "…" nào cả, nhìn rời rạc/không nhất quán với các trường hợp >7 trang.
 */
function buildPageList(current: number, total: number, siblingCount = 1): (number | typeof DOTS)[] {
  if (total <= 5) return range(1, total)

  const leftSibling = Math.max(current - siblingCount, 1)
  const rightSibling = Math.min(current + siblingCount, total)
  const showLeftDots = leftSibling > 2
  const showRightDots = rightSibling < total - 1

  if (!showLeftDots && showRightDots) {
    return [...range(1, 3 + siblingCount * 2), DOTS, total]
  }
  if (showLeftDots && !showRightDots) {
    return [1, DOTS, ...range(total - (3 + siblingCount * 2) + 1, total)]
  }
  return [1, DOTS, ...range(leftSibling, rightSibling), DOTS, total]
}

export function Pagination({ total, page, pageSize = 20, onChange }: { total: number; page: number; pageSize?: number; onChange?: (p: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pages = buildPageList(page, totalPages)
  return (
    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
      <span>Tổng {total} bản ghi</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange?.(Math.max(1, page - 1))} className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer">‹</button>
        {pages.map((p, i) => p === DOTS ? (
          <span key={`dots-${i}`} className="px-1.5 select-none">{DOTS}</span>
        ) : (
          <button key={p} onClick={() => onChange?.(p)} className={`px-2.5 py-1 rounded border transition-colors cursor-pointer ${p === page ? 'text-white border-blue-500' : 'border-slate-200 hover:bg-slate-50'}`}
            style={p === page ? { background: '#1a56db' } : undefined}>{p}</button>
        ))}
        <button onClick={() => onChange?.(Math.min(totalPages, page + 1))} className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer">›</button>
      </div>
    </div>
  )
}

export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex border-b border-slate-200 overflow-x-auto">
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)}
          className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${active === t ? 'border-b-2 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          style={active === t ? { borderBottomColor: '#1a56db', color: '#1a56db' } : undefined}>
          {t}
        </button>
      ))}
    </div>
  )
}

export function BackBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onClick={onClick} className="text-xs font-medium cursor-pointer hover:underline" style={{ color: '#1a56db' }}>← {label}</button>
}

export function Modal({ title, onClose, children, width = 'max-w-md' }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: string
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${width}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={16} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-slate-700 block mb-1">{label}{required && <span className="text-red-500"> *</span>}</label>
      {children}
    </div>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400 ${props.className ?? ''}`} />
  )
}

export function ErrorBox({ message }: { message: string | null }) {
  if (!message) return null
  return <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-3">{message}</div>
}

export function Spinner() {
  return <div className="flex items-center justify-center py-12 text-slate-400 text-xs">Đang tải...</div>
}

export function formatMoney(n: number) {
  return `${n.toLocaleString('vi-VN')} VNĐ`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN')
}

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  return { ngay: d.toLocaleDateString('vi-VN'), gio: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }
}
