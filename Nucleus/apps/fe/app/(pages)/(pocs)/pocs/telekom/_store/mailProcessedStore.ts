/** biome-ignore-all lint/suspicious/noExplicitAny: <> */
import { createStore } from 'h-state'
import type { MethodCreators } from 'h-state/dist/types'

export type MailProcessedData = {
  paraBirimi: { birim: string }
  yazimTiklayin: string
  urunAlisFiyati: number
  kur: number
  urunAlisFiyatiTL: number
  urunSatisFiyati: number
  musteri: {
    ismi: string
    mevcutYeni: string
    cihazAlisMaliyeti: number
    taksitSayisi: number
    cihazSatisTutari: number
    taksitSayisi2: number
    damgaVergisi: string
  }
  projeTuru: string
  karar: { pulu: boolean; kamuIhalePayi: boolean }
  calistilanAy: string
  calistilanYil: number
  vergiOranlari: {
    wacc: number
    vergi: number
    digerVergiler: { value: number; percentage1: number; percentage2: number }
  }
  aciklamaBilgileri: {
    verilecekCihazla: string
    cihazDetayiTurkce: string
    cihazDetayiIngilizce: string
    odemeTipi: string
    urun: string
  }
  finansalTablo: Record<string, any>
  yillikProjeksiyon: { baslik: string; yillar: any[] }
  sonuclar: { ebit: number; npv: number; ebitYuzde: number; npvYuzde: number }
}

type MailStoreMethods = {
  setProcessedData: (data: MailProcessedData) => undefined
  clearProcessedData: () => undefined
}

type MailStoreState = {
  processedData: MailProcessedData | null
}

type MailStore = MailStoreState & MailStoreMethods

const initialState: MailStoreState = {
  processedData: null,
}

const methodCreators: MethodCreators<MailStoreState, MailStoreMethods> = {
  setProcessedData(store) {
    return (data: MailProcessedData) => {
      store.processedData = data
      return undefined
    }
  },
  clearProcessedData(store) {
    return () => {
      store.processedData = null
      return undefined
    }
  },
}

const { useStore: useMailProcessedStore } = createStore<MailStoreState, MailStoreMethods>(
  initialState,
  methodCreators
)

export type { MailStore }
export { useMailProcessedStore }
