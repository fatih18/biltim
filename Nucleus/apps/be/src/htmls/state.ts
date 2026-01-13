import type { WebSocketClient, WsMessage } from '../types/shared'

interface StoreState {
  chatSessions: Record<string, Set<WebSocketClient>>
  waitingQueue: Record<string, WsMessage<unknown>[]>
}

export const state_html = (store: StoreState) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>tcs WebSocket State</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            color: #ffffff;
            overflow-x: hidden;
            padding: 1rem;
        }

        .background-grid {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: gridMove 30s linear infinite;
        }

        .floating-particles {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }

        .particle {
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(255, 255, 255, 0.4);
            border-radius: 50%;
            animation: particleFloat 15s infinite linear;
        }

        .particle:nth-child(1) { left: 10%; animation-delay: 0s; }
        .particle:nth-child(2) { left: 20%; animation-delay: 2s; }
        .particle:nth-child(3) { left: 30%; animation-delay: 4s; }
        .particle:nth-child(4) { left: 40%; animation-delay: 6s; }
        .particle:nth-child(5) { left: 50%; animation-delay: 8s; }
        .particle:nth-child(6) { left: 60%; animation-delay: 10s; }
        .particle:nth-child(7) { left: 70%; animation-delay: 12s; }
        .particle:nth-child(8) { left: 80%; animation-delay: 1s; }
        .particle:nth-child(9) { left: 90%; animation-delay: 3s; }
        .particle:nth-child(10) { left: 15%; animation-delay: 5s; }

        @keyframes particleFloat {
            0% {
                transform: translateY(100vh) translateX(0);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateY(-100px) translateX(-20px);
                opacity: 0;
            }
        }

        @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }

        .container {
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            padding: 2.5rem 2rem;
            text-align: center;
            box-shadow: 
                0 20px 40px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
            max-width: 800px;
            width: 100%;
            position: relative;
            z-index: 10;
            animation: slideIn 0.8s ease-out;
            transition: all 0.3s ease;
        }

        @keyframes slideIn {
            from {
                transform: translateY(30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header {
            margin-bottom: 2.5rem;
        }

        .company-logo {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #60a5fa, #3b82f6);
            border-radius: 12px;
            margin: 0 auto 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: bold;
            box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
            animation: logoFloat 3s ease-in-out infinite;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .company-logo:hover {
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 12px 24px rgba(59, 130, 246, 0.4);
        }

        @keyframes logoFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
        }

        .api-title {
            font-size: 1.75rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 0.5rem;
            letter-spacing: -0.025em;
            animation: fadeInUp 1s ease-out 0.3s both;
            transition: all 0.3s ease;
        }

        .api-title:hover {
            transform: translateY(-1px);
            text-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }

        .api-subtitle {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            animation: fadeInUp 1s ease-out 0.5s both;
        }

        .refresh-btn {
            display: inline-flex;
            align-items: center;
            padding: 0.5rem 1rem;
            background-color: #2563eb;
            color: white;
            border-radius: 0.375rem;
            font-weight: 500;
            margin: 1rem 1rem 1rem 1rem;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 100;
        }

        .refresh-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(37, 99, 235, 0.4);
            box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4);
        }

        .refresh-btn:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
        }

        .state-container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            animation: fadeInUp 1s ease-out 0.7s both;
        }

        .state-section {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
            transition: all 0.3s ease;
            text-align: left;
        }

        .state-section:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .state-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .state-title .badge {
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            font-weight: 600;
        }

        .empty-state {
            color: rgba(255, 255, 255, 0.6);
            font-style: italic;
            text-align: center;
            padding: 1rem;
        }

        .session-item {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            border-left: 3px solid #3b82f6;
        }

        .session-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.75rem;
            font-weight: 600;
        }

        .session-id {
            color: #60a5fa;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.9rem;
        }

        .client-count {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            padding: 0.125rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
        }

        .client-list {
            margin-top: 0.75rem;
            font-size: 0.85rem;
        }

        .client-item {
            padding: 0.5rem;
            background: rgba(0, 0, 0, 0.15);
            border-radius: 6px;
            margin-bottom: 0.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .queue-item {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            border-left: 3px solid #8b5cf6;
        }

        .queue-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.75rem;
            font-weight: 600;
        }

        .queue-id {
            color: #a78bfa;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.9rem;
        }

        .message-count {
            background: rgba(139, 92, 246, 0.2);
            color: #a78bfa;
            padding: 0.125rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.75rem;
        }

        .message-list {
            margin-top: 0.75rem;
            font-size: 0.85rem;
            max-height: 150px;
            overflow-y: auto;
        }

        .message-item {
            padding: 0.5rem;
            background: rgba(0, 0, 0, 0.15);
            border-radius: 6px;
            margin-bottom: 0.5rem;
            word-break: break-word;
        }

        .message-item pre {
            white-space: pre-wrap;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 0.75rem;
            margin-top: 0.5rem;
            padding: 0.5rem;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
            overflow-x: auto;
        }
        
        .detail-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
            background-color: #1f2937;
            border-radius: 0.375rem;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .detail-table thead {
            background-color: #111827;
        }
        
        .detail-table th {
            padding: 0.75rem 1rem;
            text-align: left;
            font-weight: 600;
            color: #e5e7eb;
            border-bottom: 1px solid #374151;
        }
        
        .detail-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #374151;
            color: #d1d5db;
        }
        
        .detail-table tr:last-child td {
            border-bottom: none;
        }
        
        .detail-table tr:hover {
            background-color: rgba(55, 65, 81, 0.5);
        }
        
        .text-center {
            text-align: center;
        }
        
        details {
            margin: 0.25rem 0;
        }
        
        details summary {
            cursor: pointer;
            color: #60a5fa;
            font-weight: 500;
            padding: 0.25rem 0;
        }
        
        details .details-content {
            margin-top: 0.5rem;
            padding: 0.5rem;
            background-color: #111827;
            border-radius: 0.25rem;
            max-height: 300px;
            overflow: auto;
        }
        
        .client-list {
            list-style-type: none;
            padding-left: 0;
            margin: 0.5rem 0;
        }
        
        .client-list li {
            padding: 0.25rem 0;
            border-bottom: 1px dashed #374151;
        }
        
        .client-list li:last-child {
            border-bottom: none;
        }
        
        code {
            background: rgba(0, 0, 0, 0.2);
            padding: 0.1rem 0.3rem;
            border-radius: 3px;
            font-size: 0.85rem;
        }

        .footer {
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            animation: fadeInUp 1s ease-out 1.1s both;
        }

        .timestamp-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.75rem;
            font-weight: 500;
        }

        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #10b981;
            animation: blink 2s ease-in-out infinite;
        }

        @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        ::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.4);
        }

        @media (max-width: 768px) {
            .container {
                max-width: 100%;
                padding: 2rem 1.5rem;
            }
        }

        @media (max-width: 640px) {
            body {
                padding: 0.5rem;
            }
            
            .container {
                padding: 1.5rem 1rem;
            }
            
            .api-title {
                font-size: 1.5rem;
            }
            
            .api-subtitle {
                font-size: 0.8rem;
            }

            .state-title {
                font-size: 1.125rem;
            }
        }
    </style>
