export const status_html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>tcs API Status</title>
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
            max-width: 400px;
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

        .status-section {
            margin: 2.5rem 0;
            animation: fadeInUp 1s ease-out 0.7s both;
        }

        .status-indicator {
            width: 80px;
            height: 80px;
            margin: 0 auto 1.5rem;
            position: relative;
        }

        .status-circle {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(135deg, #10b981, #059669);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 
                0 0 0 4px rgba(16, 185, 129, 0.2),
                0 8px 16px rgba(16, 185, 129, 0.2);
            animation: statusPulse 4s ease-in-out infinite;
            position: relative;
        }

        .status-circle::before {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            bottom: 2px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent);
            opacity: 0.6;
        }

        @keyframes statusPulse {
            0%, 100% { 
                transform: scale(1);
                box-shadow: 
                    0 0 0 4px rgba(16, 185, 129, 0.2),
                    0 8px 16px rgba(16, 185, 129, 0.2);
            }
            50% { 
                transform: scale(1.02);
                box-shadow: 
                    0 0 0 8px rgba(16, 185, 129, 0.15),
                    0 12px 24px rgba(16, 185, 129, 0.3);
            }
        }

        .checkmark {
            color: white;
            font-size: 1.875rem;
            font-weight: 600;
        }

        .status-text {
            font-size: 1.5rem;
            font-weight: 600;
            color: #10b981;
            margin-bottom: 0.5rem;
            letter-spacing: -0.025em;
        }

        .status-description {
            font-size: 1rem;
            color: rgba(255, 255, 255, 0.8);
            font-weight: 400;
        }

        .info-panel {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 2rem;
            animation: fadeInUp 1s ease-out 0.9s both;
            transition: all 0.3s ease;
        }

        .info-panel:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            transition: all 0.2s ease;
        }

        .info-row:hover {
            padding-left: 0.5rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            margin: 0 -0.5rem;
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .info-label {
            font-size: 0.875rem;
            color: rgba(255, 255, 255, 0.7);
            font-weight: 500;
        }

        .info-value {
            font-size: 0.875rem;
            color: #ffffff;
            font-weight: 600;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
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

        @media (max-width: 640px) {
            body {
                padding: 0.5rem;
            }
            
            .container {
                padding: 2rem 1.5rem;
                max-width: 100%;
                margin: 0;
            }
            
            .api-title {
                font-size: 1.5rem;
            }
            
            .api-subtitle {
                font-size: 0.8rem;
            }
            
            .status-indicator {
                width: 72px;
                height: 72px;
            }
            
            .checkmark {
                font-size: 1.5rem;
            }
            
            .status-text {
                font-size: 1.25rem;
            }
            
            .info-panel {
                padding: 1.25rem;
            }
            
            .info-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 0.25rem;
                padding: 0.5rem 0;
            }
            
            .company-logo {
                width: 40px;
                height: 40px;
                font-size: 1.25rem;
            }
        }

        @media (max-width: 480px) {
            .container {
                padding: 1.5rem 1rem;
            }
            
            .api-title {
                font-size: 1.375rem;
            }
            
            .status-text {
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

    <div class="container">
        <div class="header">
            <div class="company-logo">H</div>
            <h1 class="api-title">tcs API</h1>
            <p class="api-subtitle">Service Status</p>
        </div>
        
        <div class="status-section">
            <div class="status-indicator">
                <div class="status-circle">
                    <div class="checkmark">✓</div>
                </div>
            </div>
            
            <div class="status-text">Operational</div>
            <div class="status-description">All systems running normally</div>
        </div>
        
        <div class="info-panel">
            <div class="info-row">
                <span class="info-label">Service Status</span>
                <span class="info-value">ONLINE</span>
            </div>
            <div class="info-row">
                <span class="info-label">API Version</span>
                <span class="info-value">v0.9.0</span>
            </div>
            <div class="info-row">
                <span class="info-label">Environment</span>
                <span class="info-value">DEVELOPMENT</span>
            </div>
        </div>

        <div class="footer">
            <div class="timestamp-container">
                <div class="status-dot"></div>
                <span>Last checked: <span id="current-time"></span></span>
            </div>
        </div>
    </div>

    <script>
        function updateTime() {
            const now = new Date();
            const options = {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            };
            document.getElementById('current-time').textContent = now.toLocaleDateString('en-US', options);
        }

        // Initialize and update time every second
        updateTime();
        setInterval(updateTime, 1000);
    </script>
</body>
</html>
`
