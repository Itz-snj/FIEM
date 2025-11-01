import { Controller, Inject } from "@tsed/di";
import { Post, Get, Put } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Description, Returns, Summary } from "@tsed/schema";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { HospitalIntegrationService } from "../../services/HospitalIntegrationService.js";

@Controller("/hospitals")
export class HospitalController {
  @Inject()
  private hospitalIntegrationService: HospitalIntegrationService;

  /**
   * Get hospital details
   */
  @Get("/:hospitalId")
  @Summary("Get hospital details")
  @Description("Get detailed information about a specific hospital")
  async getHospital(@PathParams("hospitalId") hospitalId: string): Promise<any> {
    try {
      // Mock hospital data for testing
      const mockHospital = {
        id: hospitalId,
        name: `Hospital ${hospitalId}`,
        address: "123 Medical Center Dr, San Francisco, CA",
        location: {
          latitude: 37.7749 + Math.random() * 0.01,
          longitude: -122.4194 + Math.random() * 0.01
        },
        capacity: {
          emergencyBeds: Math.floor(Math.random() * 20) + 10,
          icuBeds: Math.floor(Math.random() * 10) + 5,
          ventilators: Math.floor(Math.random() * 8) + 3,
          lastUpdated: new Date()
        },
        specializations: ["emergency", "cardiology", "trauma"],
        contactInfo: {
          phone: "+1-555-HOSPITAL",
          emergency: "+1-555-EMERGENCY"
        }
      };

      return {
        success: true,
        hospital: mockHospital,
        message: "Hospital details retrieved successfully"
      };
    } catch (error) {
      throw new NotFound(`Hospital not found: ${hospitalId}`);
    }
  }

