import { Controller, Inject } from "@tsed/di";
import { Post, Get, Put, Delete } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Description, Returns, Summary } from "@tsed/schema";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { BookingService } from "../../services/BookingService.js";
import { SmartDispatchService } from "../../services/SmartDispatchService.js";
import { HospitalIntegrationService } from "../../services/HospitalIntegrationService.js";

// Simple request/response interfaces
interface CreateBookingRequest {
  userId: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  dropoffLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  priority: Priority;
  ambulanceType?: AmbulanceType;
  patientDetails: {
    name: string;
    age: number;
    gender: string;
    condition: string;
    emergencyContact: string;
  };
  bookingType: BookingType;
  specialRequirements?: string[];
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
  };
  paymentMethod?: {
    type: string;
    cardLastFour?: string;
  };
}

interface BookingResponse {
  bookingId: string;
  status: BookingStatus;
  estimatedCost: number;
  estimatedArrival?: number;
  driverInfo?: {
    name: string;
    phone: string;
    vehicleNumber: string;
    currentLocation: {
      latitude: number;
      longitude: number;
    };
  };
  hospitalRecommendations?: any[];
  message: string;
  createdAt: Date;
}

interface DispatchRequest {
  bookingId: string;
  maxDistance?: number;
  forceAssign?: boolean;
}

interface HospitalSearchRequest {
  latitude: number;
  longitude: number;
  patientCondition: string;
  priority: Priority;
  requiredSpecialties?: string[];
  maxDistance?: number;
  insuranceType?: string;
  patientAge?: number;
}

@Controller("/bookings")
@Summary("Booking Management")
@Description("Endpoints for managing ambulance bookings")
export class BookingController {
  @Inject()
  private bookingService: BookingService;

  @Inject()
  private smartDispatchService: SmartDispatchService;

  @Inject()
  private hospitalIntegrationService: HospitalIntegrationService;

  /**
   * Create a new ambulance booking
   */
  @Post("/")
  @Summary("Create booking")
  @Description("Create a new ambulance booking with automatic dispatch")
  @Returns(200, BookingResponse)
  async createBooking(@BodyParams() request: CreateBookingRequest): Promise<BookingResponse> {
    // Create the booking
    const booking = await this.bookingService.createBooking(request);

    // Get hospital recommendations
    const hospitalRecommendations = await this.hospitalIntegrationService.getHospitalRecommendations({
      patientLocation: request.pickupLocation,
      patientCondition: request.patientDetails.condition,
      priority: request.priority,
      patientAge: request.patientDetails.age,
      maxDistance: 50 // Default max distance
    });

    // For emergency bookings, auto-dispatch
    let driverInfo = undefined;
    let estimatedArrival = undefined;

    if (request.priority === Priority.CRITICAL || request.priority === Priority.HIGH) {
      try {
        const dispatchResult = await this.smartDispatchService.dispatchAmbulance({
          bookingId: booking.bookingId,
          pickupLocation: request.pickupLocation,
          priority: request.priority,
          ambulanceType: request.ambulanceType,
          specialRequirements: request.specialRequirements,
          patientCondition: request.patientDetails.condition
        });

        if (dispatchResult.success && dispatchResult.assignedDriver) {
          estimatedArrival = dispatchResult.assignedDriver.estimatedArrival;
          // In real system, would fetch driver details
          driverInfo = {
            name: "Driver Name",
            phone: "+1234567890",
            vehicleNumber: "AMB-001",
            currentLocation: request.pickupLocation // Placeholder
          };
        }
      } catch (error) {
        console.error("Auto-dispatch failed:", error);
      }
    }

    return {
      bookingId: booking.bookingId,
      status: booking.status,
      estimatedCost: booking.estimatedCost,
      estimatedArrival,
      driverInfo,
      hospitalRecommendations: hospitalRecommendations.slice(0, 3), // Top 3 recommendations
      message: booking.status === BookingStatus.CONFIRMED ? 
        "Booking created and driver assigned" : "Booking created, searching for driver",
      createdAt: booking.createdAt
    };
  }

  /**
   * Get booking details
   */
  @Get("/:bookingId")
  @Summary("Get booking")
  @Description("Get detailed booking information")
  @Returns(200, BookingResponse)
  async getBooking(@PathParams("bookingId") bookingId: string): Promise<BookingResponse> {
    const booking = await this.bookingService.getBookingById(bookingId);
    
    return {
      bookingId: booking.bookingId,
      status: booking.status,
      estimatedCost: booking.estimatedCost,
      estimatedArrival: booking.estimatedArrival,
      message: "Booking details retrieved successfully",
      createdAt: booking.createdAt
    };
  }

