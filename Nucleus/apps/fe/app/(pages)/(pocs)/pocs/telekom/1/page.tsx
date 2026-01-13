'use client'
import Image from 'next/image'
import { useMailProcessedStore } from '@/app/(pages)/(pocs)/pocs/telekom/_store/mailProcessedStore'
import { HeaderTelekom } from '../_components'

export default function Home() {
  const { processedData } = useMailProcessedStore()
  const formatNumber = (num: number) => {
    if (!num && num !== 0) return '-'
    return new Intl.NumberFormat('tr-TR').format(num)
  }

  const formatCurrency = (num: number) => {
    if (!num && num !== 0) return '-'
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)
  }
  return (
    <div className="h-screen flex flex-col">
      <HeaderTelekom />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Image
            src={'/tt1.png'}
            alt="tt"
            width={350}
            height={60}
            className="place-self-center-safe"
          />
          {/* Üst Bilgi Paneli */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sol Panel - Para Birimi ve Fiyatlar */}
            <div className="bg-white rounded-lg shadow p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-sm font-medium text-gray-600">Para Birimi</span>
                <span className="text-sm font-semibold">
                  {processedData?.paraBirimi?.birim || 'TL'}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">NPV (%)</span>
                  <span className="font-medium">{processedData?.yazimTiklayin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ürün Alış Fiyatı</span>
                  <span className="font-medium">
                    {formatCurrency(Number(processedData?.urunAlisFiyati))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Kur</span>
                  <span className="font-medium">{processedData?.kur}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ürün Alış Fiyatı (TL)</span>
                  <span className="font-medium">
                    {formatCurrency(Number(processedData?.urunAlisFiyatiTL))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ürün Satış Fiyatı</span>
                  <span className="font-medium">
                    {formatCurrency(Number(processedData?.urunSatisFiyati))}
                  </span>
                </div>
              </div>
            </div>

            {/* Orta Panel - Müşteri Bilgileri */}
            <div className="bg-white rounded-lg shadow p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-sm font-medium text-gray-600">Müşteri İsmi</span>
                <span className="text-sm font-semibold">{processedData?.musteri?.ismi}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mevcut/Yeni</span>
                  <span className="font-medium">{processedData?.musteri?.mevcutYeni}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cihaz Alış Maliyeti</span>
                  <span className="font-medium">
                    {formatCurrency(Number(processedData?.musteri?.cihazAlisMaliyeti))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taksit Sayısı</span>
                  <span className="font-medium">{processedData?.musteri?.taksitSayisi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cihaz Satış Tutarı (TL)</span>
                  <span className="font-medium">
                    {formatCurrency(Number(processedData?.musteri?.cihazSatisTutari))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Taksit Sayısı</span>
                  <span className="font-medium">{processedData?.musteri?.taksitSayisi2}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Damga Vergisi</span>
                  <span className="font-medium">{processedData?.musteri?.damgaVergisi}</span>
                </div>
              </div>
            </div>

            {/* Sağ Panel - Proje ve Çalışma Bilgileri */}
            <div className="bg-white rounded-lg shadow p-5 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b">
                  <span className="text-sm font-medium text-gray-600">Proje Türü</span>
                  <span className="text-sm font-semibold">{processedData?.projeTuru}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={processedData?.karar?.pulu}
                      readOnly
                      className="rounded"
                    />
                    <span className="text-gray-600">Karar Pulu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={processedData?.karar?.kamuIhalePayi}
                      readOnly
                      className="rounded"
                    />
                    <span className="text-gray-600">Kamu İhale Payı</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm pt-2 border-t">
                <div className="flex justify-between">
                  <span className="text-gray-600">Çalıştılan Ay</span>
                  <span className="font-medium">{processedData?.calistilanAy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Çalıştılan Yıl</span>
                  <span className="font-medium">{processedData?.calistilanYil}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Vergi Oranları ve Açıklama Bilgileri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vergi Oranları */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-sm font-semibold mb-4 text-gray-700">Vergi Oranları</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">WACC</span>
                    <span className="font-medium">
                      {processedData?.vergiOranlari?.wacc?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vergi</span>
                    <span className="font-medium">
                      {processedData?.vergiOranlari?.vergi?.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Diğer Vergiler</span>
                    <span className="font-medium">
                      {processedData?.vergiOranlari?.digerVergiler?.value?.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      {processedData?.vergiOranlari?.digerVergiler?.percentage1}%
                    </span>
                    <span className="text-gray-500">
                      {processedData?.vergiOranlari?.digerVergiler?.percentage2}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Açıklama Bilgileri */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="text-sm font-semibold mb-4 text-gray-700">Açıklama Bilgileri</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Verilecek Cihazla</span>
                  <span className="font-medium text-xs">
                    {processedData?.aciklamaBilgileri?.verilecekCihazla}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cihaz Detayı (TR)</span>
                  <span className="font-medium text-xs">
                    {processedData?.aciklamaBilgileri?.cihazDetayiTurkce}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cihaz Detayı (EN)</span>
                  <span className="font-medium text-xs">
                    {processedData?.aciklamaBilgileri?.cihazDetayiIngilizce}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ödeme Tipi</span>
                  <span className="font-medium">{processedData?.aciklamaBilgileri?.odemeTipi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ürün</span>
                  <span className="font-medium">{processedData?.aciklamaBilgileri?.urun}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Finansal Özet Tablosu */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 border-b-2 border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700"></th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Toplam</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Nisan 25</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">Gelir</td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.toplam?.gelir)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.nisan25?.gelir)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">Opex</td>
                    <td className="px-4 py-2 text-center text-red-600">
                      ({formatNumber(Math.abs(processedData?.finansalTablo?.toplam?.opex || 0))})
                    </td>
                    <td className="px-4 py-2 text-center text-red-600">
                      ({formatNumber(Math.abs(processedData?.finansalTablo?.nisan25?.opex || 0))})
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700 italic pl-8">
                      Cihaz Maliyeti
                    </td>
                    <td className="px-4 py-2 text-center text-red-600">
                      (
                      {formatNumber(
                        Math.abs(processedData?.finansalTablo?.toplam?.cihazMaliyeti || 0)
                      )}
                      )
                    </td>
                    <td className="px-4 py-2 text-center text-red-600">
                      (
                      {formatNumber(
                        Math.abs(processedData?.finansalTablo?.nisan25?.cihazMaliyeti || 0)
                      )}
                      )
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700 italic pl-8">
                      Damga Vergisi
                    </td>
                    <td className="px-4 py-2 text-center">
                      ({formatNumber(processedData?.finansalTablo?.toplam?.damgaVergisi)})
                    </td>
                    <td className="px-4 py-2 text-center">
                      ({formatNumber(processedData?.finansalTablo?.nisan25?.damgaVergisi)})
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700 italic pl-8">
                      Other Opex (EHF - KKP)
                    </td>
                    <td className="px-4 py-2 text-center">
                      (
                      {formatNumber(Math.abs(processedData?.finansalTablo?.toplam?.otherOpex || 0))}
                      )
                    </td>
                    <td className="px-4 py-2 text-center">
                      (
                      {formatNumber(
                        Math.abs(processedData?.finansalTablo?.nisan25?.otherOpex || 0)
                      )}
                      )
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 font-semibold bg-blue-50">
                    <td className="px-4 py-2 text-gray-700">Ebit</td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.toplam?.ebit)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.nisan25?.ebit)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">Corporate Tax</td>
                    <td className="px-4 py-2 text-center text-red-600">
                      (
                      {formatNumber(
                        Math.abs(processedData?.finansalTablo?.toplam?.corporateTax || 0)
                      )}
                      )
                    </td>
                    <td className="px-4 py-2 text-center text-red-600">
                      (
                      {formatNumber(
                        Math.abs(processedData?.finansalTablo?.nisan25?.corporateTax || 0)
                      )}
                      )
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 font-semibold bg-green-50">
                    <td className="px-4 py-2 text-gray-700">CF</td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.toplam?.cf)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.nisan25?.cf)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 font-semibold">
                    <td className="px-4 py-2 text-gray-700">DCF</td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.toplam?.dcf)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.nisan25?.dcf)}
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50 font-semibold">
                    <td className="px-4 py-2 text-gray-700">PP</td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.toplam?.pp)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.nisan25?.pp)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Yıllık Projeksiyon Tablosu */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-5 py-3 bg-gray-100 border-b">
              <h3 className="text-sm font-semibold text-gray-700">
                {processedData?.yillikProjeksiyon?.baslik}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-700"></th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-700">Total</th>
                    {processedData?.yillikProjeksiyon?.yillar?.map((yilData) => (
                      <th
                        key={yilData.yil}
                        className="px-4 py-2 text-center font-semibold text-gray-700"
                      >
                        {yilData.yil}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">Gelir</td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.toplam?.gelir)}
                    </td>
                    {processedData?.yillikProjeksiyon?.yillar?.map((yilData) => (
                      <td key={yilData.yil} className="px-4 py-2 text-center">
                        {formatNumber(yilData.gelir)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">Opex</td>
                    <td className="px-4 py-2 text-center text-red-600">
                      ({formatNumber(Math.abs(processedData?.finansalTablo?.toplam?.opex || 0))})
                    </td>
                    {processedData?.yillikProjeksiyon?.yillar?.map((yilData) => (
                      <td key={yilData.yil} className="px-4 py-2 text-center text-red-600">
                        {yilData.opex !== 0
                          ? `(${formatNumber(Math.abs(yilData.opex))})`
                          : formatNumber(yilData.opex)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700 italic pl-8">
                      Cihaz Maliyeti
                    </td>
                    <td className="px-4 py-2 text-center text-red-600">
                      (
                      {formatNumber(
                        Math.abs(processedData?.finansalTablo?.toplam?.cihazMaliyeti || 0)
                      )}
                      )
                    </td>
                    {processedData?.yillikProjeksiyon?.yillar?.map((yilData) => (
                      <td key={yilData.yil} className="px-4 py-2 text-center text-red-600">
                        {yilData.cihazMaliyeti !== 0
                          ? `(${formatNumber(Math.abs(yilData.cihazMaliyeti))})`
                          : formatNumber(yilData.cihazMaliyeti)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700 italic pl-8">
                      Damga Vergisi
                    </td>
                    <td className="px-4 py-2 text-center">
                      ({formatNumber(processedData?.finansalTablo?.toplam?.damgaVergisi)})
                    </td>
                    {processedData?.yillikProjeksiyon?.yillar?.map((yilData) => (
                      <td key={yilData.yil} className="px-4 py-2 text-center">
                        {yilData.damgaVergisi !== 0
                          ? `(${formatNumber(yilData.damgaVergisi)})`
                          : formatNumber(yilData.damgaVergisi)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700 italic pl-8">
                      Other Opex (EHF - KKP)
                    </td>
                    <td className="px-4 py-2 text-center">
                      (
                      {formatNumber(Math.abs(processedData?.finansalTablo?.toplam?.otherOpex || 0))}
                      )
                    </td>
                    {processedData?.yillikProjeksiyon?.yillar?.map((yilData) => (
                      <td key={yilData.yil} className="px-4 py-2 text-center">
                        {yilData.otherOpex !== 0
                          ? `(${formatNumber(Math.abs(yilData.otherOpex))})`
                          : formatNumber(yilData.otherOpex)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 font-semibold bg-blue-50">
                    <td className="px-4 py-2 text-gray-700">Ebit</td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.toplam?.ebit)}
                    </td>
                    {processedData?.yillikProjeksiyon?.yillar?.map((yilData) => (
                      <td key={yilData.yil} className="px-4 py-2 text-center">
                        {formatNumber(yilData.ebit)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-700">Corporate Tax</td>
                    <td className="px-4 py-2 text-center text-red-600">
                      (
                      {formatNumber(
                        Math.abs(processedData?.finansalTablo?.toplam?.corporateTax || 0)
                      )}
                      )
                    </td>
                    {processedData?.yillikProjeksiyon?.yillar?.map((yilData) => (
                      <td key={yilData.yil} className="px-4 py-2 text-center text-red-600">
                        {yilData.corporateTax !== 0
                          ? `(${formatNumber(Math.abs(yilData.corporateTax))})`
                          : formatNumber(yilData.corporateTax)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 font-semibold bg-green-50">
                    <td className="px-4 py-2 text-gray-700">CF</td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.toplam?.cf)}
                    </td>
                    {processedData?.yillikProjeksiyon?.yillar?.map((yilData) => (
                      <td key={yilData.yil} className="px-4 py-2 text-center">
                        {formatNumber(yilData.cf)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-50 font-semibold">
                    <td className="px-4 py-2 text-gray-700">DCF</td>
                    <td className="px-4 py-2 text-center">
                      {formatNumber(processedData?.finansalTablo?.toplam?.dcf)}
                    </td>
                    {processedData?.yillikProjeksiyon?.yillar?.map((yilData) => (
                      <td key={yilData.yil} className="px-4 py-2 text-center">
                        {formatNumber(yilData.dcf)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sonuçlar Kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-5 text-white">
              <div className="text-sm opacity-90 mb-1">Ebit</div>
              <div className="text-2xl font-bold">
                {formatNumber(Number(processedData?.sonuclar?.ebit))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-5 text-white">
              <div className="text-sm opacity-90 mb-1">NPV</div>
              <div className="text-2xl font-bold">
                {formatNumber(Number(processedData?.sonuclar?.npv))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-5 text-white">
              <div className="text-sm opacity-90 mb-1">EBIT %</div>
              <div className="text-2xl font-bold">
                {processedData?.sonuclar?.ebitYuzde?.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-5 text-white">
              <div className="text-sm opacity-90 mb-1">NPV %</div>
              <div className="text-2xl font-bold">
                {processedData?.sonuclar?.npvYuzde?.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
