import { Injectable, Logger } from '@nestjs/common';

interface RouteMetric {
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  errors: number;
  lastAccess: Date;
  statusCodes: { [key: number]: number };
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger('Metrics');
  private metrics: Map<string, RouteMetric> = new Map();
  private startTime = new Date();

  recordRequest(route: string, duration: number, statusCode: number, isError = false) {
    const key = route;
    const existing = this.metrics.get(key) || {
      count: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errors: 0,
      lastAccess: new Date(),
      statusCodes: {},
    };

    existing.count++;
    existing.totalDuration += duration;
    existing.avgDuration = existing.totalDuration / existing.count;
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    existing.lastAccess = new Date();
    existing.statusCodes[statusCode] = (existing.statusCodes[statusCode] || 0) + 1;
    
    if (isError) {
      existing.errors++;
    }

    this.metrics.set(key, existing);
  }

  getMetrics() {
    const metricsArray = Array.from(this.metrics.entries()).map(
      ([route, data]) => ({
        route,
        ...data,
        errorRate: data.count > 0 ? (data.errors / data.count) * 100 : 0,
      })
    );

    return metricsArray.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  getStartTime() {
    return this.startTime;
  }

  getDashboardData() {
    const metrics = this.getMetrics();
    const totalRequests = metrics.reduce((sum, m) => sum + m.count, 0);
    const totalErrors = metrics.reduce((sum, m) => sum + m.errors, 0);
    const avgResponseTime = totalRequests > 0
      ? metrics.reduce((sum, m) => sum + m.avgDuration * m.count, 0) / totalRequests
      : 0;

    return {
      overview: {
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
        avgResponseTime: Math.round(avgResponseTime),
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      },
      slowestRoutes: metrics
        .slice(0, 10)
        .map((m) => ({
          route: m.route,
          avgDuration: Math.round(m.avgDuration),
          maxDuration: m.maxDuration,
          count: m.count,
          errors: m.errors,
        })),
      mostUsedRoutes: metrics
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((m) => ({
          route: m.route,
          count: m.count,
          avgDuration: Math.round(m.avgDuration),
          errors: m.errors,
        })),
      errorRoutes: metrics
        .filter((m) => m.errors > 0)
        .map((m) => ({
          route: m.route,
          errors: m.errors,
          errorRate: Math.round(m.errorRate * 100) / 100,
          count: m.count,
        })),
      recentActivity: metrics
        .sort((a, b) => b.lastAccess.getTime() - a.lastAccess.getTime())
        .slice(0, 10)
        .map((m) => ({
          route: m.route,
          lastAccess: m.lastAccess,
          count: m.count,
          avgDuration: Math.round(m.avgDuration),
        })),
    };
  }
}