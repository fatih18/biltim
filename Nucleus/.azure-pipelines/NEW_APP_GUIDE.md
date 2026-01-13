# 🚀 Yeni Uygulama Ekleme Kılavuzu

Pipeline'a yeni bir uygulama eklemek artık çok basit! Sadece template çağrıları eklemen yeterli.

## Backend Uygulaması Eklemek

### 1. TurboBuild Stage'ine Ekle

`azure-pipelines.yml` dosyasında, "COMPILE & PREPARE" bölümüne ekle:

```yaml
# ============================================
# COMPILE & PREPARE MY-NEW-APP
# ============================================
- template: .azure-pipelines/templates/compile-backend-binary.yml
  parameters:
    appName: 'my-new-app'
    appPath: 'apps'
    externalDeps:
      - pg
      - drizzle-orm
      - postgres
      - argon2

- template: .azure-pipelines/templates/create-minimal-deps.yml
  parameters:
    appName: 'my-new-app'
    dependencies:
      pg: 'latest'
      drizzle-orm: '0.44.7'
      postgres: 'latest'
      argon2: 'latest'

# Package artifact
- template: .azure-pipelines/templates/package-backend-artifact.yml
  parameters:
    appName: 'my-new-app'
    hasPublicFolder: true

# Publish artifact
- task: PublishPipelineArtifact@1
  displayName: 'Publish my-new-app minimal'
  condition: eq(variables['buildOutput.myNewAppBuilt'], 'true')
  inputs:
    targetPath: $(Build.ArtifactStagingDirectory)/my-new-app-minimal
    artifact: 'my-new-app-minimal'
    publishLocation: 'pipeline'
```

### 2. App Detection Ekle

Turbo build script'inde app detection ekle:

```yaml
# Turbo build sonrası
if [ -d "apps/my-new-app/src" ]; then
  echo "✅ My New App: Source found"
  echo "##vso[task.setvariable variable=myNewAppBuilt;isOutput=true]true"
else
  echo "❌ My New App: Source not found"
  echo "##vso[task.setvariable variable=myNewAppBuilt;isOutput=true]false"
fi
```

### 3. Build & Deploy Stage Ekle

Pipeline'ın sonuna ekle:

```yaml
# ============================================
# STAGE X - MY NEW APP BUILD & DEPLOY
# ============================================
- stage: BuildAndDeployMyNewApp
  displayName: '🚀 My New App Build & Deploy'
  dependsOn: TurboBuild
  condition: and(succeeded(), eq(dependencies.TurboBuild.outputs['Build.buildOutput.myNewAppBuilt'], 'true'))
  jobs:
  - job: DebugMyNewApp
    displayName: '🔍 Debug My New App Stage'
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - bash: |
        echo "============================================"
        echo "🚀 STAGE X: MY NEW APP BUILD & DEPLOY"
        echo "============================================"
        echo "Condition met: My New App was built in TurboBuild"
        echo "============================================"
      displayName: '🔍 Debug: My New App Stage Started'
  
  # TODO: Add template call when ready
  # - template: .azure-pipelines/templates/app-build-deploy-simple.yml
  #   parameters:
  #     appName: 'my-new-app'
  #     appType: 'backend'
  #     buildCondition: 'myNewApp'
  #     port: 5000
  #     hasDaprSubscription: false
```

## Frontend Uygulaması Eklemek

Frontend için compile adımı yok, sadece package:

### 1. Package Adımı (Frontend-specific)

Frontend package karmaşık olduğu için şimdilik manual. Template'e çevireceğiz.

### 2. App Detection

```yaml
if [ -d "apps/my-new-fe/.next/standalone" ]; then
  echo "✅ My New FE: Built successfully"
  echo "##vso[task.setvariable variable=myNewFeBuilt;isOutput=true]true"
else
  echo "❌ My New FE: Not built"
  echo "##vso[task.setvariable variable=myNewFeBuilt;isOutput=true]false"
fi
```

## Template'ler

### Mevcut Template'ler

1. **`compile-backend-binary.yml`** - Bun ile binary compile
2. **`create-minimal-deps.yml`** - Minimal runtime dependencies
3. **`package-backend-artifact.yml`** - Binary + deps + public → artifact
4. **`app-build-deploy-simple.yml`** - Docker build + K8s deploy (yakında)

### Template Parametreleri

#### compile-backend-binary.yml
- `appName`: App adı (örn: 'be', 'bifrost')
- `appPath`: App yolu (varsayılan: 'apps')
- `externalDeps`: Bundle edilmeyecek dependencies (array)

#### create-minimal-deps.yml
- `appName`: App adı
- `dependencies`: Dependency map (key: version)

#### package-backend-artifact.yml
- `appName`: App adı
- `hasPublicFolder`: Public klasörü var mı (boolean)

## Örnek: "analytics" Backend Ekleme

### Tam kod:

```yaml
# TurboBuild stage'inde

# Detection (Turbo build sonrası)
if [ -d "apps/analytics/src" ]; then
  echo "✅ Analytics: Source found"
  echo "##vso[task.setvariable variable=analyticsBuilt;isOutput=true]true"
else
  echo "❌ Analytics: Source not found"
  echo "##vso[task.setvariable variable=analyticsBuilt;isOutput=true]false"
fi

# Compile & Prepare
- template: .azure-pipelines/templates/compile-backend-binary.yml
  parameters:
    appName: 'analytics'
    appPath: 'apps'
    externalDeps: [pg, drizzle-orm, postgres]

- template: .azure-pipelines/templates/create-minimal-deps.yml
  parameters:
    appName: 'analytics'
    dependencies:
      pg: 'latest'
      drizzle-orm: '0.44.7'
      postgres: 'latest'

- template: .azure-pipelines/templates/package-backend-artifact.yml
  parameters:
    appName: 'analytics'
    hasPublicFolder: false

- task: PublishPipelineArtifact@1
  displayName: 'Publish analytics minimal'
  condition: eq(variables['buildOutput.analyticsBuilt'], 'true')
  inputs:
    targetPath: $(Build.ArtifactStagingDirectory)/analytics-minimal
    artifact: 'analytics-minimal'
    publishLocation: 'pipeline'

# Yeni Stage
- stage: BuildAndDeployAnalytics
  displayName: '🚀 Analytics Build & Deploy'
  dependsOn: TurboBuild
  condition: and(succeeded(), eq(dependencies.TurboBuild.outputs['Build.buildOutput.analyticsBuilt'], 'true'))
  jobs:
  - job: DebugAnalytics
    displayName: '🔍 Debug Analytics Stage'
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - bash: echo "Analytics stage started"
      displayName: 'Debug'
```

## Özet

✅ **Backend eklemek için 4 template çağrısı + 1 stage**
✅ **Her app bağımsız ve paralel çalışır**
✅ **Debug mesajları her adımda**
✅ **Tekrarlanan kod yok**

Gelecekte 10, 20 app olsa bile temiz ve yönetilebilir! 🎯
