import { Service } from "@tsed/di";
import { BadRequest, NotFound, Unauthorized } from "@tsed/exceptions";
import { BookingStatus, BookingType, Priority, PaymentStatus } from "../models/Booking.js";
import { DriverStatus, AmbulanceType } from "../models/Driver.js";
import { LocationService } from "./LocationService.js";
import { UserService } from "./UserService.js";
import { WebSocketService } from "./WebSocketService.js";

// Define interfaces locally to avoid import issues
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface LocationPoint extends Coordinates {
  timestamp?: Date;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface BookingRequest {
  userId: string;
  type: BookingType;
  priority: Priority;
  pickupLocation: {
    address: string;
    coordinates: Coordinates;
    landmarks?: string;
    contactPerson?: {
      name: string;
      phone: string;
    };
  };
  destination?: {
    address: string;
    coordinates: Coordinates;
    hospitalName?: string;
    department?: string;
  };
  patientInfo: {
    name: string;
    age: number;
    gender: string;
    condition: string;
    symptoms: string[];
    allergies?: string[];
    medications?: string[];
    emergencyContact: {
      name: string;
      phone: string;
      relation: string;
    };
    consciousnessLevel?: string;
    vitalSigns?: {
      bloodPressure?: string;
      heartRate?: number;
      temperature?: number;
      oxygenSaturation?: number;
    };
  };
  ambulanceRequirements?: {
    type: AmbulanceType;
    equipment: string[];
    medicalStaff: boolean;
    oxygenRequired: boolean;
    stretcher: boolean;
    ventilator: boolean;
  };
  scheduledTime?: Date;
  notes?: string;
}

export interface BookingResponse {
  bookingId: string;
  bookingNumber: string;
  status: BookingStatus;
  estimatedArrival?: Date;
  assignedDriver?: {
    driverId: string;
    name: string;
    phone: string;
    vehicleNumber: string;
    currentLocation?: LocationPoint;
  };
  recommendedHospital?: {
    hospitalId: string;
    name: string;
    distance: number;
    estimatedTime: number;
  };
  payment: {
    amount: number;
    currency: string;
    status: PaymentStatus;
    breakdown: {
      baseFare: number;
      distanceCharge: number;
      timeCharge: number;
      emergencyCharge?: number;
      taxes: number;
    };
  };
  timeline: Array<{
    status: BookingStatus;
    timestamp: Date;
    location?: Coordinates;
    notes?: string;
  }>;
}

export interface BookingUpdate {
  bookingId: string;
  status: BookingStatus;
  location?: LocationPoint;
  estimatedArrival?: Date;
  notes?: string;
}

@Service()
export class BookingService {
  // In-memory storage for demo purposes
  private bookings: Map<string, any> = new Map();
  private bookingCounter = 1000;

  // Socket service will be injected later to avoid circular dependencies
  private socketService?: WebSocketService;

  constructor(
    private locationService: LocationService,
    private userService: UserService
  ) {
    this.initializeDemoBookings();
  }

  /**
   * Create a new ambulance booking
   */
  async createBooking(bookingRequest: BookingRequest): Promise<BookingResponse> {
    // Validate user exists
    const user = await this.userService.getUserById(bookingRequest.userId);
    if (!user) {
      throw new BadRequest("Invalid user ID");
    }

    // Validate pickup location
    if (!this.isValidCoordinates(bookingRequest.pickupLocation.coordinates)) {
      throw new BadRequest("Invalid pickup location coordinates");
    }

    // Validate destination if provided
    if (bookingRequest.destination && !this.isValidCoordinates(bookingRequest.destination.coordinates)) {
      throw new BadRequest("Invalid destination coordinates");
    }

    // Generate booking ID and number
    const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const bookingNumber = `AMB-${this.bookingCounter++}`;

    // Calculate estimated cost
    const distance = bookingRequest.destination ? 
      this.calculateDistance(bookingRequest.pickupLocation.coordinates, bookingRequest.destination.coordinates) : 5;
    const costBreakdown = this.calculateBookingCost(distance, bookingRequest.type, bookingRequest.priority);

    // Create booking timeline
    const timeline = [{
      status: BookingStatus.REQUESTED,
      timestamp: new Date(),
      location: bookingRequest.pickupLocation.coordinates,
      notes: "Booking request received"
    }];

    // Create booking object
    const booking = {
      _id: bookingId,
      bookingNumber,
      userId: bookingRequest.userId,
      type: bookingRequest.type,
      priority: bookingRequest.priority,
      status: BookingStatus.REQUESTED,
      pickupLocation: bookingRequest.pickupLocation,
      destination: bookingRequest.destination,
      patientInfo: bookingRequest.patientInfo,
      ambulanceRequirements: bookingRequest.ambulanceRequirements || {
        type: AmbulanceType.BASIC,
        equipment: ['First Aid', 'Oxygen'],
        medicalStaff: false,
        oxygenRequired: true,
        stretcher: true,
        ventilator: false
      },
      scheduledTime: bookingRequest.scheduledTime,
      notes: bookingRequest.notes,
      payment: {
        amount: costBreakdown.total,
        currency: 'INR',
        status: PaymentStatus.PENDING,
        breakdown: costBreakdown
      },
      timeline,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store booking
    this.bookings.set(bookingId, booking);

    // 🔔 Emit real-time booking created event
    this.emitBookingEvent('booking:created', {
      bookingId: booking._id,
      userId: booking.userId,
      status: booking.status,
      priority: booking.priority,
      location: booking.pickupLocation.coordinates,
      message: `New booking ${booking.bookingNumber} created`
    });

    // For emergency bookings, immediately try to dispatch
    if (bookingRequest.priority === Priority.CRITICAL || bookingRequest.type === BookingType.EMERGENCY) {
      // This would trigger the dispatch algorithm
      setTimeout(() => this.autoDispatchEmergencyBooking(bookingId), 1000);
    }

    // Find recommended hospital
    const recommendedHospital = await this.findRecommendedHospital(
      bookingRequest.pickupLocation.coordinates,
      bookingRequest.patientInfo.condition
    );

    const response: BookingResponse = {
      bookingId,
      bookingNumber,
      status: BookingStatus.REQUESTED,
      recommendedHospital,
      payment: {
        amount: costBreakdown.total,
        currency: 'INR',
        status: PaymentStatus.PENDING,
        breakdown: costBreakdown
      },
      timeline
    };

    console.log(`New booking created: ${bookingNumber} for user ${bookingRequest.userId}`);
    return response;
  }

  /**
   * Get booking by ID
   */
  async getBooking(bookingId: string): Promise<any> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new NotFound("Booking not found");
    }
    return booking;
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string, 
    status: BookingStatus, 
    updateData?: {
      location?: LocationPoint;
      estimatedArrival?: Date;
      notes?: string;
    }
  ): Promise<any> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new NotFound("Booking not found");
    }

    // If the requested status is the same as current, treat as idempotent no-op and return success
    if (booking.status === status) {
      // Update timestamp to reflect the request and optionally add a lightweight timeline entry
      booking.updatedAt = new Date();
      // Avoid stacking duplicate timeline entries for identical status updates
      const lastTimeline = booking.timeline && booking.timeline.length ? booking.timeline[booking.timeline.length - 1] : null;
      if (!lastTimeline || lastTimeline.status !== status) {
        booking.timeline.push({ status, timestamp: new Date(), notes: 'Status reaffirmed (no-op)' });
      }

      // Emit update for clients (keeps behavior consistent)
      this.emitBookingUpdate(bookingId, status, {
        location: updateData?.location,
        estimatedArrival: updateData?.estimatedArrival,
        notes: updateData?.notes,
        message: `Booking ${booking.bookingNumber} status reaffirmed as ${status}`
      });

      return booking;
    }

    // Validate status transition
    if (!this.isValidStatusTransition(booking.status, status)) {
      throw new BadRequest(`Invalid status transition from ${booking.status} to ${status}`);
    }

    // Update booking
    booking.status = status;
    booking.updatedAt = new Date();

    // Add to timeline
    const timelineEntry: any = {
      status,
      timestamp: new Date(),
      location: updateData?.location,
      notes: updateData?.notes
    };
    booking.timeline.push(timelineEntry);

    // Update tracking data if location provided
    if (updateData?.location && booking.assignedDriver) {
      booking.tracking = {
        driverLocation: updateData.location,
        lastUpdated: new Date(),
        estimatedArrivalTime: updateData.estimatedArrival
      };
    }

    // Handle special status updates
    await this.handleStatusSpecificUpdates(booking, status, updateData);

    // 🔔 Emit real-time booking status update
    this.emitBookingUpdate(bookingId, status, {
      location: updateData?.location,
      estimatedArrival: updateData?.estimatedArrival,
      notes: updateData?.notes,
      message: `Booking ${booking.bookingNumber} status updated to ${status}`
    });

    console.log(`Booking ${booking.bookingNumber} status updated to ${status}`);
    return booking;
  }

  /**
   * Assign driver to booking
   */
  async assignDriver(bookingId: string, driverId: string): Promise<any> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new NotFound("Booking not found");
    }

    // Validate driver availability
    const driverLocation = await this.locationService.getDriverLocation(driverId);
    if (!driverLocation || driverLocation.status !== DriverStatus.AVAILABLE) {
      throw new BadRequest("Driver is not available");
    }

    // Get driver details (mock data for demo)
    const driverDetails = {
      driverId,
      name: `Driver ${driverId.split('-')[1] || 'Demo'}`,
      phone: `+91987654${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      vehicleNumber: `DL-${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 10000)}`,
      currentLocation: driverLocation.location
    };

    // Calculate estimated arrival time
    const distance = this.calculateDistance(
      driverLocation.location,
      booking.pickupLocation.coordinates
    );
    const estimatedArrival = new Date(Date.now() + distance * 2 * 60 * 1000); // 2 minutes per km

    // Update booking
    booking.assignedDriver = driverDetails;
    booking.status = BookingStatus.DRIVER_ASSIGNED;
    booking.estimatedArrival = estimatedArrival;
    booking.updatedAt = new Date();

    // Add to timeline
    booking.timeline.push({
      status: BookingStatus.DRIVER_ASSIGNED,
      timestamp: new Date(),
      location: driverLocation.location,
      notes: `Driver ${driverDetails.name} assigned`
    });

    // Update driver status to busy
    await this.locationService.updateDriverLocation(
      driverId, 
      driverLocation.location, 
      DriverStatus.BUSY
    );

    // 🔔 Emit real-time driver assignment notification
    this.emitBookingEvent('booking:driver_assigned', {
      bookingId: booking._id,
      userId: booking.userId,
      driverId: driverDetails.driverId,
      driverName: driverDetails.name,
      driverPhone: driverDetails.phone,
      vehicleNumber: driverDetails.vehicleNumber,
      estimatedArrival: estimatedArrival,
      driverLocation: driverLocation.location,
      message: `Driver ${driverDetails.name} has been assigned to your booking`
    });

    // Notify the driver about the new booking
    if (this.socketService) {
      this.socketService.sendMessageToDriver(driverId, 'booking:assigned_to_you', {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        pickupLocation: booking.pickupLocation,
        patientInfo: booking.patientInfo,
        priority: booking.priority,
        estimatedDistance: distance,
        message: `New booking assigned: ${booking.bookingNumber}`
      });
    }

    console.log(`Driver ${driverId} assigned to booking ${booking.bookingNumber}`);
    return booking;
  }

  /**
   * Cancel booking
   */
  async cancelBooking(
    bookingId: string, 
    cancelledBy: string, 
    reason: string
  ): Promise<any> {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      throw new NotFound("Booking not found");
    }

    // Check if booking can be cancelled
    if ([BookingStatus.COMPLETED, BookingStatus.CANCELLED].includes(booking.status)) {
      throw new BadRequest("Booking cannot be cancelled in current status");
    }

    // Calculate refund amount based on current status
    const refundAmount = this.calculateRefundAmount(booking);

    // Update booking
    booking.status = BookingStatus.CANCELLED;
    booking.updatedAt = new Date();
    booking.cancellation = {
      reason,
      cancelledBy,
      cancellationTime: new Date(),
      refundAmount,
      refundStatus: refundAmount > 0 ? 'pending' : 'not_applicable'
    };

    // Add to timeline
    booking.timeline.push({
      status: BookingStatus.CANCELLED,
      timestamp: new Date(),
      notes: `Cancelled by ${cancelledBy}: ${reason}`
    });

    // If driver was assigned, make them available again
    if (booking.assignedDriver) {
      await this.locationService.setDriverAvailability(booking.assignedDriver.driverId, true);
    }

    // Update payment status
    if (booking.payment.status === PaymentStatus.PAID && refundAmount > 0) {
      booking.payment.status = PaymentStatus.REFUNDED;
    }

    console.log(`Booking ${booking.bookingNumber} cancelled by ${cancelledBy}`);
    return booking;
  }

  /**
   * Get bookings for a user
   */
  async getUserBookings(userId: string, limit: number = 10): Promise<any[]> {
    const userBookings = Array.from(this.bookings.values())
      .filter(booking => booking.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return userBookings;
  }

  /**
   * Get active bookings for a driver
   */
  async getDriverBookings(driverId: string): Promise<any[]> {
    const driverBookings = Array.from(this.bookings.values())
      .filter(booking => 
        booking.assignedDriver?.driverId === driverId &&
        ![BookingStatus.COMPLETED, BookingStatus.CANCELLED].includes(booking.status)
      );

    return driverBookings;
  }

  /**
   * Get all bookings with filters (for admin/emergency executives)
   */
  async getAllBookings(filters: {
    status?: BookingStatus;
    priority?: Priority;
    type?: BookingType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<any[]> {
    let bookings = Array.from(this.bookings.values());

    // Apply filters
    if (filters.status) {
      bookings = bookings.filter(b => b.status === filters.status);
    }
    if (filters.priority) {
      bookings = bookings.filter(b => b.priority === filters.priority);
    }
    if (filters.type) {
      bookings = bookings.filter(b => b.type === filters.type);
    }
    if (filters.startDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) >= filters.startDate!);
    }
    if (filters.endDate) {
      bookings = bookings.filter(b => new Date(b.createdAt) <= filters.endDate!);
    }

    // Sort by creation date (newest first)
    bookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return bookings.slice(0, filters.limit || 50);
  }

  // Helper methods
  private isValidCoordinates(coords: Coordinates): boolean {
    const { latitude, longitude } = coords;
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180 &&
      !isNaN(latitude) && !isNaN(longitude)
    );
  }

  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const lat1Rad = (coord1.latitude * Math.PI) / 180;
    const lat2Rad = (coord2.latitude * Math.PI) / 180;
    const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const deltaLngRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateBookingCost(distance: number, type: BookingType, priority: Priority): any {
    let baseFare = 500; // Base fare in INR
    let distanceCharge = distance * 15; // 15 INR per km
    let timeCharge = 50; // Base time charge
    let emergencyCharge = 0;

    // Emergency surcharge
    if (type === BookingType.EMERGENCY || priority === Priority.CRITICAL) {
      emergencyCharge = baseFare * 0.5; // 50% surcharge
    }

    // Priority surcharge
    if (priority === Priority.HIGH) {
      emergencyCharge += baseFare * 0.25; // 25% surcharge
    }

    const subtotal = baseFare + distanceCharge + timeCharge + emergencyCharge;
    const taxes = subtotal * 0.18; // 18% GST
    const total = subtotal + taxes;

    return {
      baseFare,
      distanceCharge,
      timeCharge,
      emergencyCharge,
      taxes: Math.round(taxes),
      total: Math.round(total)
    };
  }

  private async findRecommendedHospital(location: Coordinates, condition: string): Promise<any> {
    const hospitals = await this.locationService.findNearestHospitals(
      location,
      20, // 20km radius
      3,  // top 3 results
      true // require emergency services
    );

    if (hospitals.length === 0) {
      return null;
    }

    // Simple recommendation based on distance and specialization
    const hospital = hospitals[0];
    return {
      hospitalId: hospital.hospitalId,
      name: hospital.hospital.name,
      distance: hospital.distance,
      estimatedTime: hospital.estimatedArrival
    };
  }

  private isValidStatusTransition(currentStatus: BookingStatus, newStatus: BookingStatus): boolean {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.REQUESTED]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.DRIVER_ASSIGNED, BookingStatus.CANCELLED],
      [BookingStatus.DRIVER_ASSIGNED]: [BookingStatus.DRIVER_ENROUTE, BookingStatus.CANCELLED],
      [BookingStatus.DRIVER_ENROUTE]: [BookingStatus.DRIVER_ARRIVED, BookingStatus.CANCELLED],
      [BookingStatus.DRIVER_ARRIVED]: [BookingStatus.PATIENT_PICKED, BookingStatus.CANCELLED],
      [BookingStatus.PATIENT_PICKED]: [BookingStatus.IN_TRANSIT],
      [BookingStatus.IN_TRANSIT]: [BookingStatus.ARRIVED_HOSPITAL],
      [BookingStatus.ARRIVED_HOSPITAL]: [BookingStatus.COMPLETED],
      [BookingStatus.COMPLETED]: [],
      [BookingStatus.CANCELLED]: []
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private async handleStatusSpecificUpdates(booking: any, status: BookingStatus, updateData?: any): Promise<void> {
    switch (status) {
      case BookingStatus.COMPLETED:
        // Mark payment as paid if not already
        if (booking.payment.status === PaymentStatus.PENDING) {
          booking.payment.status = PaymentStatus.PAID;
        }
        // Make driver available again
        if (booking.assignedDriver) {
          await this.locationService.setDriverAvailability(booking.assignedDriver.driverId, true);
        }
        break;

      case BookingStatus.DRIVER_ENROUTE:
        // Update estimated arrival based on current traffic
        if (updateData?.location && booking.assignedDriver) {
          const distance = this.calculateDistance(updateData.location, booking.pickupLocation.coordinates);
          booking.estimatedArrival = new Date(Date.now() + distance * 2 * 60 * 1000);
        }
        break;

      case BookingStatus.PATIENT_PICKED:
        // Start tracking to hospital
        if (booking.destination && updateData?.location) {
          const distance = this.calculateDistance(updateData.location, booking.destination.coordinates);
          booking.estimatedHospitalArrival = new Date(Date.now() + distance * 2.5 * 60 * 1000);
        }
        break;
    }
  }

  private calculateRefundAmount(booking: any): number {
    const { status, payment } = booking;

    // No refund if not paid yet
    if (payment.status !== PaymentStatus.PAID) {
      return 0;
    }

    // Refund policy based on status
    switch (status) {
      case BookingStatus.REQUESTED:
      case BookingStatus.CONFIRMED:
        return payment.amount * 0.95; // 95% refund (5% processing fee)
      
      case BookingStatus.DRIVER_ASSIGNED:
        return payment.amount * 0.80; // 80% refund
      
      case BookingStatus.DRIVER_ENROUTE:
        return payment.amount * 0.50; // 50% refund
      
      default:
        return 0; // No refund after driver arrives
    }
  }

  private async autoDispatchEmergencyBooking(bookingId: string): Promise<void> {
    try {
      const booking = this.bookings.get(bookingId);
      if (!booking || booking.status !== BookingStatus.REQUESTED) {
        return;
      }

      // Find nearest available driver
      const nearestDrivers = await this.locationService.findNearestDrivers(
        booking.pickupLocation.coordinates,
        25, // 25km emergency radius
        1,  // just need the nearest one
        booking.ambulanceRequirements?.type
      );

      if (nearestDrivers.length > 0) {
        await this.assignDriver(bookingId, nearestDrivers[0].driverId);
        console.log(`Emergency booking ${booking.bookingNumber} auto-dispatched to ${nearestDrivers[0].driverId}`);
      } else {
        console.warn(`No available drivers found for emergency booking ${booking.bookingNumber}`);
        // Would trigger alerts to emergency executives in real system
      }
    } catch (error) {
      console.error(`Error in auto-dispatch for booking ${bookingId}:`, error);
    }
  }

  private initializeDemoBookings(): void {
    // Add a few demo bookings for testing
    const demoBookings = [
      {
        _id: 'demo-booking-1',
        bookingNumber: 'AMB-1001',
        userId: 'demo-user-1',
        type: BookingType.EMERGENCY,
        priority: Priority.HIGH,
        status: BookingStatus.COMPLETED,
        pickupLocation: {
          address: 'Connaught Place, New Delhi',
          coordinates: { latitude: 28.6315, longitude: 77.2167 }
        },
        destination: {
          address: 'AIIMS Delhi',
          coordinates: { latitude: 28.5672, longitude: 77.2100 },
          hospitalName: 'AIIMS Delhi'
        },
        patientInfo: {
          name: 'Demo Patient',
          age: 45,
          gender: 'Male',
          condition: 'Chest Pain',
          symptoms: ['chest pain', 'shortness of breath'],
          emergencyContact: { name: 'Demo Contact', phone: '+919876543210', relation: 'Spouse' }
        },
        payment: {
          amount: 850,
          currency: 'INR',
          status: PaymentStatus.PAID,
          breakdown: { baseFare: 500, distanceCharge: 150, timeCharge: 50, emergencyCharge: 250, taxes: 153 }
        },
        timeline: [
          { status: BookingStatus.REQUESTED, timestamp: new Date(Date.now() - 60 * 60 * 1000) },
          { status: BookingStatus.DRIVER_ASSIGNED, timestamp: new Date(Date.now() - 50 * 60 * 1000) },
          { status: BookingStatus.COMPLETED, timestamp: new Date(Date.now() - 10 * 60 * 1000) }
        ],
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 60 * 1000)
      }
    ];

    demoBookings.forEach(booking => {
      this.bookings.set(booking._id, booking);
    });
  }

  /**
   * 📡 Real-time event emission helpers
   */
  private emitBookingEvent(eventType: string, data: any) {
    if (this.socketService) {
      // Notify the specific user
      if (data.userId) {
        this.socketService.sendMessageToUser(data.userId, eventType, data);
      }
      
      // Notify emergency executives for high priority bookings
      if (data.priority === Priority.CRITICAL || data.priority === Priority.HIGH) {
        this.socketService.broadcastToEmergencyExecutives(eventType, data);
      }

      // Broadcast to relevant drivers for CRITICAL emergencies
      if (data.priority === Priority.CRITICAL) {
        this.socketService.sendMessageToDriver('*', 'emergency:new_booking', data);
      }

      console.log(`📡 Real-time event emitted: ${eventType} for booking ${data.bookingId}`);
    }
  }

  private emitBookingUpdate(bookingId: string, status: BookingStatus, additionalData?: any) {
    const booking = this.bookings.get(bookingId);
    if (booking && this.socketService) {
      const updateData = {
        bookingId,
        status,
        userId: booking.userId,
        assignedDriver: booking.assignedDriver,
        location: booking.currentLocation,
        timestamp: new Date(),
        ...additionalData
      };

      // Emit to all stakeholders
      this.emitBookingEvent('booking:status_updated', updateData);
      
      // If driver is assigned, notify them specifically
      if (booking.assignedDriver) {
        this.socketService.sendMessageToDriver(
          booking.assignedDriver.driverId, 
          'booking:status_updated', 
          updateData
        );
      }
    }
  }

  /**
   * 🔔 Public method to set socket service (to avoid circular dependency)
   */
  public setSocketService(socketService: WebSocketService) {
    this.socketService = socketService;
  }
}