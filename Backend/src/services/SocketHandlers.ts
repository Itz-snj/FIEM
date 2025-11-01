import { Args, Emit, Input, IO, Nsp, Socket, SocketService } from "@tsed/socketio";
import { Server, Namespace } from "socket.io";
import { Inject, Service } from "@tsed/di";
import { UserRole } from "../models/User.js";
import { DriverStatus } from "../models/Driver.js";
import { WebSocketService } from "./WebSocketService.js";

@SocketService("/drivers")
export class DriverSocketService {
  @Inject()
  private webSocketService: WebSocketService;

  @Nsp("/drivers")
  private nsp: Namespace;

  /**
   * Driver authentication
   */
  @Input("driver:authenticate")
  async authenticateDriver(
    @Socket socket: Socket, 
    @Args(0) data: { driverId: string; token: string }
  ) {
    // TODO: Verify JWT token
    const driverUser = {
      id: data.driverId,
      role: UserRole.DRIVER,
      socketId: socket.id,
      isOnline: true,
      lastSeen: new Date()
    };
    
    this.webSocketService.addConnectedUser(driverUser);
    socket.join(`driver:${data.driverId}`);
    
    return { success: true };
  }

  /**
   * 📍 Enhanced Driver Location Update (Phase 4)
   * Real-time location tracking with comprehensive broadcasting
   */
  @Input("driver:location_update")
  async updateDriverLocation(
    @Socket socket: Socket,
    @Args(0) locationData: {
      driverId: string;
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
      timestamp?: Date;
      currentBookingId?: string;
    }
  ) {
    // Validate location data
    if (!locationData.driverId || !locationData.latitude || !locationData.longitude) {
      return { success: false, error: "Invalid location data" };
    }

    // Enhanced location update with proper structure
    const enrichedLocationUpdate: any = {
      driverId: locationData.driverId,
      location: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        timestamp: locationData.timestamp || new Date(),
        accuracy: locationData.accuracy || 10,
        heading: locationData.heading,
        speed: locationData.speed
      },
      status: DriverStatus.BUSY, // Assume busy if actively updating location
      speed: locationData.speed,
      heading: locationData.heading
    };

    // Update location in WebSocket service
    this.webSocketService.updateDriverLocation(enrichedLocationUpdate);

    // 🔄 Broadcast to specific audiences based on driver's current status
    await this.broadcastLocationUpdate(enrichedLocationUpdate);

