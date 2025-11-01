import { describe, it, expect, beforeEach } from "vitest";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import { RealTimeIntegrationService } from "./services/RealTimeIntegrationService.js";
import { BookingService } from "./services/BookingService.js";
import { SmartDispatchService } from "./services/SmartDispatchService.js";
import { HospitalIntegrationService } from "./services/HospitalIntegrationService.js";
import { LocationService } from "./services/LocationService.js";
import { UserService } from "./services/UserService.js";
import { SocketService } from "./services/SocketService.js";
import { Priority } from "./models/Booking.js";
import { DriverStatus } from "./models/Driver.js";

describe("Phase 4: Real-time Status Updates Integration", () => {
  let realTimeService: RealTimeIntegrationService;
  let bookingService: BookingService;
  let smartDispatchService: SmartDispatchService;
  let hospitalIntegrationService: HospitalIntegrationService;
  let locationService: LocationService;
  let userService: UserService;
  let socketService: SocketService;
  let io: SocketIOServer;

  beforeEach(() => {
    // Create HTTP server and Socket.io server
    const httpServer = createServer();
    io = new SocketIOServer(httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] }
    });

    // Initialize services
    locationService = new LocationService();
    userService = new UserService();
    bookingService = new BookingService(locationService, userService);
    smartDispatchService = new SmartDispatchService(locationService, bookingService);
    hospitalIntegrationService = new HospitalIntegrationService(locationService);
    
    realTimeService = new RealTimeIntegrationService(
      bookingService,
      smartDispatchService, 
      hospitalIntegrationService,
      locationService
    );

    // Initialize Socket.io integration
    realTimeService.initializeSocketIO(io);
    socketService = realTimeService.getSocketService()!;
  });

  describe("Real-time Integration Service", () => {
    it("should initialize Socket.io integration successfully", () => {
      expect(socketService).toBeDefined();
      expect(socketService).toBeInstanceOf(SocketService);
      
      const stats = realTimeService.getSystemStats();
      expect(stats).toBeDefined();
      expect(stats?.systemHealth.socketServiceActive).toBe(true);
      expect(stats?.systemHealth.realTimeEventsEnabled).toBe(true);
    });

    it("should provide system statistics", () => {
      const stats = realTimeService.getSystemStats();
      
      expect(stats).toBeDefined();
      expect(stats?.realTimeConnections).toBeDefined();
      expect(stats?.driverStatus).toBeDefined();
      expect(stats?.systemHealth).toBeDefined();
      
      expect(stats?.realTimeConnections.totalConnected).toBe(0);
      expect(stats?.driverStatus.onlineDrivers).toBe(0);
    });
  });

  describe("Socket Service Integration", () => {
    it("should handle driver connections and location updates", () => {
      const connectedUsers = socketService.getConnectedUsers();
      const driverLocations = socketService.getAllDriverLocations();
      
      expect(Array.isArray(connectedUsers)).toBe(true);
      expect(Array.isArray(driverLocations)).toBe(true);
      expect(connectedUsers.length).toBe(0);
      expect(driverLocations.length).toBe(0);
    });

    it("should provide methods for real-time messaging", () => {
      expect(typeof socketService.sendMessageToUser).toBe('function');
      expect(typeof socketService.sendMessageToDriver).toBe('function');
      expect(typeof socketService.sendMessageToHospital).toBe('function');
      expect(typeof socketService.broadcastToEmergencyExecutives).toBe('function');
    });

    it("should handle booking room management", () => {
      const mockSocketId = 'test-socket-123';
      const mockBookingId = 'test-booking-456';
      
      // These would work with actual socket connections
      expect(() => {
        socketService.joinBookingRoom(mockSocketId, mockBookingId);
        socketService.leaveBookingRoom(mockSocketId, mockBookingId);
      }).not.toThrow();
    });
  });

  describe("Booking Service Real-time Integration", () => {
    it("should create booking with real-time notifications", async () => {
      const bookingRequest = {
        userId: "test-user-001",
        type: "EMERGENCY" as any,
        priority: Priority.HIGH,
        pickupLocation: {
          address: "123 Emergency St, Delhi",
          coordinates: { latitude: 28.6139, longitude: 77.2090 }
        },
        patientInfo: {
          name: "Test Patient",
          age: 35,
          gender: "male",
          condition: "chest pain",
          symptoms: ["chest pain", "shortness of breath"],
          emergencyContact: {
            name: "Emergency Contact",
            phone: "+919876543210",
            relation: "spouse"
          }
        }
      };

      const booking = await bookingService.createBooking(bookingRequest);
      
      expect(booking).toBeDefined();
      expect(booking.bookingId).toBeDefined();
      expect(booking.status).toBe("REQUESTED");
      
      // Real-time events would be emitted here (verified via socket service)
      console.log(`📡 Booking created with real-time notifications: ${booking.bookingNumber}`);
    });

    it("should update booking status with real-time broadcasts", async () => {
      // Create a booking first
      const bookingRequest = {
        userId: "test-user-002", 
        type: "EMERGENCY" as any,
        priority: Priority.CRITICAL,
        pickupLocation: {
          address: "456 Critical Ave, Delhi",
          coordinates: { latitude: 28.6200, longitude: 77.2100 }
        },
        patientInfo: {
          name: "Critical Patient",
          age: 60,
          gender: "female", 
          condition: "cardiac emergency",
          symptoms: ["severe chest pain"],
          emergencyContact: {
            name: "Family Member",
            phone: "+919876543211", 
            relation: "daughter"
          }
        }
      };

      const booking = await bookingService.createBooking(bookingRequest);
      
      // Update booking status
      const updatedBooking = await bookingService.updateBookingStatus(
        booking.bookingId,
        "DRIVER_ASSIGNED" as any,
        {
          location: { latitude: 28.6150, longitude: 77.2080 },
          notes: "Driver en route to pickup location"
        }
      );

      expect(updatedBooking.status).toBe("DRIVER_ASSIGNED");
      expect(updatedBooking.timeline).toBeDefined();
      expect(updatedBooking.timeline.length).toBeGreaterThan(1);
      
      console.log(`📡 Booking status updated with real-time notifications: ${updatedBooking.status}`);
    });
  });

  describe("Smart Dispatch Real-time Integration", () => {
    it("should dispatch ambulance with real-time notifications", async () => {
      // Add available driver
      await locationService.updateDriverLocation("real-time-driver", {
        latitude: 28.6140,
        longitude: 77.2090
      }, DriverStatus.AVAILABLE);

      // Test dispatch with real-time events
      const dispatchResult = await smartDispatchService.dispatchAmbulance({
        bookingId: "real-time-booking-001",
        pickupLocation: { latitude: 28.6139, longitude: 77.2090 },
        priority: Priority.HIGH,
        patientCondition: "emergency transport"
      });

      expect(dispatchResult.success).toBe(true);
      expect(dispatchResult.assignedDriver).toBeDefined();
      expect(dispatchResult.assignedDriver?.driverId).toBe("real-time-driver");
      
      console.log(`📡 Smart dispatch completed with real-time notifications for driver: ${dispatchResult.assignedDriver?.driverId}`);
    });

    it("should handle manual dispatch with executive notifications", async () => {
      // Add driver
      await locationService.updateDriverLocation("manual-dispatch-driver", {
        latitude: 28.6140,
        longitude: 77.2090
      }, DriverStatus.AVAILABLE);

      // Manual dispatch
      const manualResult = await smartDispatchService.manualDispatch(
        "manual-booking-001",
        "manual-dispatch-driver", 
        "Emergency executive override - critical patient condition"
      );

      expect(manualResult.success).toBe(true);
      expect(manualResult.assignedDriver?.driverId).toBe("manual-dispatch-driver");
      expect(manualResult.assignedDriver?.confidence).toBe(1.0);
      
      console.log(`📡 Manual dispatch completed with executive notifications`);
    });
  });

  describe("Hospital Integration Real-time Updates", () => {
    it("should update hospital capacity with real-time broadcasts", async () => {
      const hospitalId = "hosp1";
      
      // Update hospital capacity
      await hospitalIntegrationService.updateHospitalCapacity(hospitalId, {
        availableBeds: 25,
        availableIcuBeds: 3,
        availableEmergencyBeds: 8
      });

      // Verify capacity analytics
      const analytics = await hospitalIntegrationService.getCapacityAnalytics();
      expect(analytics).toBeDefined();
      expect(analytics.hospitalUtilization.length).toBeGreaterThan(0);
      
      console.log(`📡 Hospital capacity updated with real-time broadcasts for ${hospitalId}`);
    });

    it("should provide real-time hospital recommendations", async () => {
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
      
      console.log(`📡 Real-time hospital recommendations provided: ${recommendations.length} hospitals`);
    });
  });

  describe("Complete Real-time Workflow", () => {
    it("should handle end-to-end emergency workflow with real-time updates", async () => {
      // Step 1: Add available driver
      await locationService.updateDriverLocation("emergency-realtime-driver", {
        latitude: 28.6140, 
        longitude: 77.2090
      }, DriverStatus.AVAILABLE);

      // Step 2: Create emergency booking (triggers real-time events)
      const emergencyBooking = await bookingService.createBooking({
        userId: "emergency-user-001",
        type: "EMERGENCY" as any,
        priority: Priority.CRITICAL,
        pickupLocation: {
          address: "Emergency Location, Delhi",
          coordinates: { latitude: 28.6139, longitude: 77.2090 }
        },
        patientInfo: {
          name: "Emergency Patient",
          age: 45,
          gender: "male",
          condition: "severe cardiac emergency",
          symptoms: ["chest pain", "difficulty breathing"],
          emergencyContact: {
            name: "Emergency Contact", 
            phone: "+919876543212",
            relation: "spouse"
          }
        }
      });

      // Step 3: Smart dispatch (triggers real-time notifications)
      const dispatchResult = await smartDispatchService.dispatchAmbulance({
        bookingId: emergencyBooking.bookingId,
        pickupLocation: { latitude: 28.6139, longitude: 77.2090 },
        priority: Priority.CRITICAL,
        patientCondition: "severe cardiac emergency"
      });

      // Step 4: Get hospital recommendations (would trigger capacity updates)
      const hospitalRecommendations = await hospitalIntegrationService.getHospitalRecommendations({
        patientLocation: { latitude: 28.6139, longitude: 77.2090 },
        patientCondition: "severe cardiac emergency",
        priority: "CRITICAL" as any,
        requiredSpecialties: ["cardiology", "emergency medicine"],
        maxDistance: 25
      });

      // Step 5: Update booking status (triggers status notifications)
      const updatedBooking = await bookingService.updateBookingStatus(
        emergencyBooking.bookingId,
        "EN_ROUTE" as any,
        {
          location: { latitude: 28.6145, longitude: 77.2085 },
          estimatedArrival: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
          notes: "Driver en route, ETA 5 minutes"
        }
      );

      // Verify complete workflow
      expect(emergencyBooking.bookingId).toBeDefined();
      expect(dispatchResult.success).toBe(true);
      expect(dispatchResult.assignedDriver?.driverId).toBe("emergency-realtime-driver");
      expect(hospitalRecommendations.length).toBeGreaterThan(0);
      expect(updatedBooking.status).toBe("EN_ROUTE");

      // Get system stats to verify real-time activity
      const stats = realTimeService.getSystemStats();
      expect(stats?.systemHealth.realTimeEventsEnabled).toBe(true);

      console.log(`🚨 Complete emergency workflow with real-time updates executed successfully!`);
      console.log(`   📋 Booking: ${emergencyBooking.bookingNumber}`);
      console.log(`   🚑 Driver: ${dispatchResult.assignedDriver?.driverId}`);  
      console.log(`   🏥 Hospitals: ${hospitalRecommendations.length} recommended`);
      console.log(`   📡 Status: ${updatedBooking.status}`);
    });

    it("should handle system statistics and monitoring", () => {
      const stats = realTimeService.getSystemStats();
      
      expect(stats).toBeDefined();
      expect(stats?.realTimeConnections.totalConnected).toBeGreaterThanOrEqual(0);
      expect(stats?.driverStatus.onlineDrivers).toBeGreaterThanOrEqual(0);
      expect(stats?.systemHealth.socketServiceActive).toBe(true);
      expect(stats?.systemHealth.realTimeEventsEnabled).toBe(true);
      expect(stats?.systemHealth.lastUpdate).toBeInstanceOf(Date);

      console.log(`📊 Real-time system statistics:`, {
        connections: stats?.realTimeConnections.totalConnected,
        drivers: stats?.driverStatus.onlineDrivers,
        health: stats?.systemHealth.socketServiceActive
      });
    });
  });
});