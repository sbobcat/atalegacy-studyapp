import type { ReactNode } from 'react'

interface LiveRegionProps {
  children: ReactNode
  className?: string
}

function LiveRegion({ children, className }: LiveRegionProps) {
  return (
    <div aria-live="polite" aria-atomic="true" className={className}>
      {children}
    </div>
  )
}

export default LiveRegion
