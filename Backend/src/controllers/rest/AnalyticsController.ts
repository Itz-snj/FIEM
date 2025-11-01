import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";
import { Returns } from "@tsed/schema";

/**
 * 📊 ENHANCED ANALYTICS CONTROLLER
 * 
 * Comprehensive analytics and performance monitoring for production deployment
 * Provides insights into system health, API usage, and performance metrics
 */

interface SystemMetrics {
  requests: Map<string, number>;
  responseTimes: number[];
  errors: Map<string, number>;
  slowRequests: Array<{ endpoint: string; time: number; timestamp: Date }>;
}

interface PerformanceAnalytics {
  summary: {
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    averageResponseTime: number;
    slowRequestsCount: number;
  };
  topEndpoints: Array<{ endpoint: string; requests: number }>;
  performanceMetrics: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    maxResponseTime: number;
  };
  recentSlowRequests: Array<{
    endpoint: string;
    time: number;
    timestamp: string;
  }>;
  errorsByType: Array<{
    statusCode: number;
    endpoint: string;
    count: number;
  }>;
}

@Controller("/analytics")
export class AnalyticsController {
  private static metrics: SystemMetrics = {
    requests: new Map<string, number>(),
    responseTimes: [],
    errors: new Map<string, number>(),
    slowRequests: []
  };

