import os from "node:os";
import type { AgentConfig } from "./config";
import { getConfigPath, isConfigured, loadLocalConfig } from "./localConfig";

const VORION_PURPLE = "#8B5CF6";
const VORION_DARK = "#1a1a2e";

export function getSetupPageHTML(config: AgentConfig): string {
	const localConfig = loadLocalConfig();
	const configured = isConfigured();
	const configPath = getConfigPath();

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Vorion Agent Setup</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: linear-gradient(135deg, ${VORION_DARK} 0%, #16213e 100%);
			min-height: 100vh;
			color: #e2e8f0;
			padding: 40px 20px;
		}
		.container {
			max-width: 500px;
			margin: 0 auto;
		}
		.header {
			text-align: center;
			margin-bottom: 40px;
		}
		.logo {
			font-size: 48px;
			margin-bottom: 8px;
		}
		h1 {
			font-size: 28px;
			font-weight: 600;
			color: white;
			margin-bottom: 8px;
		}
		.subtitle {
			color: #94a3b8;
			font-size: 14px;
		}
		.card {
			background: rgba(255,255,255,0.05);
			border: 1px solid rgba(255,255,255,0.1);
			border-radius: 16px;
			padding: 24px;
			margin-bottom: 20px;
		}
		.status-badge {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			padding: 6px 12px;
			border-radius: 20px;
			font-size: 13px;
			font-weight: 500;
			margin-bottom: 16px;
		}
		.status-configured {
			background: rgba(34, 197, 94, 0.2);
			color: #4ade80;
		}
		.status-not-configured {
			background: rgba(251, 191, 36, 0.2);
			color: #fbbf24;
		}
		.info-row {
			display: flex;
			justify-content: space-between;
			padding: 10px 0;
			border-bottom: 1px solid rgba(255,255,255,0.1);
			font-size: 14px;
		}
		.info-row:last-child { border-bottom: none; }
		.info-label { color: #94a3b8; }
		.info-value { color: #e2e8f0; font-family: monospace; }
		.form-group {
			margin-bottom: 20px;
		}
		label {
			display: block;
			font-size: 14px;
			font-weight: 500;
			color: #e2e8f0;
			margin-bottom: 8px;
		}
		input[type="text"], input[type="password"] {
			width: 100%;
			padding: 12px 16px;
			background: rgba(0,0,0,0.3);
			border: 1px solid rgba(255,255,255,0.2);
			border-radius: 8px;
			color: white;
			font-size: 14px;
			font-family: monospace;
			transition: border-color 0.2s;
		}
		input:focus {
			outline: none;
			border-color: ${VORION_PURPLE};
		}
		input::placeholder {
			color: #64748b;
		}
		.hint {
			font-size: 12px;
			color: #64748b;
			margin-top: 6px;
		}
		.btn {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			padding: 12px 24px;
			border-radius: 8px;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
			border: none;
			transition: all 0.2s;
			width: 100%;
		}
		.btn-primary {
			background: ${VORION_PURPLE};
			color: white;
		}
		.btn-primary:hover {
			background: #7c3aed;
		}
		.btn-danger {
			background: rgba(239, 68, 68, 0.2);
			color: #f87171;
			border: 1px solid rgba(239, 68, 68, 0.3);
		}
		.btn-danger:hover {
			background: rgba(239, 68, 68, 0.3);
		}
		.btn-group {
			display: flex;
			gap: 12px;
			margin-top: 24px;
		}
		.btn-group .btn {
			flex: 1;
		}
		.message {
			padding: 12px 16px;
			border-radius: 8px;
			margin-bottom: 16px;
			font-size: 14px;
		}
		.message-success {
			background: rgba(34, 197, 94, 0.2);
			color: #4ade80;
			border: 1px solid rgba(34, 197, 94, 0.3);
		}
		.message-error {
			background: rgba(239, 68, 68, 0.2);
			color: #f87171;
			border: 1px solid rgba(239, 68, 68, 0.3);
		}
		.footer {
			text-align: center;
			margin-top: 32px;
			color: #64748b;
			font-size: 12px;
		}
		.config-path {
			font-family: monospace;
			font-size: 11px;
			color: #64748b;
			word-break: break-all;
			margin-top: 8px;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div class="logo">🖥️</div>
			<h1>Vorion Agent</h1>
			<p class="subtitle">Remote Computer Access</p>
		</div>

		<div class="card">
			<div class="status-badge ${configured ? "status-configured" : "status-not-configured"}">
				<span>${configured ? "●" : "○"}</span>
				${configured ? "Configured" : "Setup Required"}
			</div>
			<div class="info-row">
				<span class="info-label">Agent ID</span>
				<span class="info-value">${config.agentId.slice(0, 8)}...</span>
			</div>
			<div class="info-row">
				<span class="info-label">Hostname</span>
				<span class="info-value">${os.hostname()}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Platform</span>
				<span class="info-value">${os.platform()} / ${os.arch()}</span>
			</div>
			<div class="info-row">
				<span class="info-label">Port</span>
				<span class="info-value">${config.port}</span>
			</div>
			${
				config.backendHttpUrl
					? `
			<div class="info-row">
				<span class="info-label">Backend</span>
				<span class="info-value">${config.backendHttpUrl.replace(/^https?:\/\//, "").slice(0, 25)}...</span>
			</div>
			`
					: ""
			}
		</div>

		<div class="card">
			<h2 style="font-size: 18px; margin-bottom: 20px;">⚙️ Configuration</h2>
			
			<div id="message"></div>

			<form id="setupForm">
				<div class="form-group">
					<label for="apiKey">API Key *</label>
					<input 
						type="password" 
						id="apiKey" 
						name="apiKey" 
						placeholder="Paste your API key from Vorion"
						value="${localConfig.apiKey || ""}"
						required
					>
					<p class="hint">Get this key from Vorion Portal → Remote Terminal → Add Computer</p>
				</div>

				<div class="form-group">
					<label for="backendHttpUrl">Backend URL (optional)</label>
					<input 
						type="text" 
						id="backendHttpUrl" 
						name="backendHttpUrl" 
						placeholder="https://api.vorion.app"
						value="${localConfig.backendHttpUrl || ""}"
					>
					<p class="hint">Leave empty to use the default URL.</p>
				</div>

				<div class="btn-group">
					<button type="submit" class="btn btn-primary">
						💾 Save
					</button>
					<button type="button" class="btn" id="pauseButton" onclick="togglePause()">
						⏸️ Pause
					</button>
					<button type="button" class="btn btn-danger" onclick="stopAgent()">
						⏹️ Stop
					</button>
				</div>
			</form>
		
			<p class="config-path">Config: ${configPath}</p>
		</div>

		<div class="card">
			<h2 style="font-size: 18px; margin-bottom: 12px;">📜 Command Logs</h2>
			<p class="hint">Recent remote commands are shown here.</p>
			<div id="commandLogs" style="margin-top: 12px; max-height: 200px; overflow-y: auto; font-size: 12px; font-family: monospace;"></div>
		</div>

		<div class="card">
			<h2 style="font-size: 18px; margin-bottom: 12px;">⬇️ Agent Update & Download</h2>
			<p class="hint">Manually check for a newer agent version or download the latest launcher.</p>
			<div class="btn-group">
				<button type="button" class="btn" onclick="checkForUpdate()">
					🔄 Check for updates now
				</button>
				<button type="button" class="btn btn-primary" onclick="downloadAgent()">
					⬇️ Download latest agent
				</button>
			</div>
			<p class="hint" style="margin-top: 12px;">
				This agent is not code-signed yet. Your OS may show a warning when running it. Use
				"Open Anyway" (macOS) or "More info → Run anyway" (Windows) to proceed.
			</p>
		</div>

		<div class="footer">
			<p>Vorion Agent v1.0.0</p>
			<p style="margin-top: 4px;">http://127.0.0.1:${config.port}</p>
		</div>
	</div>

	<script>
		var form = document.getElementById('setupForm');
		var messageEl = document.getElementById('message');
		var pauseButton = document.getElementById('pauseButton');
		var logsEl = document.getElementById('commandLogs');
		var isPaused = false;

		function showMessage(text, type) {
			messageEl.innerHTML = '<div class="message message-' + type + '">' + text + '</div>';
		}

		function updatePauseButton() {
			if (!pauseButton) return;
			pauseButton.textContent = isPaused ? '▶️ Resume' : '⏸️ Pause';
		}

		function loadState() {
			fetch('/state')
				.then(function(res) { return res.json(); })
				.then(function(data) {
					isPaused = !!data.paused;
					updatePauseButton();
				})
				.catch(function() {});
		}

		function loadLogs() {
			if (!logsEl) return;
			fetch('/logs')
				.then(function(res) { return res.json(); })
				.then(function(data) {
					var logs = Array.isArray(data.logs) ? data.logs : [];
					if (!logs.length) {
						logsEl.innerHTML = '<p class="hint">No commands yet.</p>';
						return;
					}
					logsEl.innerHTML = logs.map(function(log) {
						var ts = log.createdAt || (log.result && log.result.startedAt) || '';
						var exitCode = log.result && typeof log.result.exitCode === 'number' ? log.result.exitCode : 'N/A';
						return '<div style="margin-bottom:8px;">'
							+ '<div style="color:#94a3b8;">[' + ts + '] ' + log.source + ' - exit=' + exitCode + '</div>'
							+ '<div><code>' + (log.command || '') + ' ' + (Array.isArray(log.args) ? log.args.join(' ') : '') + '</code></div>'
							+ '</div>';
					}).join('');
				})
				.catch(function() {});
		}

		function checkForUpdate() {
			fetch('/update-check', { method: 'POST' })
				.then(function(res) {
					if (!res.ok) {
						showMessage('Update check failed', 'error');
						return null;
					}
					return res.json();
				})
				.then(function(data) {
					if (!data || !data.result) return;
					var status = data.result.status;
					var msg = data.result.message || 'Update check completed.';
					if (status === 'up-to-date') {
						showMessage('Up to date: ' + msg, 'success');
					} else if (status === 'update-scheduled') {
						showMessage(msg + ' Agent will exit shortly.', 'success');
					} else {
						showMessage(msg, 'success');
					}
				})
				.catch(function() {
					showMessage('Update check failed', 'error');
				});
		}

		function downloadAgent() {
			fetch('/state')
				.then(function(res) { return res.json(); })
				.then(function(state) {
					if (!state || !state.platform) {
						showMessage('Could not detect platform for download', 'error');
						return;
					}
					var filename = '';
					if (state.platform === 'darwin') {
						filename = 'desktop-agent-macos.zip';
					} else if (state.platform === 'win32') {
						filename = 'desktop-agent-windows.bat';
					} else if (state.platform === 'linux') {
						filename = 'desktop-agent-linux.sh';
					}
					if (!filename) {
						showMessage('Unsupported platform for download', 'error');
						return;
					}
					var base = state.backendHttpUrl || '';
					if (base) base = base.replace(/\\/$/, '');
					var url = base + '/api/downloads/desktop-agent/' + filename;
					window.open(url, '_blank');
					showMessage('Download started in your browser.', 'success');
				})
				.catch(function() {
					showMessage('Failed to start download', 'error');
				});
		}

		function togglePause() {
			fetch('/pause', { method: 'POST' })
				.then(function(res) { return res.json(); })
				.then(function(result) {
					isPaused = !!result.paused;
					updatePauseButton();
					showMessage(result.message || (isPaused ? 'Agent paused' : 'Agent resumed'), 'success');
				})
				.catch(function() {
					showMessage('Operation failed', 'error');
				});
		}

		function stopAgent() {
			if (!confirm('Are you sure you want to stop the agent?')) return;
			fetch('/stop', { method: 'POST' })
				.then(function() {
					showMessage('Agent stopping...', 'success');
				})
				.catch(function() {});
		}

		form.addEventListener('submit', function(e) {
			e.preventDefault();
			var formData = new FormData(form);
			var data = {
				apiKey: formData.get('apiKey'),
				backendHttpUrl: formData.get('backendHttpUrl') || undefined
			};
			fetch('/setup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			})
			.then(function(res) { return res.json(); })
			.then(function(result) {
				if (result.success) {
					showMessage(result.message, 'success');
					setTimeout(function() { window.location.reload(); }, 1500);
				} else {
					showMessage(result.message, 'error');
				}
			})
			.catch(function() {
				showMessage('Connection error', 'error');
			});
		});

		// Load initial state and logs
		loadState();
		loadLogs();
		setInterval(loadLogs, 5000);
	</script>
</body>
</html>
`;
}

export function getHomePageHTML(config: AgentConfig): string {
	const configured = isConfigured();

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Vorion Agent</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: linear-gradient(135deg, ${VORION_DARK} 0%, #16213e 100%);
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #e2e8f0;
		}
		.container {
			text-align: center;
			padding: 40px;
		}
		.logo {
			font-size: 72px;
			margin-bottom: 16px;
		}
		h1 {
			font-size: 32px;
			font-weight: 600;
			color: white;
			margin-bottom: 8px;
		}
		.subtitle {
			color: #94a3b8;
			font-size: 16px;
			margin-bottom: 32px;
		}
		.status {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			padding: 8px 16px;
			border-radius: 20px;
			font-size: 14px;
			margin-bottom: 32px;
		}
		.status-online {
			background: rgba(34, 197, 94, 0.2);
			color: #4ade80;
		}
		.status-offline {
			background: rgba(251, 191, 36, 0.2);
			color: #fbbf24;
		}
		.btn {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			padding: 14px 28px;
			background: ${VORION_PURPLE};
			color: white;
			text-decoration: none;
			border-radius: 8px;
			font-size: 15px;
			font-weight: 500;
			transition: background 0.2s;
		}
		.btn:hover {
			background: #7c3aed;
		}
		.info {
			margin-top: 40px;
			color: #64748b;
			font-size: 13px;
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="logo">🖥️</div>
		<h1>Vorion Agent</h1>
		<p class="subtitle">Remote Computer Access</p>
		
		<div class="status ${configured ? "status-online" : "status-offline"}">
			<span>${configured ? "●" : "○"}</span>
			${configured ? "Running" : "Setup Required"}
		</div>
		
		<br><br>
		
		<a href="/setup" class="btn">
			⚙️ ${configured ? "Settings" : "Start Setup"}
		</a>
		
		<div class="info">
			<p>Agent ID: ${config.agentId.slice(0, 8)}...</p>
			<p style="margin-top: 4px;">Port: ${config.port}</p>
		</div>
	</div>
</body>
</html>`;
}