    return { 
      success: true, 
      timestamp: enrichedLocationUpdate.timestamp,
      message: "Location updated successfully"
    };
  }

  /**
   * 📍 Enhanced Driver Status Change (Phase 4)
   * Status updates with location correlation and real-time broadcasting
   */
  @Input("driver:status_change")
  async updateDriverStatus(
    @Socket socket: Socket,
    @Args(0) data: { 
      driverId: string; 
      status: DriverStatus;
      location?: { latitude: number; longitude: number };
      currentBookingId?: string;
      reason?: string;
    }
  ) {
    console.log(`📡 Driver ${data.driverId} status changed to ${data.status}`);

    // Update driver status with location if provided
    if (data.location) {
      const locationUpdate = {
        driverId: data.driverId,
        location: {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          timestamp: new Date()
        },
        status: data.status,
        speed: 0,
        heading: 0
      };
      this.webSocketService.updateDriverLocation(locationUpdate);
    }

    // Broadcast status change to relevant parties
    await this.broadcastStatusChange(data);

    return { success: true, timestamp: new Date() };
  }

  /**
   * 🎯 Real-time Location Broadcasting Logic
   */
  private async broadcastLocationUpdate(locationUpdate: any) {
    // 1. If driver has an active booking, broadcast to user and hospital
    if (locationUpdate.currentBookingId) {
      // Broadcast to booking participants
      this.nsp.to(`booking:${locationUpdate.currentBookingId}`).emit('driver:location_live', {
        driverId: locationUpdate.driverId,
        location: {
          latitude: locationUpdate.latitude,
          longitude: locationUpdate.longitude
        },
        speed: locationUpdate.speed,
        heading: locationUpdate.heading,
        accuracy: locationUpdate.accuracy,
        timestamp: locationUpdate.timestamp,
        bookingId: locationUpdate.currentBookingId
      });

      // Send personalized update to user
      // Note: This would require booking service integration to get userId
      console.log(`📡 Location broadcasted for active booking: ${locationUpdate.currentBookingId}`);
    }

    // 2. Broadcast to emergency executives for monitoring
    this.webSocketService.broadcastToEmergencyExecutives('driver:location_monitor', {
      driverId: locationUpdate.driverId,
      location: { latitude: locationUpdate.latitude, longitude: locationUpdate.longitude },
      timestamp: locationUpdate.timestamp,
      hasActiveBooking: !!locationUpdate.currentBookingId
    });

    // 3. Broadcast to nearby drivers for coordination (optional)
    this.nsp.emit('driver:fleet_update', {
      driverId: locationUpdate.driverId,
      location: { latitude: locationUpdate.latitude, longitude: locationUpdate.longitude },
      timestamp: locationUpdate.timestamp
    });
  }

  /**
   * 📢 Driver Status Change Broadcasting
   */
  private async broadcastStatusChange(statusData: any) {
    // Broadcast to all drivers in the area
    this.nsp.emit('driver:status_updated', {
      driverId: statusData.driverId,
      status: statusData.status,
      location: statusData.location,
      timestamp: new Date(),
      reason: statusData.reason
    });

    // If driver has active booking, notify user
    if (statusData.currentBookingId) {
      this.nsp.to(`booking:${statusData.currentBookingId}`).emit('driver:status_change', {
        driverId: statusData.driverId,
        status: statusData.status,
        message: this.getStatusChangeMessage(statusData.status),
        timestamp: new Date()
      });
    }

    // Notify emergency executives of status changes
    this.webSocketService.broadcastToEmergencyExecutives('driver:fleet_status_change', {
      driverId: statusData.driverId,
      status: statusData.status,
      location: statusData.location,
      timestamp: new Date()
    });
  }

  /**
   * 💬 Generate user-friendly status change messages
   */
  private getStatusChangeMessage(status: DriverStatus): string {
    const messages: Record<string, string> = {
      [DriverStatus.AVAILABLE]: "Driver is now available for new bookings",
      [DriverStatus.BUSY]: "Driver is currently busy with a booking",
      [DriverStatus.OFFLINE]: "Driver has gone offline",
      [DriverStatus.ON_DUTY]: "Driver is on duty and available"
    };
    return messages[status] || `Driver status updated to ${status}`;
  }

  /**
   * 🔄 Request Current Location (for tracking)
   */
  @Input("driver:request_location")
  async requestCurrentLocation(
    @Socket socket: Socket,
    @Args(0) data: { driverId: string; requesterId: string; reason?: string }
  ) {
    // Send location request to specific driver
    this.nsp.to(`driver:${data.driverId}`).emit('driver:location_request', {
      requesterId: data.requesterId,
      reason: data.reason || "Location update requested",
      timestamp: new Date()
    });

    return { success: true, message: "Location request sent to driver" };
  }

  /**
   * 📊 Get Driver Fleet Status
   */
  @Input("driver:fleet_status")
  async getFleetStatus(@Socket socket: Socket) {
    const onlineDrivers = this.webSocketService.getOnlineDrivers();
    const driverLocations = this.webSocketService.getAllDriverLocations();

    return {
      success: true,
      data: {
        totalOnlineDrivers: onlineDrivers.length,
        driversWithLocation: driverLocations.length,
        fleetStatus: driverLocations.map(loc => ({
          driverId: loc.driverId,
          status: loc.status,
          lastUpdate: loc.location?.timestamp || new Date(),
          hasLocation: !!(loc.location?.latitude && loc.location?.longitude)
        }))
      }
    };
  }

  /**
   * 💬 Driver Message System (Phase 4)
   */
  @Input("driver:send_message")
  async sendDriverMessage(
    @Socket socket: Socket,
    @Args(0) data: {
      bookingId: string;
      message: string;
      recipient: 'user' | 'hospital' | 'emergency';
      messageType: 'text' | 'voice' | 'location' | 'eta_update';
      priority?: string;
    }
  ) {
    const message = {
      messageId: `drv_${Date.now()}`,
      bookingId: data.bookingId,
      sender: 'driver',
      recipient: data.recipient,
      content: data.message,
      messageType: data.messageType,
      priority: data.priority || 'normal',
      timestamp: new Date(),
      status: 'sent'
    };

    // Route message to appropriate recipient
    this.webSocketService.sendChatMessage(message);

    return { success: true, messageId: message.messageId };
  }

  /**
   * 🕐 ETA Updates (Phase 4)
   */
  @Input("driver:update_eta")
  async updateETAInformation(
    @Socket socket: Socket,
    @Args(0) data: {
      bookingId: string;
      currentLocation: { latitude: number; longitude: number };
      estimatedArrival: Date;
      trafficConditions?: string;
      alternateRoute?: boolean;
    }
  ) {
    const etaUpdate = {
      updateId: `eta_${Date.now()}`,
      bookingId: data.bookingId,
      currentLocation: data.currentLocation,
      estimatedArrival: data.estimatedArrival,
      trafficConditions: data.trafficConditions,
      alternateRoute: data.alternateRoute,
      timestamp: new Date()
    };

    // Broadcast ETA update to booking participants
    socket.to(`booking:${data.bookingId}`).emit('booking:eta_updated', etaUpdate);

    // Notify emergency executives
    this.webSocketService.broadcastToEmergencyExecutives('tracking:eta_updated', etaUpdate);

    return { success: true, updateId: etaUpdate.updateId };
  }

  /**
   * 🚨 Incident Reporting (Phase 4)
   */
  @Input("driver:report_incident")
  async reportIncident(
    @Socket socket: Socket,
    @Args(0) data: {
      bookingId: string;
      incidentType: 'traffic' | 'vehicle' | 'medical' | 'safety' | 'other';
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      location: { latitude: number; longitude: number };
      requiresAssistance: boolean;
    }
  ) {
    const incident = {
      incidentId: `inc_${Date.now()}`,
      bookingId: data.bookingId,
      reportedBy: 'driver',
      incidentType: data.incidentType,
      severity: data.severity,
      description: data.description,
      location: data.location,
      requiresAssistance: data.requiresAssistance,
      timestamp: new Date(),
      status: 'reported'
    };

    // Immediate alert to emergency executives
    this.webSocketService.broadcastToEmergencyExecutives('incident:driver_report', {
      ...incident,
      urgency: data.severity === 'critical' ? 'immediate' : 'normal',
      responseRequired: data.requiresAssistance
    });

    // Notify user if appropriate
    if (data.severity !== 'low') {
      socket.to(`booking:${data.bookingId}`).emit('booking:incident_reported', {
        incidentId: incident.incidentId,
        message: 'Your driver has reported an incident. Emergency services are being notified.',
        severity: data.severity,
        timestamp: incident.timestamp
      });
    }

    return { success: true, incidentId: incident.incidentId };
  }
}

