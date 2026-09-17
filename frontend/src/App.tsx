import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { DialogProvider } from './lib/dialog'
import { useIsMobile } from './lib/responsive'
import { Sidebar, Header } from './components/Layout'
import { Spinner } from './components/ui'
import { LoginScreen } from './screens/Login'
import { DashboardScreen } from './screens/Dashboard'
import { OrdersScreen } from './screens/Orders'
import { OrderDetailScreen } from './screens/OrderDetail'
import { CreateOrderScreen } from './screens/CreateOrder'
import { InventoryScreen } from './screens/Inventory'
import { InventoryHistoryScreen } from './screens/InventoryHistory'
import { ProductsScreen } from './screens/Products'
import { ProductDetailScreen } from './screens/ProductDetail'
import { CustomersScreen } from './screens/Customers'
import { CustomerDetailScreen } from './screens/CustomerDetail'
import { InvoicesScreen } from './screens/Invoices'
import { InvoiceDetailScreen } from './screens/InvoiceDetail'
import { RevenueScreen } from './screens/Revenue'
import { ThuChiScreen } from './screens/ThuChi'
import { KeToanScreen } from './screens/KeToan'
import { BaoCaoScreen } from './screens/BaoCao'
import { CaiDatScreen } from './screens/CaiDat'
import type { Screen } from './types'

const titles: Record<string, string> = {
  dashboard: 'Tổng quan hệ thống',
  orders: 'Quản lý đơn hàng',
  'order-detail': 'Chi tiết đơn hàng',
  'create-order': 'Tạo đơn hàng',
  inventory: 'Quản lý kho',
  'inventory-history': 'Lịch sử kho',
  products: 'Quản lý sản phẩm',
  'product-detail': 'Chi tiết sản phẩm',
  customers: 'Quản lý khách hàng',
  'customer-detail': 'Hồ sơ khách hàng',
  invoices: 'Quản lý hóa đơn',
  'invoice-detail': 'Chi tiết hóa đơn',
  revenue: 'Doanh thu',
  'thu-chi': 'Quản lý thu / chi',
  'ke-toan': 'Kế toán',
  'bao-cao': 'Báo cáo',
  'cai-dat': 'Cài đặt',
}

interface Nav { screen: Screen; id?: string }

// Các màn hình chi tiết cần "id" mới hiển thị được — nếu URL thiếu id (gõ tay,
// link cũ...) thì rơi về Dashboard cho an toàn thay vì crash.
const SCREENS_REQUIRING_ID: Screen[] = ['order-detail', 'product-detail', 'customer-detail', 'invoice-detail']

function navFromLocation(): Nav {
  const params = new URLSearchParams(window.location.search)
  const screen = params.get('screen') as Screen | null
  const id = params.get('id') ?? undefined
  if (!screen) return { screen: 'dashboard' }
  if (SCREENS_REQUIRING_ID.includes(screen) && !id) return { screen: 'dashboard' }
  return { screen, id }
}

function navToUrl(nav: Nav): string {
  const params = new URLSearchParams()
  params.set('screen', nav.screen)
  if (nav.id) params.set('id', nav.id)
  return `?${params.toString()}`
}

