import { Service } from "@tsed/di";
import { Logger } from "@tsed/logger";
import { Model } from "@tsed/mongoose";
import { Inject } from "@tsed/di";
import { Booking, BookingStatus } from "../models/Booking.js";
import { Driver, DriverStatus } from "../models/Driver.js";
import { Hospital } from "../models/Hospital.js";
import type { Model as MongooseModelType } from "mongoose";

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  acknowledged?: boolean;
  resolvedAt?: Date;
  source: string;
}

export enum AlertType {
  SYSTEM_ERROR = 'system_error',
  HIGH_RESPONSE_TIME = 'high_response_time',
  LOW_DRIVER_AVAILABILITY = 'low_driver_availability',
  BOOKING_FAILURE = 'booking_failure',
  DATABASE_ERROR = 'database_error',
  HIGH_MEMORY_USAGE = 'high_memory_usage',
  HIGH_ERROR_RATE = 'high_error_rate',
  EMERGENCY_OVERLOAD = 'emergency_overload',
  HOSPITAL_CAPACITY = 'hospital_capacity',
  DRIVER_OFFLINE = 'driver_offline'
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export interface SystemHealthCheck {
  timestamp: Date;
  status: 'healthy' | 'warning' | 'critical';
  checks: {
    database: boolean;
    memory: { usage: number; status: boolean };
    responseTime: { avg: number; status: boolean };
    errorRate: { rate: number; status: boolean };
    activeDrivers: { count: number; status: boolean };
    pendingBookings: { count: number; status: boolean };
  };
  uptime: number;
  version: string;
}

export interface MonitoringMetrics {
  timestamp: Date;
  activeAlerts: number;
  criticalAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  avgResponseTime: number;
  errorRate: number;
  memoryUsage: number;
  activeDrivers: number;
  pendingBookings: number;
  hospitalCapacityAlerts: number;
}

@Service()
export class MonitoringService {
  @Inject()
  private logger: Logger;

  @Inject(Booking)
  private bookingModel: MongooseModelType<Booking>;

  @Inject(Driver)
  private driverModel: MongooseModelType<Driver>;

  @Inject(Hospital)
  private hospitalModel: MongooseModelType<Hospital>;

  private alerts: Alert[] = [];
  private healthChecks: SystemHealthCheck[] = [];
  private alertCounter = 0;

  constructor() {
    // Start periodic health checks
    this.startHealthMonitoring();
  }

  /**
   * Create a new alert
   */
  async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    title: string,
    message: string,
    data?: any,
    source = 'system'
  ): Promise<Alert> {
    const alert: Alert = {
      id: `alert_${++this.alertCounter}_${Date.now()}`,
      type,
      severity,
      title,
      message,
      data,
      timestamp: new Date(),
      source
    };

    this.alerts.unshift(alert);

    // Keep only last 1000 alerts to prevent memory issues
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(0, 1000);
    }

    this.logger.warn(`[ALERT-${severity.toUpperCase()}] ${title}: ${message}`, data);

    // Auto-escalate critical alerts
    if (severity === AlertSeverity.CRITICAL) {
      await this.escalateCriticalAlert(alert);
    }

