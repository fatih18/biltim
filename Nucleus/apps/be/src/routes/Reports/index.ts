import { DashboardReport, OpenFindingsExcel } from '@/controllers'
import type { App } from '@/server'

export function ReportsRoute(app: App) {
  return app.group('/reports', (app) => {
    return app
      .get('/dashboard', DashboardReport)
      .get('/open-findings.xlsx', OpenFindingsExcel)
  })
}
