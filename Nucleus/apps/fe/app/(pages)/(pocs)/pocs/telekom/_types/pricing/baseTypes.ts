export type CurrencyCode = 'TRY' | 'USD' | 'EUR'

export type PaymentMode = 'cash' | 'credit'

export type PaymentTerm = {
  mode: PaymentMode
  days: number
}

export type Percentage = number

export type MoneyValue = number

export type CalendarMonth = {
  year: number
  month: number
}

export type CalendarPeriod = 'monthly' | 'quarterly' | 'yearly'

export type AlertSeverity = 'info' | 'warning' | 'critical'
