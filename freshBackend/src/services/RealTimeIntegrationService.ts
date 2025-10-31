import { Service } from "@tsed/di";
import { Server as SocketIOServer } from "socket.io";
import { WebSocketService } from "./WebSocketService.js";
import { BookingService } from "./BookingService.js";
import { SmartDispatchService } from "./SmartDispatchService.js";
import { HospitalIntegrationService } from "./HospitalIntegrationService.js";
import { LocationService } from "./LocationService.js";
import { UserRole } from "../models/User.js";

/**
 * 📡 Real-time Integration Service
 * 
 * Manages Socket.io integration across all services and provides
 * real-time updates for booking status, driver locations, hospital capacity,
 * and emergency communications.
 */
@Service()
export class RealTimeIntegrationService {
  private isInitialized = false;

  private socketService?: WebSocketService;

  constructor(
    private bookingService: BookingService,
    private smartDispatchService: SmartDispatchService,
    private hospitalIntegrationService: HospitalIntegrationService,
    private locationService: LocationService,
    private webSocketService: WebSocketService
  ) {}

  /**
   * Initialize Socket.io server and wire up all real-time integrations
   */
  public initializeSocketIO(io: SocketIOServer): void {
    if (this.isInitialized) {
      console.warn("⚠️ Real-time integration already initialized");
      return;
    }

    // Create and initialize the socket service with the Socket.io server
    this.socketService = new SocketService();
    this.socketService.setSocketIOServer(io);

    // Wire up all services with socket integration
    this.wireUpServices();

    // Set up custom event handlers
    this.setupCustomEventHandlers();

    this.isInitialized = true;
    console.log("🚀 Real-time integration service initialized successfully");
  }

  /**
   * Wire up all services with Socket.io integration
   */
  private wireUpServices(): void {
    if (!this.socketService) {
      console.error("❌ Socket service not initialized");
      return;
    }

    // Inject socket service into all real-time enabled services
    this.bookingService.setSocketService(this.socketService);
    this.smartDispatchService.setSocketService(this.socketService);
    this.hospitalIntegrationService.setSocketService(this.socketService);

    console.log("✅ Socket service wired to all real-time enabled services");
  }

  /**
   * Helper method to check if socket service is available
   */
  private isSocketServiceAvailable(): boolean {
    return this.isInitialized && !!this.socketService;
  }  /**
   * Set up custom real-time event handlers
   */
  private setupCustomEventHandlers(): void {
    // Set up periodic location broadcasts for active drivers
    this.startDriverLocationBroadcasts();

    // Set up hospital capacity monitoring
    this.startHospitalCapacityMonitoring();

    // Set up emergency alert system
    this.setupEmergencyAlertSystem();

    console.log("📡 Custom real-time event handlers configured");
  }

  /**
   * 🚑 Start broadcasting driver locations in real-time
   */
  private startDriverLocationBroadcasts(): void {
    setInterval(() => {
      const activeDrivers = this.socketService.getOnlineDrivers();
      const driverLocations = this.socketService.getAllDriverLocations();

      if (driverLocations.length > 0) {
        // Broadcast to emergency executives
        this.socketService.broadcastToEmergencyExecutives('drivers:location_update', {
          drivers: driverLocations.map(driver => ({
            driverId: driver.driverId,
            location: driver.location,
            status: driver.status,
            speed: driver.speed,
            heading: driver.heading,
            lastUpdated: new Date()
          })),
          timestamp: new Date(),
          totalActiveDrivers: activeDrivers.length
        });

        // Update analytics
        this.socketService.broadcastToEmergencyExecutives('analytics:driver_coverage', {
          totalActiveDrivers: activeDrivers.length,
          totalDriversWithLocation: driverLocations.length,
          coveragePercentage: ((activeDrivers.length / driverLocations.length) * 100).toFixed(1),
          timestamp: new Date()
        });
      }
    }, 10000); // Every 10 seconds

    console.log("🚑 Driver location broadcasts started (10s intervals)");
  }

