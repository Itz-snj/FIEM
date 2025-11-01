import { Service } from "@tsed/di";
import { IO, Nsp } from "@tsed/socketio";
import { Server } from "socket.io";
import { UserRole } from "../models/User.js";
import { DriverStatus } from "../models/Driver.js";
import { BookingStatus } from "../models/Booking.js";
import { LocationPoint } from "../utils/LocationUtils.js";

export interface SocketUser {
  id: string;
  role: UserRole;
  socketId: string;
  isOnline: boolean;
  lastSeen: Date;
}

export interface DriverLocationUpdate {
  driverId: string;
  location: LocationPoint;
  status: DriverStatus;
  speed?: number;
  heading?: number;
}

export interface BookingUpdate {
  bookingId: string;
  status: BookingStatus;
  location?: LocationPoint;
  estimatedArrival?: Date;
  message?: string;
}

@Service()
export class WebSocketService {

  @IO()
  private io: Server;

  @Nsp("/drivers")
  private driverNamespace: any;

  @Nsp("/users") 
  private userNamespace: any;

  @Nsp("/hospitals")
  private hospitalNamespace: any;

  @Nsp("/emergency")
  private emergencyNamespace: any;

  private connectedUsers: Map<string, SocketUser> = new Map();
  private driverLocations: Map<string, DriverLocationUpdate> = new Map();

  // Public methods for external use
  public sendMessageToUser(userId: string, event: string, data: any): boolean {
    const user = this.connectedUsers.get(userId);
    if (user && user.isOnline && this.io) {
      this.io.to(user.socketId).emit(event, data);
      return true;
    }
    return false;
  }

  public sendMessageToDriver(driverId: string, event: string, data: any): void {
    if (this.driverNamespace) {
      this.driverNamespace.to(`driver:${driverId}`).emit(event, data);
    }
  }

  public sendMessageToHospital(hospitalId: string, event: string, data: any): void {
    if (this.hospitalNamespace) {
      this.hospitalNamespace.to(`hospital:${hospitalId}`).emit(event, data);
    }
  }

  public broadcastToEmergencyExecutives(event: string, data: any): void {
    if (this.emergencyNamespace) {
      this.emergencyNamespace.emit(event, data);
    }
  }

  public getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  public getOnlineDrivers(): SocketUser[] {
    return Array.from(this.connectedUsers.values())
      .filter(user => user.role === UserRole.DRIVER && user.isOnline);
  }

  public getDriverLocation(driverId: string): DriverLocationUpdate | undefined {
    return this.driverLocations.get(driverId);
  }

  public getAllDriverLocations(): DriverLocationUpdate[] {
    return Array.from(this.driverLocations.values());
  }

  public sendChatMessage(message: any): void {
    if (this.io) {
      this.io.to(`booking:${message.bookingId}`).emit('chat:message', message);
    }
  }