  /**
   * Get user's booking history
   */
  @Get("/user/:userId")
  @Summary("Get user bookings")
  @Description("Get booking history for a specific user")
  @Returns(200, Array)
  async getUserBookings(
    @PathParams("userId") userId: string,
    @QueryParams("status") status?: BookingStatus,
    @QueryParams("limit") limit: number = 10,
    @QueryParams("offset") offset: number = 0
  ): Promise<BookingResponse[]> {
    const bookings = await this.bookingService.getUserBookings(userId, status, limit, offset);
    
    return bookings.map(booking => ({
      bookingId: booking.bookingId,
      status: booking.status,
      estimatedCost: booking.estimatedCost,
      estimatedArrival: booking.estimatedArrival,
      message: "User booking retrieved",
      createdAt: booking.createdAt
    }));
  }

  /**
   * Dispatch ambulance to booking
   */
  @Post("/:bookingId/dispatch")
  @Summary("Dispatch ambulance")
  @Description("Manually dispatch ambulance using smart dispatch algorithm")
  @Returns(200, Object)
  async dispatchAmbulance(
    @PathParams("bookingId") bookingId: string,
    @BodyParams() request: DispatchRequest
  ): Promise<any> {
    // Get booking details
    const booking = await this.bookingService.getBookingById(bookingId);

    // Dispatch ambulance
    const dispatchResult = await this.smartDispatchService.dispatchAmbulance({
      bookingId,
      pickupLocation: booking.pickupLocation,
      priority: booking.priority,
      ambulanceType: booking.ambulanceType,
      specialRequirements: booking.specialRequirements,
      maxDistance: request.maxDistance,
      patientCondition: booking.patientDetails.condition
    });

    return {
      success: dispatchResult.success,
      message: dispatchResult.message,
      assignedDriver: dispatchResult.assignedDriver,
      alternativeDrivers: dispatchResult.alternativeDrivers,
      dispatchTime: dispatchResult.dispatchTime
    };
  }

  /**
   * Update booking status
   */
  @Put("/:bookingId/status")
  @Summary("Update booking status")
  @Description("Update the status of an existing booking")
  @Returns(200, Object)
  async updateBookingStatus(
    @PathParams("bookingId") bookingId: string,
    @BodyParams() request: { status: BookingStatus; location?: { latitude: number; longitude: number } }
  ): Promise<{ success: boolean; message: string; booking: any }> {
    const updatedBooking = await this.bookingService.updateBookingStatus(
      bookingId, 
      request.status, 
      request.location
    );

    return {
      success: true,
      message: `Booking status updated to ${request.status}`,
      booking: updatedBooking
    };
  }

  /**
   * Cancel booking
   */
  @Delete("/:bookingId")
  @Summary("Cancel booking")
  @Description("Cancel an existing booking")
  @Returns(200, Object)
  async cancelBooking(
    @PathParams("bookingId") bookingId: string,
    @BodyParams() request: { reason: string; cancelledBy: string }
  ): Promise<{ success: boolean; message: string; refundAmount?: number }> {
    const result = await this.bookingService.cancelBooking(
      bookingId, 
      request.reason, 
      request.cancelledBy
    );

    return {
      success: true,
      message: "Booking cancelled successfully",
      refundAmount: result.refundAmount
    };
  }

  /**
   * Search nearby hospitals
   */
  @Post("/hospitals/search")
  @Summary("Search hospitals")
  @Description("Get intelligent hospital recommendations based on patient condition and location")
  @Returns(200, Array)
  async searchHospitals(@BodyParams() request: HospitalSearchRequest): Promise<any[]> {
    const recommendations = await this.hospitalIntegrationService.getHospitalRecommendations({
      patientLocation: { latitude: request.latitude, longitude: request.longitude },
      patientCondition: request.patientCondition,
      priority: request.priority,
      requiredSpecialties: request.requiredSpecialties,
      maxDistance: request.maxDistance,
      insuranceType: request.insuranceType,
      patientAge: request.patientAge
    });

    return recommendations;
  }

  /**
   * Get booking analytics
   */
  @Get("/analytics/overview")
  @Summary("Booking analytics")
  @Description("Get comprehensive booking analytics and statistics")
  @Returns(200, Object)
  async getBookingAnalytics(
    @QueryParams("timeframe") timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    const [bookingStats, dispatchStats, hospitalStats] = await Promise.all([
      this.bookingService.getBookingAnalytics(timeframe),
      this.smartDispatchService.getDispatchAnalytics(timeframe),
      this.hospitalIntegrationService.getCapacityAnalytics(timeframe as 'hour' | 'day' | 'week')
    ]);

    return {
      bookings: bookingStats,
      dispatch: dispatchStats,
      hospitals: hospitalStats,
      generatedAt: new Date()
    };
  }

