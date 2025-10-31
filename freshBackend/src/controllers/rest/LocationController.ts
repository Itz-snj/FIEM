import { Controller } from "@tsed/di";
import { Get, Post, Put } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Description, Returns, Summary } from "@tsed/schema";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { LocationService, NearestDriverResult, NearestHospitalResult } from "../../services/LocationService.js";
import { DriverStatus, AmbulanceType } from "../../models/Driver.js";

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

const LOCATION_CONSTANTS = {
  DEFAULT_SEARCH_RADIUS_KM: 10,
  EMERGENCY_RESPONSE_RADIUS_KM: 25
};

interface LocationUpdateRequest {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  status: DriverStatus;
}

interface NearestSearchRequest {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  maxResults?: number;
  ambulanceType?: AmbulanceType;
}

interface HospitalSearchRequest extends NearestSearchRequest {
  requireEmergencyServices?: boolean;
  requiredSpecializations?: string[];
}

@Controller("/location")
export class LocationController {
  constructor(private locationService: LocationService) {}

  @Post("/drivers/:driverId/update")
  @Summary("Update driver location")
  @Description("Update real-time location and status for a driver")
  @Returns(200, Object)
  @Returns(400, BadRequest)
  async updateDriverLocation(
    @PathParams("driverId") driverId: string,
    @BodyParams() locationData: LocationUpdateRequest
  ): Promise<{ success: boolean; message: string }> {
    const location: LocationPoint = {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      accuracy: locationData.accuracy,
      heading: locationData.heading,
      speed: locationData.speed,
      timestamp: new Date()
    };

    await this.locationService.updateDriverLocation(driverId, location, locationData.status);
    
    return {
      success: true,
      message: "Driver location updated successfully"
    };
  }

  @Get("/drivers/active")
  @Summary("Get all active driver locations")
  @Description("Get real-time locations of all active drivers for monitoring")
  @Returns(200, Array)
  async getAllActiveDrivers(): Promise<any[]> {
    try {
      const activeDrivers = await this.locationService.getAllActiveDriverLocations();
      return activeDrivers;
    } catch (error) {
      // Return empty array instead of error if no active drivers
      console.log('No active drivers found:', error.message);
      return [];
    }
  }

  @Get("/drivers/:driverId")
  @Summary("Get driver location")
  @Description("Get current location and status of a specific driver")
  @Returns(200, Object)
  @Returns(404, NotFound)
  async getDriverLocation(
    @PathParams("driverId") driverId: string
  ): Promise<any> {
    const location = await this.locationService.getDriverLocation(driverId);
    
    if (!location) {
      throw new NotFound("Driver location not found or outdated");
    }

    return location;
  }

  @Post("/drivers/nearest")
  @Summary("Find nearest available drivers")
  @Description("Search for nearest available ambulance drivers within specified radius")
  @Returns(200, Array)
  @Returns(400, BadRequest)
  async findNearestDrivers(
    @BodyParams() searchRequest: NearestSearchRequest & { radius?: number }
  ): Promise<NearestDriverResult[]> {
    const location: Coordinates = {
      latitude: searchRequest.latitude,
      longitude: searchRequest.longitude
    };

    // Handle both radiusKm and radius (convert meters to km if needed)
    let radiusKm = searchRequest.radiusKm || LOCATION_CONSTANTS.DEFAULT_SEARCH_RADIUS_KM;
    if (searchRequest.radius && !searchRequest.radiusKm) {
      // If radius is provided and it's a large number, assume it's in meters
      radiusKm = searchRequest.radius > 1000 ? searchRequest.radius / 1000 : searchRequest.radius;
    }
    
    const maxResults = Math.min(searchRequest.maxResults || 10, 50); // Limit to 50 results

    return await this.locationService.findNearestDrivers(
      location,
      radiusKm,
      maxResults,
      searchRequest.ambulanceType
    );
  }

