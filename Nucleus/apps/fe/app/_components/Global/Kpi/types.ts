import type { ReactNode } from 'react'

export type KpiTrend = 'up' | 'down' | 'steady'

export type KpiProps = {
  title: string
  value: string
  subValue?: string
  trend?: KpiTrend
  trendLabel?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}
