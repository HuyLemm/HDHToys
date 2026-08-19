export type DebtStatus = "CHUA_DEN_HAN" | "SAP_DEN_HAN" | "QUA_HAN" | "DA_THANH_TOAN"

const SAP_DEN_HAN_DAYS = 7

export function resolveDebtStatus(conLai: number, ngayDenHan: Date, now: Date = new Date()): DebtStatus {
  if (conLai <= 0) return "DA_THANH_TOAN"
  const daysUntilDue = Math.ceil((ngayDenHan.getTime() - now.getTime()) / 86_400_000)
  if (daysUntilDue < 0) return "QUA_HAN"
  if (daysUntilDue <= SAP_DEN_HAN_DAYS) return "SAP_DEN_HAN"
  return "CHUA_DEN_HAN"
}

export function serializeDebt<T extends { soTien: number; daThanhToan: number; ngayDenHan: Date }>(debt: T) {
  const conLai = debt.soTien - debt.daThanhToan
  return { ...debt, conLai, trangThai: resolveDebtStatus(conLai, debt.ngayDenHan) }
}
