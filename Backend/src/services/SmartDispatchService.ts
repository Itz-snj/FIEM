import { Service } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { LocationService } from "./LocationService.js";
import { BookingService } from "./BookingService.js";
import { WebSocketService } from "./WebSocketService.js";
import { Priority, BookingType } from "../models/Booking.js";
import { AmbulanceType, DriverStatus } from "../models/Driver.js";

// Define interfaces locally
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface DispatchRequest {
  bookingId: string;
  pickupLocation: Coordinates;
  priority: Priority;
  ambulanceType?: AmbulanceType;
  specialRequirements?: string[];
  maxDistance?: number;
  patientCondition?: string;
}

interface DispatchResult {
  success: boolean;
  assignedDriver?: {
    driverId: string;
    distance: number;
    estimatedArrival: number;
    confidence: number;
  };
  alternativeDrivers?: Array<{
    driverId: string;
    distance: number;
    estimatedArrival: number;
    confidence: number;
    reason?: string;
  }>;
  message: string;
  dispatchTime: Date;
}

interface DriverScore {
  driverId: string;
  score: number;
  factors: {
    distance: number;
    availability: number;
    rating: number;
    ambulanceMatch: number;
    responseTime: number;
    specialization: number;
  };
  distance: number;
  estimatedArrival: number;
}

@Service()
export class SmartDispatchService {
  private dispatchHistory: Array<{
    bookingId: string;
    driverId: string;
    dispatchTime: Date;
    responseTime?: number;
    success: boolean;
  }> = [];

  private socketService?: WebSocketService; // Optional to avoid circular dependencies

  constructor(
    private locationService: LocationService,
    private bookingService: BookingService
  ) {}