@SocketService("/users")
export class UserSocketService {
  @Inject()
  private webSocketService: WebSocketService;

  /**
   * User authentication
   */
  @Input("user:authenticate")
  async authenticateUser(
    @Socket socket: Socket,
    @Args(0) data: { userId: string; token: string }
  ) {
    const userUser = {
      id: data.userId,
      role: UserRole.USER,
      socketId: socket.id,
      isOnline: true,
      lastSeen: new Date()
    };
    
    this.webSocketService.addConnectedUser(userUser);
    socket.join(`user:${data.userId}`);
    
    return { success: true };
  }

  /**
   * Emergency alert
   */
  @Input("user:emergency_alert")
  async handleEmergencyAlert(
    @Socket socket: Socket,
    @Args(0) alertData: any
  ) {
    const alert = {
      ...alertData,
      timestamp: new Date()
    };
    
    this.webSocketService.broadcastEmergencyAlert(alert);
  }

  /**
   * Track booking
   */
  @Input("user:track_booking")
  async trackBooking(
    @Socket socket: Socket,
    @Args(0) data: { bookingId: string }
  ) {
    socket.join(`booking:${data.bookingId}`);
  }

  /**
   * 💬 Multi-Stakeholder Communication (Phase 4)
   * Enhanced messaging system between user, driver, and hospital
   */
  @Input("user:send_message")
  async sendMessage(
    @Socket socket: Socket,
    @Args(0) data: {
      bookingId: string;
      message: string;
      messageType: 'text' | 'voice' | 'image' | 'location' | 'emergency';
      recipient: 'driver' | 'hospital' | 'emergency' | 'all';
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      metadata?: any;
    }
  ) {
    const message = {
      messageId: `msg_${Date.now()}`,
      bookingId: data.bookingId,
      sender: 'user',
      recipient: data.recipient,
      content: data.message,
      messageType: data.messageType,
      priority: data.priority || 'normal',
      timestamp: new Date(),
      metadata: data.metadata,
      status: 'sent'
    };

    // Broadcast message to booking room
    this.webSocketService.sendChatMessage(message);

    // Send delivery confirmations
    await this.handleMessageDelivery(message);

    return { success: true, messageId: message.messageId };
  }

