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

Sıra önemli: ön yüz derlenmiş çıktıyı servis eder, o yüzden `build` restart'tan
önce gelir.

```bash
cd /root/apps/biltim
git pull
cd Nucleus && bun install
cd apps/fe && bun run build
systemctl restart biltim-be biltim-fe
```

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
