import { Service } from "@tsed/di";
import { Logger } from "@tsed/logger";
import { Model } from "@tsed/mongoose";
import { Inject } from "@tsed/di";
import { Booking, BookingStatus, BookingType, Priority } from "../models/Booking.js";
import { Driver, DriverStatus } from "../models/Driver.js";
import { Hospital } from "../models/Hospital.js";
import { User } from "../models/User.js";
import type { Model as MongooseModelType } from "mongoose";

export interface ResponseTimeMetrics {
  avgResponseTime: number; // in minutes
  medianResponseTime: number;
  p95ResponseTime: number;
  emergencyResponseTime: number;
  scheduledResponseTime: number;
  totalBookings: number;
  period: string;
}

export interface ServiceQualityMetrics {
  completionRate: number; // percentage
  cancellationRate: number;
  driverRating: number;
  hospitalRating: number;
  serviceRating: number;
  totalRatedBookings: number;
  customerSatisfactionScore: number;
}

export interface UsageStatistics {
  totalBookings: number;
  emergencyBookings: number;
  scheduledBookings: number;
  transferBookings: number;
  uniqueUsers: number;
  activeDrivers: number;
  partneredHospitals: number;
  peakHours: Array<{ hour: number; bookings: number }>;
  busyDays: Array<{ date: string; bookings: number }>;
}

export interface DriverPerformanceMetrics {
  driverId: string;
  driverName: string;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  avgRating: number;
  avgResponseTime: number; // in minutes
  totalDistance: number; // in kilometers
  totalEarnings: number;
  onlineHours: number;
  efficiency: number; // completion rate percentage
  preferredAreas: string[];
}

export interface HospitalUtilizationMetrics {
  hospitalId: string;
  hospitalName: string;
  totalBookings: number;
  emergencyBookings: number;
  scheduledBookings: number;
  avgWaitTime: number; // in minutes
  bedUtilization: number; // percentage
  specialtyDemand: Array<{ specialty: string; bookings: number }>;
  patientSatisfaction: number;
  capacity: number;
  currentOccupancy: number;
}

export interface SystemHealthMetrics {
  uptime: number; // in seconds
  avgResponseTime: number; // in milliseconds
  errorRate: number; // percentage
  activeConnections: number;
  peakConcurrentUsers: number;
  memoryUsage: number; // in MB
  cpuUsage: number; // percentage
  dbConnectionCount: number;
  lastHealthCheck: Date;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  emergencyRevenue: number;
  scheduledRevenue: number;
  avgBookingValue: number;
  revenueByHour: Array<{ hour: number; revenue: number }>;
  revenueByDay: Array<{ date: string; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  driverCommissions: number;
  hospitalFees: number;
  platformFees: number;
}

@Service()
export class AnalyticsService {
  @Inject()
  private logger: Logger;

  @Inject(Booking)
  private bookingModel: MongooseModelType<Booking>;

  @Inject(Driver)
  private driverModel: MongooseModelType<Driver>;

  @Inject(Hospital)
  private hospitalModel: MongooseModelType<Hospital>;

  @Inject(User)
  private userModel: MongooseModelType<User>;

  /**
   * Get response time metrics for bookings
   */
  async getResponseTimeMetrics(startDate?: Date, endDate?: Date): Promise<ResponseTimeMetrics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);
      
      const bookings = await this.bookingModel.find({
        ...dateFilter,
        status: { $ne: BookingStatus.CANCELLED }
      }).select('createdAt timeline type priority');

      const responseTimes = bookings.map(booking => {
        const createdAt = new Date(booking.createdAt!);
        const confirmedEvent = booking.timeline?.find(event => 
          event.status === BookingStatus.CONFIRMED
        );
        
        if (confirmedEvent) {
          const confirmedAt = new Date(confirmedEvent.timestamp);
          return {
            time: (confirmedAt.getTime() - createdAt.getTime()) / (1000 * 60), // minutes
            type: booking.type,
            priority: booking.priority
          };
        }
        return null;
      }).filter(Boolean) as Array<{ time: number; type: BookingType; priority: Priority }>;

      const times = responseTimes.map(rt => rt.time);
      const emergencyTimes = responseTimes
        .filter(rt => rt.type === BookingType.EMERGENCY)
        .map(rt => rt.time);
      const scheduledTimes = responseTimes
        .filter(rt => rt.type === BookingType.SCHEDULED)
        .map(rt => rt.time);

