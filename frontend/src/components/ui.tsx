// ─── Shared presentational UI components ─────────────────────────────────────
// Extracted from the original single-file App.tsx so screens can import them
// independently once each screen moves to its own module.

import { useEffect, useRef, useId, useState } from 'react'
import { Search, X, TriangleAlert, RotateCw, SlidersHorizontal } from 'lucide-react'
import logoUrl from '../assets/logo.jpg'
import { ApiError } from '../lib/api'
import { useIsMobile } from '../lib/responsive'

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
  'Chưa cọc': 'bg-slate-100 text-slate-500 border-slate-200',
  'Cọc một phần': 'bg-amber-50 text-amber-700 border-amber-200',
  'Đã cọc đủ': 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
        <div className="text-white font-bold text-sm leading-tight tracking-wide">HDH Toys</div>
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
    <button type="button" onClick={onClick} className="text-xs font-medium cursor-pointer hover:underline" style={{ color: '#1a56db' }}>
      {children}
    </button>
  )
}

export function Btn({ children, variant = 'primary', small, onClick, disabled, type = 'button' }: {
  children: React.ReactNode; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; small?: boolean; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit'
}) {
  const base = `inline-flex items-center gap-1 font-medium rounded cursor-pointer [@media(pointer:coarse)]:min-h-11 transition-colors whitespace-nowrap flex-shrink-0 ${small ? 'text-xs px-2.5 py-1.5' : 'text-sm px-3 py-1.5'}`
  const v = {
    primary: 'text-white hover:opacity-90',
    secondary: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${v[variant]} disabled:opacity-50 disabled:cursor-not-allowed`} style={variant === 'primary' ? { background: '#1a56db' } : undefined}>
      {children}
    </button>
  )
}

export function TinyBtn({ children, danger, title, onClick }: { children: React.ReactNode; danger?: boolean; title?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`text-[10px] px-1.5 py-1 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 rounded border cursor-pointer whitespace-nowrap transition-colors inline-flex items-center justify-center
        ${danger ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
    >
      {children}
    </button>
  )
}

export function Table({ cols, rows, priority, renderCard, onCardClick }: {
  cols: string[]; rows: React.ReactNode[][]
  /** Mức ưu tiên từng cột: 1 = luôn hiện, 2 = từ 768px (tablet), 3 = từ 1024px (desktop). Bỏ trống = luôn hiện. */
  priority?: (1 | 2 | 3)[]
  /** Điện thoại (< 768px): hiển thị mỗi bản ghi thành 1 thẻ thay cho bảng. */
  renderCard?: (rowIndex: number) => React.ReactNode
  /** Bấm vào cả thẻ (chỉ dùng cùng renderCard). */
  onCardClick?: (rowIndex: number) => void
}) {
  const isMobile = useIsMobile()

  if (isMobile && renderCard) {
    return (
      <ul className="space-y-2">
        {rows.map((_, ri) => (
          <li key={ri}
            role={onCardClick ? 'button' : undefined}
            tabIndex={onCardClick ? 0 : undefined}
            onClick={onCardClick ? () => onCardClick(ri) : undefined}
            onKeyDown={onCardClick ? e => { if (e.key === 'Enter' && e.target === e.currentTarget) onCardClick(ri) } : undefined}
            className={`rounded-lg border border-slate-200 bg-white p-3 ${onCardClick ? 'cursor-pointer active:bg-slate-50' : ''}`}>
            {renderCard(ri)}
          </li>
        ))}
      </ul>
    )
  }

  const hide = (i: number) => priority?.[i] === 2 ? 'hidden md:table-cell' : priority?.[i] === 3 ? 'hidden lg:table-cell' : ''
  // Cột đầu tiên (luôn là "Thao tác" theo quy ước toàn app) được ghim lại khi
  // cuộn ngang — bảng nào cũng có nhiều cột nên vẫn bấm được nút thao tác mà
  // không phải cuộn ngược về đầu bảng.
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            {cols.map((c, i) => (
              <th key={i} scope="col" className={`text-left py-1.5 px-2 font-semibold text-slate-500 whitespace-nowrap ${i === 0 ? 'sticky left-0 z-20 bg-white' : ''} ${hide(i)}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className={`py-1.5 px-2 text-slate-700 ${ci === 0 ? 'sticky left-0 z-10 bg-white group-hover:bg-slate-50' : ''} ${hide(ci)}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Điện thoại: chỉ ô tìm kiếm + nút "Bộ lọc (n)" mở bảng lọc kéo từ dưới lên —
 * trước đây 5–7 ô lọc xếp thành 4 hàng chiếm hết màn hình. Từ 768px trở lên
 * (hoặc khi màn hình không truyền `search`) giữ nguyên bố cục cũ.
 */
export function FilterBar({ children, search, activeCount = 0, onClear }: {
  children: React.ReactNode
  search?: React.ReactNode
  activeCount?: number
  onClear?: () => void
}) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  if (search === undefined) {
    return <div className="flex items-center gap-1.5 flex-wrap mb-3">{children}</div>
  }
  if (!isMobile) {
    return <div className="flex items-center gap-1.5 flex-wrap mb-3">{search}{children}</div>
  }
  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0">{search}</div>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
          className="relative inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-medium rounded-md border border-slate-200 bg-white text-slate-700 cursor-pointer flex-shrink-0">
          <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden="true" /> Bộ lọc
          {activeCount > 0 && (
            <span className="min-w-5 h-5 px-1 rounded-full text-[11px] font-bold text-white flex items-center justify-center" style={{ background: '#1a56db' }}>{activeCount}</span>
          )}
        </button>
      </div>
      {open && (
        <Modal title="Bộ lọc" placement="bottom" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-3 [&_select]:w-full [&_select]:min-h-11 [&_input]:w-full">{children}</div>
          <div className="flex gap-2 mt-4">
            {onClear && <Btn variant="secondary" onClick={() => { onClear(); setOpen(false) }}>Xóa lọc</Btn>}
            <Btn onClick={() => setOpen(false)}>Xong</Btn>
          </div>
        </Modal>
      )}
    </>
  )
}

export function SearchInput({ placeholder, width = 'w-56', value, onChange }: {
  placeholder: string; width?: string; value?: string; onChange?: (v: string) => void
}) {
  return (
    <div className="relative">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
      <input
        type="search"
        aria-label={placeholder}
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
      aria-label={placeholder}
      value={value ?? ''}
      onChange={e => onChange?.(e.target.value)}
      className={`text-xs px-2.5 py-1.5 [@media(pointer:coarse)]:w-auto [@media(pointer:coarse)]:min-h-11 border border-slate-200 rounded-md bg-white text-slate-600 focus:outline-none focus:border-blue-400 overflow-hidden text-ellipsis whitespace-nowrap ${width ?? ''}`}
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
    <nav aria-label="Phân trang" className="flex items-center justify-between mt-3 text-xs text-slate-500">
      <span>Tổng {total} bản ghi</span>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange?.(Math.max(1, page - 1))} className="px-2 py-1 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
        {pages.map((p, i) => p === DOTS ? (
          <span key={`dots-${i}`} className="px-1.5 select-none" aria-hidden="true">{DOTS}</span>
        ) : (
          <button type="button" key={p} aria-label={`Trang ${p}`} aria-current={p === page ? 'page' : undefined} onClick={() => onChange?.(p)} className={`px-2.5 py-1 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 rounded border transition-colors cursor-pointer ${p === page ? 'text-white border-blue-500' : 'border-slate-200 hover:bg-slate-50'}`}
            style={p === page ? { background: '#1a56db' } : undefined}>{p}</button>
        ))}
        <button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => onChange?.(Math.min(totalPages, page + 1))} className="px-2 py-1 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">›</button>
      </div>
    </nav>
  )
}

export type TabItem = string | { key: string; label: React.ReactNode }

export function Tabs({ tabs, active, onChange }: { tabs: TabItem[]; active: string; onChange: (t: string) => void }) {
  return (
    <div role="tablist" className="flex border-b border-slate-200 overflow-x-auto">
      {tabs.map(t => {
        const key = typeof t === 'string' ? t : t.key
        const label = typeof t === 'string' ? t : t.label
        return (
          <button type="button" role="tab" aria-selected={active === key} key={key} onClick={() => onChange(key)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${active === key ? 'border-b-2 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            style={active === key ? { borderBottomColor: '#1a56db', color: '#1a56db' } : undefined}>
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function BackBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="text-xs font-medium cursor-pointer hover:underline" style={{ color: '#1a56db' }}>← {label}</button>
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Modal({ title, onClose, children, width = 'max-w-md', placement = 'center' }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: string
  /** 'bottom' = bảng kéo từ cạnh dưới (dùng cho bộ lọc trên điện thoại). */
  placement?: 'center' | 'bottom'
}) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Chuẩn dialog: nhớ phần tử đang focus để trả lại khi đóng, đưa focus vào
  // modal, bẫy phím Tab trong modal và đóng bằng Esc.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    if (dialog && !dialog.contains(document.activeElement)) {
      const first = dialog.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled])') ?? dialog.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? dialog).focus()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [])

  return (
    <div className={`fixed inset-0 bg-black/40 flex z-50 overscroll-contain ${placement === 'bottom' ? 'items-end justify-center' : 'items-center justify-center p-4'}`} onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={`bg-white shadow-xl w-full overflow-y-auto overscroll-contain ${placement === 'bottom' ? 'rounded-t-xl max-h-[85dvh] pb-[env(safe-area-inset-bottom)]' : `rounded-lg max-h-full ${width}`}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h3 id={titleId} className="text-sm font-semibold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-600 cursor-pointer [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:min-h-11 flex items-center justify-center"><X size={16} aria-hidden="true" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

// Nhãn bọc luôn ô nhập con — bấm nhãn focus được ô, screen reader đọc đúng
// tên trường (không cần htmlFor/id cho từng chỗ dùng).
export function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="mb-3">
      <label className="block">
        <span className="text-xs font-semibold text-slate-700 block mb-1">
          {label}{required && <><span className="text-red-500" aria-hidden="true"> *</span><span className="sr-only"> (bắt buộc)</span></>}
        </span>
        {children}
      </label>
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
  return <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-3">{message}</div>
}

export function Spinner() {
  return <div role="status" aria-live="polite" className="flex items-center justify-center py-12 text-slate-500 text-xs">Đang tải...</div>
}

/** Thông điệp lỗi hiển thị cho người dùng từ lỗi bắt được của API. */
export function errorMessage(err: unknown, fallback = 'Không thể tải dữ liệu. Vui lòng kiểm tra kết nối và thử lại.') {
  // Lỗi mạng của fetch là TypeError tiếng Anh ("Failed to fetch") — chỉ hiện
  // message của ApiError (do server trả), còn lại dùng thông điệp mặc định.
  return err instanceof ApiError && err.message ? err.message : fallback
}

/** Trạng thái lỗi tải dữ liệu — thay cho spinner quay mãi khi API lỗi/mất mạng. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <TriangleAlert size={22} strokeWidth={1.75} className="text-red-500" aria-hidden="true" />
      <div className="text-xs text-slate-600 max-w-sm">{message}</div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
          <RotateCw size={12} strokeWidth={2} aria-hidden="true" /> Thử lại
        </button>
      )}
    </div>
  )
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
