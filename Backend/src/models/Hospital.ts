import { Model, ObjectID, Ref } from "@tsed/mongoose";
import { Property, Required, Enum, Default, Description } from "@tsed/schema";
import { User } from "./User.js";

export enum HospitalType {
  GOVERNMENT = "government",
  PRIVATE = "private",
  SPECIALIZED = "specialized",
  EMERGENCY = "emergency"
}

export enum DepartmentType {
  EMERGENCY = "emergency",
  CARDIOLOGY = "cardiology", 
  NEUROLOGY = "neurology",
  ORTHOPEDICS = "orthopedics",
  PEDIATRICS = "pediatrics",
  MATERNITY = "maternity",
  ICU = "icu",
  TRAUMA = "trauma",
  GENERAL = "general"
}

@Model({
  collection: "hospitals",
  schemaOptions: {
    timestamps: true
  }
})
export class Hospital {
  @ObjectID("id")
  _id: string;

  @Property()
  @Ref(User)
  @Required()
  @Description("Reference to User model")
  userId: Ref<User>;

  @Property()
  @Required()
  @Description("Hospital name")
  name: string;

  @Property()
  @Required()
  @Description("Hospital registration number")
  registrationNumber: string;

  @Property()
  @Enum(HospitalType)
  @Required()
  @Description("Type of hospital")
  type: HospitalType;

  @Property()
  @Required()
  @Description("Hospital address with coordinates")
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    landmarks?: string;
  };

  @Property()
  @Description("Contact information")
  contact: {
    mainPhone: string;
    emergencyPhone?: string;
    fax?: string;
    email?: string;
    website?: string;
  };

  @Property()
  @Description("Available departments and specializations")
  departments: Array<{
    name: string;
    type: DepartmentType;
    isAvailable24x7: boolean;
    contactNumber?: string;
    headDoctor?: string;
  }>;

  @Property()
  @Description("Hospital facilities and equipment")
  facilities: {
    totalBeds: number;
    availableBeds: number;
    icuBeds: number;
    emergencyBeds: number;
    operatingTheaters: number;
    ambulanceServices: boolean;
    bloodBank: boolean;
    pharmacy: boolean;
    laboratory: boolean;
    radiology: boolean;
    mri: boolean;
    ctScan: boolean;
    dialysis: boolean;
    ventilators: number;
    oxygenSupply: boolean;
  };

  @Property()
  @Description("Current capacity and availability")
  availability: {
    isAcceptingPatients: boolean;
    emergencyAvailable: boolean;
    lastUpdated: Date;
    waitingTime?: number; // in minutes
    occupancyRate?: number; // percentage
  };

  @Property()
  @Description("Hospital ratings and reviews")
  rating?: {
    average: number;
    totalRatings: number;
    reviews: Array<{
      rating: number;
      comment: string;
      patientId: string;
      date: Date;
      category: string; // service, cleanliness, staff, facilities
    }>;
  };

  @Property()
  @Description("Medical staff information")
  staff?: {
    doctors: number;
    nurses: number;
    emergencyStaff: number;
    specialists: Array<{
      specialization: string;
      count: number;
    }>;
  };

  @Property()
  @Description("Insurance and payment options")
  paymentOptions?: {
    cashless: boolean;
    insuranceAccepted: string[];
    emergencyPolicy: string;
    paymentMethods: string[];
  };

  @Property()
  @Description("Verification and accreditation")
  verification?: {
    isVerified: boolean;
    accreditations: string[];
    licenses: Array<{
      type: string;
      number: string;
      expiryDate: Date;
    }>;
    verificationDate?: Date;
  };

  @Property()
  @Description("Emergency protocols")
  emergencyProtocol?: {
    responseTime: number; // average in minutes
    traumaCapable: boolean;
    helipadAvailable: boolean;
    emergencyProcedures: string[];
  };

  @Property()
  @Description("Hospital statistics")
  statistics?: {
    totalPatientsHandled: number;
    emergencyCases: number;
    averageWaitTime: number;
    patientSatisfactionScore: number;
    monthlyFootfall: number;
  };

  @Property()
  @Description("Account creation timestamp")
  createdAt?: Date;

  @Property()
  @Description("Last update timestamp")
  updatedAt?: Date;
}