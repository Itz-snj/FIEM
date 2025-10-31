import { Controller } from "@tsed/di";
import { Get, Post, Put } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Description, Returns, Summary } from "@tsed/schema";
import { BadRequest, NotFound, Unauthorized } from "@tsed/exceptions";
import { LocationService } from "../../services/LocationService.js";
import { UserService } from "../../services/UserService.js";
import { DriverStatus, AmbulanceType } from "../../models/Driver.js";
import { UserRole } from "../../models/User.js";

// Define interfaces locally to avoid import issues
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationPoint extends Coordinates {
  timestamp?: Date;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

interface DriverStatusUpdateRequest {
  status: DriverStatus;
  location?: LocationPoint;
}

interface DriverWorkingHoursRequest {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  daysOfWeek: string[]; // ['monday', 'tuesday', etc.]
  isActive: boolean;
}

interface DriverStatsResponse {
  totalRides: number;
  totalDistance: number;
  averageRating: number;
  totalEarnings: number;
  responseTime: number;
  todayRides: number;
  weeklyRides: number;
  monthlyRides: number;
}

@Controller("/drivers")
export class DriverController {
  constructor(
    private locationService: LocationService,
    private userService: UserService
  ) {}

  @Get("/:driverId/profile")
  @Summary("Get driver profile")
  @Description("Get comprehensive driver profile including vehicle and statistics")
  @Returns(200, Object)
  @Returns(404, NotFound)
  async getDriverProfile(
    @PathParams("driverId") driverId: string
  ): Promise<any> {
    // Get basic user info
    const user = await this.userService.getUserById(driverId);
    
    if (user.role !== UserRole.DRIVER) {
      throw new BadRequest("User is not a driver");
    }

    // Get current location
    const location = await this.locationService.getDriverLocation(driverId);
    
    // Mock driver-specific data (would come from Driver model in real implementation)
    const driverData = {
      ...user,
      vehicle: {
        registrationNumber: `DL-${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 10000)}`,
        type: AmbulanceType.BASIC,
        capacity: 2,
        facilities: ['Oxygen', 'Stretcher', 'First Aid'],
        insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        lastServiceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      },
      currentLocation: location,
      rating: {
        average: 4.2 + Math.random() * 0.8,
        totalRatings: Math.floor(Math.random() * 500) + 100
      },
      statistics: this.generateMockStats(),
      certifications: ['Basic Life Support', 'Emergency Medical Technician'],
      isOnline: location?.status === DriverStatus.AVAILABLE || location?.status === DriverStatus.ON_DUTY,
      availability: {
        workingHours: { start: '06:00', end: '18:00' },
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      }
    };

    return driverData;
  }

  @Put("/:driverId/status")
  @Summary("Update driver status")
  @Description("Update driver availability status and optionally location")
  @Returns(200, Object)
  @Returns(400, BadRequest)
  async updateDriverStatus(
    @PathParams("driverId") driverId: string,
    @BodyParams() statusUpdate: DriverStatusUpdateRequest
  ): Promise<{ success: boolean; message: string; currentStatus: DriverStatus }> {
    // Validate driver exists and is actually a driver
    const user = await this.userService.getUserById(driverId);
    if (user.role !== UserRole.DRIVER) {
      throw new BadRequest("User is not a driver");
    }

    // Update location if provided
    if (statusUpdate.location) {
      await this.locationService.updateDriverLocation(
        driverId, 
        statusUpdate.location, 
        statusUpdate.status
      );
    } else {
      // Update only availability status
      await this.locationService.setDriverAvailability(
        driverId, 
        statusUpdate.status === DriverStatus.AVAILABLE
      );
    }

    return {
      success: true,
      message: `Driver status updated to ${statusUpdate.status}`,
      currentStatus: statusUpdate.status
    };
  }

  @Post("/:driverId/go-online")
  @Summary("Go online")
  @Description("Set driver status to available/online with location")
  @Returns(200, Object)
  @Returns(400, BadRequest)
  async goOnline(
    @PathParams("driverId") driverId: string,
    @BodyParams() locationData: LocationPoint
  ): Promise<{ success: boolean; message: string }> {
    await this.locationService.updateDriverLocation(driverId, locationData, DriverStatus.AVAILABLE);
    
    return {
      success: true,
      message: "Driver is now online and available for bookings"
    };
  }

  @Post("/:driverId/go-offline")
  @Summary("Go offline")
  @Description("Set driver status to offline")
  @Returns(200, Object)
  async goOffline(
    @PathParams("driverId") driverId: string
  ): Promise<{ success: boolean; message: string }> {
    await this.locationService.setDriverAvailability(driverId, false);
    
    return {
      success: true,
      message: "Driver is now offline"
    };
  }

  @Get("/:driverId/statistics")
  @Summary("Get driver statistics")
  @Description("Get detailed statistics for driver performance and earnings")
  @Returns(200, Object)
  async getDriverStatistics(
    @PathParams("driverId") driverId: string,
    @QueryParams("period") period: 'today' | 'week' | 'month' | 'year' = 'month'
  ): Promise<DriverStatsResponse> {
    // Validate driver exists
    const user = await this.userService.getUserById(driverId);
    if (user.role !== UserRole.DRIVER) {
      throw new BadRequest("User is not a driver");
    }

    // Return mock statistics (would be calculated from actual data in production)
    return this.generateMockStats(period);
  }

  @Put("/:driverId/working-hours")
  @Summary("Update working hours")
  @Description("Set driver's preferred working hours and days")
  @Returns(200, Object)
  async updateWorkingHours(
    @PathParams("driverId") driverId: string,
    @BodyParams() workingHours: DriverWorkingHoursRequest
  ): Promise<{ success: boolean; message: string }> {
    // Validate driver exists
    const user = await this.userService.getUserById(driverId);
    if (user.role !== UserRole.DRIVER) {
      throw new BadRequest("User is not a driver");
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(workingHours.startTime) || !timeRegex.test(workingHours.endTime)) {
      throw new BadRequest("Invalid time format. Use HH:MM format");
    }

    // In real implementation, this would update the Driver model
    console.log(`Updated working hours for driver ${driverId}:`, workingHours);

    return {
      success: true,
      message: "Working hours updated successfully"
    };
  }

  @Get("/nearby")
  @Summary("Get nearby drivers")
  @Description("Get all drivers near a specific location (for admin/emergency use)")
  @Returns(200, Array)
  async getNearbyDrivers(
    @QueryParams("lat") latitude: number,
    @QueryParams("lng") longitude: number,
    @QueryParams("radius") radiusKm: number = 10,
    @QueryParams("status") status?: DriverStatus
  ): Promise<any[]> {
    if (!latitude || !longitude) {
      throw new BadRequest("Latitude and longitude are required");
    }

    const location: Coordinates = { latitude, longitude };
    const allDrivers = await this.locationService.findNearestDrivers(location, radiusKm, 50);
    
    // Filter by status if provided
    if (status) {
      const filteredDrivers = allDrivers.filter(driver => {
        const driverLocation = this.locationService.getDriverLocation(driver.driverId);
        return driverLocation && (driverLocation as any).status === status;
      });
      return filteredDrivers;
    }

    return allDrivers;
  }

  @Post("/:driverId/emergency-mode")
  @Summary("Activate emergency mode")
  @Description("Activate emergency response mode for driver")
  @Returns(200, Object)
  async activateEmergencyMode(
    @PathParams("driverId") driverId: string,
    @BodyParams("emergencyType") emergencyType: string,
    @BodyParams("location") location: LocationPoint
  ): Promise<{ success: boolean; message: string }> {
    // Update driver status to emergency mode
    await this.locationService.updateDriverLocation(driverId, location, DriverStatus.ON_DUTY);
    
    // In real implementation, this would:
    // 1. Notify nearby emergency services
    // 2. Update dispatch system
    // 3. Send alerts to relevant stakeholders
    
    console.log(`Emergency mode activated for driver ${driverId}: ${emergencyType}`);

    return {
      success: true,
      message: "Emergency mode activated successfully"
    };
  }

  @Get("/:driverId/earnings")
  @Summary("Get driver earnings")
  @Description("Get detailed earnings information for the driver")
  @Returns(200, Object)
  async getDriverEarnings(
    @PathParams("driverId") driverId: string,
    @QueryParams("period") period: 'today' | 'week' | 'month' | 'year' = 'month'
  ): Promise<{
    totalEarnings: number;
    tripEarnings: number;
    bonuses: number;
    deductions: number;
    netEarnings: number;
    tripsCompleted: number;
    averageEarningPerTrip: number;
  }> {
    // Validate driver exists
    const user = await this.userService.getUserById(driverId);
    if (user.role !== UserRole.DRIVER) {
      throw new BadRequest("User is not a driver");
    }

    // Mock earnings data (would be calculated from actual bookings in production)
    const baseEarnings = Math.floor(Math.random() * 50000) + 10000;
    const bonuses = Math.floor(baseEarnings * 0.1);
    const deductions = Math.floor(baseEarnings * 0.05);
    const tripsCompleted = Math.floor(Math.random() * 100) + 20;

    return {
      totalEarnings: baseEarnings,
      tripEarnings: baseEarnings - bonuses,
      bonuses,
      deductions,
      netEarnings: baseEarnings + bonuses - deductions,
      tripsCompleted,
      averageEarningPerTrip: Math.floor(baseEarnings / tripsCompleted)
    };
  }

  // Helper method to generate mock statistics
  private generateMockStats(period: string = 'month'): DriverStatsResponse {
    const multiplier = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365;
    
    return {
      totalRides: Math.floor(Math.random() * 10 * multiplier) + multiplier,
      totalDistance: Math.floor(Math.random() * 500 * multiplier) + (100 * multiplier),
      averageRating: 4.0 + Math.random() * 1.0,
      totalEarnings: Math.floor(Math.random() * 25000 * multiplier) + (5000 * multiplier),
      responseTime: Math.floor(Math.random() * 10) + 3, // 3-13 minutes
      todayRides: Math.floor(Math.random() * 10) + 1,
      weeklyRides: Math.floor(Math.random() * 50) + 10,
      monthlyRides: Math.floor(Math.random() * 200) + 50
    };
  }
}