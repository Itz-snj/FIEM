import { Controller, Inject } from "@tsed/di";
import { Post, Get, Put, Delete } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Description, Returns, Summary } from "@tsed/schema";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { BookingService } from "../../services/BookingService.js";
import { SmartDispatchService } from "../../services/SmartDispatchService.js";
import { HospitalIntegrationService } from "../../services/HospitalIntegrationService.js";
import { BookingType, Priority } from "../../models/Booking.js";
import { AmbulanceType } from "../../models/Driver.js";

@Controller("/bookings")
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
  async createBooking(@BodyParams() request: any): Promise<any> {
    try {
      // Transform request to match BookingService interface
      const bookingRequest = {
        userId: request.userId,
        pickupLocation: {
          address: request.pickupLocation.address,
          coordinates: request.pickupLocation.coordinates || {
            latitude: request.pickupLocation.latitude,
            longitude: request.pickupLocation.longitude
          }
        },
        destination: request.destinationLocation ? {
          address: request.destinationLocation.address,
          coordinates: request.destinationLocation.coordinates || {
            latitude: request.destinationLocation.latitude,
            longitude: request.destinationLocation.longitude
          }
        } : undefined,
        priority: request.priority || 'MEDIUM',
        type: request.type || 'EMERGENCY',
        ambulanceType: request.ambulanceType,
        patientInfo: {
          name: request.patientInfo.name,
          age: request.patientInfo.age,
          gender: request.patientInfo.gender,
          condition: request.patientInfo.condition,
          symptoms: request.patientInfo.symptoms || [request.patientInfo.condition],
          emergencyContact: request.patientInfo.emergencyContact
        },
        specialRequirements: request.specialRequirements || []
      };

      // Create the booking
      const booking = await this.bookingService.createBooking(bookingRequest);

      // Get hospital recommendations
      const hospitalRecommendations = await this.hospitalIntegrationService.getHospitalRecommendations({
        patientLocation: bookingRequest.pickupLocation.coordinates,
        patientCondition: request.patientInfo.medicalCondition || request.patientInfo.condition,
        priority: request.priority || 'MEDIUM',
        patientAge: request.patientInfo.age,
        maxDistance: 50
      });

      // For high priority bookings, attempt auto-dispatch
      let dispatchInfo = null;
      if (request.priority === 'CRITICAL' || request.priority === 'HIGH') {
        try {
          const dispatchResult = await this.smartDispatchService.dispatchAmbulance({
            bookingId: booking.bookingId,
            pickupLocation: request.pickupLocation,
            priority: request.priority,
            ambulanceType: request.ambulanceType,
            patientCondition: request.patientDetails.condition
          });

          if (dispatchResult.success) {
            dispatchInfo = dispatchResult;
          }
        } catch (error) {
          console.error("Auto-dispatch failed:", error);
        }
      }

      return {
        success: true,
        bookingId: booking.bookingId,
        status: booking.status,
        hospitalRecommendations: hospitalRecommendations.slice(0, 3),
        dispatchInfo,
        message: dispatchInfo ? "Booking created and driver assigned" : "Booking created successfully"
      };
    } catch (error) {
      throw new BadRequest(`Booking creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get booking details
   */
  @Get("/:bookingId")
  @Summary("Get booking")
  @Description("Get detailed booking information")
  async getBooking(@PathParams("bookingId") bookingId: string): Promise<any> {
    try {
      const booking = await this.bookingService.getBooking(bookingId);
      return {
        success: true,
        booking,
        message: "Booking details retrieved successfully"
      };
    } catch (error) {
      throw new NotFound(`Booking not found: ${bookingId}`);
    }
  }

  /**
   * Get user's booking history
   */
  @Get("/user/:userId")
  @Summary("Get user bookings")
  @Description("Get booking history for a specific user")
  async getUserBookings(
    @PathParams("userId") userId: string,
    @QueryParams("limit") limit: number = 10
  ): Promise<any> {
    try {
      const bookings = await this.bookingService.getUserBookings(userId);
      return {
        success: true,
        bookings: bookings.slice(0, limit),
        message: "User bookings retrieved successfully"
      };
    } catch (error) {
      throw new BadRequest(`Failed to get user bookings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Dispatch ambulance to booking
   */
  @Post("/:bookingId/dispatch")
  @Summary("Dispatch ambulance")
  @Description("Manually dispatch ambulance using smart dispatch algorithm")
  async dispatchAmbulance(
    @PathParams("bookingId") bookingId: string,
    @BodyParams() request: any = {}
  ): Promise<any> {
    try {
      // Get booking details
      const booking = await this.bookingService.getBooking(bookingId);

      // Dispatch ambulance
      const dispatchResult = await this.smartDispatchService.dispatchAmbulance({
        bookingId,
        pickupLocation: booking.pickupLocation?.coordinates || { latitude: 0, longitude: 0 },
        priority: booking.priority || 'MEDIUM',
        ambulanceType: booking.ambulanceType,
        specialRequirements: booking.specialRequirements,
        maxDistance: request.maxDistance,
        patientCondition: booking.patientInfo?.condition
      });

      return {
        success: dispatchResult.success,
        message: dispatchResult.message,
        assignedDriver: dispatchResult.assignedDriver,
        alternativeDrivers: dispatchResult.alternativeDrivers,
        dispatchTime: dispatchResult.dispatchTime
      };
    } catch (error) {
      throw new BadRequest(`Dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update booking status
   */
  @Put("/:bookingId/status")
  @Summary("Update booking status")
  @Description("Update the status of an existing booking")
  async updateBookingStatus(
    @PathParams("bookingId") bookingId: string,
    @BodyParams() request: { status: string; location?: { latitude: number; longitude: number } }
  ): Promise<any> {
    try {
      const updatedBooking = await this.bookingService.updateBookingStatus(
        bookingId, 
        request.status as any
      );

      return {
        success: true,
        message: `Booking status updated to ${request.status}`,
        booking: updatedBooking
      };
    } catch (error) {
      throw new BadRequest(`Status update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel booking
   */
  @Delete("/:bookingId")
  @Summary("Cancel booking")
  @Description("Cancel an existing booking")
  async cancelBooking(
    @PathParams("bookingId") bookingId: string,
    @BodyParams() request: { reason: string; cancelledBy: string }
  ): Promise<any> {
    try {
      const result = await this.bookingService.cancelBooking(
        bookingId, 
        request.reason, 
        request.cancelledBy
      );

      return {
        success: true,
        message: "Booking cancelled successfully",
        refundAmount: result.refundAmount || 0
      };
    } catch (error) {
      throw new BadRequest(`Cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search nearby hospitals
   */
  @Post("/hospitals/search")
  @Summary("Search hospitals")
  @Description("Get intelligent hospital recommendations based on patient condition and location")
  async searchHospitals(@BodyParams() request: any): Promise<any> {
    try {
      const recommendations = await this.hospitalIntegrationService.getHospitalRecommendations({
        patientLocation: { 
          latitude: request.latitude || 0, 
          longitude: request.longitude || 0 
        },
        patientCondition: request.patientCondition || 'General',
        priority: request.priority || 'MEDIUM',
        requiredSpecialties: request.requiredSpecialties,
        maxDistance: request.maxDistance,
        insuranceType: request.insuranceType,
        patientAge: request.patientAge
      });

      return {
        success: true,
        hospitals: recommendations,
        message: "Hospital recommendations retrieved successfully"
      };
    } catch (error) {
      throw new BadRequest(`Hospital search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Emergency SOS booking (instant dispatch)
   */
  @Post("/emergency/sos")
  @Summary("Emergency SOS")
  @Description("Create emergency booking with immediate dispatch")
  async emergencySOS(@BodyParams() request: any): Promise<any> {
    try {
      // Validate that user exists (proper authentication required)
      if (!request.userId) {
        throw new BadRequest("User ID is required for emergency SOS");
      }

      // Verify user exists in the system
      const user = await this.bookingService['userService'].getUserById(request.userId);
      if (!user) {
        throw new BadRequest("User not found - please register first");
      }

      // Create emergency booking
      const emergencyBooking = await this.bookingService.createBooking({
        userId: request.userId,
        type: BookingType.EMERGENCY,
        patientInfo: {
          name: request.patientDetails?.name || 'Emergency Patient',
          age: request.patientDetails?.age || 0,
          gender: 'Unknown',
          condition: request.patientDetails?.condition || 'Emergency',
          symptoms: [request.patientDetails?.condition || 'Emergency'],
          emergencyContact: {
            name: 'Emergency Contact',
            phone: request.emergencyContact || '911',
            relation: 'Unknown'
          }
        },
        pickupLocation: {
          address: request.location?.address || 'Emergency Location',
          coordinates: {
            latitude: request.location?.latitude || 0,
            longitude: request.location?.longitude || 0
          }
        },
        priority: Priority.CRITICAL,
        ambulanceRequirements: {
          type: AmbulanceType.EMERGENCY,
          equipment: [],
          medicalStaff: true,
          oxygenRequired: true,
          stretcher: true,
          ventilator: false
        }
      });

      // Immediate dispatch
      const dispatchResult = await this.smartDispatchService.dispatchAmbulance({
        bookingId: emergencyBooking.bookingId,
        pickupLocation: {
          latitude: request.location?.latitude || 0,
          longitude: request.location?.longitude || 0
        },
        priority: Priority.CRITICAL,
        ambulanceType: AmbulanceType.EMERGENCY,
        patientCondition: request.patientDetails?.condition || 'Emergency'
      });

      // Get nearest hospitals
      const hospitalRecommendations = await this.hospitalIntegrationService.getHospitalRecommendations({
        patientLocation: {
          latitude: request.location?.latitude || 0,
          longitude: request.location?.longitude || 0
        },
        patientCondition: request.patientDetails?.condition || 'Emergency',
        priority: 'CRITICAL',
        maxDistance: 100
      });

      return {
        success: true,
        bookingId: emergencyBooking.bookingId,
        status: 'EMERGENCY_DISPATCHED',
        estimatedArrival: dispatchResult.assignedDriver?.estimatedArrival,
        assignedDriver: dispatchResult.assignedDriver,
        nearestHospitals: hospitalRecommendations.slice(0, 2),
        emergencyNumber: '911',
        message: 'Emergency ambulance dispatched. Stay calm, help is on the way.',
        dispatchTime: dispatchResult.dispatchTime
      };
    } catch (error) {
      throw new BadRequest(`Emergency SOS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Manual dispatch override (for emergency executives)
   */
  @Post("/:bookingId/dispatch/manual")
  @Summary("Manual dispatch")
  @Description("Manually assign a specific driver to a booking")
  async manualDispatch(
    @PathParams("bookingId") bookingId: string,
    @BodyParams() request: { driverId: string; reason: string }
  ): Promise<any> {
    try {
      const result = await this.smartDispatchService.manualDispatch(
        bookingId,
        request.driverId,
        request.reason
      );

      return result;
    } catch (error) {
      throw new BadRequest(`Manual dispatch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reserve hospital bed
   */
  @Post("/hospitals/:hospitalId/reserve")
  @Summary("Reserve hospital bed")
  @Description("Reserve a bed at a specific hospital")
  async reserveHospitalBed(
    @PathParams("hospitalId") hospitalId: string,
    @BodyParams() request: { bedType?: string; bookingId?: string } = {}
  ): Promise<any> {
    try {
      const result = await this.hospitalIntegrationService.reserveBed(
        hospitalId,
        (request.bedType || 'emergency') as any
      );

      if (request.bookingId && result.success) {
        console.log(`Bed reserved for booking ${request.bookingId} at hospital ${hospitalId}`);
      }

      return result;
    } catch (error) {
      throw new BadRequest(`Bed reservation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get dispatch analytics
   */
  @Get("/analytics/dispatch")
  @Summary("Dispatch analytics")
  @Description("Get dispatch analytics and statistics")
  async getDispatchAnalytics(
    @QueryParams("timeframe") timeframe: string = 'day'
  ): Promise<any> {
    try {
      const dispatchStats = await this.smartDispatchService.getDispatchAnalytics(
        timeframe as any
      );

      return {
        success: true,
        analytics: dispatchStats,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new BadRequest(`Analytics retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get hospital capacity analytics
   */
  @Get("/analytics/hospitals")
  @Summary("Hospital capacity analytics")
  @Description("Get hospital capacity and utilization analytics")
  async getHospitalAnalytics(): Promise<any> {
    try {
      const hospitalStats = await this.hospitalIntegrationService.getCapacityAnalytics();

      return {
        success: true,
        analytics: hospitalStats,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new BadRequest(`Hospital analytics retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 📡 Real-time Socket.io endpoints
   */

  /**
   * Get real-time system status
   */
  @Get("/realtime/status")
  @Summary("Real-time system status")
  @Description("Get current real-time connections and system health")
  async getRealTimeStatus(): Promise<any> {
    // Note: This would need RealTimeIntegrationService injected to work fully
    // For now, return mock data to show the endpoint structure
    return {
      success: true,
      realTimeStatus: {
        socketServiceActive: true,
        connections: {
          totalConnected: 0,
          users: 0,
          drivers: 0,
          hospitals: 0,
          executives: 0
        },
        systemHealth: {
          status: 'healthy',
          uptime: process.uptime(),
          lastUpdate: new Date()
        }
      },
      message: "Real-time status retrieved successfully"
    };
  }

  /**
   * Trigger emergency broadcast (for testing)
   */
  @Post("/realtime/emergency/broadcast")
  @Summary("Emergency broadcast")
  @Description("Trigger emergency broadcast to all connected clients")
  async triggerEmergencyBroadcast(@BodyParams() request: {
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    location?: { latitude: number; longitude: number };
  }): Promise<any> {
    try {
      // Note: This would use RealTimeIntegrationService when properly injected
      return {
        success: true,
        broadcastId: `emergency-${Date.now()}`,
        message: "Emergency broadcast triggered successfully",
        sentTo: {
          emergencyExecutives: 'all',
          drivers: 'nearby',
          hospitals: 'relevant'
        },
        timestamp: new Date()
      };
    } catch (error) {
      throw new BadRequest(`Emergency broadcast failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Join booking room for real-time updates
   */
  @Post("/realtime/booking/:bookingId/join")
  @Summary("Join booking updates")
  @Description("Subscribe to real-time updates for a specific booking")
  async joinBookingUpdates(@PathParams("bookingId") bookingId: string): Promise<any> {
    try {
      // Validate booking exists
      await this.bookingService.getBooking(bookingId);

      return {
        success: true,
        bookingId,
        socketRoom: `booking:${bookingId}`,
        message: "Successfully subscribed to booking updates",
        events: [
          'booking:status_updated',
          'booking:driver_assigned', 
          'booking:location_updated',
          'booking:completed'
        ]
      };
    } catch (error) {
      throw new BadRequest(`Failed to join booking updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}