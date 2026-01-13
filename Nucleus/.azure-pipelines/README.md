# Azure Pipelines - Modular Architecture

## 📁 Yapı

```
.azure-pipelines/
├── stages/           # Her app'in stage dosyası
├── templates/        # Reusable template'ler
└── NEW_APP_GUIDE.md  # Detaylı kılavuz
```

## 🚀 Yeni App Ekle

1. **Stage kopyala:**
   ```bash
   cp .azure-pipelines/stages/be-stage.yml .azure-pipelines/stages/my-app-stage.yml
   ```

2. **Parametreleri değiştir** (appName, port vb.)

3. **Ana pipeline'a ekle:**
   ```yaml
   - template: .azure-pipelines/stages/my-app-stage.yml
   ```

4. **TurboBuild'e compile/package ekle** (3 template çağrısı)

Detay için: `NEW_APP_GUIDE.md`