function AppShell() {
  const { staff, loading } = useAuth()
  // navStack ghi lại toàn bộ đường đi đã qua (không chỉ màn hiện tại) — nút
  // "Quay lại" của từng màn trước đây gọi go(<màn cha cố định>) nên luôn về
  // đúng 1 nơi bất kể đi từ đâu tới (VD xem sản phẩm từ tab "Khách đã mua" ->
  // mở 1 đơn hàng -> bấm Quay lại thì lẽ ra phải về lại trang sản phẩm đó,
  // nhưng lại về thẳng danh sách Đơn hàng). goBack() dưới đây bỏ đúng 1 bước
  // vừa đi, về đúng màn trước đó bất kể đường đi thế nào.
  const [navStack, setNavStack] = useState<Nav[]>(() => [navFromLocation()])
  const nav = navStack[navStack.length - 1]
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isMobile = useIsMobile()

  // Đồng bộ với URL trình duyệt (query string) + nút Back/Forward của
  // trình duyệt/chuột — trước đây điều hướng chỉ là state nội bộ, nút back
  // của trình duyệt không có tác dụng gì cả. Lưu cả navStack (không chỉ màn
  // hiện tại) vào history.state để nút back/forward CỦA TRÌNH DUYỆT cũng đi
  // đúng từng bước một thay vì nhảy thẳng.
  useEffect(() => {
    window.history.replaceState(navStack, '', navToUrl(nav))

    function onPopState(e: PopStateEvent) {
      const state = e.state as Nav[] | null
      setNavStack(state && state.length > 0 ? state : [navFromLocation()])
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function go(screen: Screen, id?: string) {
    const next: Nav = { screen, id }
    const nextStack = [...navStack, next]
    window.history.pushState(nextStack, '', navToUrl(next))
    setNavStack(nextStack)
  }

  /** Bỏ đúng 1 bước vừa đi, về lại màn hình trước đó — dùng cho mọi nút "Quay lại". */
  function goBack() {
    if (navStack.length <= 1) return
    const nextStack = navStack.slice(0, -1)
    window.history.pushState(nextStack, '', navToUrl(nextStack[nextStack.length - 1]))
    setNavStack(nextStack)
  }

  function toggleSidebar() {
    if (isMobile) setMobileNavOpen(v => !v)
    else setCollapsed(v => !v)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  }

  if (!staff) return <LoginScreen />

  function renderScreen() {
    switch (nav.screen) {
      case 'dashboard': return <DashboardScreen onNav={go} />
      case 'orders': return <OrdersScreen onDetail={id => go('order-detail', id)} onCreate={() => go('create-order')} onViewCustomer={id => go('customer-detail', id)} />
      case 'order-detail': return <OrderDetailScreen orderId={nav.id!} onBack={goBack} onViewProduct={id => go('product-detail', id)} />
      case 'create-order': return <CreateOrderScreen onBack={goBack} onCreated={id => go('order-detail', id)} />
      case 'inventory': return <InventoryScreen onHistory={() => go('inventory-history')} />
      case 'inventory-history': return <InventoryHistoryScreen onBack={goBack} />
      case 'products': return <ProductsScreen onDetail={id => go('product-detail', id)} />
      case 'product-detail': return <ProductDetailScreen productId={nav.id!} onBack={goBack} onViewCustomer={id => go('customer-detail', id)} onViewOrder={id => go('order-detail', id)} />
      case 'customers': return <CustomersScreen onDetail={id => go('customer-detail', id)} />
      case 'customer-detail': return <CustomerDetailScreen customerId={nav.id!} onBack={goBack} onOrderDetail={id => go('order-detail', id)} />
      case 'invoices': return <InvoicesScreen onDetail={id => go('invoice-detail', id)} />
      case 'invoice-detail': return <InvoiceDetailScreen invoiceId={nav.id!} onBack={goBack} onViewOrder={id => go('order-detail', id)} />
      case 'revenue': return <RevenueScreen />
      case 'thu-chi': return <ThuChiScreen />
      case 'ke-toan': return <KeToanScreen />
      case 'bao-cao': return <BaoCaoScreen onNav={go} />
      case 'cai-dat': return <CaiDatScreen />
      default: return null
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0f2f7' }}>
      <Sidebar active={nav.screen} onNav={go} collapsed={collapsed} onToggleCollapsed={toggleSidebar} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={titles[nav.screen] ?? ''} onToggleSidebar={toggleSidebar} onNav={go} />
        <main className="flex-1 overflow-y-auto">
          {renderScreen()}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <AppShell />
      </DialogProvider>
    </AuthProvider>
  )
}
