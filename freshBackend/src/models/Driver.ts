import { Model, ObjectID, Ref } from "@tsed/mongoose";
import { Property, Required, Enum, Default, Description } from "@tsed/schema";
import { User } from "./User.js";

export enum DriverStatus {
  AVAILABLE = "available",
  BUSY = "busy",
  OFFLINE = "offline",
  ON_DUTY = "on_duty"
}

export enum AmbulanceType {
  BASIC = "basic",
  ADVANCED = "advanced", 
  CARDIAC = "cardiac",
  NEONATAL = "neonatal",
  EMERGENCY = "emergency"
}

export enum VehicleStatus {
  ACTIVE = "active",
  MAINTENANCE = "maintenance",
  OUT_OF_SERVICE = "out_of_service"
}

@Model({
  collection: "drivers",
  schemaOptions: {
    timestamps: true
  }
})
export class Driver {
  @ObjectID("id")
  _id: string;

  @Property()
  @Ref(User)
  @Required()
  @Description("Reference to User model")
  userId: Ref<User>;

  @Property()
  @Required()
  @Description("Driver license number")
  licenseNumber: string;

  @Property()
  @Required()
  @Description("License expiry date")
  licenseExpiry: Date;

  @Property()
  @Enum(DriverStatus)
  @Default(DriverStatus.OFFLINE)
  @Description("Current driver status")
  status: DriverStatus;

  @Property()
  @Description("Current location coordinates")
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    lastUpdated: Date;
  };

  @Property()
  @Description("Ambulance vehicle details")
  vehicle: {
    registrationNumber: string;
    type: AmbulanceType;
    capacity: number;
    facilities: string[];
    status: VehicleStatus;
    insuranceExpiry: Date;
    lastServiceDate?: Date;
    nextServiceDue?: Date;
  };

  @Property()
  @Description("Driver ratings and reviews")
  rating?: {
    average: number;
    totalRatings: number;
    reviews: Array<{
      rating: number;
      comment: string;
      bookingId: string;
      userId: string;
      date: Date;
    }>;
  };

  @Property()
  @Description("Medical certifications")
  certifications?: string[];

  @Property()
  @Description("Experience in years")
  experience?: number;

  @Property()
  @Description("Emergency contact for driver")
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };

  @Property()
  @Description("Driver statistics")
  statistics?: {
    totalRides: number;
    totalDistance: number;
    averageResponseTime: number;
    completedRides: number;
    cancelledRides: number;
  };

  @Property()
  @Description("Verification documents status")
  verification?: {
    documentsUploaded: boolean;
    backgroundCheck: boolean;
    medicalCertificate: boolean;
    isVerified: boolean;
    verificationDate?: Date;
  };

  @Property()
  @Description("Driver availability schedule")
  availability?: {
    isOnline: boolean;
    workingHours?: {
      start: string;
      end: string;
    };
    daysOfWeek?: string[];
  };

  @Property()
  @Description("Account creation timestamp")
  createdAt?: Date;

  @Property()
  @Description("Last update timestamp") 
  updatedAt?: Date;
}