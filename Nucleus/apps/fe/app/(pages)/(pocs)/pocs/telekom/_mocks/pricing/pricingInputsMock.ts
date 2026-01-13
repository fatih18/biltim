import type { PaymentTerm } from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/baseTypes'
import type {
  AdditionalCost,
  PricingInputs,
} from '@/app/(pages)/(pocs)/pocs/telekom/_types/pricing/pricingTypes'

function createPaymentTerm(mode: PaymentTerm['mode'], days: number): PaymentTerm {
  return {
    mode: mode,
    days: days,
  }
}

function createAdditionalCost(
  id: string,
  label: string,
  amount: number,
  category: AdditionalCost['category'],
  isPercentage: boolean,
  percentageValue: number | null
): AdditionalCost {
  return {
    id: id,
    label: label,
    amount: amount,
    category: category,
    isPercentage: isPercentage,
    percentageValue: percentageValue,
  }
}

export const defaultPricingInputs: PricingInputs = {
  project: {
    id: 'project-default',
    title: 'Fiber Optik Altyapı',
    projectDate: '2025-04-01',
    currency: 'TRY',
    exchangeRateToTry: 1,
    customerName: 'Telekom Müşteri A',
    trackInvestment: true,
    trackInvestments: true,
  },
  purchase: {
    baseCost: 10206,
    payment: createPaymentTerm('cash', 0),
    damgaVergisiIncluded: true,
    additionalCosts: [
      createAdditionalCost('damga', 'Damga Vergisi', 0.948, 'tax', true, 0.948),
      createAdditionalCost('demurrage', 'Demurrage', 149, 'logistics', false, null),
    ],
  },
  sales: {
    desiredMargin: 10,
    overridePrice: null,
    payment: createPaymentTerm('cash', 0),
  },
  financing: {
    monthlyRate: 1.5,
    annualDiscountRate: 18,
  },
}
