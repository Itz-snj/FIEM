import { Service } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { LocationService } from "./LocationService.js";
import { BookingService } from "./BookingService.js";
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

  constructor(
    private locationService: LocationService,
    private bookingService: BookingService
  ) {}

  /**
   * Main smart dispatch algorithm
   */
  async dispatchAmbulance(request: DispatchRequest): Promise<DispatchResult> {
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
      console.error("Smart dispatch error:", error);
      return {
        success: false,
        message: `Dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        dispatchTime: new Date()
      };
    }
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
    // In real system, would:
    // 1. Send push notification to driver
    // 2. Send SMS to patient
    // 3. Notify emergency executives
    // 4. Update real-time dashboard
    // 5. Log to analytics system
    
    console.log(`Dispatch notifications sent for booking ${bookingId} to driver ${driver.driverId}`);
  }

  /**
   * Get dispatch analytics
   */
  async getDispatchAnalytics(timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    totalDispatches: number;
    successRate: number;
    averageResponseTime: number;
    topPerformingDrivers: string[];
    dispatchByHour: number[];
  }> {
    const now = new Date();
    let startTime: Date;
    
    switch (timeframe) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const recentDispatches = this.dispatchHistory.filter(d => d.dispatchTime >= startTime);
    
    const totalDispatches = recentDispatches.length;
    const successfulDispatches = recentDispatches.filter(d => d.success).length;
    const successRate = totalDispatches > 0 ? successfulDispatches / totalDispatches : 0;
    
    // Calculate average response time
    const responseTimes = recentDispatches
      .filter(d => d.responseTime)
      .map(d => d.responseTime!);
    const averageResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

    // Top performing drivers
    const driverCounts = recentDispatches.reduce((acc, d) => {
      acc[d.driverId] = (acc[d.driverId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topPerformingDrivers = Object.entries(driverCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([driverId]) => driverId);

    // Dispatch by hour (for daily patterns)
    const dispatchByHour = new Array(24).fill(0);
    recentDispatches.forEach(d => {
      const hour = d.dispatchTime.getHours();
      dispatchByHour[hour]++;
    });

    return {
      totalDispatches,
      successRate,
      averageResponseTime,
      topPerformingDrivers,
      dispatchByHour
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
      
      console.log(`Manual dispatch: ${bookingId} assigned to ${driverId}. Reason: ${overrideReason}`);

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
}