  /**
   * Update hospital capacity (Phase 4 Feature)
   */
  @Put("/:hospitalId/capacity")
  @Summary("Update hospital capacity")
  @Description("Update real-time hospital capacity information")
  async updateHospitalCapacity(
    @PathParams("hospitalId") hospitalId: string,
    @BodyParams() request: {
      emergencyBeds?: number;
      icuBeds?: number;
      ventilators?: number;
      operatingRooms?: number;
      lastUpdated?: string;
    }
  ): Promise<any> {
    try {
      // In a real implementation, this would update the database
      // and broadcast to all connected clients via WebSocket
      
      const updatedCapacity = {
        hospitalId,
        emergencyBeds: request.emergencyBeds || 0,
        icuBeds: request.icuBeds || 0,
        ventilators: request.ventilators || 0,
        operatingRooms: request.operatingRooms || 0,
        lastUpdated: request.lastUpdated || new Date().toISOString(),
        updatedAt: new Date()
      };

      // Mock WebSocket broadcast notification
      const broadcastInfo = {
        event: 'hospital:capacity_updated',
        hospitalId,
        capacity: updatedCapacity,
        broadcastTo: ['emergency_executives', 'dispatchers', 'nearby_ambulances']
      };

      return {
        success: true,
        hospitalId,
        capacity: updatedCapacity,
        broadcastInfo,
        message: "Hospital capacity updated and broadcasted successfully"
      };
    } catch (error) {
      throw new BadRequest(`Failed to update hospital capacity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get hospitals by specialization
   */
  @Get("/specialization/:specialty")
  @Summary("Get hospitals by specialty")
  @Description("Get hospitals that offer a specific medical specialization")
  async getHospitalsBySpecialization(
    @PathParams("specialty") specialty: string,
    @QueryParams("latitude") latitude?: number,
    @QueryParams("longitude") longitude?: number,
    @QueryParams("radius") radius: number = 25000
  ): Promise<any> {
    try {
      // Mock hospitals with the requested specialization
      const mockHospitals = [
        {
          id: `hospital-${specialty}-1`,
          name: `${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Medical Center`,
          specializations: [specialty, "emergency"],
          location: {
            latitude: latitude ? latitude + Math.random() * 0.01 : 37.7749,
            longitude: longitude ? longitude + Math.random() * 0.01 : -122.4194
          },
          distance: Math.floor(Math.random() * radius / 1000) + 1,
          capacity: {
            emergencyBeds: Math.floor(Math.random() * 15) + 5,
            icuBeds: Math.floor(Math.random() * 8) + 2,
            availableNow: true
          }
        },
        {
          id: `hospital-${specialty}-2`,
          name: `University ${specialty.charAt(0).toUpperCase() + specialty.slice(1)} Hospital`,
          specializations: [specialty, "research", "emergency"],
          location: {
            latitude: latitude ? latitude + Math.random() * 0.02 : 37.7849,
            longitude: longitude ? longitude + Math.random() * 0.02 : -122.4094
          },
          distance: Math.floor(Math.random() * radius / 1000) + 2,
          capacity: {
            emergencyBeds: Math.floor(Math.random() * 20) + 8,
            icuBeds: Math.floor(Math.random() * 12) + 4,
            availableNow: Math.random() > 0.3
          }
        }
      ];

      return {
        success: true,
        specialty,
        hospitals: mockHospitals,
        searchRadius: radius,
        count: mockHospitals.length,
        message: `Found ${mockHospitals.length} hospitals with ${specialty} specialization`
      };
    } catch (error) {
      throw new BadRequest(`Failed to search hospitals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all hospitals with current capacity
   */
  @Get("/")
  @Summary("Get all hospitals")
  @Description("Get list of all hospitals with current capacity information")
  async getAllHospitals(
    @QueryParams("includeCapacity") includeCapacity: boolean = true
  ): Promise<any> {
    try {
      const mockHospitals = [
        {
          id: "hospital-1",
          name: "San Francisco General Hospital",
          address: "1001 Potrero Ave, San Francisco, CA",
          location: { latitude: 37.7749, longitude: -122.4194 },
          specializations: ["emergency", "trauma", "cardiology"],
          capacity: includeCapacity ? {
            emergencyBeds: 25,
            icuBeds: 12,
            ventilators: 8,
            lastUpdated: new Date()
          } : undefined
        },
        {
          id: "hospital-2", 
          name: "UCSF Medical Center",
          address: "505 Parnassus Ave, San Francisco, CA",
          location: { latitude: 37.7632, longitude: -122.4583 },
          specializations: ["emergency", "neurology", "oncology"],
          capacity: includeCapacity ? {
            emergencyBeds: 30,
            icuBeds: 18,
            ventilators: 12,
            lastUpdated: new Date()
          } : undefined
        },
        {
          id: "hospital-3",
          name: "California Pacific Medical Center",
          address: "2333 Buchanan St, San Francisco, CA", 
          location: { latitude: 37.7886, longitude: -122.4324 },
          specializations: ["emergency", "maternity", "pediatrics"],
          capacity: includeCapacity ? {
            emergencyBeds: 20,
            icuBeds: 10,
            ventilators: 6,
            lastUpdated: new Date()
          } : undefined
        }
      ];

      return {
        success: true,
        hospitals: mockHospitals,
        count: mockHospitals.length,
        includeCapacity,
        message: "Hospitals retrieved successfully"
      };
    } catch (error) {
      throw new BadRequest(`Failed to get hospitals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send emergency notification to hospital (Phase 4 Feature)
   */
  @Post("/:hospitalId/notify")
  @Summary("Send hospital notification")
  @Description("Send emergency notification to a specific hospital")
  async notifyHospital(
    @PathParams("hospitalId") hospitalId: string,
    @BodyParams() request: {
      notificationType: 'incoming_patient' | 'capacity_request' | 'emergency_alert';
      message: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      bookingId?: string;
      estimatedArrival?: string;
      patientInfo?: any;
    }
  ): Promise<any> {
    try {
      const notificationId = `notif-${Date.now()}`;
      
      return {
        success: true,
        notificationId,
        hospitalId,
        notificationType: request.notificationType,
        priority: request.priority,
        message: request.message,
        bookingId: request.bookingId,
        estimatedArrival: request.estimatedArrival,
        sentAt: new Date(),
        deliveryStatus: 'delivered',
        acknowledgmentRequired: request.priority === 'critical' || request.priority === 'high'
      };
    } catch (error) {
      throw new BadRequest(`Failed to notify hospital: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}