</head>
<body>
    <div class="background-grid"></div>
    
    <div class="floating-particles">
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
    </div>

    <a href="/state" class="refresh-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;">
            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
        </svg>
        Refresh Data
    </a>
        
    <div class="container">
        <div class="header">
            <div class="company-logo">H</div>
            <h1 class="api-title">tcs API</h1>
            <p class="api-subtitle">WebSocket State Monitor</p>
        </div>
        <div class="state-container">
            <div class="state-section" id="chat-sessions">
                <h2 class="state-title">
                    Chat Sessions
                    <span class="badge" id="sessions-count">${
                      Object.keys(store.chatSessions || {}).length
                    }</span>
                </h2>
                <div class="state-content" id="sessions-list">
                    ${
                      Object.keys(store.chatSessions || {}).length === 0
                        ? '<div class="empty-state">No active chat sessions</div>'
                        : `<table class="detail-table">
                        <thead>
                          <tr>
                            <th>Session ID</th>
                            <th>Client Count</th>
                            <th>Status</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${Object.keys(store.chatSessions)
                            .map((sessionId) => {
                              const clientCount = store.chatSessions[sessionId]?.size || 0
                              const clients = store.chatSessions[sessionId]
                                ? Array.from(store.chatSessions[sessionId])
                                : []

                              return `
                              <tr>
                                <td><code>${sessionId}</code></td>
                                <td class="text-center"><span class="badge badge-blue">${clientCount}</span></td>
                                <td><span class="active-status">Active</span></td>
                                <td>
                                  <details>
                                    <summary>View Clients</summary>
                                    <div class="details-content">
                                      ${
                                        clientCount > 0
                                          ? `<ul class="client-list">
                                          ${clients
                                            .map(
                                              (_, index) => `
                                            <li>Client #${index + 1} - Connected</li>
                                          `
                                            )
                                            .join('')}
                                        </ul>`
                                          : '<p>No clients connected</p>'
                                      }
                                    </div>
                                  </details>
                                </td>
                              </tr>
                            `
                            })
                            .join('')}
                        </tbody>
                      </table>`
                    }
                </div>
            </div>
            
            <div class="state-section" id="waiting-queue">
                <h2 class="state-title">
                    Waiting Queue
                    <span class="badge" id="queue-count">${Object.keys(
                      store.waitingQueue || {}
                    ).reduce((acc, id) => acc + (store.waitingQueue[id]?.length || 0), 0)}</span>
                </h2>
                <div class="state-content" id="queue-list">
                    ${
                      Object.keys(store.waitingQueue || {}).length === 0
                        ? '<div class="empty-state">No messages in queue</div>'
                        : `<table class="detail-table">
                        <thead>
                          <tr>
                            <th>Session ID</th>
                            <th>Message Count</th>
                            <th>Last Updated</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${Object.keys(store.waitingQueue)
                            .map((sessionId) => {
                              const messages = store.waitingQueue[sessionId] || []
                              const lastUpdated =
                                messages.length > 0 ? new Date().toLocaleString() : 'N/A'

                              return `
                              <tr>
                                <td><code>${sessionId}</code></td>
                                <td class="text-center"><span class="badge badge-orange">${
                                  messages.length
                                }</span></td>
                                <td>${lastUpdated}</td>
                                <td>
                                  <details>
                                    <summary>View Messages</summary>
                                    <div class="details-content">
                                      ${
                                        messages.length > 0
                                          ? `<div class="message-preview">
                                          <pre>${JSON.stringify(messages, null, 2)}</pre>
                                        </div>`
                                          : '<p>No messages in queue</p>'
                                      }
                                    </div>
                                  </details>
                                </td>
                              </tr>
                            `
                            })
                            .join('')}
                        </tbody>
                      </table>`
                    }
                </div>
            </div>
        </div>
        
        <footer class="footer">
            <p>Last Updated: <span id="timestamp">${new Date().toLocaleString()}</span></p>
            <p>Session Version: <span class="version">v0.9.0</span></p>
        </footer>
    </div>
</body>
</html>`