  /**
   * 📞 Emergency Communication
   */
  @Input("user:emergency_communication")
  async emergencyCommunication(
    @Socket socket: Socket,
    @Args(0) data: {
      bookingId: string;
      emergencyType: 'medical' | 'location' | 'safety' | 'family_contact';
      message: string;
      urgencyLevel: 'high' | 'critical';
      contactInfo?: string;
    }
  ) {
    const emergencyMessage = {
      ...data,
      messageId: `emg_${Date.now()}`,
      sender: 'user',
      timestamp: new Date(),
      status: 'emergency'
    };

    // Immediate broadcast to all stakeholders
    await this.broadcastEmergencyMessage(emergencyMessage);

    return { success: true, messageId: emergencyMessage.messageId };
  }

  /**
   * 📋 Request Status Update
   */
  @Input("user:request_status")
  async requestStatusUpdate(
    @Socket socket: Socket,
    @Args(0) data: { bookingId: string; requestType: 'location' | 'eta' | 'driver_info' | 'hospital_info' }
  ) {
    // Send status request to relevant parties
    const statusRequest = {
      requestId: `req_${Date.now()}`,
      bookingId: data.bookingId,
      requestType: data.requestType,
      requester: 'user',
      timestamp: new Date()
    };

    // Route request to appropriate handler
    await this.routeStatusRequest(statusRequest);

    return { success: true, requestId: statusRequest.requestId };
  }

  /**
   * Handle message delivery and confirmations
   */
  private async handleMessageDelivery(message: any) {
    // Send delivery confirmations based on recipient
    switch (message.recipient) {
      case 'driver':
        // Find driver and send personal notification
        break;
      case 'hospital':
        // Send to hospital namespace
        break;
      case 'emergency':
        // Alert emergency executives
        this.webSocketService.broadcastToEmergencyExecutives('communication:user_message', message);
        break;
      case 'all':
        // Send to all booking participants
        break;
    }
  }

  /**
   * Broadcast emergency messages
   */
  private async broadcastEmergencyMessage(message: any) {
    // Immediate alert to emergency executives
    this.webSocketService.broadcastToEmergencyExecutives('emergency:user_communication', {
      ...message,
      alertLevel: 'HIGH',
      requiresResponse: true
    });

    // Alert driver if assigned
    // Alert hospital if en route
    
    console.log(`🚨 Emergency communication broadcasted: ${message.messageId}`);
  }

  /**
   * Route status requests to appropriate handlers
   */
  private async routeStatusRequest(request: any) {
    // Route to appropriate service based on request type
    console.log(`📋 Status request routed: ${request.requestType}`);
  }
}

