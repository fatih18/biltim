#!/usr/bin/env bun

/**
 * Desktop Agent Distribution Builder
 *
 * Bu script desktop agent'ı tüm platformlar için build eder ve
 * backend storage klasörüne kopyalar. Backend URL ve API key
 * build time'da config dosyasına gömülür.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DESKTOP_DIR = path.resolve(import.meta.dirname, "..");
const BE_DIR = path.resolve(DESKTOP_DIR, "../be");
const OUTPUT_DIR = path.resolve(BE_DIR, "storage/downloads/desktop-agent");
const ENTRY_FILE = path.resolve(DESKTOP_DIR, "src/index.ts");

interface BuildConfig {
	backendUrl: string;
	wsUrl: string;
	frontendUrl: string;
}

function loadBuildConfig(): BuildConfig {
	// Backend .env dosyasından config oku
	const beEnvPath = path.join(BE_DIR, ".env");
	let backendUrl = "http://localhost:1001";
	let frontendUrl = "http://localhost:3000";

	if (fs.existsSync(beEnvPath)) {
		const envContent = fs.readFileSync(beEnvPath, "utf8");
		const lines = envContent.split("\n");

		for (const line of lines) {
			const [key, ...valueParts] = line.split("=");
			const value = valueParts.join("=").trim();

			// REMOTE_AGENT_BACKEND_URL varsa kullan, yoksa localhost
			if (key?.trim() === "REMOTE_AGENT_BACKEND_URL") {
				backendUrl = value || backendUrl;
			}
			// Eski isimlendirme ile uyumluluk icin PUBLIC_BACKEND_URL de destekle
			if (key?.trim() === "PUBLIC_BACKEND_URL") {
				backendUrl = value || backendUrl;
			}
			// Agent için ayrı frontend URL (REMOTE_AGENT_FRONTEND_URL öncelikli)
			if (key?.trim() === "REMOTE_AGENT_FRONTEND_URL") {
				frontendUrl = value || frontendUrl;
			} else if (
				key?.trim() === "FRONTEND_URL" &&
				frontendUrl === "http://localhost:3000"
			) {
				frontendUrl = value || frontendUrl;
			}
		}
	}

	// Fallback: environment variables
	backendUrl =
		process.env.REMOTE_AGENT_BACKEND_URL ||
		process.env.PUBLIC_BACKEND_URL ||
		backendUrl;
	frontendUrl =
		process.env.REMOTE_AGENT_FRONTEND_URL ||
		process.env.FRONTEND_URL ||
		frontendUrl;

	const wsUrl = `${backendUrl.replace(/^http/, "ws")}/api/remote/agent`;

	return {
		backendUrl,
		wsUrl,
		frontendUrl,
	};
}

function createEmbeddedConfigFile(config: BuildConfig): string {
	// Geçici bir config dosyası oluştur - build time'da embed edilecek
	// NOT: API key artık embed edilmiyor, kullanıcı local agent UI'dan giriyor
	const configContent = `
// Auto-generated embedded config - DO NOT EDIT
// API key is NOT embedded - user enters it via local agent UI at http://127.0.0.1:5050/setup
export const EMBEDDED_CONFIG = {
  DESKTOP_BACKEND_HTTP_URL: "${config.backendUrl}",
  DESKTOP_BACKEND_WS_URL: "${config.wsUrl}",
} as const;
`;

	const embeddedConfigPath = path.join(DESKTOP_DIR, "src/embedded-config.ts");
	fs.writeFileSync(embeddedConfigPath, configContent.trim(), "utf8");

	return embeddedConfigPath;
}

function createMacCommandLauncher(config: BuildConfig): void {
	const scriptPath = path.join(OUTPUT_DIR, "desktop-agent-macos.command");
	// Downloads always go through the frontend (Next.js), which proxies to the
	// backend via AUTH_API_URL. This keeps the backend URL non-public.
	const frontendBase = (config.frontendUrl || config.backendUrl).replace(
		/\/$/,
		"",
	);
	const downloadUrl = `${frontendBase}/downloads/desktop-agent/desktop-agent-macos-arm64`;

	const scriptContent = `#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BINARY_NAME="desktop-agent-macos-arm64"
DOWNLOAD_URL="${downloadUrl}"
LOG_FILE="/tmp/vorion-desktop-agent.log"
PID_FILE="/tmp/vorion-desktop-agent.pid"
STOP_FILE="$HOME/.vorion-agent/agent.stop"

# Önceki agent varsa durdur
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE" 2>/dev/null)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "➡️  Önceki agent durduruluyor (PID: $OLD_PID)..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

echo "Vorion Desktop Agent (macOS)"
echo "=============================="
echo "" 

if [ ! -f "$BINARY_NAME" ]; then
  echo "➡️  Agent indiriliyor..."
else
  echo "➡️  Agent güncelleniyor..."
fi

curl -L "$DOWNLOAD_URL" -o "$BINARY_NAME"
chmod +x "$BINARY_NAME"

echo ""
echo "✔️  Agent başlatılıyor..."
echo "   Kurulum: http://127.0.0.1:5050/setup"
echo "   Log: $LOG_FILE"
echo ""

# Agent'ı arka planda başlat ve yeniden başlatma döngüsü
(
  while true; do
    # UI'dan /stop çağrıldığında oluşturulan stop flag'i kontrol et
    if [ -f "$STOP_FILE" ]; then
      echo "[$(date)] Stop flag detected, not restarting agent." >> "$LOG_FILE"
      rm -f "$STOP_FILE"
      break
    fi

    # Her yeniden başlatma öncesinde son sürümü indir
    echo "[$(date)] Checking for latest agent binary..." >> "$LOG_FILE"
    curl -L "$DOWNLOAD_URL" -o "$BINARY_NAME" >> "$LOG_FILE" 2>&1
    chmod +x "$BINARY_NAME" 2>/dev/null || true

    "./$BINARY_NAME" >> "$LOG_FILE" 2>&1
    EXIT_CODE=$?
    echo "[$(date)] Agent exited with code $EXIT_CODE, restarting in 2s..." >> "$LOG_FILE"
    sleep 2
  done
) &
AGENT_PID=$!
echo $AGENT_PID > "$PID_FILE"

echo "✅ Agent arka planda çalışıyor (PID: $AGENT_PID)"
echo "   Durdurmak için: kill $AGENT_PID"
echo ""

# Terminal'i kapat (macOS)
osascript -e 'tell application "Terminal" to close front window' 2>/dev/null &
exit 0
`;

	fs.writeFileSync(scriptPath, scriptContent.replace(/\r\n/g, "\n"), {
		encoding: "utf8",
		mode: 0o755,
	});
	try {
		fs.chmodSync(scriptPath, 0o755);
	} catch {
		// ignore chmod errors on non-unix systems
	}

	// Ayrıca .command dosyasını ZIP içine koyarak HTTP indirmelerde
	// execute izinlerinin korunmasını sağla. macOS Finder, ZIP'ten çıkartırken
	// dosya izinlerini korur, böylece kullanıcı ek chmod komutu yazmak zorunda kalmaz.
	try {
		spawnSync(
			"zip",
			["-j", "desktop-agent-macos.zip", "desktop-agent-macos.command"],
			{
				cwd: OUTPUT_DIR,
				stdio: "ignore",
			},
		);
	} catch {
		// zip komutu yoksa hata verme; .command yine de mevcut olur
	}
}

function createLinuxLauncher(config: BuildConfig): void {
	const scriptPath = path.join(OUTPUT_DIR, "desktop-agent-linux.sh");
	const frontendBase = (config.frontendUrl || config.backendUrl).replace(
		/\/$/,
		"",
	);
	const downloadUrl = `${frontendBase}/downloads/desktop-agent/desktop-agent-linux-x64`;

	const scriptContent = `#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BINARY_NAME="desktop-agent-linux-x64"
DOWNLOAD_URL="${downloadUrl}"
LOG_FILE="/tmp/vorion-desktop-agent.log"
STOP_FILE="$HOME/.vorion-agent/agent.stop"

if [ ! -f "$BINARY_NAME" ]; then
  echo "Vorion Desktop Agent (Linux) indiriliyor..."
else
  echo "Vorion Desktop Agent (Linux) güncelleniyor..."
fi

curl -L "$DOWNLOAD_URL" -o "$BINARY_NAME"
chmod +x "$BINARY_NAME"

echo "Vorion Desktop Agent (Linux)"
echo "============================"
echo ""
echo "Kurulum: http://127.0.0.1:5050/setup"
echo "Log: $LOG_FILE"
echo ""

while true; do
  if [ -f "$STOP_FILE" ]; then
    echo "[$(date)] Stop flag detected, not restarting agent." >> "$LOG_FILE"
    rm -f "$STOP_FILE"
    break
  fi

  echo "[$(date)] Checking for latest agent binary..." >> "$LOG_FILE"
  curl -L "$DOWNLOAD_URL" -o "$BINARY_NAME" >> "$LOG_FILE" 2>&1
  chmod +x "$BINARY_NAME" 2>/dev/null || true

  "./$BINARY_NAME" >> "$LOG_FILE" 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Agent exited with code $EXIT_CODE, restarting in 2s..." >> "$LOG_FILE"
  sleep 2
done
`;

	fs.writeFileSync(scriptPath, scriptContent.replace(/\r\n/g, "\n"), {
		encoding: "utf8",
		mode: 0o755,
	});
	try {
		fs.chmodSync(scriptPath, 0o755);
	} catch {
		// ignore chmod errors
	}
}

function createWindowsLauncher(config: BuildConfig): void {
	const scriptPath = path.join(OUTPUT_DIR, "desktop-agent-windows.bat");
	const frontendBase = (config.frontendUrl || config.backendUrl).replace(
		/\/$/,
		"",
	);
	const downloadUrl = `${frontendBase}/downloads/desktop-agent/desktop-agent-windows-x64.exe`;

	const scriptContent = `@echo off

setlocal enabledelayedexpansion

cd /d "%~dp0"

set "BINARY_NAME=desktop-agent-windows-x64.exe"
set "DOWNLOAD_URL=${downloadUrl}"
set "LOG_FILE=%TEMP%\\vorion-desktop-agent.log"
set "STOP_FILE=%USERPROFILE%\\.vorion-agent\\agent.stop"

echo Vorion Desktop Agent (Windows)
echo ==============================
echo.
echo Setup: http://127.0.0.1:5050/setup
echo Log: %LOG_FILE%
echo.

:loop

if exist "%STOP_FILE%" (
  echo [%date% %time%] Stop flag detected, not restarting agent.>>"%LOG_FILE%"
  del "%STOP_FILE%" >nul 2>&1
  goto :eof
)

echo [%date% %time%] Checking for latest agent binary...>>"%LOG_FILE%"
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%BINARY_NAME%' -UseBasicParsing } catch { exit 1 }" >>"%LOG_FILE%" 2>&1

"%BINARY_NAME%" >>"%LOG_FILE%" 2>&1
set "EXIT_CODE=%ERRORLEVEL%"
echo [%date% %time%] Agent exited with code %EXIT_CODE%, restarting in 2s...>>"%LOG_FILE%"
timeout /t 2 /nobreak >nul
goto loop
`;

	fs.writeFileSync(scriptPath, scriptContent.replace(/\r\n/g, "\n"), {
		encoding: "utf8",
	});
}

async function buildForPlatform(
	platform: string,
	target: string,
	outputName: string,
): Promise<void> {
	console.log(`📦 Building for ${platform}...`);

	const outputPath = path.join(OUTPUT_DIR, outputName);

	const proc = Bun.spawn(
		[
			"bun",
			"build",
			"--compile",
			"--minify-whitespace",
			"--minify-syntax",
			"--target",
			target,
			"--outfile",
			outputPath,
			ENTRY_FILE,
		],
		{
			cwd: DESKTOP_DIR,
			stdout: "inherit",
			stderr: "inherit",
		},
	);

	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		throw new Error(`Build failed for ${platform} with exit code ${exitCode}`);
	}

	// Dosya boyutunu göster
	if (fs.existsSync(outputPath)) {
		const stats = fs.statSync(outputPath);
		const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
		console.log(`   ✅ ${outputName} (${sizeMB} MB)`);
	}
}

async function main() {
	console.log("🚀 Desktop Agent Distribution Builder\n");

	// Output dizinini oluştur
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });

	// Config yükle
	const config = loadBuildConfig();
	console.log("📝 Build Config:");
	console.log(`   Backend URL: ${config.backendUrl}`);
	console.log(`   WebSocket URL: ${config.wsUrl}`);
	console.log(`   Frontend URL: ${config.frontendUrl}`);
	console.log(`   API Key: (per-computer - entered via local UI)\n`);

	// Embedded config oluştur
	const embeddedConfigPath = createEmbeddedConfigFile(config);
	console.log(`📄 Created embedded config: ${embeddedConfigPath}\n`);

	// Tüm platformlar için build
	const platforms = [
		{
			name: "macOS (ARM64)",
			target: "bun-darwin-arm64",
			output: "desktop-agent-macos-arm64",
		},
		{
			name: "macOS (x64)",
			target: "bun-darwin-x64",
			output: "desktop-agent-macos-x64",
		},
		{
			name: "Linux (x64)",
			target: "bun-linux-x64",
			output: "desktop-agent-linux-x64",
		},
		{
			name: "Windows (x64)",
			target: "bun-windows-x64",
			output: "desktop-agent-windows-x64.exe",
		},
	];

	for (const { name, target, output } of platforms) {
		try {
			await buildForPlatform(name, target, output);
		} catch (error) {
			console.error(`   ❌ Failed to build for ${name}:`, error);
		}
	}

	// macOS kullanıcıları için .command launcher script'i oluştur
	createMacCommandLauncher(config);
	// Linux ve Windows kullanıcıları için wrapper script'leri oluştur
	createLinuxLauncher(config);
	createWindowsLauncher(config);

	// Temizlik - embedded config dosyasını sil (opsiyonel, debug için bırakılabilir)
	// fs.unlinkSync(embeddedConfigPath);

	console.log("\n✨ Build complete!");
	console.log(`📂 Output directory: ${OUTPUT_DIR}`);

	// Dosyaları listele
	const files = fs.readdirSync(OUTPUT_DIR);
	console.log("\n📋 Built files:");
	for (const file of files) {
		const filePath = path.join(OUTPUT_DIR, file);
		const stats = fs.statSync(filePath);
		const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
		console.log(`   - ${file} (${sizeMB} MB)`);
	}
}

main().catch((error) => {
	console.error("❌ Build failed:", error);
	process.exit(1);
});
