#!/usr/bin/env bun
/**
 * Bundle script for Windows deployment
 * Creates a self-contained deployment package
 *
 * Usage: bun run scripts/bundle-for-deployment.ts
 */

import { $ } from "bun";
import {
	copyFileSync,
	cpSync,
	existsSync,
	mkdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DIST = join(ROOT, "dist-deployment");

async function main() {
	console.log("🚀 Starting deployment bundle...\n");

	// Clean previous build
	if (existsSync(DIST)) {
		console.log("🗑️  Cleaning previous build...");
		rmSync(DIST, { recursive: true });
	}
	mkdirSync(DIST, { recursive: true });

	// Step 1: Build Frontend (Next.js standalone)
	console.log("\n📦 Building Frontend (Next.js standalone)...");
	await $`bun run --cwd ${join(ROOT, "apps/fe")} build`.quiet();

	const standaloneDir = join(ROOT, "apps/fe/.next/standalone");
	const staticDir = join(ROOT, "apps/fe/.next/static");
	const publicDir = join(ROOT, "apps/fe/public");

	if (!existsSync(standaloneDir)) {
		throw new Error("Standalone build not found! Check Next.js build output.");
	}

	// Copy standalone output
	console.log("📁 Copying frontend standalone...");
	cpSync(standaloneDir, join(DIST, "frontend"), { recursive: true });

	// Copy static files (required for standalone)
	if (existsSync(staticDir)) {
		cpSync(staticDir, join(DIST, "frontend/apps/fe/.next/static"), {
			recursive: true,
		});
	}

	// Copy public folder
	if (existsSync(publicDir)) {
		cpSync(publicDir, join(DIST, "frontend/apps/fe/public"), {
			recursive: true,
		});
	}

	// Step 2: Build Backend with Bun
	console.log("\n📦 Building Backend...");

	// Bundle backend (not compile - for cross-platform compatibility)
	await $`bun build --minify --target bun --outdir ${join(DIST, "backend")} ${join(ROOT, "apps/be/src/index.ts")}`.quiet();

	// Copy backend public folder if exists
	const bePublicDir = join(ROOT, "apps/be/public");
	if (existsSync(bePublicDir)) {
		cpSync(bePublicDir, join(DIST, "backend/public"), { recursive: true });
	}

	// Step 3: Create environment templates
	console.log("\n📝 Creating environment templates...");

	const feEnvTemplate = `# Frontend Environment
NEXT_PUBLIC_API_URL=http://localhost:1001
AUTH_API_URL=http://localhost:1001
`;

	const beEnvTemplate = `# Backend Environment
NODE_ENV=production
PORT=1001
DATABASE_URL=postgresql://postgres:password@localhost:5432/nucleus

# JWT Configuration
JWT_SECRET=your-production-secret-change-this
JWT_EXPIRES_IN=30m
JWT_REFRESH_SECRET=your-refresh-secret-change-this
JWT_REFRESH_EXPIRES_IN=30d

# App Config
IS_MULTI_TENANT=false
NUCLEUS_APP_ID=default_be
GODMIN_EMAIL=admin@company.com
GODMIN_PASSWORD=change-this-password
GODMIN_FIRST_NAME=Admin
GODMIN_LAST_NAME=User
`;

	writeFileSync(join(DIST, "frontend/.env"), feEnvTemplate);
	writeFileSync(join(DIST, "backend/.env"), beEnvTemplate);

	// Step 4: Create Windows start scripts
	console.log("\n🪟 Creating Windows start scripts...");

	// PowerShell script (recommended)
	const startPs1 = `# Nucleus Startup Script for Windows
# Run as: powershell -ExecutionPolicy Bypass -File start.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Nucleus..." -ForegroundColor Cyan

# Check if Bun is installed
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Bun is not installed. Installing..." -ForegroundColor Yellow
    powershell -c "irm bun.sh/install.ps1 | iex"
    Write-Host "✅ Bun installed. Please restart this script." -ForegroundColor Green
    exit 1
}

# Check if Node.js is installed (for Next.js)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install Node.js 20+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}

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
`;

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
`;

	writeFileSync(join(DIST, "start.ps1"), startPs1);
	writeFileSync(join(DIST, "start.bat"), startBat);

	// Step 5: Create README
	const readme = `# Nucleus Deployment Package

## Gereksinimler

1. **Node.js 20+**: https://nodejs.org
2. **Bun**: https://bun.sh (PowerShell: \`irm bun.sh/install.ps1 | iex\`)
3. **PostgreSQL 15+**: https://www.postgresql.org/download/windows/

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

**PowerShell ile (Önerilen):**
\`\`\`powershell
powershell -ExecutionPolicy Bypass -File start.ps1
\`\`\`

**Batch ile:**
\`\`\`cmd
start.bat
\`\`\`

## Portlar
- Frontend: http://localhost:3000
- Backend: http://localhost:1001

## Servis Olarak Çalıştırma (Opsiyonel)

Windows Service olarak çalıştırmak için PM2 kullanabilirsiniz:

\`\`\`powershell
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2-startup install
\`\`\`
`;

	writeFileSync(join(DIST, "README.md"), readme);

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
`;

	writeFileSync(join(DIST, "ecosystem.config.js"), pm2Config);

	// Done
	console.log("\n✅ Deployment bundle created successfully!");
	console.log(`📁 Output: ${DIST}`);
	console.log("\n📋 Contents:");
	console.log("   - frontend/     (Next.js standalone)");
	console.log("   - backend/      (Bun bundle)");
	console.log("   - start.ps1     (PowerShell starter)");
	console.log("   - start.bat     (Batch starter)");
	console.log("   - README.md     (Kurulum talimatları)");
	console.log("   - ecosystem.config.js (PM2 config)");
	console.log(
		"\n🎉 Ready to deploy! Zip the dist-deployment folder and send to customer.",
	);
}

main().catch((err) => {
	console.error("❌ Build failed:", err);
	process.exit(1);
});
