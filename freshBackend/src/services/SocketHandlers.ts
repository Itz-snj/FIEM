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
   * Driver location update
   */
  @Input("driver:location_update")
  async updateDriverLocation(
    @Socket socket: Socket,
    @Args(0) locationData: any
  ) {
    this.webSocketService.updateDriverLocation(locationData);
  }

  /**
   * Driver status change
   */
  @Input("driver:status_change")
  async updateDriverStatus(
    @Socket socket: Socket,
    @Args(0) data: { driverId: string; status: DriverStatus }
  ) {
    console.log(`Driver ${data.driverId} status changed to ${data.status}`);
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
   * Hospital capacity update
   */
  @Input("hospital:capacity_update")
  async updateCapacity(
    @Socket socket: Socket,
    @Args(0) data: { hospitalId: string; availableBeds: number }
  ) {
    this.webSocketService.broadcastHospitalCapacityUpdate(data);
  }
}

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