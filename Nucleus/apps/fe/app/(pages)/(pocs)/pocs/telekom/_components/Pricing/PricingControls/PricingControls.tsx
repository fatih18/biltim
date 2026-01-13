import { useId } from 'react'
import { Card } from '@/app/_components/Global'
import type { PricingControlsProps } from './types'

export function PricingControls({ store }: PricingControlsProps) {
  const baseCostId = useId()
  const purchaseModeId = useId()
  const purchaseDaysId = useId()
  const damgaId = useId()
  const marginId = useId()
  const overrideId = useId()
  const salesModeId = useId()
  const salesDaysId = useId()
  const monthlyRateId = useId()
  const annualRateId = useId()

  return (
    <Card
      title="Fiyatlandırma Kontrolleri"
      description="Satın alma, satış ve finansman parametrelerini ayarlayın."
    >
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-3">
        <section className="flex flex-col gap-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Satın Alma
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <fieldset className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor={baseCostId}>
                Alış Maliyeti
              </label>
              <input
                id={baseCostId}
                type="number"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={store.inputs.purchase.baseCost ?? 0}
                onChange={(event) => {
                  store.setBaseCost(Number(event.target.value))
                }}
                aria-label="Alış maliyetini girin"
                step="0.01"
                min="0"
              />
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor={purchaseModeId}>
                Ödeme Tipi
              </label>
              <select
                id={purchaseModeId}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={store.inputs.purchase.payment.mode ?? ''}
                onChange={(event) => {
                  store.setPurchasePayment(
                    event.target.value as typeof store.inputs.purchase.payment.mode,
                    store.inputs.purchase.payment.days
                  )
                }}
                aria-label="Satın alma ödeme tipi"
              >
                <option value="cash">Peşin</option>
                <option value="credit">Vadeli</option>
              </select>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor={purchaseDaysId}>
                Vade (gün)
              </label>
              <input
                id={purchaseDaysId}
                type="number"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={store.inputs.purchase.payment.days ?? 0}
                onChange={(event) => {
                  store.setPurchasePayment(
                    store.inputs.purchase.payment.mode,
                    Number(event.target.value)
                  )
                }}
                aria-label="Satın alma vadesini girin"
                min="0"
                max="365"
              />
            </fieldset>

            <fieldset className="flex items-center gap-3">
              <input
                id={damgaId}
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
                checked={store.inputs.purchase.damgaVergisiIncluded ?? false}
                onChange={(event) => {
                  store.toggleDamgaVergisi(event.target.checked)
                }}
                aria-label="Damga vergisini dahil et"
              />
              <label className="text-sm text-slate-700" htmlFor={damgaId}>
                Damga Vergisi Dahil
              </label>
            </fieldset>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Satış</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <fieldset className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor={marginId}>
                Kar Marjı (%)
              </label>
              <input
                id={marginId}
                type="number"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={store.inputs.sales.desiredMargin ?? 0}
                onChange={(event) => {
                  store.setDesiredMargin(Number(event.target.value))
                }}
                aria-label="Kar marjını girin"
                step="0.1"
                min="0"
                max="100"
              />
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor={overrideId}>
                Satış Fiyatı (Opsiyonel)
              </label>
              <input
                id={overrideId}
                type="number"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={store.inputs.sales.overridePrice ?? 0}
                placeholder="Manuel satış fiyatı"
                onChange={(event) => {
                  const nextValue = event.target.value
                  store.setOverridePrice(nextValue === '' ? null : Number(nextValue))
                }}
                aria-label="Satış fiyatını girin"
                step="0.01"
                min="0"
              />
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor={salesModeId}>
                Tahsilat Tipi
              </label>
              <select
                id={salesModeId}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={store.inputs.sales.payment.mode ?? ''}
                onChange={(event) => {
                  store.setSalesPayment(
                    event.target.value as typeof store.inputs.sales.payment.mode,
                    store.inputs.sales.payment.days
                  )
                }}
                aria-label="Tahsilat tipini seçin"
              >
                <option value="cash">Peşin</option>
                <option value="credit">Vadeli</option>
              </select>
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor={salesDaysId}>
                Tahsilat Vadesi (gün)
              </label>
              <input
                id={salesDaysId}
                type="number"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={store.inputs.sales.payment.days ?? 0}
                onChange={(event) => {
                  store.setSalesPayment(store.inputs.sales.payment.mode, Number(event.target.value))
                }}
                aria-label="Tahsilat vadesini girin"
                min="0"
                max="365"
              />
            </fieldset>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Finansman
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <fieldset className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor={monthlyRateId}>
                Aylık Finansman (%)
              </label>
              <input
                id={monthlyRateId}
                type="number"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={store.inputs.financing.monthlyRate}
                onChange={(event) => {
                  store.setFinancingRates(
                    Number(event.target.value),
                    store.inputs.financing.annualDiscountRate
                  )
                }}
                aria-label="Aylık finansman oranını girin"
                step="0.1"
                min="0"
              />
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor={annualRateId}>
                Yıllık İskonto (%)
              </label>
              <input
                id={annualRateId}
                type="number"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={store.inputs.financing.annualDiscountRate}
                onChange={(event) => {
                  store.setFinancingRates(
                    store.inputs.financing.monthlyRate,
                    Number(event.target.value)
                  )
                }}
                aria-label="Yıllık iskonto oranını girin"
                step="0.1"
                min="0"
              />
            </fieldset>
          </div>
        </section>
      </div>
    </Card>
  )
}
