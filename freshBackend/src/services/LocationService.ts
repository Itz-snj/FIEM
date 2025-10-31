import { Service } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { 
  Coordinates, 
  LocationPoint, 
  calculateDistance, 
  findNearestPoints, 
  isValidCoordinates,
  createBoundingBox,
  estimateTravelTime,
  LOCATION_CONSTANTS
} from "../utils/LocationUtils.js";
import { Driver, DriverStatus, AmbulanceType } from "../models/Driver.js";
import { Hospital } from "../models/Hospital.js";
import { UserRole } from "../models/User.js";

export interface NearestDriverResult {
  driverId: string;
  driver: any; // Would be Driver model in real implementation
  location: LocationPoint;
  distance: number;
  estimatedArrival: number; // minutes
  ambulanceType: AmbulanceType;
  isAvailable: boolean;
}

export interface NearestHospitalResult {
  hospitalId: string;
  hospital: any; // Would be Hospital model in real implementation
  location: Coordinates;
  distance: number;
  estimatedArrival: number;
  availableBeds: number;
  hasEmergencyServices: boolean;
  specializations: string[];
}

export interface LocationUpdate {
  entityId: string;
  entityType: 'driver' | 'user' | 'ambulance';
  location: LocationPoint;
  status?: string;
  timestamp: Date;
}

export interface SearchArea {
  center: Coordinates;
  radiusKm: number;
  maxResults: number;
}

@Service()
export class LocationService {
  // In-memory storage for demo purposes (would use Redis or MongoDB in production)
  private driverLocations: Map<string, LocationUpdate> = new Map();
  private hospitalLocations: Map<string, NearestHospitalResult> = new Map();
  
  constructor() {
    this.initializeDemoData();
  }

  /**
   * Update driver location in real-time
   */
  async updateDriverLocation(driverId: string, location: LocationPoint, status: DriverStatus): Promise<void> {
    if (!isValidCoordinates(location)) {
      throw new BadRequest("Invalid GPS coordinates provided");
    }

    const locationUpdate: LocationUpdate = {
      entityId: driverId,
      entityType: 'driver',
      location: {
        ...location,
        timestamp: new Date()
      },
      status,
      timestamp: new Date()
    };

    this.driverLocations.set(driverId, locationUpdate);
    console.log(`Updated location for driver ${driverId}:`, location);
  }

  /**
   * Get current location of a specific driver
   */
  async getDriverLocation(driverId: string): Promise<LocationUpdate | null> {
    const location = this.driverLocations.get(driverId);
    if (!location) {
      return null;
    }

    // Check if location is recent (within last 5 minutes)
    const now = new Date();
    const locationAge = now.getTime() - location.timestamp.getTime();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (locationAge > maxAge) {
      console.warn(`Driver ${driverId} location is stale (${locationAge / 1000} seconds old)`);
    }

    return location;
  }

