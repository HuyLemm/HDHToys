import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
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

function AppShell() {
  const { staff, loading } = useAuth()
  const [nav, setNav] = useState<Nav>({ screen: 'dashboard' })
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isMobile = useIsMobile()

  function go(screen: Screen, id?: string) {
    setNav({ screen, id })
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
      case 'orders': return <OrdersScreen onDetail={id => go('order-detail', id)} onCreate={() => go('create-order')} />
      case 'order-detail': return <OrderDetailScreen orderId={nav.id!} onBack={() => go('orders')} />
      case 'create-order': return <CreateOrderScreen onBack={() => go('orders')} onCreated={id => go('order-detail', id)} />
      case 'inventory': return <InventoryScreen onHistory={() => go('inventory-history')} />
      case 'inventory-history': return <InventoryHistoryScreen onBack={() => go('inventory')} />
      case 'products': return <ProductsScreen onDetail={id => go('product-detail', id)} />
      case 'product-detail': return <ProductDetailScreen productId={nav.id!} onBack={() => go('products')} />
      case 'customers': return <CustomersScreen onDetail={id => go('customer-detail', id)} />
      case 'customer-detail': return <CustomerDetailScreen customerId={nav.id!} onBack={() => go('customers')} onOrderDetail={id => go('order-detail', id)} />
      case 'invoices': return <InvoicesScreen onDetail={id => go('invoice-detail', id)} />
      case 'invoice-detail': return <InvoiceDetailScreen invoiceId={nav.id!} onBack={() => go('invoices')} onViewOrder={id => go('order-detail', id)} />
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
      <Sidebar active={nav.screen} onNav={go} collapsed={collapsed} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
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
      <AppShell />
    </AuthProvider>
  )
}
