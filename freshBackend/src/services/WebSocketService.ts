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

  public updateDriverLocation(update: DriverLocationUpdate): void {
    this.driverLocations.set(update.driverId, update);
    
    // Broadcast location update
    if (this.io) {
      this.io.emit('driver:location_updated', update);
    }
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

  public broadcastHospitalCapacityUpdate(data: { hospitalId: string; availableBeds: number }): void {
    if (this.emergencyNamespace) {
      this.emergencyNamespace.emit('hospital:capacity_updated', data);
    }
    
    if (this.driverNamespace) {
      this.driverNamespace.emit('hospital:capacity_updated', data);
    }
  }
}