  @Post("/hospitals/nearest")
  @Summary("Find nearest hospitals")
  @Description("Search for nearest hospitals within specified radius with optional filters")
  @Returns(200, Array)
  @Returns(400, BadRequest)
  async findNearestHospitals(
    @BodyParams() searchRequest: HospitalSearchRequest & { radius?: number }
  ): Promise<NearestHospitalResult[]> {
    const location: Coordinates = {
      latitude: searchRequest.latitude,
      longitude: searchRequest.longitude
    };

    // Handle both radiusKm and radius (convert meters to km if needed)
    let radiusKm = searchRequest.radiusKm || LOCATION_CONSTANTS.DEFAULT_SEARCH_RADIUS_KM;
    if (searchRequest.radius && !searchRequest.radiusKm) {
      // If radius is provided and it's a large number, assume it's in meters
      radiusKm = searchRequest.radius > 1000 ? searchRequest.radius / 1000 : searchRequest.radius;
    }
    
    const maxResults = Math.min(searchRequest.maxResults || 10, 50);

    return await this.locationService.findNearestHospitals(
      location,
      radiusKm,
      maxResults,
      searchRequest.requireEmergencyServices,
      searchRequest.requiredSpecializations
    );
  }

  @Post("/route/calculate")
  @Summary("Calculate route between two points")
  @Description("Calculate distance, time and waypoints between origin and destination")
  @Returns(200, Object)
  @Returns(400, BadRequest)
  async calculateRoute(
    @BodyParams("from") from: Coordinates,
    @BodyParams("to") to: Coordinates
  ): Promise<{
    distance: number;
    estimatedTime: number;
    waypoints: Coordinates[];
  }> {
    return await this.locationService.calculateRoute(from, to);
  }

  @Put("/drivers/:driverId/availability")
  @Summary("Set driver availability")
  @Description("Update driver availability status and optionally location")
  @Returns(200, Object)
  @Returns(400, BadRequest)
  async setDriverAvailability(
    @PathParams("driverId") driverId: string,
    @BodyParams("isAvailable") isAvailable: boolean,
    @BodyParams("location") location?: LocationPoint
  ): Promise<{ success: boolean; message: string }> {
    await this.locationService.setDriverAvailability(driverId, isAvailable, location);
    
    return {
      success: true,
      message: `Driver availability updated to ${isAvailable ? 'available' : 'unavailable'}`
    };
  }

  @Get("/area/coverage")
  @Summary("Get area coverage statistics")
  @Description("Get statistics about driver availability and coverage in a specific area")
  @Returns(200, Object)
  @Returns(400, BadRequest)
  async getAreaCoverage(
    @QueryParams("lat") latitude: number,
    @QueryParams("lng") longitude: number,
    @QueryParams("radius") radiusKm: number = LOCATION_CONSTANTS.DEFAULT_SEARCH_RADIUS_KM
  ): Promise<{
    totalDrivers: number;
    availableDrivers: number;
    averageDistance: number;
    ambulanceTypes: Record<AmbulanceType, number>;
  }> {
    if (!latitude || !longitude) {
      throw new BadRequest("Latitude and longitude are required");
    }

    const center: Coordinates = { latitude, longitude };
    return await this.locationService.getAreaCoverage(center, radiusKm);
  }

  @Get("/emergency/nearest")
  @Summary("Emergency nearest search")
  @Description("Quick search for nearest available resources in emergency situations")
  @Returns(200, Object)
  @Returns(400, BadRequest)
  async emergencyNearestSearch(
    @QueryParams("lat") latitude: number,
    @QueryParams("lng") longitude: number,
    @QueryParams("type") ambulanceType?: AmbulanceType
  ): Promise<{
    nearestDriver: NearestDriverResult | null;
    nearestHospital: NearestHospitalResult | null;
    alternativeDrivers: NearestDriverResult[];
    alternativeHospitals: NearestHospitalResult[];
  }> {
    if (!latitude || !longitude) {
      throw new BadRequest("Latitude and longitude are required");
    }

    const location: Coordinates = { latitude, longitude };
    const emergencyRadius = LOCATION_CONSTANTS.EMERGENCY_RESPONSE_RADIUS_KM;

    // Find nearest drivers and hospitals
    const [drivers, hospitals] = await Promise.all([
      this.locationService.findNearestDrivers(location, emergencyRadius, 5, ambulanceType),
      this.locationService.findNearestHospitals(location, emergencyRadius, 5, true) // Require emergency services
    ]);

    return {
      nearestDriver: drivers.length > 0 ? drivers[0] : null,
      nearestHospital: hospitals.length > 0 ? hospitals[0] : null,
      alternativeDrivers: drivers.slice(1),
      alternativeHospitals: hospitals.slice(1)
    };
  }
}