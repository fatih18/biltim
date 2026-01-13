#!/usr/bin/env bun
/**
 * Bundle script for Windows deployment
 * Creates a self-contained deployment package
 *
 * Usage: bun run scripts/bundle-for-deployment.ts
 */

import { $ } from 'bun'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..')
const DIST = join(ROOT, 'dist-deployment')
const REQUIRED_PACKAGES = join(ROOT, '../required_packages')

async function main() {
  console.log('🚀 Starting deployment bundle...\n')

  // Clean previous build
  if (existsSync(DIST)) {
    console.log('🗑️  Cleaning previous build...')
    rmSync(DIST, { recursive: true })
  }
  mkdirSync(DIST, { recursive: true })

  // Step 1: Build Frontend (Next.js standalone)
  console.log('\n📦 Building Frontend (Next.js standalone)...')
  await $`bun run --cwd ${join(ROOT, 'apps/fe')} build`.quiet()

  const standaloneDir = join(ROOT, 'apps/fe/.next/standalone')
  const staticDir = join(ROOT, 'apps/fe/.next/static')
  const publicDir = join(ROOT, 'apps/fe/public')

  if (!existsSync(standaloneDir)) {
    throw new Error('Standalone build not found! Check Next.js build output.')
  }

  // Copy standalone output
  console.log('📁 Copying frontend standalone...')
  cpSync(standaloneDir, join(DIST, 'frontend'), { recursive: true })

  // Copy static files (required for standalone)
  if (existsSync(staticDir)) {
    cpSync(staticDir, join(DIST, 'frontend/apps/fe/.next/static'), {
      recursive: true,
    })
  }

  // Copy public folder
  if (existsSync(publicDir)) {
    cpSync(publicDir, join(DIST, 'frontend/apps/fe/public'), {
      recursive: true,
    })
  }

  // Copy ALL dependencies from bun cache to frontend node_modules
  // This ensures Next.js standalone has all required packages
  console.log('📁 Copying all Next.js dependencies from bun cache...')
  const bunCache = join(ROOT, 'node_modules/.bun')
  const feNodeModules = join(DIST, 'frontend/apps/fe/node_modules')

  mkdirSync(feNodeModules, { recursive: true })

  let copiedCount = 0
  if (existsSync(bunCache)) {
    const bunCacheEntries = readdirSync(bunCache)

    for (const entry of bunCacheEntries) {
      const entryPath = join(bunCache, entry, 'node_modules')
      if (!existsSync(entryPath)) continue

      const packages = readdirSync(entryPath)
      for (const pkg of packages) {
        const sourcePath = join(entryPath, pkg)

        // Handle scoped packages (@org/package)
        if (pkg.startsWith('@')) {
          const scopedPackages = readdirSync(sourcePath)
          for (const scopedPkg of scopedPackages) {
            const scopedSource = join(sourcePath, scopedPkg)
            const scopedDest = join(feNodeModules, pkg, scopedPkg)
            if (!existsSync(scopedDest)) {
              mkdirSync(join(feNodeModules, pkg), { recursive: true })
              try {
                cpSync(scopedSource, scopedDest, { recursive: true, dereference: true })
                copiedCount++
              } catch {
                /* skip broken symlinks */
              }
            }
          }
        } else {
          const destPath = join(feNodeModules, pkg)
          if (!existsSync(destPath)) {
            try {
              cpSync(sourcePath, destPath, { recursive: true, dereference: true })
              copiedCount++
            } catch {
              /* skip broken symlinks */
            }
          }
        }
      }
    }
  }
  console.log(`   ✅ Copied ${copiedCount} packages from bun cache`)

  // Step 2: Build Backend with Bun
  console.log('\n📦 Building Backend...')

  // Bundle backend (not compile - for cross-platform compatibility)
  await $`bun build --minify --target bun --outdir ${join(DIST, 'backend')} ${join(ROOT, 'apps/be/src/index.ts')}`.quiet()

  // Copy backend public folder if exists
  const bePublicDir = join(ROOT, 'apps/be/public')
  if (existsSync(bePublicDir)) {
    cpSync(bePublicDir, join(DIST, 'backend/public'), { recursive: true })
  }

  // Step 2.5: Copy required packages (Node.js, Bun) for offline install
  console.log('\n📦 Copying required packages for offline install...')
  const runtimeDir = join(DIST, 'runtime')
  mkdirSync(runtimeDir, { recursive: true })

  // Windows files
  const bunExe = join(REQUIRED_PACKAGES, 'bun.exe')
  const nodeMsi = join(REQUIRED_PACKAGES, 'node-v24.12.0-x64.msi')

  // macOS files
  const bunMac = join(REQUIRED_PACKAGES, 'bun-darwin')
  const nodePkg = join(REQUIRED_PACKAGES, 'node-v24.12.0.pkg')

  console.log('   Windows:')
  if (existsSync(bunExe)) {
    cpSync(bunExe, join(runtimeDir, 'bun.exe'))
    console.log('     ✅ bun.exe copied')
  } else {
    console.warn('     ⚠️  bun.exe not found')
  }

  if (existsSync(nodeMsi)) {
    cpSync(nodeMsi, join(runtimeDir, 'node-v24.12.0-x64.msi'))
    console.log('     ✅ node MSI copied')
  } else {
    console.warn('     ⚠️  node MSI not found')
  }

  console.log('   macOS:')
  if (existsSync(bunMac)) {
    cpSync(bunMac, join(runtimeDir, 'bun-darwin'))
    console.log('     ✅ bun-darwin copied')
  } else {
    console.warn('     ⚠️  bun-darwin not found (download from https://bun.sh)')
  }

  if (existsSync(nodePkg)) {
    cpSync(nodePkg, join(runtimeDir, 'node-v24.12.0.pkg'))
    console.log('     ✅ node PKG copied')
  } else {
    console.warn('     ⚠️  node PKG not found (download from https://nodejs.org)')
  }

  // Step 3: Copy actual environment files (instead of templates)
  console.log('\n📝 Copying environment files...')

  const feEnvSource = join(ROOT, 'apps/fe/.env')
  const beEnvSource = join(ROOT, 'apps/be/.env')

  if (existsSync(feEnvSource)) {
    cpSync(feEnvSource, join(DIST, 'frontend/.env'))
    console.log('   ✅ Frontend .env copied')
  } else {
    console.warn('   ⚠️  Frontend .env not found - creating template')
    writeFileSync(
      join(DIST, 'frontend/.env'),
      `NEXT_PUBLIC_API_URL=http://localhost:1001\nAUTH_API_URL=http://localhost:1001\n`
    )
  }

  if (existsSync(beEnvSource)) {
    cpSync(beEnvSource, join(DIST, 'backend/.env'))
    console.log('   ✅ Backend .env copied')
  } else {
    console.warn('   ⚠️  Backend .env not found - creating template')
    writeFileSync(
      join(DIST, 'backend/.env'),
      `NODE_ENV=production\nPORT=1001\nDATABASE_URL=postgresql://postgres:password@localhost:5432/nucleus\n`
    )
  }

  // Step 4: Create Windows start scripts
  console.log('\n🪟 Creating Windows start scripts...')

  // PowerShell script (recommended)
  const startPs1 = `# Nucleus Startup Script for Windows
# Run as: powershell -ExecutionPolicy Bypass -File start.ps1

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🚀 Starting Nucleus..." -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed." -ForegroundColor Yellow
    $nodeMsi = Join-Path $ScriptDir "runtime\\node-v24.12.0-x64.msi"
    if (Test-Path $nodeMsi) {
        Write-Host "📦 Installing Node.js from local package..." -ForegroundColor Cyan
        Start-Process msiexec.exe -ArgumentList "/i", "\`"$nodeMsi\`"", "/passive", "/norestart" -Wait
        Write-Host "✅ Node.js installed. Please restart this script." -ForegroundColor Green
        Write-Host "   (You may need to open a new terminal for PATH to update)" -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 0
    } else {
        Write-Host "❌ Node.js installer not found at: $nodeMsi" -ForegroundColor Red
        exit 1
    }
}

# Check if Bun is available (use local bun.exe if not in PATH)
$bunPath = "bun"
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    $localBun = Join-Path $ScriptDir "runtime\\bun.exe"
    if (Test-Path $localBun) {
        Write-Host "📦 Using local bun.exe..." -ForegroundColor Cyan
        $bunPath = $localBun
    } else {
        Write-Host "❌ Bun not found. Please place bun.exe in runtime folder." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Node.js: $(node --version)" -ForegroundColor Green
Write-Host "✅ Bun: $bunPath" -ForegroundColor Green
Write-Host ""

Write-Host "📦 Starting Backend on port 1001..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot\\backend
    bun run index.js
}

Write-Host "🌐 Starting Frontend on port 3000..." -ForegroundColor Green
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PSScriptRoot\\frontend
    $env:PORT = "3000"
    $env:HOSTNAME = "0.0.0.0"
    node apps/fe/server.js
}

Write-Host ""
Write-Host "✅ Nucleus is running!" -ForegroundColor Green
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:1001" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop..." -ForegroundColor Yellow

try {
    while ($true) {
        Receive-Job $backendJob -ErrorAction SilentlyContinue
        Receive-Job $frontendJob -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "Stopping services..." -ForegroundColor Yellow
    Stop-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
}
`

  // Batch script (alternative)
  const startBat = `@echo off
title Nucleus Server
echo.
echo ========================================
echo   Nucleus - Starting Services
echo ========================================
echo.

:: Check Bun
where bun >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Bun is not installed!
    echo Please install Bun from: https://bun.sh
    pause
    exit /b 1
)

:: Check Node
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org
    pause
    exit /b 1
)

echo Starting Backend on port 1001...
start "Nucleus Backend" cmd /c "cd backend && bun run index.js"

echo Starting Frontend on port 3000...
start "Nucleus Frontend" cmd /c "cd frontend && set PORT=3000 && set HOSTNAME=0.0.0.0 && node apps/fe/server.js"

echo.
echo ========================================
echo   Nucleus is running!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:1001
echo ========================================
echo.
echo Press any key to stop all services...
pause >nul

taskkill /FI "WINDOWTITLE eq Nucleus Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Nucleus Frontend" /F >nul 2>&1
echo Services stopped.
`

  // macOS/Linux shell script
  const startSh = `#!/bin/bash
# Nucleus Startup Script for macOS/Linux
# Run as: chmod +x start.sh && ./start.sh

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Starting Nucleus..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    if [ -f "runtime/node-v24.12.0.pkg" ]; then
        echo "📦 Found local Node.js installer."
        echo "   Please run: sudo installer -pkg runtime/node-v24.12.0.pkg -target /"
        echo "   Then restart this script."
        exit 1
    else
        echo "   Please install Node.js from: https://nodejs.org"
        exit 1
    fi
fi

# Check if Bun is available
BUN_PATH="bun"
if ! command -v bun &> /dev/null; then
    if [ -f "runtime/bun-darwin" ]; then
        echo "📦 Using local bun-darwin..."
        chmod +x runtime/bun-darwin
        BUN_PATH="./runtime/bun-darwin"
    else
        echo "❌ Bun not found. Please install from https://bun.sh"
        exit 1
    fi
fi

echo "✅ Node.js: $(node --version)"
echo "✅ Bun: $BUN_PATH"
echo ""

# Start Backend
echo "📦 Starting Backend on port 1001..."
cd backend
$BUN_PATH run index.js &
BACKEND_PID=$!
cd ..

# Start Frontend  
echo "🌐 Starting Frontend on port 3000..."
cd frontend
PORT=3000 HOSTNAME=0.0.0.0 node apps/fe/server.js &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Nucleus is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:1001"
echo ""
echo "Press Ctrl+C to stop..."

# Trap SIGINT (Ctrl+C) to kill both processes
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for processes
wait
`

  writeFileSync(join(DIST, 'start.ps1'), startPs1)
  writeFileSync(join(DIST, 'start.bat'), startBat)
  writeFileSync(join(DIST, 'start.sh'), startSh, { mode: 0o755 })

  // Step 5: Create README
  const readme = `# Nucleus Deployment Package

## Gereksinimler

1. **Node.js 20+**: https://nodejs.org
2. **Bun**: https://bun.sh
3. **PostgreSQL 15+**: https://www.postgresql.org/download/

## Offline Kurulum (İnternet Yoksa)

\`runtime/\` klasöründe hazır kurulum dosyaları bulunur:
- **Windows**: \`bun.exe\`, \`node-v24.12.0-x64.msi\`
- **macOS**: \`bun-darwin\`, \`node-v24.12.0.pkg\`

### Windows'ta Node.js Kurulumu:
\`\`\`cmd
msiexec /i runtime\\node-v24.12.0-x64.msi /passive
\`\`\`

### macOS'ta Node.js Kurulumu:
\`\`\`bash
sudo installer -pkg runtime/node-v24.12.0.pkg -target /
\`\`\`

## Kurulum

### 1. PostgreSQL Kurulumu
- PostgreSQL'i kurun ve bir veritabanı oluşturun:
  \`\`\`sql
  CREATE DATABASE nucleus;
  \`\`\`

### 2. Environment Ayarları
- \`backend/.env\` dosyasını düzenleyin:
  - DATABASE_URL: PostgreSQL bağlantı stringi
  - JWT_SECRET: Güvenli bir secret key
  - GODMIN_EMAIL/PASSWORD: Admin kullanıcı bilgileri

- \`frontend/.env\` dosyasını düzenleyin (gerekirse):
  - NEXT_PUBLIC_API_URL: Backend URL'i

### 3. Başlatma

**Windows - PowerShell ile (Önerilen):**
\`\`\`powershell
powershell -ExecutionPolicy Bypass -File start.ps1
\`\`\`

**Windows - Batch ile:**
\`\`\`cmd
start.bat
\`\`\`

**macOS/Linux:**
\`\`\`bash
chmod +x start.sh
./start.sh
\`\`\`

## Portlar
- Frontend: http://localhost:3000
- Backend: http://localhost:1001

## Servis Olarak Çalıştırma (Opsiyonel)

PM2 ile servis olarak çalıştırabilirsiniz:

\`\`\`bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
\`\`\`
`

  writeFileSync(join(DIST, 'README.md'), readme)

  // Step 6: Create PM2 ecosystem config
  const pm2Config = `module.exports = {
  apps: [
    {
      name: 'nucleus-backend',
      cwd: './backend',
      script: 'index.js',
      interpreter: 'bun',
      env: {
        NODE_ENV: 'production',
        PORT: 1001
      }
    },
    {
      name: 'nucleus-frontend',
      cwd: './frontend',
      script: 'apps/fe/server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0'
      }
    }
  ]
};
`

  writeFileSync(join(DIST, 'ecosystem.config.js'), pm2Config)

  // Done
  console.log('\n✅ Deployment bundle created successfully!')
  console.log(`📁 Output: ${DIST}`)
  console.log('\n📋 Contents:')
  console.log('   - frontend/     (Next.js standalone)')
  console.log('   - backend/      (Bun bundle)')
  console.log('   - runtime/      (Offline installers)')
  console.log('   - start.ps1     (Windows PowerShell)')
  console.log('   - start.bat     (Windows Batch)')
  console.log('   - start.sh      (macOS/Linux)')
  console.log('   - README.md     (Kurulum talimatları)')
  console.log('   - ecosystem.config.js (PM2 config)')
  console.log('\n🎉 Ready to deploy! Zip the dist-deployment folder and send to customer.')
}

main().catch((err) => {
  console.error('❌ Build failed:', err)
  process.exit(1)
})
