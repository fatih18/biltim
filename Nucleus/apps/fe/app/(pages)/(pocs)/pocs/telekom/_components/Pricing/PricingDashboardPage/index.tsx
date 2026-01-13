'use client'

import { usePricingDashboardStore } from '@/app/(pages)/(pocs)/pocs/telekom/_store/pricingDashboardStore'
import { HeaderTelekom } from '../../HeaderTelekom'
import { AlertsPanel } from '../AlertsPanel'
import { CalculationTable } from '../CalculationTable'
import { CashFlowProjection } from '../CashFlowProjection'
import { CustomerInsights } from '../CustomerInsights'
import { HistoryTimeline } from '../HistoryTimeline'
import { MilestoneDistribution } from '../MilestoneDistribution'
import { PricingControls } from '../PricingControls'
import { ProfitabilitySummary } from '../ProfitabilitySummary'
import { ProjectInfoPanel } from '../ProjectInfoPanel'
import { ReportingPanel } from '../ReportingPanel'
import { ScenarioAnalysis } from '../ScenarioAnalysis'

export function PricingDashboardPage() {
  const store = usePricingDashboardStore()

  return (
    <main className="flex flex-col gap-6 p-6">
      <HeaderTelekom />
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="flex flex-col gap-6">
          <ProjectInfoPanel store={store} />
          <PricingControls store={store} />
        </div>
        <div className="flex flex-col gap-6">
          <ProfitabilitySummary store={store} />
          <AlertsPanel store={store} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 2xl:grid-cols-[2fr,1fr]">
        <CalculationTable store={store} />
        <div className="flex flex-col gap-6">
          <CashFlowProjection store={store} />
          <ScenarioAnalysis store={store} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr,1fr]">
        <MilestoneDistribution store={store} />
        <CustomerInsights store={store} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr,1fr]">
        <ReportingPanel store={store} />
        <HistoryTimeline store={store} />
      </section>
    </main>
  )
}