  /**
   * Get real-time booking status updates
   */
  @Get("/:bookingId/status/live")
  @Summary("Live booking status")
  @Description("Get real-time status updates for a booking")
  @Returns(200, Object)
  async getLiveBookingStatus(@PathParams("bookingId") bookingId: string): Promise<any> {
    const booking = await this.bookingService.getBookingById(bookingId);
    
    // In real system, would get live driver location, ETA updates, etc.
    return {
      bookingId: booking.bookingId,
      currentStatus: booking.status,
      driverLocation: booking.driverCurrentLocation,
      estimatedArrival: booking.estimatedArrival,
      timeline: booking.statusTimeline,
      lastUpdated: new Date()
    };
  }

  /**
   * Emergency SOS booking (instant dispatch)
   */
  @Post("/emergency/sos")
  @Summary("Emergency SOS")
  @Description("Create emergency booking with immediate dispatch")
  @Returns(200, Object)
  async emergencySOS(@BodyParams() request: {
    location: { latitude: number; longitude: number; address?: string };
    patientDetails?: { name?: string; age?: number; condition?: string };
    emergencyContact?: string;
  }): Promise<any> {
    // Create emergency booking
    const emergencyBooking = await this.bookingService.createBooking({
      userId: 'EMERGENCY_USER', // Special emergency user
      pickupLocation: {
        latitude: request.location.latitude,
        longitude: request.location.longitude,
        address: request.location.address || 'Emergency Location'
      },
      dropoffLocation: {
        latitude: 0, // Will be determined by hospital recommendation
        longitude: 0,
        address: 'To be determined'
      },
      priority: Priority.CRITICAL,
      ambulanceType: AmbulanceType.EMERGENCY,
      patientDetails: {
        name: request.patientDetails?.name || 'Emergency Patient',
        age: request.patientDetails?.age || 0,
        gender: 'Unknown',
        condition: request.patientDetails?.condition || 'Emergency',
        emergencyContact: request.emergencyContact || ''
      },
      bookingType: BookingType.EMERGENCY
    });

    // Immediate dispatch
    const dispatchResult = await this.smartDispatchService.dispatchAmbulance({
      bookingId: emergencyBooking.bookingId,
      pickupLocation: request.location,
      priority: Priority.CRITICAL,
      ambulanceType: AmbulanceType.EMERGENCY,
      patientCondition: request.patientDetails?.condition || 'Emergency'
    });

    // Get nearest hospitals
    const hospitalRecommendations = await this.hospitalIntegrationService.getHospitalRecommendations({
      patientLocation: request.location,
      patientCondition: request.patientDetails?.condition || 'Emergency',
      priority: Priority.CRITICAL,
      maxDistance: 100 // Extended range for emergency
    });

    return {
      bookingId: emergencyBooking.bookingId,
      status: 'EMERGENCY_DISPATCHED',
      estimatedArrival: dispatchResult.assignedDriver?.estimatedArrival,
      assignedDriver: dispatchResult.assignedDriver,
      nearestHospitals: hospitalRecommendations.slice(0, 2),
      emergencyNumber: '911',
      message: 'Emergency ambulance dispatched. Stay calm, help is on the way.',
      dispatchTime: dispatchResult.dispatchTime
    };
  }

  /**
   * Manual dispatch override (for emergency executives)
   */
  @Post("/:bookingId/dispatch/manual")
  @Summary("Manual dispatch")
  @Description("Manually assign a specific driver to a booking")
  @Returns(200, Object)
  async manualDispatch(
    @PathParams("bookingId") bookingId: string,
    @BodyParams() request: { driverId: string; reason: string }
  ): Promise<any> {
    const result = await this.smartDispatchService.manualDispatch(
      bookingId,
      request.driverId,
      request.reason
    );

    return result;
  }

  /**
   * Reserve hospital bed
   */
  @Post("/hospitals/:hospitalId/reserve")
  @Summary("Reserve hospital bed")
  @Description("Reserve a bed at a specific hospital")
  @Returns(200, Object)
  async reserveHospitalBed(
    @PathParams("hospitalId") hospitalId: string,
    @BodyParams() request: { bedType?: 'emergency' | 'icu' | 'general'; bookingId?: string }
  ): Promise<any> {
    const result = await this.hospitalIntegrationService.reserveBed(
      hospitalId,
      request.bedType || 'emergency'
    );

    // If booking ID provided, update booking with hospital info
    if (request.bookingId && result.success) {
      // In real system, would update booking with hospital assignment
      console.log(`Bed reserved for booking ${request.bookingId} at hospital ${hospitalId}`);
    }

    return result;
  }
}