    return alert;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(severity?: AlertSeverity): Alert[] {
    let activeAlerts = this.alerts.filter(alert => !alert.resolvedAt);
    
    if (severity) {
      activeAlerts = activeAlerts.filter(alert => alert.severity === severity);
    }

    return activeAlerts.sort((a, b) => {
      const severityOrder = {
        [AlertSeverity.CRITICAL]: 5,
        [AlertSeverity.HIGH]: 4,
        [AlertSeverity.MEDIUM]: 3,
        [AlertSeverity.LOW]: 2,
        [AlertSeverity.INFO]: 1
      };
      
      return severityOrder[b.severity] - severityOrder[a.severity] ||
             b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      this.logger.info(`Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolvedAt) {
      alert.resolvedAt = new Date();
      this.logger.info(`Alert resolved: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Perform comprehensive system health check
   */
  async performHealthCheck(): Promise<SystemHealthCheck> {
    const timestamp = new Date();
    
    try {
      // Database connectivity check
      const dbCheck = await this.checkDatabaseHealth();
      
      // Memory usage check
      const memoryCheck = this.checkMemoryUsage();
      
      // Response time check
      const responseTimeCheck = await this.checkResponseTimes();
      
      // Error rate check
      const errorRateCheck = await this.checkErrorRate();
      
      // Driver availability check
      const driverCheck = await this.checkDriverAvailability();
      
      // Pending bookings check
      const bookingCheck = await this.checkPendingBookings();

      const checks = {
        database: dbCheck,
        memory: memoryCheck,
        responseTime: responseTimeCheck,
        errorRate: errorRateCheck,
        activeDrivers: driverCheck,
        pendingBookings: bookingCheck
      };

      // Determine overall health status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      if (!checks.database || 
          !checks.memory.status || 
          !checks.responseTime.status ||
          checks.errorRate.rate > 10) {
        status = 'critical';
      } else if (!checks.activeDrivers.status || 
                 !checks.pendingBookings.status ||
                 checks.errorRate.rate > 5) {
        status = 'warning';
      }

      const healthCheck: SystemHealthCheck = {
        timestamp,
        status,
        checks,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      };

      this.healthChecks.unshift(healthCheck);
      
      // Keep only last 100 health checks
      if (this.healthChecks.length > 100) {
        this.healthChecks = this.healthChecks.slice(0, 100);
      }

      // Create alerts for critical issues
      await this.processHealthCheckAlerts(healthCheck);

      return healthCheck;

    } catch (error) {
      this.logger.error('Health check failed:', error);
      
      const criticalHealthCheck: SystemHealthCheck = {
        timestamp,
        status: 'critical',
        checks: {
          database: false,
          memory: { usage: 0, status: false },
          responseTime: { avg: 0, status: false },
          errorRate: { rate: 100, status: false },
          activeDrivers: { count: 0, status: false },
          pendingBookings: { count: 0, status: false }
        },
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      };

      await this.createAlert(
        AlertType.SYSTEM_ERROR,
        AlertSeverity.CRITICAL,
        'System Health Check Failed',
        `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.stack : error }
      );

      return criticalHealthCheck;
    }
  }

  /**
   * Get current monitoring metrics
   */
  async getMonitoringMetrics(): Promise<MonitoringMetrics> {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === AlertSeverity.CRITICAL);
    const latestHealthCheck = this.healthChecks[0];

    return {
      timestamp: new Date(),
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
      systemHealth: latestHealthCheck?.status || 'warning',
      avgResponseTime: latestHealthCheck?.checks.responseTime.avg || 0,
      errorRate: latestHealthCheck?.checks.errorRate.rate || 0,
      memoryUsage: latestHealthCheck?.checks.memory.usage || 0,
      activeDrivers: latestHealthCheck?.checks.activeDrivers.count || 0,
      pendingBookings: latestHealthCheck?.checks.pendingBookings.count || 0,
      hospitalCapacityAlerts: activeAlerts.filter(a => a.type === AlertType.HOSPITAL_CAPACITY).length
    };
  }

  /**
   * Get recent health checks
   */
  getHealthHistory(limit = 24): SystemHealthCheck[] {
    return this.healthChecks.slice(0, limit);
  }

  /**
   * Monitor specific booking for issues
   */
  async monitorBooking(bookingId: string): Promise<void> {
    try {
      const booking = await this.bookingModel.findById(bookingId);
      
      if (!booking) {
        await this.createAlert(
          AlertType.BOOKING_FAILURE,
          AlertSeverity.HIGH,
          'Booking Not Found',
          `Booking ${bookingId} could not be found for monitoring`,
          { bookingId }
        );
        return;
      }

      const now = new Date();
      const createdAt = new Date(booking.createdAt!);
      const timeElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60); // minutes

      // Check for long requested bookings
      if (booking.status === BookingStatus.REQUESTED && timeElapsed > 10) {
        await this.createAlert(
          AlertType.HIGH_RESPONSE_TIME,
          AlertSeverity.MEDIUM,
          'Long Pending Booking',
          `Booking ${bookingId} has been requested for ${Math.round(timeElapsed)} minutes`,
          { bookingId, timeElapsed, booking }
        );
      }

      // Check for emergency bookings taking too long
      if (booking.type === 'emergency' && 
          booking.status === BookingStatus.REQUESTED && 
          timeElapsed > 5) {
        await this.createAlert(
          AlertType.EMERGENCY_OVERLOAD,
          AlertSeverity.HIGH,
          'Emergency Booking Delayed',
          `Emergency booking ${bookingId} has been requested for ${Math.round(timeElapsed)} minutes`,
          { bookingId, timeElapsed, booking }
        );
      }

    } catch (error) {
      this.logger.error(`Error monitoring booking ${bookingId}:`, error);
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    // Perform health check every 5 minutes
    setInterval(async () => {
      await this.performHealthCheck();
    }, 5 * 60 * 1000);

    // Perform initial health check
    setTimeout(() => {
      this.performHealthCheck();
    }, 10000); // 10 seconds after startup
  }

  /**
   * Check database connectivity
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.bookingModel.findOne().limit(1);
      return true;
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Check memory usage
   */
  private checkMemoryUsage(): { usage: number; status: boolean } {
    const memoryUsage = process.memoryUsage();
    const usagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    return {
      usage: Math.round(usagePercentage),
      status: usagePercentage < 80 // Alert if memory usage > 80%
    };
  }

  /**
   * Check average response times
   */
  private async checkResponseTimes(): Promise<{ avg: number; status: boolean }> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentBookings = await this.bookingModel
        .find({
          createdAt: { $gte: last24Hours },
          status: { $ne: BookingStatus.CANCELLED }
        })
        .select('createdAt timeline')
        .limit(100);

      const responseTimes = recentBookings.map(booking => {
        const createdAt = new Date(booking.createdAt!);
        const confirmedEvent = booking.timeline?.find(event => 
          event.status === BookingStatus.CONFIRMED
        );
        
        if (confirmedEvent) {
          const confirmedAt = new Date(confirmedEvent.timestamp);
          return (confirmedAt.getTime() - createdAt.getTime()) / 1000; // seconds
        }
        return null;
      }).filter(Boolean) as number[];

      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b) / responseTimes.length 
        : 0;

      return {
        avg: Math.round(avgResponseTime),
        status: avgResponseTime < 300 // Alert if avg response time > 5 minutes
      };

    } catch (error) {
      this.logger.error('Response time check failed:', error);
      return { avg: 0, status: false };
    }
  }

  /**
   * Check error rate
   */
  private async checkErrorRate(): Promise<{ rate: number; status: boolean }> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const [totalBookings, failedBookings] = await Promise.all([
        this.bookingModel.countDocuments({ createdAt: { $gte: last24Hours } }),
        this.bookingModel.countDocuments({
          createdAt: { $gte: last24Hours },
          status: BookingStatus.CANCELLED,
          'timeline.1': { $exists: false } // Cancelled without progression
        })
      ]);

      const errorRate = totalBookings > 0 ? (failedBookings / totalBookings) * 100 : 0;

      return {
        rate: Math.round(errorRate * 100) / 100,
        status: errorRate < 5 // Alert if error rate > 5%
      };

    } catch (error) {
      this.logger.error('Error rate check failed:', error);
      return { rate: 100, status: false };
    }
  }

  /**
   * Check driver availability
   */
  private async checkDriverAvailability(): Promise<{ count: number; status: boolean }> {
    try {
      const activeDriverCount = await this.driverModel.countDocuments({
        status: DriverStatus.AVAILABLE
      });

      return {
        count: activeDriverCount,
        status: activeDriverCount >= 5 // Alert if less than 5 active drivers
      };

    } catch (error) {
      this.logger.error('Driver availability check failed:', error);
      return { count: 0, status: false };
    }
  }

  /**
   * Check pending bookings
   */
  private async checkPendingBookings(): Promise<{ count: number; status: boolean }> {
    try {
      const pendingCount = await this.bookingModel.countDocuments({
        status: BookingStatus.REQUESTED
      });

      return {
        count: pendingCount,
        status: pendingCount < 10 // Alert if more than 10 pending bookings
      };

    } catch (error) {
      this.logger.error('Pending bookings check failed:', error);
      return { count: 0, status: false };
    }
  }

  /**
   * Process health check results and create alerts
   */
  private async processHealthCheckAlerts(healthCheck: SystemHealthCheck): Promise<void> {
    const { checks, status } = healthCheck;

    // Database connectivity alert
    if (!checks.database) {
      await this.createAlert(
        AlertType.DATABASE_ERROR,
        AlertSeverity.CRITICAL,
        'Database Connection Failed',
        'Unable to connect to the database',
        { timestamp: healthCheck.timestamp }
      );
    }

    // Memory usage alert
    if (!checks.memory.status) {
      await this.createAlert(
        AlertType.HIGH_MEMORY_USAGE,
        AlertSeverity.HIGH,
        'High Memory Usage',
        `Memory usage is at ${checks.memory.usage}%`,
        { usage: checks.memory.usage, timestamp: healthCheck.timestamp }
      );
    }

    // Response time alert
    if (!checks.responseTime.status) {
      await this.createAlert(
        AlertType.HIGH_RESPONSE_TIME,
        AlertSeverity.MEDIUM,
        'High Response Times',
        `Average response time is ${checks.responseTime.avg} seconds`,
        { avgResponseTime: checks.responseTime.avg, timestamp: healthCheck.timestamp }
      );
    }

    // Error rate alert
    if (!checks.errorRate.status) {
      await this.createAlert(
        AlertType.HIGH_ERROR_RATE,
        AlertSeverity.HIGH,
        'High Error Rate',
        `Error rate is ${checks.errorRate.rate}%`,
        { errorRate: checks.errorRate.rate, timestamp: healthCheck.timestamp }
      );
    }

    // Driver availability alert
    if (!checks.activeDrivers.status) {
      await this.createAlert(
        AlertType.LOW_DRIVER_AVAILABILITY,
        AlertSeverity.MEDIUM,
        'Low Driver Availability',
        `Only ${checks.activeDrivers.count} drivers are currently active`,
        { activeDrivers: checks.activeDrivers.count, timestamp: healthCheck.timestamp }
      );
    }

    // Pending bookings alert
    if (!checks.pendingBookings.status) {
      await this.createAlert(
        AlertType.EMERGENCY_OVERLOAD,
        AlertSeverity.HIGH,
        'High Number of Pending Bookings',
        `There are ${checks.pendingBookings.count} pending bookings`,
        { pendingBookings: checks.pendingBookings.count, timestamp: healthCheck.timestamp }
      );
    }
  }

  /**
   * Escalate critical alerts
   */
  private async escalateCriticalAlert(alert: Alert): Promise<void> {
    // In a real implementation, this would send notifications to:
    // - SMS to on-call engineers
    // - Slack/Teams channels
    // - Email to management
    // - PagerDuty or similar alerting service
    
    this.logger.error(`CRITICAL ALERT ESCALATION: ${alert.title}`, {
      alertId: alert.id,
      message: alert.message,
      data: alert.data,
      timestamp: alert.timestamp
    });

    // For now, just log the escalation
    console.error('🚨 CRITICAL ALERT ESCALATED 🚨');
    console.error(`Alert ID: ${alert.id}`);
    console.error(`Title: ${alert.title}`);
    console.error(`Message: ${alert.message}`);
    console.error(`Timestamp: ${alert.timestamp.toISOString()}`);
  }
}