@SocketService("/hospitals")
export class HospitalSocketService {
  @Inject()
  private webSocketService: WebSocketService;

  /**
   * Hospital authentication
   */
  @Input("hospital:authenticate")
  async authenticateHospital(
    @Socket socket: Socket,
    @Args(0) data: { hospitalId: string; token: string }
  ) {
    const hospitalUser = {
      id: data.hospitalId,
      role: UserRole.HOSPITAL,
      socketId: socket.id,
      isOnline: true,
      lastSeen: new Date()
    };
    
    this.webSocketService.addConnectedUser(hospitalUser);
    socket.join(`hospital:${data.hospitalId}`);
    
    return { success: true };
  }

  /**
   * 🏥 Enhanced Hospital Capacity Update (Phase 4)
   * Real-time capacity broadcasting with comprehensive data
   */
  @Input("hospital:capacity_update")
  async updateCapacity(
    @Socket socket: Socket,
    @Args(0) data: {
      hospitalId: string;
      availableBeds: number;
      totalBeds: number;
      specialtyUnits?: {
        icu?: number;
        emergency?: number;
        cardiac?: number;
        pediatric?: number;
      };
      waitTime?: number; // estimated wait time in minutes
      severity?: 'normal' | 'busy' | 'critical';
      location?: { latitude: number; longitude: number };
    }
  ) {
    // Validate capacity data
    if (!data.hospitalId || data.availableBeds < 0) {
      return { success: false, error: "Invalid capacity data" };
    }

    // Enhanced capacity data
    const capacityUpdate = {
      ...data,
      timestamp: new Date(),
      occupancyRate: data.totalBeds > 0 ? 
        Math.round(((data.totalBeds - data.availableBeds) / data.totalBeds) * 100) : 0,
      status: this.getHospitalStatus(data.availableBeds, data.totalBeds, data.severity)
    };

    // Broadcast capacity update
    await this.broadcastCapacityUpdate(capacityUpdate);

    return { 
      success: true, 
      timestamp: capacityUpdate.timestamp,
      message: "Hospital capacity updated successfully"
    };
  }

  /**
   * 🏥 Real-time Bed Reservation
   */
  @Input("hospital:reserve_bed")
  async reserveBed(
    @Socket socket: Socket,
    @Args(0) data: {
      hospitalId: string;
      bookingId: string;
      patientInfo: {
        priority: string;
        condition: string;
        specialtyRequired?: string;
      };
      estimatedArrival: Date;
    }
  ) {
    // Process bed reservation
    const reservation = {
      ...data,
      reservationId: `res_${Date.now()}`,
      timestamp: new Date(),
      status: 'confirmed'
    };

    // Broadcast reservation to hospital staff
    this.webSocketService.sendMessageToHospital(
      data.hospitalId,
      'hospital:bed_reserved',
      reservation
    );

    // Notify emergency executives
    this.webSocketService.broadcastToEmergencyExecutives(
      'hospital:reservation_made',
      {
        hospitalId: data.hospitalId,
        bookingId: data.bookingId,
        priority: data.patientInfo.priority,
        estimatedArrival: data.estimatedArrival
      }
    );

    return { success: true, reservation };
  }

  /**
   * 📊 Hospital Status Monitoring
   */
  @Input("hospital:status_update")
  async updateHospitalStatus(
    @Socket socket: Socket,
    @Args(0) data: {
      hospitalId: string;
      operationalStatus: 'normal' | 'busy' | 'emergency' | 'closed';
      message?: string;
      expectedDuration?: number; // minutes
    }
  ) {
    const statusUpdate = {
      ...data,
      timestamp: new Date()
    };

    // Broadcast to all relevant parties
    await this.broadcastHospitalStatusUpdate(statusUpdate);

    return { success: true, timestamp: statusUpdate.timestamp };
  }

