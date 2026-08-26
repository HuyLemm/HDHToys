import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, ClipboardList, Boxes, Package, Users,
  ReceiptText, ChartColumn, Wallet, Calculator, FileText, Settings,
  Search, Bell, Menu, LogOut, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { HdhLogo, Badge } from './ui'
import logoUrl from '../assets/logo.jpg'
import { api, type Notification } from '../lib/api'
import { useAuth } from '../lib/auth'
import { staffRoleLabel } from '../lib/labels'
import type { Screen } from '../types'

const NOTIFICATION_POLL_MS = 60_000

function timeAgoVi(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'Vừa xong'
  if (min < 60) return `${min} phút trước`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} giờ trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

function NotificationDropdown({ notifications, onNav, onMarkRead, onMarkAllRead, onClose }: {
  notifications: Notification[]
  onNav: (s: Screen, id?: string) => void
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClose: () => void
}) {
  const hasUnread = notifications.some(n => !n.daDoc)

  return (
    <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
        <span className="text-xs font-bold text-slate-600">Thông báo</span>
        {hasUnread && (
          <button onClick={onMarkAllRead} className="text-[10px] font-medium hover:underline cursor-pointer" style={{ color: '#1a56db' }}>
            Đánh dấu đã đọc tất cả
          </button>
        )}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center">Không có thông báo</div>
        ) : (
          notifications.map(n => (
            <button
              key={n.id}
              onClick={() => {
                onMarkRead(n.id)
                if (n.productId) onNav('product-detail', n.productId)
                onClose()
              }}
              className="w-full flex items-start gap-2 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-slate-50 last:border-b-0"
            >
              {!n.daDoc && <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#f97316' }} />}
              <div className={`min-w-0 ${n.daDoc ? 'opacity-60' : ''}`}>
                <div className="text-xs font-semibold text-slate-800">{n.tieuDe}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{n.noiDung}</div>
                <div className="text-[10px] text-slate-400 mt-1">{timeAgoVi(n.createdAt)}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

const navItems = [
  { key: 'dashboard', Icon: LayoutDashboard, label: 'Tổng quan' },
  { key: 'orders', Icon: ClipboardList, label: 'Đơn hàng' },
  { key: 'inventory', Icon: Boxes, label: 'Kho hàng' },
  { key: 'products', Icon: Package, label: 'Sản phẩm' },
  { key: 'customers', Icon: Users, label: 'Khách hàng' },
  { key: 'invoices', Icon: ReceiptText, label: 'Hóa đơn' },
  { key: 'revenue', Icon: ChartColumn, label: 'Doanh thu' },
  { key: 'thu-chi', Icon: Wallet, label: 'Thu / Chi' },
  { key: 'ke-toan', Icon: Calculator, label: 'Kế toán' },
  { key: 'bao-cao', Icon: FileText, label: 'Báo cáo' },
  { key: 'cai-dat', Icon: Settings, label: 'Cài đặt' },
]

export function Sidebar({ active, onNav, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: {
  active: Screen; onNav: (s: Screen) => void; collapsed: boolean; onToggleCollapsed: () => void; mobileOpen: boolean; onCloseMobile: () => void
}) {
  const { staff, logout } = useAuth()
  const activeKey = (['order-detail', 'create-order'].includes(active) ? 'orders' :
    ['inventory-history'].includes(active) ? 'inventory' :
    ['product-detail'].includes(active) ? 'products' :
    ['customer-detail'].includes(active) ? 'customers' :
    ['invoice-detail'].includes(active) ? 'invoices' : active)

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`flex flex-col h-screen flex-shrink-0 transition-transform md:transition-[width] duration-200
          fixed inset-y-0 left-0 z-40 md:static md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: collapsed ? 56 : 208, background: '#0f2952' }}
      >
        <div className={`flex items-center gap-2 px-3 py-4 border-b border-white/10 ${collapsed ? 'flex-col' : ''}`}>
          {collapsed ? (
            <button onClick={onToggleCollapsed} title="Mở rộng thanh bên"
              className="relative w-8 h-8 flex-shrink-0 rounded-full group cursor-pointer">
              <img src={logoUrl} alt="HDH Toys" width={32} height={32}
                className="w-8 h-8 rounded-full object-cover transition-opacity group-hover:opacity-0" />
              <span className="absolute inset-0 rounded-full flex items-center justify-center bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: '#94b8d4' }}>
                <PanelLeftOpen size={18} strokeWidth={1.75} />
              </span>
            </button>
          ) : (
            <>
              <HdhLogo />
              <button onClick={onToggleCollapsed} title="Thu gọn thanh bên"
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer flex-shrink-0"
                style={{ color: '#94b8d4' }}>
                <PanelLeftClose size={18} strokeWidth={1.75} />
              </button>
            </>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => {
            const isActive = activeKey === item.key
            const { Icon } = item
            return (
              <button key={item.key} onClick={() => { onNav(item.key as Screen); onCloseMobile() }} title={collapsed ? item.label : undefined}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors cursor-pointer"
                style={{
                  color: isActive ? '#fff' : '#94b8d4',
                  background: isActive ? 'rgba(255,255,255,0.12)' : undefined,
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: isActive ? '3px solid #f97316' : '3px solid transparent',
                }}>
                <Icon size={18} className="flex-shrink-0" strokeWidth={1.75} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {!collapsed && (
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#f97316' }}>
                {(staff?.hoTen ?? 'A')[0]}
              </div>
              <div className="min-w-0">
                <div className="text-white text-xs font-medium truncate">{staff?.hoTen ?? 'Admin'}</div>
                <div className="text-xs truncate" style={{ color: '#7ba7d4' }}>{staffRoleLabel[staff?.vaiTro ?? 'ADMIN']}</div>
              </div>
            </div>
            <button onClick={logout} className="w-full text-xs py-1.5 rounded flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors cursor-pointer" style={{ color: '#94b8d4' }}>
              <LogOut size={13} strokeWidth={1.75} /> Đăng xuất
            </button>
          </div>
        )}
      </aside>
    </>
  )
}

function GlobalSearchDropdown({ query, onNav, onClose }: { query: string; onNav: (s: Screen, id?: string) => void; onClose: () => void }) {
  const [results, setResults] = useState<Awaited<ReturnType<typeof api.search>> | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) { setResults(null); return }
    const handle = setTimeout(() => {
      api.search(query).then(setResults).catch(() => setResults(null))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  if (query.trim().length < 2 || !results) return null
  const { khachHang, donHang, hoaDon, sanPham } = results
  if (!khachHang.length && !donHang.length && !hoaDon.length && !sanPham.length) {
    return (
      <div className="absolute left-0 top-full mt-1 w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-xl z-50 p-4 text-xs text-slate-400 text-center">
        Không tìm thấy kết quả
      </div>
    )
  }

  return (
    <div className="absolute left-0 top-full mt-1 w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto">
      {khachHang.length > 0 && <>
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50">Khách hàng</div>
        {khachHang.map(c => (
          <button key={c.id} onClick={() => { onNav('customer-detail', c.id); onClose() }}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors text-left">
            <div>
              <div className="text-xs font-semibold text-slate-800">{c.hoTen}</div>
              <div className="text-[10px] text-slate-500">{c.sdt} · <Badge label={c.hangKhachHang} /></div>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ color: '#1a56db', background: '#eff6ff' }}>Xem hồ sơ</span>
          </button>
        ))}
      </>}
      {donHang.length > 0 && <>
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 border-t bg-slate-50">Đơn hàng</div>
        {donHang.map(o => (
          <button key={o.id} onClick={() => { onNav('order-detail', o.id); onClose() }}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors text-left">
            <div>
              <div className="text-xs font-semibold font-mono text-slate-700">{o.ma}</div>
              <div className="text-[10px] text-slate-500">{o.khachHang.hoTen} · {o.tongCong.toLocaleString('vi-VN')} VNĐ</div>
            </div>
          </button>
        ))}
      </>}
      {hoaDon.length > 0 && <>
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 border-t bg-slate-50">Hóa đơn</div>
        {hoaDon.map(inv => (
          <button key={inv.id} onClick={() => { onNav('invoice-detail', inv.id); onClose() }}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors text-left">
            <div>
              <div className="text-xs font-semibold font-mono text-slate-700">{inv.soHoaDon}</div>
              <div className="text-[10px] text-slate-500">{inv.order.khachHang.hoTen} · {inv.order.tongCong.toLocaleString('vi-VN')} VNĐ</div>
            </div>
          </button>
        ))}
      </>}
      {sanPham.length > 0 && <>
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 border-t bg-slate-50">Sản phẩm</div>
        {sanPham.map(p => (
          <button key={p.id} onClick={() => { onNav('product-detail', p.id); onClose() }}
            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 transition-colors text-left">
            <div>
              <div className="text-xs font-semibold text-slate-800">{p.ten}</div>
              <div className="text-[10px] text-slate-500">{p.sku} · Tồn: {p.tonKho}</div>
            </div>
          </button>
        ))}
      </>}
    </div>
  )
}

export function Header({ title, onToggleSidebar, onNav }: {
  title: string; onToggleSidebar: () => void; onNav: (s: Screen, id?: string) => void
}) {
  const [searchVal, setSearchVal] = useState('')
  const [focused, setFocused] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { staff } = useAuth()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setFocused(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    function refresh() {
      api.notifications.list({ pageSize: 20 }).then(res => {
        setNotifications(res.items)
        setUnreadCount(res.unread)
      }).catch(() => {})
    }
    refresh()
    const handle = setInterval(refresh, NOTIFICATION_POLL_MS)
    return () => clearInterval(handle)
  }, [])

  function handleMarkRead(id: string) {
    const target = notifications.find(n => n.id === id)
    if (!target || target.daDoc) return
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, daDoc: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    api.notifications.markRead(id).catch(() => {})
  }

  function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, daDoc: true })))
    setUnreadCount(0)
    api.notifications.markAllRead().catch(() => {})
  }

  return (
    <header className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 h-14 border-b border-slate-200 bg-white flex-shrink-0 z-10">
      <button onClick={onToggleSidebar} className="md:hidden p-1.5 rounded hover:bg-slate-100 text-slate-500 cursor-pointer flex-shrink-0"><Menu size={18} strokeWidth={1.75} /></button>
      <span className="font-semibold text-slate-800 text-sm truncate max-w-[30vw] sm:max-w-none flex-shrink-0">{title}</span>

      <div className="flex-1 mx-1 sm:mx-4 relative min-w-0" ref={wrapRef}>
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="Tìm khách hàng, sản phẩm, đơn hàng..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
          />
        </div>
        {focused && searchVal.trim().length >= 2 && (
          <div className="absolute top-8 left-0 max-w-md w-full">
            <GlobalSearchDropdown query={searchVal} onNav={onNav} onClose={() => { setFocused(false); setSearchVal('') }} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 flex-shrink-0">
        <span className="hidden lg:inline">{new Date().toLocaleDateString('vi-VN')}</span>
        <span className="text-slate-300 hidden lg:inline">|</span>
        <div className="relative" ref={notifRef}>
          <button onClick={() => setNotifOpen(v => !v)} className="relative p-1.5 rounded hover:bg-slate-100 text-slate-500 cursor-pointer">
            <Bell size={17} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ background: '#f97316' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <NotificationDropdown
              notifications={notifications}
              onNav={onNav}
              onMarkRead={handleMarkRead}
              onMarkAllRead={handleMarkAllRead}
              onClose={() => setNotifOpen(false)}
            />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#1a56db' }}>
            {(staff?.hoTen ?? 'A')[0]}
          </div>
          <span className="font-medium text-slate-700 hidden md:inline whitespace-nowrap">{staff?.hoTen ?? ''}</span>
        </div>
      </div>
    </header>
  )
}
