import { useState } from 'react'

const cache = new Map<string, unknown>()

/**
 * Giữ lại state (trang, bộ lọc, tìm kiếm, sắp xếp...) của một màn hình danh
 * sách qua các lần unmount/remount do điều hướng — VD: đang xem trang 3 danh
 * sách khách hàng, mở chi tiết 1 khách rồi bấm "Quay lại" thì mong muốn về
 * đúng trang 3, không bị reset về trang 1. App.tsx render lại toàn bộ theo
 * `nav.screen` (component bị unmount hẳn khi chuyển màn, không giữ trong
 * DOM), nên `useState` bình thường sẽ mất state mỗi lần rời màn hình — hook
 * này lưu vào 1 cache ở module-level (sống ngoài vòng đời component) thay vì
 * state riêng của từng lần mount.
 *
 * `key` phải duy nhất cho từng ô state của từng màn hình (VD 'orders.page',
 * 'orders.q') — dùng chung 1 key ở 2 nơi khác nhau sẽ bị lẫn state.
 */
export function useScreenState<T>(key: string, initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (cache.has(key)) return cache.get(key) as T
    return initial instanceof Function ? initial() : initial
  })

  function set(value: T | ((prev: T) => T)) {
    setState(prev => {
      const next = value instanceof Function ? value(prev) : value
      cache.set(key, next)
      return next
    })
  }

  return [state, set]
}
