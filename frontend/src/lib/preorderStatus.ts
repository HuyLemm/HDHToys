const VN_OFFSET_MS = 7 * 60 * 60 * 1000

function vnDayKey(d: Date) {
  const vn = new Date(d.getTime() + VN_OFFSET_MS)
  return `${vn.getUTCFullYear()}-${vn.getUTCMonth()}-${vn.getUTCDate()}`
}

export type PreorderDueStatus = 'toi' | 'qua'

/**
 * So sánh theo NGÀY lịch (giờ VN), không theo giờ giấc: ngayDuKienVe rơi
 * đúng hôm nay -> 'toi' (đến hạn), sớm hơn hôm nay -> 'qua' (quá hạn), muộn
 * hơn hôm nay -> null (chưa tới hạn, chưa cần cảnh báo).
 */
export function preorderDueStatus(ngayDuKienVe: string | Date): PreorderDueStatus | null {
  const target = new Date(ngayDuKienVe)
  const now = new Date()
  if (vnDayKey(target) === vnDayKey(now)) return 'toi'
  return target.getTime() < now.getTime() ? 'qua' : null
}