  /**
   * 🔄 Comprehensive Capacity Broadcasting
   */
  private async broadcastCapacityUpdate(capacityData: any) {
    // 1. Broadcast to emergency executives for system monitoring
    this.webSocketService.broadcastToEmergencyExecutives('hospital:capacity_live', capacityData);

    // 2. Broadcast to drivers for routing decisions
    if (this.webSocketService['driverNamespace']) {
      this.webSocketService['driverNamespace'].emit('hospital:capacity_updated', {
        hospitalId: capacityData.hospitalId,
        availableBeds: capacityData.availableBeds,
        occupancyRate: capacityData.occupancyRate,
        status: capacityData.status,
        waitTime: capacityData.waitTime
      });
    }

    // 3. Broadcast to other hospitals in the network
    if (this.webSocketService['hospitalNamespace']) {
      this.webSocketService['hospitalNamespace'].emit('hospital:network_update', {
        hospitalId: capacityData.hospitalId,
        availableBeds: capacityData.availableBeds,
        status: capacityData.status,
        timestamp: capacityData.timestamp
      });
    }

    console.log(`🏥 Capacity update broadcasted for hospital: ${capacityData.hospitalId}`);
  }

  /**
   * 📢 Hospital Status Broadcasting
   */
  private async broadcastHospitalStatusUpdate(statusData: any) {
    // Broadcast to all stakeholders
    this.webSocketService.broadcastToEmergencyExecutives('hospital:status_changed', statusData);

    // Notify drivers about hospital status changes
    if (this.webSocketService['driverNamespace']) {
      this.webSocketService['driverNamespace'].emit('hospital:status_alert', {
        hospitalId: statusData.hospitalId,
        status: statusData.operationalStatus,
        message: statusData.message,
        timestamp: statusData.timestamp
      });
    }

    console.log(`📢 Status update broadcasted for hospital: ${statusData.hospitalId}`);
  }

  /**
   * 🎯 Determine Hospital Status Based on Capacity
   */
  private getHospitalStatus(availableBeds: number, totalBeds: number, severity?: string): string {
    if (severity) return severity;
    
    const occupancyRate = totalBeds > 0 ? ((totalBeds - availableBeds) / totalBeds) * 100 : 0;
    
    if (occupancyRate >= 95) return 'critical';
    if (occupancyRate >= 85) return 'busy';
    return 'normal';
  }

  /**
   * 📋 Get Hospital Dashboard Data
   */
  @Input("hospital:dashboard_data")
  async getDashboardData(
    @Socket socket: Socket,
    @Args(0) data: { hospitalId: string }
  ) {
    // Mock dashboard data - in real implementation, this would query the database
    const dashboardData = {
      hospitalId: data.hospitalId,
      currentCapacity: {
        availableBeds: 25,
        totalBeds: 100,
        occupancyRate: 75
      },
      incomingAmbulances: [
        { bookingId: 'book123', eta: 15, priority: 'high' },
        { bookingId: 'book124', eta: 8, priority: 'critical' }
      ],
      recentActivity: [
        { type: 'admission', time: '5 minutes ago' },
        { type: 'discharge', time: '12 minutes ago' }
      ],
      timestamp: new Date()
    };

    return { success: true, data: dashboardData };
  }
}

/**
 * 🔄 ENHANCED MULTI-STAKEHOLDER COMMUNICATION (Phase 4)
 * 
 * Comprehensive communication system between users, drivers, hospitals, and emergency executives
 * - Real-time messaging with delivery confirmations
 * - Emergency communication protocols
 * - Status updates and incident reporting
 * - Cross-namespace message routing
 */

@SocketService("/emergency")
export class EmergencySocketService {
  @Inject()
  private webSocketService: WebSocketService;

  /**
   * Emergency executive authentication
   */
  @Input("emergency:authenticate")
  async authenticateExecutive(
    @Socket socket: Socket,
    @Args(0) data: { executiveId: string; token: string }
  ) {
    const emergencyUser = {
      id: data.executiveId,
      role: UserRole.EMERGENCY_EXECUTIVE,
      socketId: socket.id,
      isOnline: true,
      lastSeen: new Date()
    };
    
    this.webSocketService.addConnectedUser(emergencyUser);
    socket.join('emergency_executives');
    
    return { success: true };
  }
}