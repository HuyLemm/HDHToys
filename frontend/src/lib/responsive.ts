import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 767px)'

/** Mirrors Tailwind's `md` breakpoint (768px) so JS-driven layout (the sidebar drawer) stays in sync with the CSS. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