  /**
   * Get comprehensive system health and performance analytics
   */
  @Get("/health")
  @Returns(200)
  getSystemHealth() {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    return {
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptime: {
          seconds: Math.floor(uptime),
          formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
        },
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          usage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        performance: this.getPerformanceAnalytics()
      }
    };
  }

  /**
   * Get detailed API performance analytics
   */
  @Get("/performance")
  @Returns(200)
  getPerformanceMetrics() {
    return {
      success: true,
      data: this.getPerformanceAnalytics()
    };
  }

  /**
   * Get API usage statistics
   */
  @Get("/usage")
  @Returns(200)
  getUsageStats() {
    const totalRequests = Array.from(AnalyticsController.metrics.requests.values())
      .reduce((a, b) => a + b, 0);

    return {
      success: true,
      data: {
        totalRequests,
        uniqueEndpoints: AnalyticsController.metrics.requests.size,
        topEndpoints: Array.from(AnalyticsController.metrics.requests.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 15)
          .map(([endpoint, count]) => ({
            endpoint,
            requests: count,
            percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0
          })),
        requestDistribution: this.getRequestDistribution()
      }
    };
  }

  /**
   * Get error analytics and monitoring
   */
  @Get("/errors")
  @Returns(200)
  getErrorAnalytics() {
    const totalErrors = Array.from(AnalyticsController.metrics.errors.values())
      .reduce((a, b) => a + b, 0);
    
    const totalRequests = Array.from(AnalyticsController.metrics.requests.values())
      .reduce((a, b) => a + b, 0);

    return {
      success: true,
      data: {
        totalErrors,
        errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100 * 100) / 100 : 0,
        errorsByStatus: this.getErrorsByStatus(),
        topErrorEndpoints: this.getTopErrorEndpoints(),
        recentSlowRequests: AnalyticsController.metrics.slowRequests
          .slice(-20)
          .map(req => ({
            endpoint: req.endpoint,
            responseTime: `${req.time}ms`,
            timestamp: req.timestamp.toISOString(),
            severity: req.time > 5000 ? 'critical' : req.time > 2000 ? 'warning' : 'info'
          }))
      }
    };
  }

  /**
   * Get live system monitoring data
   */
  @Get("/live")
  @Returns(200)
  getLiveMonitoring() {
    const recentRequests = AnalyticsController.metrics.responseTimes.slice(-50);
    const avgResponseTime = recentRequests.length > 0 
      ? recentRequests.reduce((a, b) => a + b) / recentRequests.length 
      : 0;

    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        recentActivity: {
          averageResponseTime: Math.round(avgResponseTime),
          recentRequests: recentRequests.length,
          slowRequestsInLast5Min: AnalyticsController.metrics.slowRequests
            .filter(req => Date.now() - req.timestamp.getTime() < 5 * 60 * 1000).length
        },
        systemLoad: {
          memoryUsage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
          uptime: Math.floor(process.uptime()),
          nodeVersion: process.version
        },
        apiHealth: this.calculateAPIHealthScore()
      }
    };
  }

  /**
   * Static method to record request analytics (called by middleware)
   */
  static recordRequest(endpoint: string, responseTime: number, statusCode: number) {
    // Track request count
    const currentCount = AnalyticsController.metrics.requests.get(endpoint) || 0;
    AnalyticsController.metrics.requests.set(endpoint, currentCount + 1);

    // Track response time
    AnalyticsController.metrics.responseTimes.push(responseTime);
    if (AnalyticsController.metrics.responseTimes.length > 1000) {
      AnalyticsController.metrics.responseTimes = AnalyticsController.metrics.responseTimes.slice(-1000);
    }

    // Track slow requests
    if (responseTime > 2000) {
      AnalyticsController.metrics.slowRequests.push({
        endpoint,
        time: responseTime,
        timestamp: new Date()
      });
      // Keep only last 100 slow requests
      if (AnalyticsController.metrics.slowRequests.length > 100) {
        AnalyticsController.metrics.slowRequests = AnalyticsController.metrics.slowRequests.slice(-100);
      }
    }

    // Track errors
    if (statusCode >= 400) {
      const errorKey = `${statusCode}_${endpoint}`;
      const errorCount = AnalyticsController.metrics.errors.get(errorKey) || 0;
      AnalyticsController.metrics.errors.set(errorKey, errorCount + 1);
    }
  }

  private getPerformanceAnalytics(): PerformanceAnalytics {
    const responseTimes = AnalyticsController.metrics.responseTimes;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b) / responseTimes.length 
      : 0;

    const totalRequests = Array.from(AnalyticsController.metrics.requests.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(AnalyticsController.metrics.errors.values()).reduce((a, b) => a + b, 0);

    return {
      summary: {
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? Math.round((totalErrors / totalRequests) * 100 * 100) / 100 : 0,
        averageResponseTime: Math.round(avgResponseTime),
        slowRequestsCount: AnalyticsController.metrics.slowRequests.length
      },
      topEndpoints: Array.from(AnalyticsController.metrics.requests.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, requests: count })),
      performanceMetrics: {
        averageResponseTime: Math.round(avgResponseTime),
        p95ResponseTime: this.calculatePercentile(responseTimes, 0.95),
        p99ResponseTime: this.calculatePercentile(responseTimes, 0.99),
        maxResponseTime: Math.max(...responseTimes, 0)
      },
      recentSlowRequests: AnalyticsController.metrics.slowRequests
        .slice(-10)
        .map(req => ({
          endpoint: req.endpoint,
          time: req.time,
          timestamp: req.timestamp.toISOString()
        })),
      errorsByType: Array.from(AnalyticsController.metrics.errors.entries())
        .map(([key, count]) => {
          const [statusCode, ...endpointParts] = key.split('_');
          return {
            statusCode: parseInt(statusCode),
            endpoint: endpointParts.join('_'),
            count
          };
        })
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index] || 0;
  }

  private getRequestDistribution() {
    const distribution = {
      GET: 0,
      POST: 0,
      PUT: 0,
      DELETE: 0,
      PATCH: 0,
      OPTIONS: 0
    };

    Array.from(AnalyticsController.metrics.requests.entries()).forEach(([endpoint, count]) => {
      const method = endpoint.split(' ')[0];
      if (distribution.hasOwnProperty(method)) {
        distribution[method as keyof typeof distribution] += count;
      }
    });

    return distribution;
  }

  private getErrorsByStatus() {
    const statusGroups = {
      '400-499': 0, // Client errors
      '500-599': 0  // Server errors
    };

    Array.from(AnalyticsController.metrics.errors.entries()).forEach(([key, count]) => {
      const statusCode = parseInt(key.split('_')[0]);
      if (statusCode >= 400 && statusCode < 500) {
        statusGroups['400-499'] += count;
      } else if (statusCode >= 500) {
        statusGroups['500-599'] += count;
      }
    });

    return statusGroups;
  }

  private getTopErrorEndpoints() {
    const endpointErrors = new Map<string, number>();

    Array.from(AnalyticsController.metrics.errors.entries()).forEach(([key, count]) => {
      const [, ...endpointParts] = key.split('_');
      const endpoint = endpointParts.join('_');
      const currentCount = endpointErrors.get(endpoint) || 0;
      endpointErrors.set(endpoint, currentCount + count);
    });

    return Array.from(endpointErrors.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([endpoint, errors]) => ({ endpoint, errors }));
  }

  private calculateAPIHealthScore(): { score: number; status: string; factors: any } {
    const responseTimes = AnalyticsController.metrics.responseTimes.slice(-100);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b) / responseTimes.length 
      : 0;

    const totalRequests = Array.from(AnalyticsController.metrics.requests.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(AnalyticsController.metrics.errors.values()).reduce((a, b) => a + b, 0);
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    const recentSlowRequests = AnalyticsController.metrics.slowRequests
      .filter(req => Date.now() - req.timestamp.getTime() < 5 * 60 * 1000).length;

    // Calculate health score (0-100)
    let score = 100;
    
    // Penalize for high error rates
    score -= errorRate * 10;
    
    // Penalize for slow response times
    if (avgResponseTime > 1000) score -= 20;
    else if (avgResponseTime > 500) score -= 10;
    
    // Penalize for recent slow requests
    score -= recentSlowRequests * 5;
    
    // Penalize for high memory usage
    const memoryUsage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100;
    if (memoryUsage > 80) score -= 15;
    else if (memoryUsage > 60) score -= 10;

    score = Math.max(0, Math.min(100, score));

    let status = 'excellent';
    if (score < 50) status = 'critical';
    else if (score < 70) status = 'warning';
    else if (score < 85) status = 'good';

    return {
      score: Math.round(score),
      status,
      factors: {
        errorRate: Math.round(errorRate * 100) / 100,
        averageResponseTime: Math.round(avgResponseTime),
        recentSlowRequests,
        memoryUsage: Math.round(memoryUsage)
      }
    };
  }
}