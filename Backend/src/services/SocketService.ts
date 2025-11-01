/**
 * Socket.io integration for real-time communication in ambulance booking system
 */
import { Service } from "@tsed/di";
import { Namespace, Server as SocketIOServer, Socket } from "socket.io";
import { Coordinates, LocationPoint } from "../utils/LocationUtils.js";
import { UserRole } from "../models/User.js";
import { DriverStatus } from "../models/Driver.js";
import { BookingStatus } from "../models/Booking.js";

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

export interface EmergencyAlert {
  bookingId: string;
  userId: string;
  location: Coordinates;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: UserRole;
  message: string;
  timestamp: Date;
  messageType: 'text' | 'location' | 'image' | 'voice';
}

@Service()
export class SocketService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, SocketUser> = new Map();
  private driverLocations: Map<string, DriverLocationUpdate> = new Map();
  
  // Namespaces for different types of communications
  private driverNamespace: Namespace | null = null;
  private userNamespace: Namespace | null = null;
  private hospitalNamespace: Namespace | null = null;
  private emergencyNamespace: Namespace | null = null;

  constructor() {
    // Socket.io will be initialized later via setSocketIOServer method
  }

  /**
   * Initialize the Socket.io server (called from external setup)
   */
  public setSocketIOServer(io: SocketIOServer) {
    this.io = io;
    this.setupNamespaces();
    this.setupEventHandlers();
    console.log("Socket.io server initialized for SocketService");
  }

  private setupNamespaces() {
    if (!this.io) {
      console.warn("Socket.io server not initialized");
      return;
    }

    // Driver namespace for ambulance drivers
    this.driverNamespace = this.io.of('/drivers');
    this.driverNamespace.on('connection', (socket) => this.handleDriverConnection(socket));

    // User namespace for regular users
    this.userNamespace = this.io.of('/users');
    this.userNamespace.on('connection', (socket) => this.handleUserConnection(socket));

    // Hospital namespace for hospital staff
    this.hospitalNamespace = this.io.of('/hospitals');
    this.hospitalNamespace.on('connection', (socket) => this.handleHospitalConnection(socket));

    // Emergency namespace for emergency executives
    this.emergencyNamespace = this.io.of('/emergency');
    this.emergencyNamespace.on('connection', (socket) => this.handleEmergencyConnection(socket));
  }

  private setupEventHandlers() {
    if (!this.io) {
      console.warn("Socket.io server not initialized");
      return;
    }

    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        this.handleDisconnection(socket.id);
      });
    });
  }

  // Driver-specific connection handling
  private handleDriverConnection(socket: Socket) {
    console.log(`Driver connected: ${socket.id}`);

    socket.on('driver:authenticate', (data: { driverId: string; token: string }) => {
      // TODO: Verify JWT token
      const driverUser: SocketUser = {
        id: data.driverId,
        role: UserRole.DRIVER,
        socketId: socket.id,
        isOnline: true,
        lastSeen: new Date()
      };
      
      this.connectedUsers.set(data.driverId, driverUser);
      socket.join(`driver:${data.driverId}`);
      
      socket.emit('driver:authenticated', { success: true });
      console.log(`Driver authenticated: ${data.driverId}`);
    });

    socket.on('driver:location_update', (data: DriverLocationUpdate) => {
      this.handleDriverLocationUpdate(data);
    });

    socket.on('driver:status_change', (data: { driverId: string; status: DriverStatus }) => {
      this.handleDriverStatusChange(data.driverId, data.status);
    });

    socket.on('driver:booking_update', (data: BookingUpdate) => {
      this.handleBookingUpdate(data);
    });

    socket.on('disconnect', () => {
      this.handleDriverDisconnection(socket.id);
    });
  }

  // User-specific connection handling
  private handleUserConnection(socket: Socket) {
    console.log(`User connected: ${socket.id}`);

    socket.on('user:authenticate', (data: { userId: string; token: string }) => {
      // TODO: Verify JWT token
      const userUser: SocketUser = {
        id: data.userId,
        role: UserRole.USER,
        socketId: socket.id,
        isOnline: true,
        lastSeen: new Date()
      };
      
      this.connectedUsers.set(data.userId, userUser);
      socket.join(`user:${data.userId}`);
      
      socket.emit('user:authenticated', { success: true });
      console.log(`User authenticated: ${data.userId}`);
    });

    socket.on('user:emergency_alert', (data: Omit<EmergencyAlert, 'timestamp'>) => {
      const alert: EmergencyAlert = {
        ...data,
        timestamp: new Date()
      };
      this.broadcastEmergencyAlert(alert);
    });

    socket.on('user:track_booking', (data: { bookingId: string }) => {
      socket.join(`booking:${data.bookingId}`);
    });
  }

  // Hospital-specific connection handling
  private handleHospitalConnection(socket: Socket) {
    console.log(`Hospital connected: ${socket.id}`);

    socket.on('hospital:authenticate', (data: { hospitalId: string; token: string }) => {
      // TODO: Verify JWT token
      const hospitalUser: SocketUser = {
        id: data.hospitalId,
        role: UserRole.HOSPITAL,
        socketId: socket.id,
        isOnline: true,
        lastSeen: new Date()
      };
      
      this.connectedUsers.set(data.hospitalId, hospitalUser);
      socket.join(`hospital:${data.hospitalId}`);
      
      socket.emit('hospital:authenticated', { success: true });
      console.log(`Hospital authenticated: ${data.hospitalId}`);
    });

    socket.on('hospital:capacity_update', (data: { hospitalId: string; availableBeds: number }) => {
      this.broadcastHospitalCapacityUpdate(data);
    });
  }

  // Emergency executive connection handling
  private handleEmergencyConnection(socket: Socket) {
    console.log(`Emergency executive connected: ${socket.id}`);

    socket.on('emergency:authenticate', (data: { executiveId: string; token: string }) => {
      // TODO: Verify JWT token
      const emergencyUser: SocketUser = {
        id: data.executiveId,
        role: UserRole.EMERGENCY_EXECUTIVE,
        socketId: socket.id,
        isOnline: true,
        lastSeen: new Date()
      };
      
      this.connectedUsers.set(data.executiveId, emergencyUser);
      socket.join('emergency_executives');
      
      socket.emit('emergency:authenticated', { success: true });
      console.log(`Emergency executive authenticated: ${data.executiveId}`);
    });
  }

  // Event handlers
  private handleDriverLocationUpdate(data: DriverLocationUpdate) {
    this.driverLocations.set(data.driverId, {
      ...data,
      location: {
        ...data.location,
        timestamp: new Date()
      }
    });

    // Broadcast to users tracking this driver
    if (this.io) {
      this.io.emit('driver:location_updated', data);
    }
    
    // Notify relevant bookings
    this.notifyBookingsOfDriverLocation(data);
  }

  private handleDriverStatusChange(driverId: string, status: DriverStatus) {
    const locationUpdate = this.driverLocations.get(driverId);
    if (locationUpdate) {
      locationUpdate.status = status;
    }

    // Broadcast status change
    if (this.io) {
      this.io.emit('driver:status_changed', { driverId, status });
    }
    
    // Update emergency executives
    if (this.emergencyNamespace) {
      this.emergencyNamespace.emit('driver:status_update', { driverId, status });
    }
  }

  private handleBookingUpdate(update: BookingUpdate) {
    // Notify all parties involved in the booking
    if (this.io) {
      this.io.to(`booking:${update.bookingId}`).emit('booking:updated', update);
    }
    
    // Notify emergency executives
    if (this.emergencyNamespace) {
      this.emergencyNamespace.emit('booking:status_change', update);
    }
  }

  private broadcastEmergencyAlert(alert: EmergencyAlert) {
    // Send to all emergency executives
    if (this.emergencyNamespace) {
      this.emergencyNamespace.emit('emergency:alert', alert);
    }
    
    // Send to nearby drivers (TODO: implement geospatial filtering)
    if (this.driverNamespace) {
      this.driverNamespace.emit('emergency:nearby_alert', alert);
    }
    
    console.log(`Emergency alert broadcasted: ${alert.bookingId}`);
  }

  private broadcastHospitalCapacityUpdate(data: { hospitalId: string; availableBeds: number }) {
    // Notify all emergency executives
    if (this.emergencyNamespace) {
      this.emergencyNamespace.emit('hospital:capacity_updated', data);
    }
    
    // Notify nearby drivers
    if (this.driverNamespace) {
      this.driverNamespace.emit('hospital:capacity_updated', data);
    }
  }

  private notifyBookingsOfDriverLocation(driverUpdate: DriverLocationUpdate) {
    // TODO: Find active bookings for this driver and notify users
    // This would typically query the database for active bookings
  }

  private handleDisconnection(socketId: string) {
    // Find and remove the disconnected user
    for (const [userId, user] of this.connectedUsers.entries()) {
      if (user.socketId === socketId) {
        user.isOnline = false;
        user.lastSeen = new Date();
        console.log(`User disconnected: ${userId}`);
        break;
      }
    }
  }

  private handleDriverDisconnection(socketId: string) {
    // Find the driver and mark as offline
    for (const [driverId, driver] of this.connectedUsers.entries()) {
      if (driver.socketId === socketId && driver.role === UserRole.DRIVER) {
        driver.isOnline = false;
        driver.lastSeen = new Date();
        
        // Update driver status to offline
        this.handleDriverStatusChange(driverId, DriverStatus.OFFLINE);
        console.log(`Driver went offline: ${driverId}`);
        break;
      }
    }
  }

  // Public methods for external use
  public sendMessageToUser(userId: string, event: string, data: any) {
    const user = this.connectedUsers.get(userId);
    if (user && user.isOnline && this.io) {
      this.io.to(user.socketId).emit(event, data);
      return true;
    }
    return false;
  }

  public sendMessageToDriver(driverId: string, event: string, data: any) {
    if (this.driverNamespace) {
      this.driverNamespace.to(`driver:${driverId}`).emit(event, data);
    }
  }

  public sendMessageToHospital(hospitalId: string, event: string, data: any) {
    if (this.hospitalNamespace) {
      this.hospitalNamespace.to(`hospital:${hospitalId}`).emit(event, data);
    }
  }

  public broadcastToEmergencyExecutives(event: string, data: any) {
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

  // Chat functionality
  public sendChatMessage(message: ChatMessage) {
    // Send to all participants in the booking
    if (this.io) {
      this.io.to(`booking:${message.bookingId}`).emit('chat:message', message);
    }
  }

  public joinBookingRoom(socketId: string, bookingId: string) {
    if (this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`booking:${bookingId}`);
      }
    }
  }

  public leaveBookingRoom(socketId: string, bookingId: string) {
    if (this.io) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.leave(`booking:${bookingId}`);
      }
    }
  }
}