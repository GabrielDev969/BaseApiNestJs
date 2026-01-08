import { Controller, Get, Render, Res, VERSION_NEUTRAL } from '@nestjs/common';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller({ path: 'monitoring', version: VERSION_NEUTRAL })
export class MonitoringController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  getDashboard(@Res() res: Response) {
    const html = this.generateDashboardHTML();
    res.type('text/html').send(html);
  }

  @Get('api/data')
  getDashboardData() {
    return this.metricsService.getDashboardData();
  }

  private generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Monitoramento - API</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 20px;
            min-height: 100vh;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
            text-align: center;
        }

        h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .subtitle {
            color: #666;
            font-size: 1.1em;
        }

        .status-badge {
            display: inline-block;
            padding: 8px 20px;
            background: #10b981;
            color: white;
            border-radius: 20px;
            margin-top: 15px;
            font-weight: bold;
        }

        .overview {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }

        .card:hover {
            transform: translateY(-5px);
        }

        .metric-card {
            text-align: center;
        }

        .metric-value {
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
            margin: 10px 0;
        }

        .metric-label {
            font-size: 1.1em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .metric-icon {
            font-size: 2.5em;
            margin-bottom: 10px;
        }

        .section-title {
            color: white;
            font-size: 1.8em;
            margin: 30px 0 15px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .route-list {
            background: white;
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        .route-item {
            padding: 15px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.2s;
        }

        .route-item:hover {
            background: #f9fafb;
        }

        .route-item:last-child {
            border-bottom: none;
        }

        .route-name {
            font-weight: 600;
            color: #333;
            font-family: 'Courier New', monospace;
            flex: 1;
        }

        .route-stats {
            display: flex;
            gap: 20px;
            align-items: center;
        }

        .stat-badge {
            padding: 6px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
        }

        .stat-success {
            background: #d1fae5;
            color: #065f46;
        }

        .stat-warning {
            background: #fef3c7;
            color: #92400e;
        }

        .stat-danger {
            background: #fee2e2;
            color: #991b1b;
        }

        .stat-info {
            background: #dbeafe;
            color: #1e40af;
        }

        .chart-container {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .loading {
            text-align: center;
            padding: 50px;
            color: white;
            font-size: 1.5em;
        }

        .error-badge {
            background: #ef4444;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: bold;
        }

        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #667eea;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 30px;
            font-size: 1em;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            transition: all 0.3s;
        }

        .refresh-btn:hover {
            background: #5568d3;
            transform: scale(1.05);
        }

        .auto-refresh {
            color: white;
            text-align: center;
            margin-top: 20px;
            font-size: 0.9em;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .pulse {
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Dashboard de Monitoramento</h1>
            <p class="subtitle">Análise em Tempo Real da sua API</p>
            <div class="status-badge">✓ Sistema Operacional</div>
        </header>

        <div id="loading" class="loading">
            Carregando dados... 🔄
        </div>

        <div id="dashboard" style="display: none;">
            <div class="overview" id="overview"></div>

            <h2 class="section-title">🐌 Rotas Mais Lentas</h2>
            <div class="route-list" id="slowest-routes"></div>

            <h2 class="section-title">🔥 Rotas Mais Acessadas</h2>
            <div class="route-list" id="most-used-routes"></div>

            <div id="error-section" style="display: none;">
                <h2 class="section-title">⚠️ Rotas com Erros</h2>
                <div class="route-list" id="error-routes"></div>
            </div>

            <h2 class="section-title">📈 Gráficos de Performance</h2>
            <div class="chart-container">
                <canvas id="performanceChart"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="usageChart"></canvas>
            </div>
        </div>

        <button class="refresh-btn" onclick="loadData()">🔄 Atualizar</button>
        <div class="auto-refresh pulse">Atualização automática a cada 10 segundos</div>
    </div>

    <script>
        let performanceChart = null;
        let usageChart = null;

        function formatUptime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return hours + 'h ' + minutes + 'm ' + secs + 's';
        }

        function formatDuration(ms) {
            if (ms < 100) return ms + 'ms';
            if (ms < 1000) return Math.round(ms) + 'ms';
            return (ms / 1000).toFixed(2) + 's';
        }

        async function loadData() {
            try {
                const response = await fetch('/monitoring/api/data');
                const data = await response.json();
                
                renderOverview(data.overview);
                renderSlowestRoutes(data.slowestRoutes);
                renderMostUsedRoutes(data.mostUsedRoutes);
                renderErrorRoutes(data.errorRoutes);
                renderCharts(data);

                document.getElementById('loading').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
            }
        }

        function renderOverview(overview) {
            const container = document.getElementById('overview');
            container.innerHTML = \`
                <div class="card metric-card">
                    <div class="metric-icon">📊</div>
                    <div class="metric-value">\${overview.totalRequests.toLocaleString()}</div>
                    <div class="metric-label">Total de Requisições</div>
                </div>
                <div class="card metric-card">
                    <div class="metric-icon">⚡</div>
                    <div class="metric-value">\${overview.avgResponseTime}</div>
                    <div class="metric-label">Tempo Médio (ms)</div>
                </div>
                <div class="card metric-card">
                    <div class="metric-icon">\${overview.totalErrors > 0 ? '⚠️' : '✅'}</div>
                    <div class="metric-value">\${overview.totalErrors}</div>
                    <div class="metric-label">Erros Totais</div>
                </div>
                <div class="card metric-card">
                    <div class="metric-icon">⏱️</div>
                    <div class="metric-value">\${formatUptime(overview.uptime)}</div>
                    <div class="metric-label">Tempo Online</div>
                </div>
            \`;
        }

        function renderSlowestRoutes(routes) {
            const container = document.getElementById('slowest-routes');
            if (routes.length === 0) {
                container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Nenhuma rota registrada ainda</p>';
                return;
            }
            
            container.innerHTML = routes.map(route => \`
                <div class="route-item">
                    <div class="route-name">\${route.route}</div>
                    <div class="route-stats">
                        <span class="stat-badge \${route.avgDuration > 1000 ? 'stat-danger' : route.avgDuration > 500 ? 'stat-warning' : 'stat-success'}">
                            Média: \${formatDuration(route.avgDuration)}
                        </span>
                        <span class="stat-badge stat-info">
                            Máx: \${formatDuration(route.maxDuration)}
                        </span>
                        <span class="stat-badge stat-info">
                            \${route.count}x
                        </span>
                        \${route.errors > 0 ? \`<span class="error-badge">\${route.errors} erros</span>\` : ''}
                    </div>
                </div>
            \`).join('');
        }

        function renderMostUsedRoutes(routes) {
            const container = document.getElementById('most-used-routes');
            if (routes.length === 0) {
                container.innerHTML = '<p style="padding: 20px; text-align: center; color: #666;">Nenhuma rota registrada ainda</p>';
                return;
            }
            
            container.innerHTML = routes.map(route => \`
                <div class="route-item">
                    <div class="route-name">\${route.route}</div>
                    <div class="route-stats">
                        <span class="stat-badge stat-info">
                            \${route.count.toLocaleString()} requisições
                        </span>
                        <span class="stat-badge \${route.avgDuration > 1000 ? 'stat-danger' : route.avgDuration > 500 ? 'stat-warning' : 'stat-success'}">
                            Média: \${formatDuration(route.avgDuration)}
                        </span>
                        \${route.errors > 0 ? \`<span class="error-badge">\${route.errors} erros</span>\` : ''}
                    </div>
                </div>
            \`).join('');
        }

        function renderErrorRoutes(routes) {
            const section = document.getElementById('error-section');
            const container = document.getElementById('error-routes');
            
            if (routes.length === 0) {
                section.style.display = 'none';
                return;
            }
            
            section.style.display = 'block';
            container.innerHTML = routes.map(route => \`
                <div class="route-item">
                    <div class="route-name">\${route.route}</div>
                    <div class="route-stats">
                        <span class="error-badge">\${route.errors} erros</span>
                        <span class="stat-badge stat-danger">
                            Taxa: \${route.errorRate.toFixed(1)}%
                        </span>
                        <span class="stat-badge stat-info">
                            \${route.count} total
                        </span>
                    </div>
                </div>
            \`).join('');
        }

        function renderCharts(data) {
            // Gráfico de Performance
            const perfCtx = document.getElementById('performanceChart').getContext('2d');
            if (performanceChart) performanceChart.destroy();
            
            const slowestData = data.slowestRoutes.slice(0, 8);
            performanceChart = new Chart(perfCtx, {
                type: 'bar',
                data: {
                    labels: slowestData.map(r => r.route.split(' ')[1] || r.route),
                    datasets: [{
                        label: 'Tempo Médio (ms)',
                        data: slowestData.map(r => r.avgDuration),
                        backgroundColor: 'rgba(102, 126, 234, 0.7)',
                        borderColor: 'rgba(102, 126, 234, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Tempo Médio de Resposta por Rota',
                            font: { size: 16 }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Tempo (ms)'
                            }
                        }
                    }
                }
            });

            // Gráfico de Uso
            const usageCtx = document.getElementById('usageChart').getContext('2d');
            if (usageChart) usageChart.destroy();
            
            const mostUsedData = data.mostUsedRoutes.slice(0, 8);
            usageChart = new Chart(usageCtx, {
                type: 'bar',
                data: {
                    labels: mostUsedData.map(r => r.route.split(' ')[1] || r.route),
                    datasets: [{
                        label: 'Número de Requisições',
                        data: mostUsedData.map(r => r.count),
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: 'rgba(16, 185, 129, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Rotas Mais Acessadas',
                            font: { size: 16 }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Número de Requisições'
                            }
                        }
                    }
                }
            });
        }

        // Carregar dados inicialmente
        loadData();

        // Atualizar automaticamente a cada 10 segundos
        setInterval(loadData, 10000);
    </script>
</body>
</html>
    `;
  }
}