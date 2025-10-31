import { Model, ObjectID, Ref } from "@tsed/mongoose";
import { Property, Required, Enum, Default, Description } from "@tsed/schema";
import { User } from "./User.js";
import { Driver } from "./Driver.js";
import { Hospital } from "./Hospital.js";

export enum BookingStatus {
  REQUESTED = "requested",
  CONFIRMED = "confirmed",
  DRIVER_ASSIGNED = "driver_assigned",
  DRIVER_ENROUTE = "driver_enroute",
  DRIVER_ARRIVED = "driver_arrived",
  PATIENT_PICKED = "patient_picked",
  IN_TRANSIT = "in_transit",
  ARRIVED_HOSPITAL = "arrived_hospital",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

export enum BookingType {
  EMERGENCY = "emergency",
  SCHEDULED = "scheduled",
  TRANSFER = "transfer"
}

export enum Priority {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical"
}

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  REFUNDED = "refunded",
  FAILED = "failed"
}

@Model({
  collection: "bookings",
  schemaOptions: {
    timestamps: true
  }
})
export class Booking {
  @ObjectID("id")
  _id: string;

  @Property()
  @Required()
  @Description("Unique booking reference number")
  bookingNumber: string;

  @Property()
  @Ref(User)
  @Required()
  @Description("Patient or person requesting ambulance")
  userId: Ref<User>;

  @Property()
  @Ref(Driver)
  @Description("Assigned driver")
  driverId?: Ref<Driver>;

  @Property()
  @Ref(Hospital)
  @Description("Destination hospital")
  hospitalId?: Ref<Hospital>;

  @Property()
  @Enum(BookingType)
  @Required()
  @Description("Type of booking")
  type: BookingType;

  @Property()
  @Enum(Priority)
  @Default(Priority.MEDIUM)
  @Description("Medical priority level")
  priority: Priority;

  @Property()
  @Enum(BookingStatus)
  @Default(BookingStatus.REQUESTED)
  @Description("Current booking status")
  status: BookingStatus;

  @Property()
  @Required()
  @Description("Pickup location details")
  pickupLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    landmarks?: string;
    contactPerson?: {
      name: string;
      phone: string;
    };
  };

  @Property()
  @Description("Destination location details")
  destination?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    hospitalName?: string;
    department?: string;
  };

  @Property()
  @Description("Patient medical information")
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

  @Property()
  @Description("Ambulance requirements")
  ambulanceRequirements?: {
    type: string; // basic, advanced, cardiac, etc.
    equipment: string[];
    medicalStaff: boolean;
    oxygenRequired: boolean;
    stretcher: boolean;
    ventilator: boolean;
  };

  @Property()
  @Description("Scheduled booking time (for non-emergency)")
  scheduledTime?: Date;

  @Property()
  @Description("Booking timeline")
  timeline: Array<{
    status: BookingStatus;
    timestamp: Date;
    location?: {
      latitude: number;
      longitude: number;
    };
    notes?: string;
  }>;

  @Property()
  @Description("Real-time tracking data")
  tracking?: {
    driverLocation?: {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
      lastUpdated: Date;
    };
    estimatedArrivalTime?: Date;
    route?: Array<{
      latitude: number;
      longitude: number;
    }>;
    distance?: number; // in kilometers
    duration?: number; // in minutes
  };

  @Property()
  @Description("Payment information")
  payment: {
    amount: number;
    currency: string;
    method?: string;
    status: PaymentStatus;
    transactionId?: string;
    breakdown?: {
      baseFare: number;
      distanceCharge: number;
      timeCharge: number;
      emergencyCharge?: number;
      hospitalFee?: number;
      taxes: number;
      discount?: number;
    };
  };

  @Property()
  @Description("Communication logs")
  communications?: Array<{
    type: string; // call, message, notification
    from: string;
    to: string;
    content?: string;
    timestamp: Date;
    duration?: number; // for calls
  }>;

  @Property()
  @Description("Rating and feedback")
  feedback?: {
    driverRating?: number;
    hospitalRating?: number;
    serviceRating?: number;
    comments?: string;
    complaintCategory?: string;
    ratingDate?: Date;
  };

  @Property()
  @Description("SOS alert information")
  sosAlert?: {
    isTriggered: boolean;
    triggeredBy: string;
    triggerTime?: Date;
    autoDetected?: boolean;
    emergencyContacts?: Array<{
      name: string;
      phone: string;
      notified: boolean;
    }>;
  };

  @Property()
  @Description("Cancellation details")
  cancellation?: {
    reason: string;
    cancelledBy: string; // user, driver, system
    cancellationTime: Date;
    refundAmount?: number;
    refundStatus?: string;
  };

  @Property()
  @Description("Additional notes and instructions")
  notes?: string;

  @Property()
  @Description("System metadata")
  metadata?: {
    deviceInfo?: string;
    appVersion?: string;
    ipAddress?: string;
    userAgent?: string;
    bookingSource?: string; // app, web, call, emergency_executive
  };

  @Property()
  @Description("Account creation timestamp")
  createdAt?: Date;

  @Property()
  @Description("Last update timestamp")
  updatedAt?: Date;
}