  /**
   * Find nearest available drivers within specified radius
   */
  async findNearestDrivers(
    location: Coordinates, 
    radiusKm: number = LOCATION_CONSTANTS.DEFAULT_SEARCH_RADIUS_KM,
    maxResults: number = 10,
    ambulanceType?: AmbulanceType
  ): Promise<NearestDriverResult[]> {
    
    if (!isValidCoordinates(location)) {
      throw new BadRequest("Invalid search coordinates");
    }

    // Get all available drivers
    const availableDrivers: NearestDriverResult[] = [];
    
    for (const [driverId, locationUpdate] of this.driverLocations.entries()) {
      // Skip if driver is not available
      if (locationUpdate.status !== DriverStatus.AVAILABLE && 
          locationUpdate.status !== DriverStatus.ON_DUTY) {
        continue;
      }

      const distance = calculateDistance(location, locationUpdate.location);
      
      // Skip if outside radius
      if (distance > radiusKm) {
        continue;
      }

      // Get driver details (mock data for now)
      const driverData = this.getMockDriverData(driverId);
      
      // Filter by ambulance type if specified
      if (ambulanceType && driverData.ambulanceType !== ambulanceType) {
        continue;
      }

      const result: NearestDriverResult = {
        driverId,
        driver: driverData,
        location: locationUpdate.location,
        distance,
        estimatedArrival: estimateTravelTime(distance, LOCATION_CONSTANTS.AMBULANCE_AVERAGE_SPEED_KMH),
        ambulanceType: driverData.ambulanceType,
        isAvailable: locationUpdate.status === DriverStatus.AVAILABLE
      };

      availableDrivers.push(result);
    }

    // Sort by distance and return top results
    return availableDrivers
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults);
  }

  /**
   * Find nearest hospitals within specified radius
   */
  async findNearestHospitals(
    location: Coordinates,
    radiusKm: number = LOCATION_CONSTANTS.DEFAULT_SEARCH_RADIUS_KM,
    maxResults: number = 10,
    requireEmergencyServices: boolean = false,
    requiredSpecializations?: string[]
  ): Promise<NearestHospitalResult[]> {
    
    if (!isValidCoordinates(location)) {
      throw new BadRequest("Invalid search coordinates");
    }

    const nearbyHospitals: NearestHospitalResult[] = [];

    for (const hospital of this.hospitalLocations.values()) {
      const distance = calculateDistance(location, hospital.location);
      
      // Skip if outside radius
      if (distance > radiusKm) {
        continue;
      }

      // Filter by emergency services requirement
      if (requireEmergencyServices && !hospital.hasEmergencyServices) {
        continue;
      }

      // Filter by required specializations
      if (requiredSpecializations && requiredSpecializations.length > 0) {
        const hasAllSpecializations = requiredSpecializations.every(spec => 
          hospital.specializations.includes(spec)
        );
        if (!hasAllSpecializations) {
          continue;
        }
      }

      const result: NearestHospitalResult = {
        ...hospital,
        distance,
        estimatedArrival: estimateTravelTime(distance, LOCATION_CONSTANTS.AMBULANCE_AVERAGE_SPEED_KMH)
      };

      nearbyHospitals.push(result);
    }

    // Sort by distance and return top results
    return nearbyHospitals
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxResults);
  }

  /**
   * Get all active driver locations for real-time tracking
   */
  async getAllActiveDriverLocations(): Promise<LocationUpdate[]> {
    const now = new Date();
    const maxAge = 10 * 60 * 1000; // 10 minutes

    return Array.from(this.driverLocations.values()).filter(location => {
      const locationAge = now.getTime() - location.timestamp.getTime();
      return locationAge <= maxAge;
    });
  }

  /**
   * Calculate route between two points (simplified version)
   */
  async calculateRoute(from: Coordinates, to: Coordinates): Promise<{
    distance: number;
    estimatedTime: number;
    waypoints: Coordinates[];
  }> {
    if (!isValidCoordinates(from) || !isValidCoordinates(to)) {
      throw new BadRequest("Invalid coordinates for route calculation");
    }

    const distance = calculateDistance(from, to);
    const estimatedTime = estimateTravelTime(distance, LOCATION_CONSTANTS.AMBULANCE_AVERAGE_SPEED_KMH);

    // Simplified route - just start and end points
    // In production, this would integrate with Google Maps or similar service
    const waypoints: Coordinates[] = [from, to];

    return {
      distance,
      estimatedTime,
      waypoints
    };
  }

  /**
   * Set driver availability and location
   */
  async setDriverAvailability(
    driverId: string, 
    isAvailable: boolean, 
    location?: LocationPoint
  ): Promise<void> {
    const status = isAvailable ? DriverStatus.AVAILABLE : DriverStatus.OFFLINE;
    
    if (location) {
      await this.updateDriverLocation(driverId, location, status);
    } else {
      // Update only status if location not provided
      const existingLocation = this.driverLocations.get(driverId);
      if (existingLocation) {
        existingLocation.status = status;
        existingLocation.timestamp = new Date();
      }
    }
  }

  /**
   * Get statistics about driver coverage in an area
   */
  async getAreaCoverage(center: Coordinates, radiusKm: number): Promise<{
    totalDrivers: number;
    availableDrivers: number;
    averageDistance: number;
    ambulanceTypes: Record<AmbulanceType, number>;
  }> {
    const driversInArea = await this.findNearestDrivers(center, radiusKm, 100);
    const availableDrivers = driversInArea.filter(d => d.isAvailable);
    
    const ambulanceTypes: Record<AmbulanceType, number> = {
      [AmbulanceType.BASIC]: 0,
      [AmbulanceType.ADVANCED]: 0,
      [AmbulanceType.CARDIAC]: 0,
      [AmbulanceType.NEONATAL]: 0,
      [AmbulanceType.EMERGENCY]: 0
    };

    availableDrivers.forEach(driver => {
      ambulanceTypes[driver.ambulanceType]++;
    });

    const totalDistance = availableDrivers.reduce((sum, driver) => sum + driver.distance, 0);
    const averageDistance = availableDrivers.length > 0 ? totalDistance / availableDrivers.length : 0;

    return {
      totalDrivers: driversInArea.length,
      availableDrivers: availableDrivers.length,
      averageDistance,
      ambulanceTypes
    };
  }

  /**
   * Initialize demo data for testing
   */
  private initializeDemoData() {
    // Demo driver locations in Delhi/NCR area
    const delhiCenter: Coordinates = { latitude: 28.6139, longitude: 77.2090 };
    
    // Add some demo drivers
    const demoDrivers = [
      { id: 'driver-1', lat: 28.6129, lng: 77.2295, type: AmbulanceType.BASIC },
      { id: 'driver-2', lat: 28.5355, lng: 77.3910, type: AmbulanceType.ADVANCED },
      { id: 'driver-3', lat: 28.4595, lng: 77.0266, type: AmbulanceType.EMERGENCY },
      { id: 'driver-4', lat: 28.7041, lng: 77.1025, type: AmbulanceType.CARDIAC },
      { id: 'driver-5', lat: 28.6692, lng: 77.4538, type: AmbulanceType.NEONATAL },
    ];

    demoDrivers.forEach(driver => {
      const locationUpdate: LocationUpdate = {
        entityId: driver.id,
        entityType: 'driver',
        location: {
          latitude: driver.lat,
          longitude: driver.lng,
          timestamp: new Date(),
          accuracy: 10,
          speed: 0
        },
        status: DriverStatus.AVAILABLE,
        timestamp: new Date()
      };
      this.driverLocations.set(driver.id, locationUpdate);
    });

    // Add demo hospitals
    const demoHospitals: NearestHospitalResult[] = [
      {
        hospitalId: 'hospital-1',
        hospital: { name: 'AIIMS Delhi' },
        location: { latitude: 28.5672, longitude: 77.2100 },
        distance: 0,
        estimatedArrival: 0,
        availableBeds: 50,
        hasEmergencyServices: true,
        specializations: ['emergency', 'cardiology', 'neurology', 'trauma']
      },
      {
        hospitalId: 'hospital-2',
        hospital: { name: 'Safdarjung Hospital' },
        location: { latitude: 28.5706, longitude: 77.2091 },
        distance: 0,
        estimatedArrival: 0,
        availableBeds: 30,
        hasEmergencyServices: true,
        specializations: ['emergency', 'orthopedics', 'pediatrics']
      },
      {
        hospitalId: 'hospital-3',
        hospital: { name: 'Max Hospital Saket' },
        location: { latitude: 28.5244, longitude: 77.2066 },
        distance: 0,
        estimatedArrival: 0,
        availableBeds: 25,
        hasEmergencyServices: true,
        specializations: ['emergency', 'cardiology', 'oncology', 'neurology']
      }
    ];

    demoHospitals.forEach(hospital => {
      this.hospitalLocations.set(hospital.hospitalId, hospital);
    });
  }

  /**
   * Get mock driver data for demo
   */
  private getMockDriverData(driverId: string) {
    const driverTypes = [AmbulanceType.BASIC, AmbulanceType.ADVANCED, AmbulanceType.EMERGENCY, AmbulanceType.CARDIAC, AmbulanceType.NEONATAL];
    const randomType = driverTypes[Math.floor(Math.random() * driverTypes.length)];
    
    return {
      id: driverId,
      name: `Driver ${driverId.split('-')[1]}`,
      phone: `+91987654${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      ambulanceType: randomType,
      rating: 4.0 + Math.random(),
      vehicle: {
        registrationNumber: `DL-${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 10000)}`,
        type: randomType
      }
    };
  }
}