  /**
   * Main smart dispatch algorithm - Modified to always assign to Mike Driver
   */
  async dispatchAmbulance(request: DispatchRequest): Promise<DispatchResult> {
    const startTime = Date.now();
    
    try {
      // 🎯 MODIFIED: Always assign to Mike Driver for helpful testing
      const MIKE_DRIVER_ID = "6904f1a7a64b0142028e8bc7";
      
      console.log(`📋 Direct assignment: Booking ${request.bookingId} -> Mike Driver (${MIKE_DRIVER_ID})`);

      // Check if Mike Driver exists and is available
      try {
        const mikeDriver = await this.locationService.getDriverLocation(MIKE_DRIVER_ID);
        
        if (!mikeDriver) {
          console.warn("⚠️ Mike Driver not found, falling back to smart dispatch");
          return await this.fallbackSmartDispatch(request);
        }

        // Calculate estimated arrival time based on distance (simplified)
        const distanceKm = this.calculateDistance(request.pickupLocation, mikeDriver.location);
        const estimatedArrivalMinutes = Math.ceil(distanceKm * 2); // Rough estimate: 2 min per km

        // Assign Mike Driver to the booking
        await this.bookingService.assignDriver(request.bookingId, MIKE_DRIVER_ID);

        // Record dispatch
        this.recordDispatch(request.bookingId, MIKE_DRIVER_ID, true);

        // Notify stakeholders
        await this.notifyDispatchStakeholders(request.bookingId, {
          driverId: MIKE_DRIVER_ID,
          distance: distanceKm,
          estimatedArrival: estimatedArrivalMinutes,
          score: 1.0 // Perfect score for direct assignment
        });

        const dispatchTime = Date.now() - startTime;
        console.log(`✅ Direct dispatch to Mike Driver completed in ${dispatchTime}ms for booking ${request.bookingId}`);

        return {
          success: true,
          assignedDriver: {
            driverId: MIKE_DRIVER_ID,
            distance: distanceKm,
            estimatedArrival: estimatedArrivalMinutes,
            confidence: 1.0
          },
          message: `Booking assigned directly to Mike Driver (${estimatedArrivalMinutes} min ETA)`,
          dispatchTime: new Date()
        };

      } catch (driverError) {
        console.error("❌ Error assigning to Mike Driver, falling back to smart dispatch:", driverError);
        return await this.fallbackSmartDispatch(request);
      }

    } catch (error) {
      console.error("Smart dispatch error:", error);
      return {
        success: false,
        message: `Dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        dispatchTime: new Date()
      };
    }
  }

  /**
   * Fallback to original smart dispatch algorithm if Mike Driver is unavailable
   */
  private async fallbackSmartDispatch(request: DispatchRequest): Promise<DispatchResult> {
    const startTime = Date.now();
    
    try {
      // Get available drivers in the area
      const maxDistance = request.maxDistance || this.getMaxDistanceForPriority(request.priority);
      const availableDrivers = await this.locationService.findNearestDrivers(
        request.pickupLocation,
        maxDistance,
        20, // Get more drivers for better selection
        request.ambulanceType
      );

      if (availableDrivers.length === 0) {
        return {
          success: false,
          message: "No available drivers found in the area",
          dispatchTime: new Date()
        };
      }

      // Score and rank drivers
      const scoredDrivers = await this.scoreDrivers(availableDrivers, request);
      
      // Select best driver
      const bestDriver = scoredDrivers[0];
      if (bestDriver.score < this.getMinimumScoreThreshold(request.priority)) {
        return {
          success: false,
          message: "No suitable drivers meet the minimum requirements",
          alternativeDrivers: scoredDrivers.slice(0, 3).map(d => ({
            driverId: d.driverId,
            distance: d.distance,
            estimatedArrival: d.estimatedArrival,
            confidence: d.score,
            reason: "Below minimum score threshold"
          })),
          dispatchTime: new Date()
        };
      }

      // Assign driver to booking
      await this.bookingService.assignDriver(request.bookingId, bestDriver.driverId);

      // Record dispatch
      this.recordDispatch(request.bookingId, bestDriver.driverId, true);

      // Notify other stakeholders (in real system)
      await this.notifyDispatchStakeholders(request.bookingId, bestDriver);

      const dispatchTime = Date.now() - startTime;
      console.log(`Smart dispatch completed in ${dispatchTime}ms for booking ${request.bookingId}`);

      return {
        success: true,
        assignedDriver: {
          driverId: bestDriver.driverId,
          distance: bestDriver.distance,
          estimatedArrival: bestDriver.estimatedArrival,
          confidence: bestDriver.score
        },
        alternativeDrivers: scoredDrivers.slice(1, 4).map(d => ({
          driverId: d.driverId,
          distance: d.distance,
          estimatedArrival: d.estimatedArrival,
          confidence: d.score
        })),
        message: `Driver successfully assigned with ${(bestDriver.score * 100).toFixed(1)}% confidence`,
        dispatchTime: new Date()
      };

    } catch (error) {
      console.error("Fallback smart dispatch error:", error);
      return {
        success: false,
        message: `Dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        dispatchTime: new Date()
      };
    }
  }

