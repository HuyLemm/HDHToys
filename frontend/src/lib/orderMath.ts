// Tính tổng tiền đơn hàng — dùng chung ở màn Tạo đơn hàng, tách riêng khỏi
// component để test được trực tiếp không cần render UI.
export interface OrderLineInput {
  soLuong: number
  giaBan: number
  giamGia: number
}

export interface OrderTotals {
  tamTinh: number
  giamGiaTong: number
  phiShipApDung: number
  tongCong: number
  thanhToanCuoiCung: number
}

export function computeOrderTotals(lines: OrderLineInput[], phiShip: number, isShip: boolean, tienCoc: number): OrderTotals {
  const tamTinh = lines.reduce((sum, l) => sum + l.soLuong * l.giaBan, 0)
  const giamGiaTong = lines.reduce((sum, l) => sum + l.giamGia, 0)
  const phiShipApDung = isShip ? phiShip : 0
  const tongCong = tamTinh - giamGiaTong + phiShipApDung
  const thanhToanCuoiCung = tongCong - tienCoc
  return { tamTinh, giamGiaTong, phiShipApDung, tongCong, thanhToanCuoiCung }
}