  public joinBookingRoom(socketId: string, bookingId: string): void {
    if (this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`booking:${bookingId}`);
      }
    }
  }

  public leaveBookingRoom(socketId: string, bookingId: string): void {
    if (this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(`booking:${bookingId}`);
      }
    }
  }

  // Helper methods for connection management
  public addConnectedUser(user: SocketUser): void {
    this.connectedUsers.set(user.id, user);
  }

  public removeConnectedUser(userId: string): void {
    this.connectedUsers.delete(userId);
  }

  /**
   * 📍 Enhanced Driver Location Update (Phase 4)
   * Updates and broadcasts driver location with intelligent routing
   */
  public updateDriverLocation(update: DriverLocationUpdate): void {
    // Store location update
    this.driverLocations.set(update.driverId, update);
    
    // 🔄 Comprehensive location broadcasting
    this.broadcastLocationUpdate(update);
  }

  /**
   * 📡 Intelligent Location Broadcasting
   * Broadcasts location updates to relevant audiences only
   */
  private broadcastLocationUpdate(update: DriverLocationUpdate): void {
    if (!this.io) return;

    // 1. Broadcast to driver namespace (other drivers, dispatchers)
    if (this.driverNamespace) {
      this.driverNamespace.emit('driver:location_updated', {
        driverId: update.driverId,
        location: update.location,
        status: update.status,
        timestamp: update.location.timestamp || new Date()
      });
    }

    // 2. Broadcast to emergency executives for fleet monitoring
    if (this.emergencyNamespace) {
      this.emergencyNamespace.emit('fleet:location_update', {
        driverId: update.driverId,
        location: update.location,
        status: update.status,
        speed: update.speed,
        heading: update.heading
      });
    }

    // 3. General location update (for tracking purposes)
    this.io.emit('driver:location_live', {
      driverId: update.driverId,
      latitude: update.location.latitude,
      longitude: update.location.longitude,
      timestamp: update.location.timestamp || new Date()
    });

    console.log(`📍 Location update broadcasted for driver: ${update.driverId}`);
  }

  public broadcastEmergencyAlert(alert: any): void {
    // Send to emergency executives
    if (this.emergencyNamespace) {
      this.emergencyNamespace.emit('emergency:alert', alert);
    }
    
    // Send to nearby drivers
    if (this.driverNamespace) {
      this.driverNamespace.emit('emergency:nearby_alert', alert);
    }
    
    console.log(`Emergency alert broadcasted: ${alert.bookingId}`);
  }

  /**
   * 🏥 Enhanced Hospital Capacity Broadcasting (Phase 4)
   * Intelligent capacity updates with audience-specific data
   */
  public broadcastHospitalCapacityUpdate(data: { 
    hospitalId: string; 
    availableBeds: number;
    totalBeds?: number;
    occupancyRate?: number;
    status?: string;
    waitTime?: number;
    specialtyUnits?: any;
    timestamp?: Date;
  }): void {
    const enhancedData = {
      ...data,
      timestamp: data.timestamp || new Date(),
      broadcastId: `cap_${Date.now()}`
    };

    // 🚨 Broadcast to emergency executives with full details
    if (this.emergencyNamespace) {
      this.emergencyNamespace.emit('hospital:capacity_critical_update', {
        ...enhancedData,
        urgencyLevel: this.calculateUrgencyLevel(data.availableBeds, data.totalBeds),
        recommendedAction: this.getRecommendedAction(data.status)
      });
    }
    
    // 🚑 Broadcast to drivers with route-relevant info
    if (this.driverNamespace) {
      this.driverNamespace.emit('hospital:routing_update', {
        hospitalId: data.hospitalId,
        availableBeds: data.availableBeds,
        status: data.status,
        waitTime: data.waitTime,
        acceptingPatients: (data.availableBeds || 0) > 0,
        timestamp: enhancedData.timestamp
      });
    }

    // 🏥 Broadcast to other hospitals for network coordination
    if (this.hospitalNamespace) {
      this.hospitalNamespace.emit('hospital:network_capacity', {
        hospitalId: data.hospitalId,
        availableBeds: data.availableBeds,
        occupancyRate: data.occupancyRate,
        status: data.status,
        timestamp: enhancedData.timestamp
      });
    }

    // 👥 Broadcast to users with active bookings (general availability)
    if (this.userNamespace) {
      this.userNamespace.emit('hospital:availability_update', {
        hospitalId: data.hospitalId,
        isAvailable: (data.availableBeds || 0) > 0,
        status: data.status,
        estimatedWait: data.waitTime
      });
    }

    console.log(`🏥 Enhanced capacity update broadcasted for ${data.hospitalId}: ${data.availableBeds} beds available`);
  }

  /**
   * Calculate urgency level for emergency executives
   */
  private calculateUrgencyLevel(availableBeds: number, totalBeds?: number): 'low' | 'medium' | 'high' | 'critical' {
    if (!totalBeds || totalBeds === 0) return 'medium';
    
    const occupancyRate = ((totalBeds - availableBeds) / totalBeds) * 100;
    
    if (occupancyRate >= 98) return 'critical';
    if (occupancyRate >= 90) return 'high';
    if (occupancyRate >= 75) return 'medium';
    return 'low';
  }

  /**
   * Get recommended action based on hospital status
   */
  private getRecommendedAction(status?: string): string {
    const actions = {
      'critical': 'Consider diverting non-critical cases to other hospitals',
      'busy': 'Monitor closely and prepare backup plans',
      'normal': 'Normal operations - continue monitoring'
    };
    return actions[status as keyof typeof actions] || 'Continue standard protocols';
  }
}