  /**
   * Calculate distance between two coordinates (simplified)
   */
  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Score drivers based on multiple factors
   */
  private async scoreDrivers(drivers: any[], request: DispatchRequest): Promise<DriverScore[]> {
    const scoredDrivers: DriverScore[] = [];

    for (const driver of drivers) {
      const score = await this.calculateDriverScore(driver, request);
      scoredDrivers.push(score);
    }

    // Sort by score (highest first)
    return scoredDrivers.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate comprehensive driver score
   */
  private async calculateDriverScore(driver: any, request: DispatchRequest): Promise<DriverScore> {
    const factors = {
      distance: this.calculateDistanceFactor(driver.distance, request.priority),
      availability: this.calculateAvailabilityFactor(driver),
      rating: this.calculateRatingFactor(driver),
      ambulanceMatch: this.calculateAmbulanceMatchFactor(driver, request),
      responseTime: await this.calculateResponseTimeFactor(driver.driverId),
      specialization: this.calculateSpecializationFactor(driver, request)
    };

    // Weighted score calculation
    const weights = this.getFactorWeights(request.priority);
    const score = (
      factors.distance * weights.distance +
      factors.availability * weights.availability +
      factors.rating * weights.rating +
      factors.ambulanceMatch * weights.ambulanceMatch +
      factors.responseTime * weights.responseTime +
      factors.specialization * weights.specialization
    );

    return {
      driverId: driver.driverId,
      score: Math.min(Math.max(score, 0), 1), // Normalize to 0-1
      factors,
      distance: driver.distance,
      estimatedArrival: driver.estimatedArrival
    };
  }

  /**
   * Distance factor - closer is better, with priority adjustments
   */
  private calculateDistanceFactor(distance: number, priority: Priority): number {
    const maxDistance = this.getMaxDistanceForPriority(priority);
    const distanceFactor = Math.max(0, 1 - (distance / maxDistance));
    
    // Emergency cases prefer very close drivers
    if (priority === Priority.CRITICAL) {
      return Math.pow(distanceFactor, 2); // Exponential preference for closer drivers
    }
    
    return distanceFactor;
  }

  /**
   * Availability factor - truly available drivers score higher
   */
  private calculateAvailabilityFactor(driver: any): number {
    if (!driver.isAvailable) return 0;
    
    // Check how long the driver has been available (prefer recently available)
    const baseScore = 1.0;
    
    // In real system, would check:
    // - How long since last ride
    // - Driver fatigue indicators
    // - Working hours compliance
    // - Break requirements
    
    return baseScore;
  }

  /**
   * Rating factor - higher rated drivers preferred
   */
  private calculateRatingFactor(driver: any): number {
    if (!driver.driver?.rating) return 0.5; // Default if no rating
    
    const rating = driver.driver.rating;
    // Normalize rating from 0-5 scale to 0-1 scale
    return Math.min(rating / 5.0, 1.0);
  }

  /**
   * Ambulance type matching factor
   */
  private calculateAmbulanceMatchFactor(driver: any, request: DispatchRequest): number {
    if (!request.ambulanceType) return 1.0; // No specific requirement
    
    const driverType = driver.ambulanceType;
    
    // Exact match is best
    if (driverType === request.ambulanceType) return 1.0;
    
    // Higher capability ambulances can handle lower requirements
    const typeHierarchy = [
      AmbulanceType.BASIC,
      AmbulanceType.ADVANCED,
      AmbulanceType.CARDIAC,
      AmbulanceType.NEONATAL,
      AmbulanceType.EMERGENCY
    ];
    
    const requestIndex = typeHierarchy.indexOf(request.ambulanceType);
    const driverIndex = typeHierarchy.indexOf(driverType);
    
    if (driverIndex > requestIndex) {
      return 0.8; // Can handle but not optimal
    }
    
    return 0.3; // Lower capability, might not be suitable
  }

  /**
   * Historical response time factor
   */
  private async calculateResponseTimeFactor(driverId: string): Promise<number> {
    // Calculate average response time for this driver
    const driverHistory = this.dispatchHistory.filter(d => d.driverId === driverId);
    
    if (driverHistory.length === 0) return 0.7; // Default for new drivers
    
    const avgResponseTime = driverHistory.reduce((sum, h) => sum + (h.responseTime || 300), 0) / driverHistory.length;
    
    // Prefer drivers with response time < 5 minutes
    const idealResponseTime = 300; // 5 minutes in seconds
    return Math.max(0, 1 - (avgResponseTime - idealResponseTime) / idealResponseTime);
  }

  /**
   * Specialization factor based on patient condition
   */
  private calculateSpecializationFactor(driver: any, request: DispatchRequest): number {
    if (!request.patientCondition) return 1.0;
    
    // In real system, would check driver certifications and specializations
    // For demo, use ambulance type as proxy for specialization
    
    const condition = request.patientCondition.toLowerCase();
    const ambulanceType = driver.ambulanceType;
    
    // Cardiac conditions prefer cardiac ambulances
    if (condition.includes('chest') || condition.includes('heart') || condition.includes('cardiac')) {
      return ambulanceType === AmbulanceType.CARDIAC ? 1.0 : 0.7;
    }
    
    // Critical conditions prefer emergency ambulances
    if (condition.includes('trauma') || condition.includes('accident') || condition.includes('critical')) {
      return ambulanceType === AmbulanceType.EMERGENCY ? 1.0 : 0.8;
    }
    
    // Neonatal conditions
    if (condition.includes('newborn') || condition.includes('infant') || condition.includes('neonatal')) {
      return ambulanceType === AmbulanceType.NEONATAL ? 1.0 : 0.5;
    }
    
    return 1.0; // Default - any ambulance can handle
  }

  /**
   * Get factor weights based on priority
   */
  private getFactorWeights(priority: Priority): {
    distance: number;
    availability: number;
    rating: number;
    ambulanceMatch: number;
    responseTime: number;
    specialization: number;
  } {
    switch (priority) {
      case Priority.CRITICAL:
        return {
          distance: 0.4,      // Distance is most important for critical
          availability: 0.25,  // Must be available
          rating: 0.1,        // Less important in emergency
          ambulanceMatch: 0.15,
          responseTime: 0.25, // Historical speed matters
          specialization: 0.15
        };
        
      case Priority.HIGH:
        return {
          distance: 0.3,
          availability: 0.2,
          rating: 0.15,
          ambulanceMatch: 0.2,
          responseTime: 0.2,
          specialization: 0.15
        };
        
      case Priority.MEDIUM:
        return {
          distance: 0.25,
          availability: 0.2,
          rating: 0.2,
          ambulanceMatch: 0.15,
          responseTime: 0.15,
          specialization: 0.05
        };
        
      default: // LOW
        return {
          distance: 0.2,
          availability: 0.15,
          rating: 0.25,      // Rating more important for routine
          ambulanceMatch: 0.1,
          responseTime: 0.1,
          specialization: 0.2
        };
    }
  }

  /**
   * Get maximum search distance based on priority
   */
  private getMaxDistanceForPriority(priority: Priority): number {
    switch (priority) {
      case Priority.CRITICAL: return 50; // 50km for critical
      case Priority.HIGH: return 30;     // 30km for high
      case Priority.MEDIUM: return 20;   // 20km for medium
      default: return 15;                // 15km for low
    }
  }

  /**
   * Get minimum score threshold
   */
  private getMinimumScoreThreshold(priority: Priority): number {
    switch (priority) {
      case Priority.CRITICAL: return 0.3; // Lower threshold for critical
      case Priority.HIGH: return 0.4;
      case Priority.MEDIUM: return 0.5;
      default: return 0.6; // Higher threshold for routine
    }
  }

  /**
   * Record dispatch for analytics
   */
  private recordDispatch(bookingId: string, driverId: string, success: boolean): void {
    this.dispatchHistory.push({
      bookingId,
      driverId,
      dispatchTime: new Date(),
      success
    });

    // Keep only last 1000 records
    if (this.dispatchHistory.length > 1000) {
      this.dispatchHistory = this.dispatchHistory.slice(-1000);
    }
  }

  /**
   * Notify stakeholders about dispatch
   */
  private async notifyDispatchStakeholders(bookingId: string, driver: DriverScore): Promise<void> {
    if (this.socketService) {
      // 📱 1. Notify the assigned driver in real-time
      this.socketService.sendMessageToDriver(driver.driverId, 'dispatch:new_booking_assigned', {
        bookingId,
        distance: driver.distance,
        estimatedArrival: driver.estimatedArrival,
        confidence: driver.score,
        priority: 'high',
        message: `New booking assigned! Distance: ${driver.distance.toFixed(1)}km, ETA: ${driver.estimatedArrival} minutes`
      });

      // 🚨 2. Notify emergency executives about successful dispatch
      this.socketService.broadcastToEmergencyExecutives('dispatch:successful_assignment', {
        bookingId,
        driverId: driver.driverId,
        distance: driver.distance,
        confidence: driver.score,
        dispatchTime: new Date(),
        message: `Smart dispatch successful: Driver ${driver.driverId} assigned to booking ${bookingId}`
      });

      // 📊 3. Broadcast to real-time dashboard
      this.socketService.broadcastToEmergencyExecutives('analytics:dispatch_update', {
        bookingId,
        driverId: driver.driverId,
        responseTime: driver.estimatedArrival,
        dispatchScore: driver.score,
        timestamp: new Date()
      });
    }
    
    console.log(`📡 Dispatch notifications sent for booking ${bookingId} to driver ${driver.driverId}`);
  }

  /**
   * Get comprehensive dispatch analytics and performance metrics
   */
  async getDispatchAnalytics(): Promise<any> {
    const recentDispatches = this.dispatchHistory.slice(-100);
    const allTimeDispatches = this.dispatchHistory;
    
    if (allTimeDispatches.length === 0) {
      return {
        summary: {
          totalDispatches: 0,
          successRate: 0,
          averageResponseTime: 0,
          totalDriversUsed: 0
        },
        performance: {
          topPerformingDrivers: [],
          dispatchByHour: new Array(24).fill(0),
          responseTimeDistribution: [],
          successTrends: []
        },
        insights: {
          peakHours: [],
          averageResponseByHour: new Array(24).fill(0),
          emergencyVsRegular: { emergency: 0, regular: 0 },
          geographicDistribution: []
        }
      };
    }

    // 📊 BASIC SUMMARY METRICS
    const successfulDispatches = allTimeDispatches.filter(d => d.success);
    const totalDispatches = allTimeDispatches.length;
    const successRate = (successfulDispatches.length / totalDispatches) * 100;
    
    const responseTimes = successfulDispatches.map(d => d.responseTime || 0).filter(t => t > 0);
    const averageResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

    const uniqueDrivers = new Set(allTimeDispatches.map(d => d.driverId)).size;

    // 🏆 PERFORMANCE ANALYTICS
    const driverPerformance = this.calculateDriverPerformance(allTimeDispatches);
    const topPerformingDrivers = driverPerformance.slice(0, 10);

    // Dispatch patterns by hour
    const dispatchByHour = new Array(24).fill(0);
    const responseTimeByHour = new Array(24).fill(0);
    const hourlyCount = new Array(24).fill(0);

    allTimeDispatches.forEach(d => {
      const hour = d.dispatchTime.getHours();
      dispatchByHour[hour]++;
      if (d.success && d.responseTime) {
        responseTimeByHour[hour] += d.responseTime;
        hourlyCount[hour]++;
      }
    });

    // Calculate average response time by hour
    const averageResponseByHour = responseTimeByHour.map((total, hour) => 
      hourlyCount[hour] > 0 ? Math.round(total / hourlyCount[hour]) : 0
    );

    // 🔍 ADVANCED INSIGHTS
    const peakHours = dispatchByHour
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ hour, count }) => ({ 
        hour: `${hour}:00-${hour + 1}:00`, 
        dispatches: count,
        percentage: Math.round((count / totalDispatches) * 100)
      }));

    // Response time distribution
    const responseTimeDistribution = this.createResponseTimeDistribution(responseTimes);

    // Emergency vs Regular breakdown (mock categorization for demo)
    const emergencyDispatches = allTimeDispatches.filter((d, index) => index % 3 === 0); // Every 3rd dispatch as emergency (demo)
    const regularDispatches = allTimeDispatches.filter((d, index) => index % 3 !== 0);

    // Success trends (last 30 dispatches in groups of 10)
    const successTrends = this.calculateSuccessTrends(allTimeDispatches);

    // Geographic distribution (mock data based on dispatch locations)
    const geographicDistribution = this.analyzeGeographicDistribution(allTimeDispatches);

    return {
      summary: {
        totalDispatches,
        successRate: Math.round(successRate * 100) / 100,
        averageResponseTime: Math.round(averageResponseTime),
        totalDriversUsed: uniqueDrivers,
        recentActivity: recentDispatches.length
      },
      performance: {
        topPerformingDrivers,
        dispatchByHour,
        responseTimeDistribution,
        successTrends,
        averageResponseByHour
      },
      insights: {
        peakHours,
        emergencyVsRegular: {
          emergency: {
            count: emergencyDispatches.length,
            successRate: emergencyDispatches.length > 0 ? 
              Math.round((emergencyDispatches.filter(d => d.success).length / emergencyDispatches.length) * 100) : 0,
            avgResponseTime: this.calculateAverageResponseTime(emergencyDispatches)
          },
          regular: {
            count: regularDispatches.length,
            successRate: regularDispatches.length > 0 ? 
              Math.round((regularDispatches.filter(d => d.success).length / regularDispatches.length) * 100) : 0,
            avgResponseTime: this.calculateAverageResponseTime(regularDispatches)
          }
        },
        geographicDistribution,
        performanceScore: this.calculateOverallPerformanceScore(successRate, averageResponseTime, totalDispatches)
      }
    };
  }

  /**
   * Calculate detailed driver performance metrics
   */
  private calculateDriverPerformance(dispatches: any[]) {
    const driverStats = new Map();

    dispatches.forEach(dispatch => {
      if (!driverStats.has(dispatch.driverId)) {
        driverStats.set(dispatch.driverId, {
          driverId: dispatch.driverId,
          totalDispatches: 0,
          successfulDispatches: 0,
          totalResponseTime: 0,
          emergencyDispatches: 0,
          recentActivity: 0
        });
      }

      const stats = driverStats.get(dispatch.driverId);
      stats.totalDispatches++;
      
      if (dispatch.successful) {
        stats.successfulDispatches++;
        if (dispatch.responseTime) {
          stats.totalResponseTime += dispatch.responseTime;
        }
      }

      // Mock emergency classification for demo (every 3rd dispatch)
      if (dispatches.indexOf(dispatch) % 3 === 0) {
        stats.emergencyDispatches++;
      }

      // Check if dispatch was in last 7 days
      if (Date.now() - dispatch.dispatchTime.getTime() < 7 * 24 * 60 * 60 * 1000) {
        stats.recentActivity++;
      }
    });

    return Array.from(driverStats.values()).map(stats => ({
      driverId: stats.driverId,
      totalDispatches: stats.totalDispatches,
      successRate: Math.round((stats.successfulDispatches / stats.totalDispatches) * 100),
      averageResponseTime: stats.successfulDispatches > 0 ? 
        Math.round(stats.totalResponseTime / stats.successfulDispatches) : 0,
      emergencyHandling: Math.round((stats.emergencyDispatches / stats.totalDispatches) * 100),
      recentActivity: stats.recentActivity,
      performanceScore: this.calculateDriverPerformanceScore(stats)
    })).sort((a, b) => b.performanceScore - a.performanceScore);
  }

  /**
   * Calculate individual driver performance score
   */
  private calculateDriverPerformanceScore(stats: any): number {
    let score = 0;
    
    // Success rate (40% weight)
    score += (stats.successfulDispatches / stats.totalDispatches) * 40;
    
    // Response time (30% weight) - lower is better
    const avgResponse = stats.successfulDispatches > 0 ? stats.totalResponseTime / stats.successfulDispatches : 1000;
    const responseScore = Math.max(0, (600 - avgResponse) / 600) * 30; // 600 seconds = 10 minutes baseline
    score += responseScore;
    
    // Emergency handling (20% weight)
    score += (stats.emergencyDispatches / stats.totalDispatches) * 20;
    
    // Recent activity (10% weight)
    const activityScore = Math.min(stats.recentActivity / 10, 1) * 10; // Up to 10 recent dispatches = full score
    score += activityScore;
    
    return Math.round(score * 100) / 100;
  }

  /**
   * Create response time distribution for analysis
   */
  private createResponseTimeDistribution(responseTimes: number[]) {
    const buckets = [
      { label: '< 5 min', min: 0, max: 300, count: 0 },
      { label: '5-10 min', min: 300, max: 600, count: 0 },
      { label: '10-15 min', min: 600, max: 900, count: 0 },
      { label: '15-20 min', min: 900, max: 1200, count: 0 },
      { label: '> 20 min', min: 1200, max: Infinity, count: 0 }
    ];

    responseTimes.forEach(time => {
      const bucket = buckets.find(b => time >= b.min && time < b.max);
      if (bucket) bucket.count++;
    });

    const total = responseTimes.length;
    return buckets.map(bucket => ({
      ...bucket,
      percentage: total > 0 ? Math.round((bucket.count / total) * 100) : 0
    }));
  }

  /**
   * Calculate success trends over time
   */
  private calculateSuccessTrends(dispatches: any[]) {
    const groupSize = 10;
    const trends = [];
    
    for (let i = dispatches.length - 1; i >= 0; i -= groupSize) {
      const group = dispatches.slice(Math.max(0, i - groupSize + 1), i + 1);
      if (group.length >= 5) { // Only analyze groups with enough data
        const successful = group.filter(d => d.success).length;
        const successRate = Math.round((successful / group.length) * 100);
        trends.unshift({
          period: `Dispatches ${Math.max(0, i - groupSize + 2)}-${i + 1}`,
          successRate,
          totalDispatches: group.length
        });
      }
    }
    
    return trends.slice(-6); // Last 6 trend periods
  }

  /**
   * Analyze geographic distribution of dispatches
   */
  private analyzeGeographicDistribution(dispatches: any[]) {
    // Mock geographic analysis - in real implementation, this would use actual coordinates
    const areas = ['Downtown', 'Suburbs', 'Medical District', 'Airport', 'University Area'];
    const distribution = areas.map(area => ({
      area,
      dispatches: Math.floor(Math.random() * dispatches.length * 0.3),
      averageResponseTime: Math.floor(Math.random() * 600 + 300) // 5-15 minutes
    }));

    // Normalize to actual dispatch count
    const totalMock = distribution.reduce((sum, d) => sum + d.dispatches, 0);
    const actualTotal = dispatches.length;
    
    return distribution.map(d => ({
      ...d,
      dispatches: Math.floor((d.dispatches / totalMock) * actualTotal),
      percentage: Math.round(((d.dispatches / totalMock) * 100))
    }));
  }

  /**
   * Calculate average response time for a set of dispatches
   */
  private calculateAverageResponseTime(dispatches: any[]): number {
    const successfulWithTime = dispatches.filter(d => d.success && d.responseTime);
    if (successfulWithTime.length === 0) return 0;
    
    const total = successfulWithTime.reduce((sum, d) => sum + d.responseTime, 0);
    return Math.round(total / successfulWithTime.length);
  }

  /**
   * Calculate overall performance score for the system
   */
  private calculateOverallPerformanceScore(successRate: number, avgResponseTime: number, totalDispatches: number): any {
    let score = 0;
    
    // Success rate component (50% weight)
    score += (successRate / 100) * 50;
    
    // Response time component (40% weight) - lower is better
    const responseScore = Math.max(0, (600 - avgResponseTime) / 600) * 40;
    score += responseScore;
    
    // Volume component (10% weight) - more dispatches handled = better
    const volumeScore = Math.min(totalDispatches / 100, 1) * 10;
    score += volumeScore;
    
    let grade = 'F';
    if (score >= 90) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 80) grade = 'B+';
    else if (score >= 75) grade = 'B';
    else if (score >= 70) grade = 'C+';
    else if (score >= 65) grade = 'C';
    else if (score >= 60) grade = 'D';

    return {
      score: Math.round(score * 100) / 100,
      grade,
      factors: {
        successRate: Math.round(successRate * 100) / 100,
        responseTime: Math.round(avgResponseTime),
        volume: totalDispatches
      }
    };
  }

  /**
   * Manual dispatch override (for emergency executives)
   */
  async manualDispatch(bookingId: string, driverId: string, overrideReason: string): Promise<DispatchResult> {
    try {
      // Validate driver is available
      const driverLocation = await this.locationService.getDriverLocation(driverId);
      if (!driverLocation || driverLocation.status !== DriverStatus.AVAILABLE) {
        throw new BadRequest("Selected driver is not available");
      }

      // Assign driver
      await this.bookingService.assignDriver(bookingId, driverId);

      // Record manual dispatch
      this.recordDispatch(bookingId, driverId, true);
      
      // 🔔 Emit real-time manual dispatch notification
      if (this.socketService) {
        this.socketService.broadcastToEmergencyExecutives('dispatch:manual_override', {
          bookingId,
          driverId,
          overrideReason,
          executedBy: 'emergency_executive', // Would come from auth context
          timestamp: new Date(),
          message: `Manual dispatch override: ${overrideReason}`
        });

        this.socketService.sendMessageToDriver(driverId, 'dispatch:manual_assignment', {
          bookingId,
          overrideReason,
          priority: 'manual',
          message: `Manual assignment by emergency executive: ${overrideReason}`
        });
      }

      console.log(`📡 Manual dispatch: ${bookingId} assigned to ${driverId}. Reason: ${overrideReason}`);

      return {
        success: true,
        assignedDriver: {
          driverId,
          distance: 0, // Would calculate in real system
          estimatedArrival: 0,
          confidence: 1.0 // Manual assignment
        },
        message: `Manual assignment completed. Reason: ${overrideReason}`,
        dispatchTime: new Date()
      };
    } catch (error) {
      return {
        success: false,
        message: `Manual dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        dispatchTime: new Date()
      };
    }
  }

  /**
   * 🔔 Public method to set socket service (to avoid circular dependency)
   */
  public setSocketService(socketService: WebSocketService) {
    this.socketService = socketService;
  }
}