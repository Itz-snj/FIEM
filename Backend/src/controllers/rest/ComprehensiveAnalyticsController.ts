import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";
import { Returns } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { AnalyticsService } from "../../services/AnalyticsService.js";

@Controller("/comprehensive-analytics")
export class ComprehensiveAnalyticsController {
  @Inject()
  private analyticsService: AnalyticsService;

  /**
   * Get comprehensive analytics overview
   */
  @Get("/overview")
  @Returns(200)
  async getAnalyticsOverview() {
    try {
      const [responseTime, serviceQuality, usage, systemHealth, revenue] = await Promise.all([
        this.analyticsService.getResponseTimeMetrics(),
        this.analyticsService.getServiceQualityMetrics(),
        this.analyticsService.getUsageStatistics(),
        this.analyticsService.getSystemHealthMetrics(),
        this.analyticsService.getRevenueAnalytics()
      ]);

      return {
        success: true,
        data: {
          responseTime,
          serviceQuality,
          usage,
          systemHealth,
          revenue,
          period: responseTime.period
        }
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch analytics overview",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get response time metrics
   */
  @Get("/response-time")
  @Returns(200)
  async getResponseTimeMetrics() {
    try {
      const metrics = await this.analyticsService.getResponseTimeMetrics();

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch response time metrics",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get service quality metrics
   */
  @Get("/service-quality")
  @Returns(200)
  async getServiceQualityMetrics() {
    try {
      const metrics = await this.analyticsService.getServiceQualityMetrics();

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch service quality metrics",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get usage statistics
   */
  @Get("/usage-statistics")
  @Returns(200)
  async getUsageStatistics() {
    try {
      const statistics = await this.analyticsService.getUsageStatistics();

      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch usage statistics",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get driver performance metrics
   */
  @Get("/drivers")
  @Returns(200)
  async getDriverPerformanceMetrics() {
    try {
      const metrics = await this.analyticsService.getDriverPerformanceMetrics();

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch driver performance metrics",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get hospital utilization metrics
   */
  @Get("/hospitals")
  @Returns(200)
  async getHospitalUtilizationMetrics() {
    try {
      const metrics = await this.analyticsService.getHospitalUtilizationMetrics();

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch hospital utilization metrics",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get system health metrics
   */
  @Get("/system-health")
  @Returns(200)
  async getSystemHealthMetrics() {
    try {
      const metrics = await this.analyticsService.getSystemHealthMetrics();

      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch system health metrics",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get revenue analytics
   */
  @Get("/revenue")
  @Returns(200)
  async getRevenueAnalytics() {
    try {
      const analytics = await this.analyticsService.getRevenueAnalytics();

      return {
        success: true,
        data: analytics
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch revenue analytics",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get dashboard summary
   */
  @Get("/dashboard-summary")
  @Returns(200)
  async getDashboardSummary() {
    try {
      const [responseTime, serviceQuality, usage, systemHealth] = await Promise.all([
        this.analyticsService.getResponseTimeMetrics(),
        this.analyticsService.getServiceQualityMetrics(),
        this.analyticsService.getUsageStatistics(),
        this.analyticsService.getSystemHealthMetrics()
      ]);

      const summary = {
        totalBookings: usage.totalBookings,
        emergencyBookings: usage.emergencyBookings,
        avgResponseTime: responseTime.avgResponseTime,
        completionRate: serviceQuality.completionRate,
        driverRating: serviceQuality.driverRating,
        activeDrivers: usage.activeDrivers,
        systemUptime: systemHealth.uptime,
        errorRate: systemHealth.errorRate
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch dashboard summary",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get real-time statistics
   */
  @Get("/real-time-stats")
  @Returns(200)
  async getRealTimeStats() {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [recentUsage, systemHealth] = await Promise.all([
        this.analyticsService.getUsageStatistics(last24Hours, now),
        this.analyticsService.getSystemHealthMetrics()
      ]);

      const realTimeStats = {
        timestamp: now,
        last24Hours: {
          totalBookings: recentUsage.totalBookings,
          emergencyBookings: recentUsage.emergencyBookings,
          activeDrivers: recentUsage.activeDrivers
        },
        system: {
          uptime: systemHealth.uptime,
          memoryUsage: systemHealth.memoryUsage,
          errorRate: systemHealth.errorRate,
          avgResponseTime: systemHealth.avgResponseTime
        }
      };

      return {
        success: true,
        data: realTimeStats
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch real-time statistics",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get top performing drivers
   */
  @Get("/top-drivers")
  @Returns(200)
  async getTopPerformingDrivers() {
    try {
      const allDrivers = await this.analyticsService.getDriverPerformanceMetrics();
      
      const topDrivers = allDrivers
        .filter(driver => driver.totalBookings > 0)
        .sort((a, b) => {
          const scoreA = (a.avgRating * 0.4) + (a.efficiency * 0.6);
          const scoreB = (b.avgRating * 0.4) + (b.efficiency * 0.6);
          return scoreB - scoreA;
        })
        .slice(0, 10);

      return {
        success: true,
        data: topDrivers
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch top performing drivers",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get hospital performance rankings
   */
  @Get("/hospital-rankings")
  @Returns(200)
  async getHospitalRankings() {
    try {
      const hospitals = await this.analyticsService.getHospitalUtilizationMetrics();
      
      const rankedHospitals = hospitals
        .filter(hospital => hospital.totalBookings > 0)
        .sort((a, b) => {
          const scoreA = (a.patientSatisfaction * 0.5) + ((100 - a.avgWaitTime) * 0.3) + (a.bedUtilization * 0.2);
          const scoreB = (b.patientSatisfaction * 0.5) + ((100 - b.avgWaitTime) * 0.3) + (b.bedUtilization * 0.2);
          return scoreB - scoreA;
        });

      return {
        success: true,
        data: rankedHospitals
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch hospital rankings",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  /**
   * Get financial insights
   */
  @Get("/financial-insights")
  @Returns(200)
  async getFinancialInsights() {
    try {
      const revenue = await this.analyticsService.getRevenueAnalytics();
      const usage = await this.analyticsService.getUsageStatistics();

      const insights = {
        revenue,
        profitability: {
          grossProfit: revenue.totalRevenue - revenue.driverCommissions,
          operatingMargin: ((revenue.platformFees + revenue.hospitalFees) / revenue.totalRevenue) * 100,
          revenuePerBooking: revenue.avgBookingValue
        },
        growth: {
          emergencyGrowthRate: usage.emergencyBookings > 0 ? 
            ((usage.emergencyBookings / usage.totalBookings) * 100) : 0,
          scheduledGrowthRate: usage.scheduledBookings > 0 ? 
            ((usage.scheduledBookings / usage.totalBookings) * 100) : 0
        },
        forecasting: {
          projectedMonthlyRevenue: revenue.totalRevenue * 30
        }
      };

      return {
        success: true,
        data: insights
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to fetch financial insights",
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
}