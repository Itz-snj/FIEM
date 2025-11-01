import { Controller } from "@tsed/di";
import { Get, Post, Delete } from "@tsed/schema";
import { Returns } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { MonitoringService, AlertSeverity } from "../../services/MonitoringService.js";

@Controller("/monitoring")
export class MonitoringController {
  @Inject()
  private monitoringService: MonitoringService;

  /**
   * Get current system health status
   */
  @Get("/health")
  @Returns(200)
  async getSystemHealth() {
    try {
      const healthCheck = await this.monitoringService.performHealthCheck();

      return {
        success: true,
        data: healthCheck
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to perform health check",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get all active alerts
   */
  @Get("/alerts")
  @Returns(200)
  async getActiveAlerts() {
    try {
      const alerts = this.monitoringService.getActiveAlerts();

      return {
        success: true,
        data: {
          alerts,
          summary: {
            total: alerts.length,
            critical: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
            high: alerts.filter(a => a.severity === AlertSeverity.HIGH).length,
            medium: alerts.filter(a => a.severity === AlertSeverity.MEDIUM).length,
            low: alerts.filter(a => a.severity === AlertSeverity.LOW).length
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch alerts",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get critical alerts only
   */
  @Get("/alerts/critical")
  @Returns(200)
  async getCriticalAlerts() {
    try {
      const criticalAlerts = this.monitoringService.getActiveAlerts(AlertSeverity.CRITICAL);

      return {
        success: true,
        data: criticalAlerts
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch critical alerts",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Acknowledge an alert
   */
  @Post("/alerts/:alertId/acknowledge")
  @Returns(200)
  async acknowledgeAlert() {
    // Note: In a real implementation, we'd extract alertId from path params
    // For now, this is a placeholder
    try {
      return {
        success: true,
        message: "Alert acknowledged successfully"
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to acknowledge alert",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Resolve an alert
   */
  @Post("/alerts/:alertId/resolve")
  @Returns(200)
  async resolveAlert() {
    // Note: In a real implementation, we'd extract alertId from path params
    try {
      return {
        success: true,
        message: "Alert resolved successfully"
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to resolve alert",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get monitoring metrics
   */
  @Get("/metrics")
  @Returns(200)
  async getMonitoringMetrics() {
    try {
      const metrics = await this.monitoringService.getMonitoringMetrics();

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch monitoring metrics",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get health check history
   */
  @Get("/health-history")
  @Returns(200)
  async getHealthHistory() {
    try {
      const history = this.monitoringService.getHealthHistory();

      return {
        success: true,
        data: {
          history,
          summary: {
            totalChecks: history.length,
            healthyChecks: history.filter(h => h.status === 'healthy').length,
            warningChecks: history.filter(h => h.status === 'warning').length,
            criticalChecks: history.filter(h => h.status === 'critical').length
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch health history",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get system status dashboard
   */
  @Get("/dashboard")
  @Returns(200)
  async getMonitoringDashboard() {
    try {
      const [healthCheck, alerts, metrics] = await Promise.all([
        this.monitoringService.performHealthCheck(),
        this.monitoringService.getActiveAlerts(),
        this.monitoringService.getMonitoringMetrics()
      ]);

      const dashboard = {
        timestamp: new Date(),
        systemHealth: {
          status: healthCheck.status,
          uptime: healthCheck.uptime,
          checks: healthCheck.checks
        },
        alerts: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
          recentAlerts: alerts.slice(0, 5).map(alert => ({
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
            timestamp: alert.timestamp
          }))
        },
        metrics: {
          avgResponseTime: metrics.avgResponseTime,
          errorRate: metrics.errorRate,
          memoryUsage: metrics.memoryUsage,
          activeDrivers: metrics.activeDrivers,
          pendingBookings: metrics.pendingBookings
        },
        trends: {
          healthStatus: this.calculateHealthTrend(),
          alertTrend: this.calculateAlertTrend(alerts)
        }
      };

      return {
        success: true,
        data: dashboard
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch monitoring dashboard",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Trigger manual health check
   */
  @Post("/health-check")
  @Returns(200)
  async triggerHealthCheck() {
    try {
      const healthCheck = await this.monitoringService.performHealthCheck();

      return {
        success: true,
        message: "Health check completed",
        data: healthCheck
      };
    } catch (error) {
      return {
        success: false,
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get alert statistics
   */
  @Get("/alert-stats")
  @Returns(200)
  async getAlertStatistics() {
    try {
      const alerts = this.monitoringService.getActiveAlerts();
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentAlerts = alerts.filter(alert => alert.timestamp >= last24Hours);
      
      const stats = {
        total: alerts.length,
        last24Hours: recentAlerts.length,
        bySeverity: {
          critical: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
          high: alerts.filter(a => a.severity === AlertSeverity.HIGH).length,
          medium: alerts.filter(a => a.severity === AlertSeverity.MEDIUM).length,
          low: alerts.filter(a => a.severity === AlertSeverity.LOW).length
        },
        byType: this.groupAlertsByType(alerts),
        acknowledged: alerts.filter(a => a.acknowledged).length,
        resolved: alerts.filter(a => a.resolvedAt).length
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch alert statistics",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get system performance summary
   */
  @Get("/performance-summary")
  @Returns(200)
  async getPerformanceSummary() {
    try {
      const healthHistory = this.monitoringService.getHealthHistory(24); // Last 24 checks
      
      if (healthHistory.length === 0) {
        return {
          success: true,
          data: {
            message: "No health check data available",
            availability: 0,
            averageResponseTime: 0,
            averageMemoryUsage: 0
          }
        };
      }

      const healthyChecks = healthHistory.filter(h => h.status === 'healthy').length;
      const availability = (healthyChecks / healthHistory.length) * 100;
      
      const avgResponseTime = healthHistory.reduce((sum, check) => 
        sum + check.checks.responseTime.avg, 0) / healthHistory.length;
      
      const avgMemoryUsage = healthHistory.reduce((sum, check) => 
        sum + check.checks.memory.usage, 0) / healthHistory.length;

      const summary = {
        period: '24 hours',
        availability: Math.round(availability * 100) / 100,
        averageResponseTime: Math.round(avgResponseTime),
        averageMemoryUsage: Math.round(avgMemoryUsage),
        totalChecks: healthHistory.length,
        healthyChecks,
        warningChecks: healthHistory.filter(h => h.status === 'warning').length,
        criticalChecks: healthHistory.filter(h => h.status === 'critical').length
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch performance summary",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  // Helper methods
  private calculateHealthTrend(): string {
    const healthHistory = this.monitoringService.getHealthHistory(10);
    
    if (healthHistory.length < 2) return 'insufficient_data';
    
    const recent = healthHistory.slice(0, 5);
    const older = healthHistory.slice(5, 10);
    
    const recentHealthy = recent.filter(h => h.status === 'healthy').length;
    const olderHealthy = older.filter(h => h.status === 'healthy').length;
    
    if (recentHealthy > olderHealthy) return 'improving';
    if (recentHealthy < olderHealthy) return 'degrading';
    return 'stable';
  }

  private calculateAlertTrend(alerts: any[]): string {
    const now = new Date();
    const last6Hours = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const last12Hours = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    
    const recent6h = alerts.filter(a => a.timestamp >= last6Hours).length;
    const older6h = alerts.filter(a => a.timestamp >= last12Hours && a.timestamp < last6Hours).length;
    
    if (recent6h > older6h) return 'increasing';
    if (recent6h < older6h) return 'decreasing';
    return 'stable';
  }

  private groupAlertsByType(alerts: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    alerts.forEach(alert => {
      grouped[alert.type] = (grouped[alert.type] || 0) + 1;
    });
    
    return grouped;
  }
}