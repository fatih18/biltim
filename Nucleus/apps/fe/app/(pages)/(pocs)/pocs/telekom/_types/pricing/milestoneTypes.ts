import type { CalendarMonth, MoneyValue, Percentage } from './baseTypes'

export type MilestoneTemplateId =
  | 'equal'
  | 'thirtyFortyThirty'
  | 'frontLoaded'
  | 'backLoaded'
  | 'custom'

export type MilestoneDistribution = {
  id: string
  templateId: MilestoneTemplateId
  totalAmount: MoneyValue
  entries: MilestoneEntry[]
  isLocked: boolean
}

export type MilestoneEntry = {
  id: string
  month: CalendarMonth
  percentage: Percentage
  amount: MoneyValue
  isEditable: boolean
}

export type MilestoneSettings = {
  defaultTemplate: MilestoneTemplateId
  allowManualEdit: boolean
  requiredTotalPercentage: Percentage
  validationMessages: string[]
}
