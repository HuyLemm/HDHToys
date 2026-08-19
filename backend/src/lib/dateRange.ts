export type RangeKey = "hom_nay" | "hom_qua" | "7_ngay" | "30_ngay" | "thang_nay" | "quy_nay" | "nam_nay" | "tuy_chinh"

function startOfDay(d: Date) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

function endOfDay(d: Date) {
  const r = new Date(d)
  r.setHours(23, 59, 59, 999)
  return r
}

function addDays(d: Date, days: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

export function resolveDateRange(range: RangeKey, tuNgay?: Date, denNgay?: Date) {
  const now = new Date()

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
      return { tuNgay: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), denNgay: endOfDay(now) }
    case "quy_nay": {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
      return { tuNgay: startOfDay(new Date(now.getFullYear(), quarterStartMonth, 1)), denNgay: endOfDay(now) }
    }
    case "nam_nay":
      return { tuNgay: startOfDay(new Date(now.getFullYear(), 0, 1)), denNgay: endOfDay(now) }
    case "tuy_chinh":
      return {
        tuNgay: tuNgay ? startOfDay(tuNgay) : startOfDay(addDays(now, -6)),
        denNgay: denNgay ? endOfDay(denNgay) : endOfDay(now),
      }
  }
}
