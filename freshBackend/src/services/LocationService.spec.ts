import { describe, it, expect, beforeEach } from "vitest";
import { LocationService } from "./LocationService.js";
import { DriverStatus, AmbulanceType } from "../models/Driver.js";
import { Coordinates, LocationPoint } from "../utils/LocationUtils.js";

describe("LocationService", () => {
  let locationService: LocationService;
  
  beforeEach(() => {
    locationService = new LocationService();
  });

  describe("updateDriverLocation", () => {
    it("should update driver location successfully", async () => {
      const driverId = "test-driver-1";
      const location: LocationPoint = {
        latitude: 28.6139,
        longitude: 77.2090,
        accuracy: 10,
        speed: 30
      };

      await locationService.updateDriverLocation(driverId, location, DriverStatus.AVAILABLE);
      
      const updatedLocation = await locationService.getDriverLocation(driverId);
      expect(updatedLocation).toBeDefined();
      expect(updatedLocation!.location.latitude).toBe(location.latitude);
      expect(updatedLocation!.location.longitude).toBe(location.longitude);
      expect(updatedLocation!.status).toBe(DriverStatus.AVAILABLE);
    });

    it("should throw error for invalid coordinates", async () => {
      const driverId = "test-driver-1";
      const invalidLocation: LocationPoint = {
        latitude: 200, // Invalid latitude
        longitude: 77.2090
      };

      await expect(
        locationService.updateDriverLocation(driverId, invalidLocation, DriverStatus.AVAILABLE)
      ).rejects.toThrow("Invalid GPS coordinates provided");
    });
  });

  describe("getDriverLocation", () => {
    it("should return null for non-existent driver", async () => {
      const location = await locationService.getDriverLocation("non-existent-driver");
      expect(location).toBeNull();
    });

    it("should return driver location if exists", async () => {
      const driverId = "test-driver-2";
      const location: LocationPoint = {
        latitude: 28.5355,
        longitude: 77.3910
      };

      await locationService.updateDriverLocation(driverId, location, DriverStatus.AVAILABLE);
      const retrievedLocation = await locationService.getDriverLocation(driverId);
      
      expect(retrievedLocation).toBeDefined();
      expect(retrievedLocation!.entityId).toBe(driverId);
    });
  });

  describe("findNearestDrivers", () => {
    beforeEach(async () => {
      // Add some test drivers at different locations
      const testDrivers = [
        { id: "driver-near", lat: 28.6140, lng: 77.2091 }, // Very close
        { id: "driver-medium", lat: 28.6200, lng: 77.2200 }, // Medium distance
        { id: "driver-far", lat: 28.7000, lng: 77.3000 }, // Far
      ];

      for (const driver of testDrivers) {
        await locationService.updateDriverLocation(
          driver.id,
          { latitude: driver.lat, longitude: driver.lng },
          DriverStatus.AVAILABLE
        );
      }
    });

    it("should find nearest drivers within radius", async () => {
      const searchLocation: Coordinates = {
        latitude: 28.6139,
        longitude: 77.2090
      };

      const nearestDrivers = await locationService.findNearestDrivers(
        searchLocation,
        10, // 10km radius
        5   // max 5 results
      );

      expect(nearestDrivers.length).toBeGreaterThan(0);
      
      // Should be sorted by distance (nearest first)
      if (nearestDrivers.length > 1) {
        expect(nearestDrivers[0].distance).toBeLessThanOrEqual(nearestDrivers[1].distance);
      }
    });

    it("should filter by ambulance type", async () => {
      const searchLocation: Coordinates = {
        latitude: 28.6139,
        longitude: 77.2090
      };

      const cardiacDrivers = await locationService.findNearestDrivers(
        searchLocation,
        20,
        10,
        AmbulanceType.CARDIAC
      );

      // All returned drivers should be cardiac ambulances
      cardiacDrivers.forEach(driver => {
        expect(driver.ambulanceType).toBe(AmbulanceType.CARDIAC);
      });
    });

    it("should respect maximum results limit", async () => {
      const searchLocation: Coordinates = {
        latitude: 28.6139,
        longitude: 77.2090
      };

      const maxResults = 2;
      const nearestDrivers = await locationService.findNearestDrivers(
        searchLocation,
        50, // Large radius to include all test drivers
        maxResults
      );

      expect(nearestDrivers.length).toBeLessThanOrEqual(maxResults);
    });

    it("should throw error for invalid coordinates", async () => {
      const invalidLocation: Coordinates = {
        latitude: 200,
        longitude: 77.2090
      };

      await expect(
        locationService.findNearestDrivers(invalidLocation, 10, 5)
      ).rejects.toThrow("Invalid search coordinates");
    });
  });

  describe("findNearestHospitals", () => {
    it("should find hospitals within radius", async () => {
      const searchLocation: Coordinates = {
        latitude: 28.6139,
        longitude: 77.2090
      };

      const hospitals = await locationService.findNearestHospitals(searchLocation, 20, 5);
      
      expect(hospitals.length).toBeGreaterThan(0);
      expect(hospitals[0]).toHaveProperty('hospitalId');
      expect(hospitals[0]).toHaveProperty('distance');
      expect(hospitals[0]).toHaveProperty('estimatedArrival');
    });

    it("should filter by emergency services requirement", async () => {
      const searchLocation: Coordinates = {
        latitude: 28.6139,
        longitude: 77.2090
      };

      const emergencyHospitals = await locationService.findNearestHospitals(
        searchLocation,
        20,
        10,
        true // Require emergency services
      );

      emergencyHospitals.forEach(hospital => {
        expect(hospital.hasEmergencyServices).toBe(true);
      });
    });

    it("should filter by required specializations", async () => {
      const searchLocation: Coordinates = {
        latitude: 28.6139,
        longitude: 77.2090
      };

      const requiredSpecs = ['cardiology', 'emergency'];
      const hospitals = await locationService.findNearestHospitals(
        searchLocation,
        20,
        10,
        false,
        requiredSpecs
      );

      hospitals.forEach(hospital => {
        requiredSpecs.forEach(spec => {
          expect(hospital.specializations).toContain(spec);
        });
      });
    });
  });

  describe("calculateRoute", () => {
    it("should calculate route between two points", async () => {
      const from: Coordinates = { latitude: 28.6139, longitude: 77.2090 };
      const to: Coordinates = { latitude: 28.5355, longitude: 77.3910 };

      const route = await locationService.calculateRoute(from, to);

      expect(route).toHaveProperty('distance');
      expect(route).toHaveProperty('estimatedTime');
      expect(route).toHaveProperty('waypoints');
      expect(route.distance).toBeGreaterThan(0);
      expect(route.estimatedTime).toBeGreaterThan(0);
      expect(route.waypoints).toHaveLength(2);
    });

    it("should throw error for invalid coordinates", async () => {
      const validCoord: Coordinates = { latitude: 28.6139, longitude: 77.2090 };
      const invalidCoord: Coordinates = { latitude: 200, longitude: 77.2090 };

      await expect(
        locationService.calculateRoute(validCoord, invalidCoord)
      ).rejects.toThrow("Invalid coordinates for route calculation");
    });
  });

  describe("setDriverAvailability", () => {
    it("should set driver as available", async () => {
      const driverId = "test-driver-availability";
      const location: LocationPoint = {
        latitude: 28.6139,
        longitude: 77.2090
      };

      await locationService.setDriverAvailability(driverId, true, location);
      
      const driverLocation = await locationService.getDriverLocation(driverId);
      expect(driverLocation).toBeDefined();
      expect(driverLocation!.status).toBe(DriverStatus.AVAILABLE);
    });

    it("should set driver as unavailable", async () => {
      const driverId = "test-driver-unavailable";
      
      // First make driver available
      await locationService.setDriverAvailability(driverId, true, {
        latitude: 28.6139,
        longitude: 77.2090
      });

      // Then make unavailable
      await locationService.setDriverAvailability(driverId, false);
      
      const driverLocation = await locationService.getDriverLocation(driverId);
      expect(driverLocation!.status).toBe(DriverStatus.OFFLINE);
    });
  });

  describe("getAreaCoverage", () => {
    beforeEach(async () => {
      // Add multiple drivers for coverage testing
      const testDrivers = [
        { id: "coverage-1", lat: 28.6140, lng: 77.2091, type: AmbulanceType.BASIC },
        { id: "coverage-2", lat: 28.6200, lng: 77.2200, type: AmbulanceType.ADVANCED },
        { id: "coverage-3", lat: 28.6300, lng: 77.2300, type: AmbulanceType.EMERGENCY },
      ];

      for (const driver of testDrivers) {
        await locationService.updateDriverLocation(
          driver.id,
          { latitude: driver.lat, longitude: driver.lng },
          DriverStatus.AVAILABLE
        );
      }
    });

    it("should return area coverage statistics", async () => {
      const center: Coordinates = { latitude: 28.6200, longitude: 77.2200 };
      
      const coverage = await locationService.getAreaCoverage(center, 10);

      expect(coverage).toHaveProperty('totalDrivers');
      expect(coverage).toHaveProperty('availableDrivers');
      expect(coverage).toHaveProperty('averageDistance');
      expect(coverage).toHaveProperty('ambulanceTypes');
      expect(coverage.totalDrivers).toBeGreaterThanOrEqual(0);
      expect(coverage.availableDrivers).toBeGreaterThanOrEqual(0);
      expect(coverage.ambulanceTypes).toHaveProperty(AmbulanceType.BASIC);
    });
  });

  describe("getAllActiveDriverLocations", () => {
    it("should return all active driver locations", async () => {
      // Add some active drivers
      await locationService.updateDriverLocation(
        "active-1",
        { latitude: 28.6139, longitude: 77.2090 },
        DriverStatus.AVAILABLE
      );
      
      await locationService.updateDriverLocation(
        "active-2", 
        { latitude: 28.6200, longitude: 77.2200 },
        DriverStatus.ON_DUTY
      );

      const activeLocations = await locationService.getAllActiveDriverLocations();
      
      expect(activeLocations.length).toBeGreaterThanOrEqual(2);
      activeLocations.forEach(location => {
        expect(location).toHaveProperty('entityId');
        expect(location).toHaveProperty('location');
        expect(location).toHaveProperty('timestamp');
      });
    });
  });
});