# Biltim 5S — sunucuda çalıştırma

Uygulama `screen` oturumlarında elle koşuyordu. Bu, iki şeyi sessizce
kaybettiriyordu: makine yeniden başlarsa uygulama kalkmıyor, süreç çökerse
kimse ayağa kaldırmıyordu. Ölçüldü — `screen -S be -X quit` sonrasında
hiçbir şey geri gelmedi.

## İlk kurulum (bir kez)

```bash
cd /root/apps/biltim
cp Nucleus/deploy/biltim-be.service /etc/systemd/system/
cp Nucleus/deploy/biltim-fe.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now biltim-be biltim-fe
```

Eski `screen` oturumları artık gereksiz:

```bash
screen -S be -X quit
screen -S fe -X quit
```

## Güncelleme

Tek komut. Konsola uzun komut yazmak gerekmez; CyberArk/RDP konsolu tuş
düşürüyor ve Shift'li karakterleri (`| " & { } : $`) bozuyor.

```bash
cd /root/apps/biltim
bash update.sh
```

Betik sırasıyla şunları yapar: `git pull` → paket dosyaları değiştiyse
`bun install` → ön yüzü `.next-build`'e derler → arka ucu yeniden başlatıp
`/health` bekler → yeni derlemeyi `.next`'e koyup ön yüzü yeniden başlatır ve
`/login` bekler. Ayrıntılar ve garantiler betiğin başında
(`Nucleus/deploy/update.sh`).

| Komut | Ne yapar |
|---|---|
| `bash update.sh` | güncelle |
| `bash update.sh status` | sadece durum, hiçbir şeye dokunmaz |
| `bash update.sh nopull` | `git pull` yapmadan derle + yeniden başlat |
| `bash update.sh geri` | yalnız ön yüz: önceki derlemeyle yer değiştirir (tekrar yazınca geri döner); kod ve arka uç değişmez |

- **Derleme sırasında site açık kalır.** `next build` hedef klasörü baştan
  siliyor; eskiden canlı `.next`'e derlendiği için derleme boyunca site
  bozuluyordu, derleme başarısızsa bozuk kalıyordu (29 Eylül). Şimdi derleme
  yandaki klasöre yapılıyor, başarısızsa canlı siteye hiç dokunulmuyor.
- **Derleme internet istemez.** Yazı tipleri repoda (`apps/fe/app/fonts`);
  eskiden derleme Google Fonts'tan indiriyordu ve makinenin çıkışı kapalıyken
  derleme düşüyordu. Yalnız paket dosyaları değişirse `bun install` için npm'e
  erişim gerekir.
- **Konsol koparsa iş yarıda kalmaz.** İş ayrı bir oturumda koşar; kaydı
  `/root/biltim-deploy/update.log`.

## Kontrol

```bash
systemctl status biltim-be biltim-fe
curl -s localhost:1001/health
curl -sI localhost:3000
journalctl -u biltim-be -f
```

## Bilinmesi gerekenler

- **bun tam yolla çağrılıyor.** `PATH`'te `/snap/bin` önce geliyordu ve orada
  kaldırılmış bir snap'ten kalan ölü bir `bun` sembolik bağı vardı; o bağ
  Next'i derleyemeyen 1.3.9'u gösteriyordu. Servisler `/usr/local/bin/bun`
  kullanıyor — kurulu gerçek sürüm (1.4.2).
- **Arka uç veritabanını bekler.** Açılışta postgres hazır değilse nucleus
  şemayı itemeden düşer; bu yüzden `After=postgresql.service` ve yeniden
  deneme payı var.
- **Ön yüz arka uçtan sonra kalkar**, açılıştaki ilk istekler 500 dönmesin diye.
