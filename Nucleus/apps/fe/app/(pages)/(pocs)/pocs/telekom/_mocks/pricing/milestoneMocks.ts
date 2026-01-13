import type { CalendarMonth } from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/baseTypes'
import type {
  MilestoneDistribution,
  MilestoneEntry,
  MilestoneSettings,
  MilestoneTemplateId,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/milestoneTypes'

function createMonth(year: number, month: number): CalendarMonth {
  return {
    year: year,
    month: month,
  }
}

function createEntry(
  id: string,
  year: number,
  month: number,
  percentage: number,
  amount: number,
  isEditable: boolean
): MilestoneEntry {
  return {
    id: id,
    month: createMonth(year, month),
    percentage: percentage,
    amount: amount,
    isEditable: isEditable,
  }
}

export const defaultMilestoneDistribution: MilestoneDistribution = {
  id: 'milestone-default',
  templateId: 'thirtyFortyThirty',
  totalAmount: 11000,
  entries: [
    createEntry('milestone-1', 2025, 3, 30, 3300, false),
    createEntry('milestone-2', 2025, 4, 40, 4400, false),
    createEntry('milestone-3', 2025, 5, 30, 3300, false),
  ],
  isLocked: false,
}

export const defaultMilestoneSettings: MilestoneSettings = {
  defaultTemplate: 'thirtyFortyThirty',
  allowManualEdit: true,
  requiredTotalPercentage: 100,
  validationMessages: [],
}

export const milestoneTemplates: Record<MilestoneTemplateId, number[]> = {
  equal: [25, 25, 25, 25],
  thirtyFortyThirty: [30, 40, 30],
  frontLoaded: [50, 30, 20],
  backLoaded: [20, 30, 50],
  custom: [],
}