  /**
   * 🏥 Start monitoring hospital capacity changes
   */
  private startHospitalCapacityMonitoring(): void {
    // Simulate periodic hospital capacity updates
    setInterval(async () => {
      // Get current hospital analytics
      const analytics = await this.hospitalIntegrationService.getCapacityAnalytics();
      
      // Broadcast capacity analytics
      this.socketService.broadcastToEmergencyExecutives('analytics:hospital_capacity', {
        ...analytics,
        timestamp: new Date(),
        message: "Hospital capacity analytics updated"
      });

      // Check for critical capacity situations
      const criticalAlerts = analytics.capacityAlerts.filter(alert => alert.severity === 'critical');
      if (criticalAlerts.length > 0) {
        this.socketService.broadcastToEmergencyExecutives('hospital:critical_capacity_alert', {
          criticalAlerts: criticalAlerts,
          message: `${criticalAlerts.length} hospitals have critical capacity issues`,
          timestamp: new Date(),
          alertLevel: 'HIGH'
        });
      }
    }, 30000); // Every 30 seconds

    console.log("🏥 Hospital capacity monitoring started (30s intervals)");
  }

  /**
   * 🚨 Set up emergency alert system
   */
  private setupEmergencyAlertSystem(): void {
    // This would integrate with external emergency systems
    // For now, we'll simulate emergency escalation scenarios

    setInterval(() => {
      // Check for bookings that might need escalation
      // This would query the database in a real system
      const currentTime = Date.now();
      
      // Simulate checking for delayed responses
      this.checkForDelayedResponses(currentTime);
      
    }, 60000); // Every minute

    console.log("🚨 Emergency alert system configured");
  }

  /**
   * Check for bookings that need emergency escalation
   */
  private checkForDelayedResponses(currentTime: number): void {
    // In a real system, this would query the database for:
    // - CRITICAL bookings without driver assignment after 2 minutes
    // - HIGH priority bookings without driver assignment after 5 minutes
    // - Any booking without driver acceptance after 10 minutes

    // For demo purposes, we'll simulate escalation alerts
    const simulateEscalation = Math.random() < 0.1; // 10% chance
    
    if (simulateEscalation) {
      this.socketService.broadcastToEmergencyExecutives('emergency:escalation_alert', {
        bookingId: `critical-${Date.now()}`,
        reason: 'No driver response for CRITICAL booking',
        elapsedTime: '3 minutes',
        location: { latitude: 28.6139, longitude: 77.2090 },
        patientCondition: 'Cardiac emergency',
        suggestedActions: [
          'Manual driver assignment',
          'Contact nearest hospital directly',
          'Escalate to emergency services'
        ],
        timestamp: new Date(),
        priority: 'CRITICAL'
      });

      console.log("🚨 Emergency escalation alert simulated");
    }
  }

  /**
   * 📊 Get real-time system statistics
   */
  public getSystemStats() {
    if (!this.isInitialized) {
      return null;
    }

    const connectedUsers = this.socketService.getConnectedUsers();
    const onlineDrivers = this.socketService.getOnlineDrivers();
    const driverLocations = this.socketService.getAllDriverLocations();

    return {
      realTimeConnections: {
        totalConnected: connectedUsers.length,
        users: connectedUsers.filter(u => u.role === UserRole.USER).length,
        drivers: connectedUsers.filter(u => u.role === UserRole.DRIVER).length,
        hospitals: connectedUsers.filter(u => u.role === UserRole.HOSPITAL).length,
        executives: connectedUsers.filter(u => u.role === UserRole.EMERGENCY_EXECUTIVE).length
      },
      driverStatus: {
        onlineDrivers: onlineDrivers.length,
        driversWithLocation: driverLocations.length,
        averageResponseRate: ((onlineDrivers.length / Math.max(driverLocations.length, 1)) * 100).toFixed(1)
      },
      systemHealth: {
        socketServiceActive: !!this.socketService,
        realTimeEventsEnabled: this.isInitialized,
        lastUpdate: new Date()
      }
    };
  }

  /**
   * 🔔 Manually trigger emergency broadcast (for testing)
   */
  public triggerEmergencyBroadcast(data: any): void {
    if (this.socketService) {
      this.socketService.broadcastToEmergencyExecutives('emergency:manual_alert', {
        ...data,
        triggeredBy: 'system',
        timestamp: new Date()
      });
      console.log("📢 Manual emergency broadcast triggered");
    }
  }

  /**
   * 📈 Send custom analytics update
   */
  public broadcastAnalyticsUpdate(analyticsData: any): void {
    if (this.socketService) {
      this.socketService.broadcastToEmergencyExecutives('analytics:custom_update', {
        data: analyticsData,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get Socket service instance (for external access if needed)
   */
  public getSocketService(): SocketService | null {
    return this.isInitialized ? this.socketService : null;
  }
}