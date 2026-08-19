import { Btn } from '../components/ui'
import type { Screen } from '../types'

const reports: { title: string; desc: string; target: Screen }[] = [
  { title: 'Báo cáo doanh thu', desc: 'Tổng quan doanh thu theo thời gian, danh mục, phương thức thanh toán', target: 'revenue' },
  { title: 'Báo cáo lợi nhuận', desc: 'Lợi nhuận gộp theo từng kỳ dựa trên đơn hàng hoàn thành', target: 'revenue' },
  { title: 'Báo cáo đơn hàng', desc: 'Danh sách và trạng thái toàn bộ đơn hàng', target: 'orders' },
  { title: 'Báo cáo tồn kho', desc: 'Giá trị tồn kho, hàng sắp hết và hết hàng', target: 'inventory' },
  { title: 'Báo cáo nhập / xuất kho', desc: 'Lịch sử giao dịch kho', target: 'inventory-history' },
  { title: 'Báo cáo sản phẩm', desc: 'Danh sách sản phẩm, giá vốn, giá bán, đã bán', target: 'products' },
  { title: 'Báo cáo khách hàng', desc: 'Danh sách khách hàng và hạng thành viên', target: 'customers' },
  { title: 'Báo cáo thu / chi', desc: 'Tổng hợp các khoản thu chi trong kỳ', target: 'thu-chi' },
  { title: 'Báo cáo công nợ', desc: 'Phải thu và phải trả theo đối tượng', target: 'ke-toan' },
  { title: 'Báo cáo kế toán', desc: 'Bảng cân đối kế toán và tình hình tài chính', target: 'ke-toan' },
]

export function BaoCaoScreen({ onNav }: { onNav: (s: Screen) => void }) {
  return (
    <div className="p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {reports.map(r => (
          <div key={r.title} className="bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="text-sm font-semibold text-slate-800">{r.title}</div>
            <div className="text-xs text-slate-500 mt-1">{r.desc}</div>
            <div className="mt-3">
              <Btn small onClick={() => onNav(r.target)}>Xem báo cáo</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
