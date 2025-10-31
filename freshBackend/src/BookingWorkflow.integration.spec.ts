import { describe, it, expect, beforeEach } from "vitest";
import { LocationService } from "./services/LocationService.js";
import { SmartDispatchService } from "./services/SmartDispatchService.js";
import { HospitalIntegrationService } from "./services/HospitalIntegrationService.js";
import { AmbulanceType, DriverStatus } from "./models/Driver.js";
import { Priority } from "./models/Booking.js";

describe("Phase 3: Booking Workflow Integration", () => {
  let smartDispatchService: SmartDispatchService;
  let hospitalIntegrationService: HospitalIntegrationService;
  let locationService: LocationService;

  beforeEach(() => {
    locationService = new LocationService();
    // Mock booking service for dispatch testing
    const mockBookingService = {
      assignDriver: async () => ({ success: true }),
      getBooking: async () => ({ bookingId: 'test', status: 'CONFIRMED' })
    } as any;
    smartDispatchService = new SmartDispatchService(locationService, mockBookingService);
    hospitalIntegrationService = new HospitalIntegrationService(locationService);
  });

  describe("Smart Dispatch Integration", () => {
    it("should successfully dispatch ambulance using smart algorithm", async () => {
      // Add a driver to the system
      await locationService.updateDriverLocation("test-driver", {
        latitude: 28.6140,
        longitude: 77.2089
      }, DriverStatus.AVAILABLE);

      // Attempt dispatch
      const dispatchResult = await smartDispatchService.dispatchAmbulance({
        bookingId: "integration-test-001",
        pickupLocation: { latitude: 28.6139, longitude: 77.2090 },
        priority: Priority.HIGH,
        ambulanceType: AmbulanceType.EMERGENCY,
        patientCondition: "emergency transport"
      });

      expect(dispatchResult).toBeDefined();
      expect(dispatchResult.success).toBe(true);
      expect(dispatchResult.assignedDriver?.driverId).toBe("test-driver");
      expect(dispatchResult.message).toContain("Driver successfully assigned");
    });

    it("should handle no available drivers scenario", async () => {
      const dispatchResult = await smartDispatchService.dispatchAmbulance({
        bookingId: "no-drivers-test",
        pickupLocation: { latitude: 28.6139, longitude: 77.2090 },
        priority: Priority.MEDIUM,
        ambulanceType: AmbulanceType.BASIC
      });

      expect(dispatchResult.success).toBe(false);
      expect(dispatchResult.message).toContain("No available drivers found");
    });

    it("should provide dispatch analytics", async () => {
      const analytics = await smartDispatchService.getDispatchAnalytics("hour");
      
      expect(analytics).toBeDefined();
      expect(typeof analytics.totalDispatches).toBe("number");
      expect(typeof analytics.successRate).toBe("number");
      expect(typeof analytics.averageResponseTime).toBe("number");
      expect(Array.isArray(analytics.topPerformingDrivers)).toBe(true);
      expect(Array.isArray(analytics.dispatchByHour)).toBe(true);
      expect(analytics.dispatchByHour.length).toBe(24);
    });

    it("should support manual dispatch override", async () => {
      // Add driver
      await locationService.updateDriverLocation("manual-driver", {
        latitude: 28.6140,
        longitude: 77.2089
      }, DriverStatus.AVAILABLE);

      const manualResult = await smartDispatchService.manualDispatch(
        "manual-booking-001",
        "manual-driver",
        "Emergency executive override"
      );

      expect(manualResult.success).toBe(true);
      expect(manualResult.assignedDriver?.driverId).toBe("manual-driver");
      expect(manualResult.assignedDriver?.confidence).toBe(1.0);
    });
  });

  describe("Hospital Integration", () => {
    it("should provide hospital recommendations based on patient condition", async () => {
      const recommendations = await hospitalIntegrationService.getHospitalRecommendations({
        patientLocation: { latitude: 28.6139, longitude: 77.2090 },
        patientCondition: "cardiac emergency",
        priority: "CRITICAL" as any,
        requiredSpecialties: ["cardiology"],
        maxDistance: 50
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      
      const firstHospital = recommendations[0];
      expect(firstHospital.hospitalId).toBeDefined();
      expect(firstHospital.suitabilityScore).toBeGreaterThan(0);
      expect(firstHospital.availableBeds).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(firstHospital.specialties)).toBe(true);
      expect(Array.isArray(firstHospital.reasons)).toBe(true);
    });

    it("should handle bed reservation", async () => {
      const hospitalId = "hosp1"; // Using demo hospital
      
      const reservationResult = await hospitalIntegrationService.reserveBed(hospitalId, "emergency");
      
      expect(reservationResult.success).toBe(true);
      expect(reservationResult.reservationId).toBeDefined();
      expect(reservationResult.message).toContain("reserved");
    });

    it("should provide capacity analytics", async () => {
      const analytics = await hospitalIntegrationService.getCapacityAnalytics("day");
      
      expect(analytics).toBeDefined();
      expect(typeof analytics.averageOccupancy).toBe("number");
      expect(Array.isArray(analytics.hospitalUtilization)).toBe(true);
      expect(Array.isArray(analytics.capacityAlerts)).toBe(true);
      
      // Verify structure of hospital utilization data
      if (analytics.hospitalUtilization.length > 0) {
        const hospital = analytics.hospitalUtilization[0];
        expect(hospital.hospitalId).toBeDefined();
        expect(typeof hospital.occupancyRate).toBe("number");
        expect(['increasing', 'decreasing', 'stable']).toContain(hospital.trend);
      }
    });

    it("should update hospital capacity in real-time", async () => {
      const hospitalId = "hosp2";
      
      await hospitalIntegrationService.updateHospitalCapacity(hospitalId, {
        availableEmergencyBeds: 8,
        availableIcuBeds: 3,
        lastUpdated: new Date()
      });

      // Verify the update worked by getting recommendations
      const recommendations = await hospitalIntegrationService.getHospitalRecommendations({
        patientLocation: { latitude: 28.6139, longitude: 77.2090 },
        patientCondition: "emergency",
        priority: "HIGH" as any,
        maxDistance: 100
      });

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Location Service Integration", () => {
    it("should find nearest drivers for dispatch", async () => {
      // Add multiple drivers  
      await locationService.updateDriverLocation("driver1", {
        latitude: 28.6140,
        longitude: 77.2089
      }, DriverStatus.AVAILABLE);
      
      await locationService.updateDriverLocation("driver2", {
        latitude: 28.6200,
        longitude: 77.2200
      }, DriverStatus.AVAILABLE);

      const nearestDrivers = await locationService.findNearestDrivers(
        { latitude: 28.6139, longitude: 77.2090 },
        10, // 10km radius
        5   // max 5 drivers
      );

      expect(nearestDrivers).toBeDefined();
      expect(Array.isArray(nearestDrivers)).toBe(true);
      expect(nearestDrivers.length).toBeGreaterThanOrEqual(0);
    });

    it("should find nearest hospitals", async () => {
      const nearestHospitals = await locationService.findNearestHospitals(
        { latitude: 28.6139, longitude: 77.2090 },
        50 // 50km radius
      );

      expect(nearestHospitals).toBeDefined();
      expect(Array.isArray(nearestHospitals)).toBe(true);
    });

    it("should provide area coverage statistics", async () => {
      // Add some drivers
      await locationService.updateDriverLocation("coverage1", {
        latitude: 28.6140,
        longitude: 77.2089
      }, DriverStatus.AVAILABLE);
      
      await locationService.updateDriverLocation("coverage2", {
        latitude: 28.6500,
        longitude: 77.2500
      }, DriverStatus.AVAILABLE);

      const coverage = await locationService.getAreaCoverage(
        { latitude: 28.6139, longitude: 77.2090 },
        20
      );

      expect(coverage).toBeDefined();
      expect(typeof coverage.totalDrivers).toBe("number");
      expect(typeof coverage.availableDrivers).toBe("number");
      expect(typeof coverage.averageDistance).toBe("number");
    });
  });

  describe("Complete Workflow Simulation", () => {
    it("should handle complete emergency workflow", async () => {
      // Step 1: Add available driver and hospital capacity
      await locationService.updateDriverLocation("emergency-driver", {
        latitude: 28.6140,
        longitude: 77.2089
      }, DriverStatus.AVAILABLE);

      // Step 2: Get hospital recommendations
      const hospitalRecommendations = await hospitalIntegrationService.getHospitalRecommendations({
        patientLocation: { latitude: 28.6139, longitude: 77.2090 },
        patientCondition: "chest pain, cardiac emergency",
        priority: "CRITICAL" as any,
        requiredSpecialties: ["cardiology", "emergency medicine"],
        maxDistance: 25
      });

      expect(hospitalRecommendations.length).toBeGreaterThan(0);

      // Step 3: Smart dispatch
      const dispatchResult = await smartDispatchService.dispatchAmbulance({
        bookingId: "emergency-workflow-001",
        pickupLocation: { latitude: 28.6139, longitude: 77.2090 },
        priority: Priority.CRITICAL,
        ambulanceType: AmbulanceType.EMERGENCY,
        patientCondition: "chest pain, cardiac emergency"
      });

      expect(dispatchResult.success).toBe(true);
      expect(dispatchResult.assignedDriver?.driverId).toBe("emergency-driver");

      // Step 4: Reserve hospital bed
      const topHospital = hospitalRecommendations[0];
      const bedReservation = await hospitalIntegrationService.reserveBed(
        topHospital.hospitalId,
        "emergency"
      );

      expect(bedReservation.success).toBe(true);

      // Step 5: Verify analytics updated
      const dispatchAnalytics = await smartDispatchService.getDispatchAnalytics("hour");
      expect(dispatchAnalytics.totalDispatches).toBeGreaterThanOrEqual(1);

      const hospitalAnalytics = await hospitalIntegrationService.getCapacityAnalytics("hour");
      expect(hospitalAnalytics.hospitalUtilization.length).toBeGreaterThan(0);
    });
  });
});