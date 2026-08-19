export function formatOrderCode(soThuTu: number, createdAt: Date) {
  return `HDH-${createdAt.getFullYear()}-${String(soThuTu).padStart(5, "0")}`
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  MOI: ["DANG_XU_LY", "DA_HUY"],
  DANG_XU_LY: ["HOAN_THANH", "DA_HUY"],
  HOAN_THANH: ["HOAN_TIEN"],
  DA_HUY: [],
  HOAN_TIEN: [],
}

export function canTransition(from: string, to: string) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
