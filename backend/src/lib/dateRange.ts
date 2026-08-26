export type RangeKey = "hom_nay" | "hom_qua" | "7_ngay" | "30_ngay" | "thang_nay" | "quy_nay" | "nam_nay" | "tuy_chinh"

// Việt Nam không có giờ mùa hè, lệch cố định UTC+7 quanh năm — dùng offset cố
// định này để tính đúng ranh giới ngày theo giờ Việt Nam bất kể server chạy ở
// múi giờ nào (Render mặc định UTC). Trước đây dùng Date#setHours (giờ LOCAL
// của server) nên "hôm nay/tháng này/..." lệch ~7 tiếng khi chạy trên UTC —
// đơn đặt lúc 0h-7h sáng giờ VN bị tính nhầm sang ngày hôm trước.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000

function vnWallClockParts(d: Date) {
  const vn = new Date(d.getTime() + VN_OFFSET_MS)
  return { year: vn.getUTCFullYear(), month: vn.getUTCMonth(), day: vn.getUTCDate() }
}

function startOfVnDay(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - VN_OFFSET_MS)
}

function endOfVnDay(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - VN_OFFSET_MS)
}

export function startOfDay(d: Date) {
  const { year, month, day } = vnWallClockParts(d)
  return startOfVnDay(year, month, day)
}

export function endOfDay(d: Date) {
  const { year, month, day } = vnWallClockParts(d)
  return endOfVnDay(year, month, day)
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86_400_000)
}

export function resolveDateRange(range: RangeKey, tuNgay?: Date, denNgay?: Date) {
  const now = new Date()
  const { year, month } = vnWallClockParts(now)

  switch (range) {
    case "hom_nay":
      return { tuNgay: startOfDay(now), denNgay: endOfDay(now) }
    case "hom_qua": {
      const yesterday = addDays(now, -1)
      return { tuNgay: startOfDay(yesterday), denNgay: endOfDay(yesterday) }
    }
    case "7_ngay":
      return { tuNgay: startOfDay(addDays(now, -6)), denNgay: endOfDay(now) }
    case "30_ngay":
      return { tuNgay: startOfDay(addDays(now, -29)), denNgay: endOfDay(now) }
    case "thang_nay":
      return { tuNgay: startOfVnDay(year, month, 1), denNgay: endOfDay(now) }
    case "quy_nay": {
      const quarterStartMonth = Math.floor(month / 3) * 3
      return { tuNgay: startOfVnDay(year, quarterStartMonth, 1), denNgay: endOfDay(now) }
    }
    case "nam_nay":
      return { tuNgay: startOfVnDay(year, 0, 1), denNgay: endOfDay(now) }
    case "tuy_chinh":
      return {
        tuNgay: tuNgay ? startOfDay(tuNgay) : startOfDay(addDays(now, -6)),
        denNgay: denNgay ? endOfDay(denNgay) : endOfDay(now),
      }
  }
}