      return {
        avgResponseTime: this.calculateAverage(times),
        medianResponseTime: this.calculateMedian(times),
        p95ResponseTime: this.calculatePercentile(times, 95),
        emergencyResponseTime: this.calculateAverage(emergencyTimes),
        scheduledResponseTime: this.calculateAverage(scheduledTimes),
        totalBookings: bookings.length,
        period: this.formatPeriod(startDate, endDate)
      };

    } catch (error) {
      this.logger.error('Error getting response time metrics:', error);
      throw error;
    }
  }

  /**
   * Get service quality metrics
   */
  async getServiceQualityMetrics(startDate?: Date, endDate?: Date): Promise<ServiceQualityMetrics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);
      
      const [totalBookings, completedBookings, cancelledBookings, ratedBookings] = await Promise.all([
        this.bookingModel.countDocuments(dateFilter),
        this.bookingModel.countDocuments({
          ...dateFilter,
          status: BookingStatus.COMPLETED
        }),
        this.bookingModel.countDocuments({
          ...dateFilter,
          status: BookingStatus.CANCELLED
        }),
        this.bookingModel.find({
          ...dateFilter,
          'feedback.driverRating': { $exists: true }
        }).select('feedback')
      ]);

      const ratings = ratedBookings.map(booking => booking.feedback);
      
      const driverRatings = ratings.map(r => r?.driverRating).filter((rating): rating is number => typeof rating === 'number');
      const hospitalRatings = ratings.map(r => r?.hospitalRating).filter((rating): rating is number => typeof rating === 'number');
      const serviceRatings = ratings.map(r => r?.serviceRating).filter((rating): rating is number => typeof rating === 'number');

      return {
        completionRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
        cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
        driverRating: this.calculateAverage(driverRatings),
        hospitalRating: this.calculateAverage(hospitalRatings),
        serviceRating: this.calculateAverage(serviceRatings),
        totalRatedBookings: ratedBookings.length,
        customerSatisfactionScore: this.calculateAverage(serviceRatings)
      };

    } catch (error) {
      this.logger.error('Error getting service quality metrics:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(startDate?: Date, endDate?: Date): Promise<UsageStatistics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);
      
      const [bookings, uniqueUserCount, activeDriverCount, hospitalCount] = await Promise.all([
        this.bookingModel.find(dateFilter).select('type createdAt userId'),
        this.bookingModel.distinct('userId', dateFilter),
        this.driverModel.countDocuments({ status: DriverStatus.AVAILABLE }),
        this.hospitalModel.countDocuments({ isActive: true })
      ]);

      const emergencyBookings = bookings.filter(b => b.type === BookingType.EMERGENCY).length;
      const scheduledBookings = bookings.filter(b => b.type === BookingType.SCHEDULED).length;
      const transferBookings = bookings.filter(b => b.type === BookingType.TRANSFER).length;

      // Calculate peak hours and busy days
      const peakHours = await this.calculatePeakHours();
      const busyDays = await this.calculateBusyDays();

      return {
        totalBookings: bookings.length,
        emergencyBookings,
        scheduledBookings,
        transferBookings,
        uniqueUsers: uniqueUserCount.length,
        activeDrivers: activeDriverCount,
        partneredHospitals: hospitalCount,
        peakHours,
        busyDays
      };

    } catch (error) {
      this.logger.error('Error getting usage statistics:', error);
      throw error;
    }
  }

  /**
   * Get driver performance metrics
   */
  async getDriverPerformanceMetrics(driverId?: string): Promise<DriverPerformanceMetrics[]> {
    try {
      const driverFilter = driverId ? { _id: driverId } : {};
      const drivers = await this.driverModel.find(driverFilter);

      const performanceMetrics = await Promise.all(
        drivers.map(async (driver) => {
          const bookings = await this.bookingModel.find({ driverId: driver._id });
          
          const completedBookings = bookings.filter(b => b.status === BookingStatus.COMPLETED);
          const cancelledBookings = bookings.filter(b => b.status === BookingStatus.CANCELLED);
          
          const ratings = bookings
            .map(b => b.feedback?.driverRating)
            .filter(Boolean) as number[];
          
          const responseTimes = bookings.map(booking => {
            const createdAt = new Date(booking.createdAt!);
            const assignedEvent = booking.timeline?.find(event => 
              event.status === BookingStatus.DRIVER_ASSIGNED
            );
            
            if (assignedEvent) {
              const assignedAt = new Date(assignedEvent.timestamp);
              return (assignedAt.getTime() - createdAt.getTime()) / (1000 * 60);
            }
            return null;
          }).filter(Boolean) as number[];

          const totalDistance = bookings.reduce((sum, booking) => {
            return sum + (booking.tracking?.distance || 0);
          }, 0);

          const totalEarnings = bookings.reduce((sum, booking) => {
            return sum + (booking.payment?.amount || 0) * 0.8; // Assuming 80% goes to driver
          }, 0);

          return {
            driverId: driver._id,
            driverName: (driver as any).name || 'Unknown Driver',
            totalBookings: bookings.length,
            completedBookings: completedBookings.length,
            cancelledBookings: cancelledBookings.length,
            avgRating: this.calculateAverage(ratings),
            avgResponseTime: this.calculateAverage(responseTimes),
            totalDistance,
            totalEarnings,
            onlineHours: 0, // Will need to implement working hours tracking
            efficiency: bookings.length > 0 ? (completedBookings.length / bookings.length) * 100 : 0,
            preferredAreas: []
          };
        })
      );

      return performanceMetrics;

    } catch (error) {
      this.logger.error('Error getting driver performance metrics:', error);
      throw error;
    }
  }

  /**
   * Get hospital utilization metrics
   */
  async getHospitalUtilizationMetrics(hospitalId?: string): Promise<HospitalUtilizationMetrics[]> {
    try {
      const hospitalFilter = hospitalId ? { _id: hospitalId } : {};
      const hospitals = await this.hospitalModel.find(hospitalFilter);

      const utilizationMetrics = await Promise.all(
        hospitals.map(async (hospital) => {
          const bookings = await this.bookingModel.find({ hospitalId: hospital._id });
          
          const emergencyBookings = bookings.filter(b => b.type === BookingType.EMERGENCY).length;
          const scheduledBookings = bookings.filter(b => b.type === BookingType.SCHEDULED).length;
          
          const ratings = bookings
            .map(b => b.feedback?.hospitalRating)
            .filter(Boolean) as number[];

          const waitTimes = bookings.map(booking => {
            const arrivedEvent = booking.timeline?.find(event => 
              event.status === BookingStatus.ARRIVED_HOSPITAL
            );
            const completedEvent = booking.timeline?.find(event => 
              event.status === BookingStatus.COMPLETED
            );
            
            if (arrivedEvent && completedEvent) {
              const arrivedAt = new Date(arrivedEvent.timestamp);
              const completedAt = new Date(completedEvent.timestamp);
              return (completedAt.getTime() - arrivedAt.getTime()) / (1000 * 60);
            }
            return null;
          }).filter(Boolean) as number[];

          const specialtyDemand = this.calculateSpecialtyDemand(bookings);
          const totalCapacity = 100; // Default capacity
          const currentOccupancy = 0; // Will need to implement occupancy tracking

          return {
            hospitalId: hospital._id,
            hospitalName: hospital.name,
            totalBookings: bookings.length,
            emergencyBookings,
            scheduledBookings,
            avgWaitTime: this.calculateAverage(waitTimes),
            bedUtilization: totalCapacity > 0 ? (currentOccupancy / totalCapacity) * 100 : 0,
            specialtyDemand,
            patientSatisfaction: this.calculateAverage(ratings),
            capacity: totalCapacity,
            currentOccupancy
          };
        })
      );

      return utilizationMetrics;

    } catch (error) {
      this.logger.error('Error getting hospital utilization metrics:', error);
      throw error;
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    try {
      const startTime = process.uptime();
      const memoryUsage = process.memoryUsage();
      
      const recentBookings = await this.bookingModel
        .find({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
        .select('createdAt timeline')
        .limit(1000);

      const responseTimes = recentBookings.map(booking => {
        const createdAt = new Date(booking.createdAt!);
        const confirmedEvent = booking.timeline?.find(event => 
          event.status === BookingStatus.CONFIRMED
        );
        
        if (confirmedEvent) {
          const confirmedAt = new Date(confirmedEvent.timestamp);
          return confirmedAt.getTime() - createdAt.getTime();
        }
        return null;
      }).filter(Boolean) as number[];

      const errorBookings = await this.bookingModel.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: BookingStatus.CANCELLED,
        'timeline.1': { $exists: false }
      });

      const totalRecentBookings = recentBookings.length;
      const errorRate = totalRecentBookings > 0 ? (errorBookings / totalRecentBookings) * 100 : 0;

      return {
        uptime: startTime,
        avgResponseTime: this.calculateAverage(responseTimes),
        errorRate,
        activeConnections: 0,
        peakConcurrentUsers: 0,
        memoryUsage: memoryUsage.heapUsed / (1024 * 1024),
        cpuUsage: 0,
        dbConnectionCount: 1,
        lastHealthCheck: new Date()
      };

    } catch (error) {
      this.logger.error('Error getting system health metrics:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(startDate?: Date, endDate?: Date): Promise<RevenueAnalytics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate);
      
      const bookings = await this.bookingModel
        .find({
          ...dateFilter,
          status: BookingStatus.COMPLETED,
          'payment.status': 'paid'
        })
        .select('payment type createdAt');

      const totalRevenue = bookings.reduce((sum, booking) => sum + booking.payment.amount, 0);
      
      const emergencyRevenue = bookings
        .filter(b => b.type === BookingType.EMERGENCY)
        .reduce((sum, booking) => sum + booking.payment.amount, 0);
      
      const scheduledRevenue = bookings
        .filter(b => b.type === BookingType.SCHEDULED)
        .reduce((sum, booking) => sum + booking.payment.amount, 0);

      const avgBookingValue = bookings.length > 0 ? totalRevenue / bookings.length : 0;

      return {
        totalRevenue,
        emergencyRevenue,
        scheduledRevenue,
        avgBookingValue,
        revenueByHour: this.calculateRevenueByHour(bookings),
        revenueByDay: this.calculateRevenueByDay(bookings),
        revenueByMonth: this.calculateRevenueByMonth(bookings),
        driverCommissions: totalRevenue * 0.70,
        hospitalFees: totalRevenue * 0.15,
        platformFees: totalRevenue * 0.15
      };

    } catch (error) {
      this.logger.error('Error getting revenue analytics:', error);
      throw error;
    }
  }

  // Helper methods
  private buildDateFilter(startDate?: Date, endDate?: Date) {
    const filter: any = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }
    return filter;
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[middle - 1] + sorted[middle]) / 2 
      : sorted[middle];
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private formatPeriod(startDate?: Date, endDate?: Date): string {
    if (!startDate && !endDate) return 'All time';
    if (startDate && endDate) {
      return `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`;
    }
    if (startDate) return `Since ${startDate.toISOString().split('T')[0]}`;
    if (endDate) return `Until ${endDate.toISOString().split('T')[0]}`;
    return 'Custom period';
  }

  private async calculatePeakHours(): Promise<Array<{ hour: number; bookings: number }>> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const pipeline = [
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { bookings: -1 as -1 } }
    ];

    const result = await this.bookingModel.aggregate(pipeline);
    return result.map(r => ({ hour: r._id, bookings: r.bookings }));
  }

  private async calculateBusyDays(): Promise<Array<{ date: string; bookings: number }>> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const pipeline = [
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { bookings: -1 as -1 } }
    ];

    const result = await this.bookingModel.aggregate(pipeline);
    return result.map(r => ({ date: r._id, bookings: r.bookings }));
  }

  private calculateSpecialtyDemand(bookings: any[]): Array<{ specialty: string; bookings: number }> {
    const specialtyCount: Record<string, number> = {};
    
    bookings.forEach(booking => {
      const condition = booking.patientInfo?.condition || 'General';
      specialtyCount[condition] = (specialtyCount[condition] || 0) + 1;
    });

    return Object.entries(specialtyCount)
      .map(([specialty, count]) => ({ specialty, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings);
  }

  private calculateRevenueByHour(bookings: any[]): Array<{ hour: number; revenue: number }> {
    const hourlyRevenue: Record<number, number> = {};
    
    bookings.forEach(booking => {
      const hour = new Date(booking.createdAt).getHours();
      hourlyRevenue[hour] = (hourlyRevenue[hour] || 0) + booking.payment.amount;
    });

    return Object.entries(hourlyRevenue)
      .map(([hour, revenue]) => ({ hour: parseInt(hour), revenue }))
      .sort((a, b) => a.hour - b.hour);
  }

  private calculateRevenueByDay(bookings: any[]): Array<{ date: string; revenue: number }> {
    const dailyRevenue: Record<string, number> = {};
    
    bookings.forEach(booking => {
      const date = new Date(booking.createdAt).toISOString().split('T')[0];
      dailyRevenue[date] = (dailyRevenue[date] || 0) + booking.payment.amount;
    });

    return Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateRevenueByMonth(bookings: any[]): Array<{ month: string; revenue: number }> {
    const monthlyRevenue: Record<string, number> = {};
    
    bookings.forEach(booking => {
      const date = new Date(booking.createdAt);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + booking.payment.amount;
    });

    return Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
}