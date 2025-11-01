import { Model, ObjectID, Unique } from "@tsed/mongoose";
import { Property, Required, Email, Enum, Default, Description } from "@tsed/schema";

export enum UserRole {
  USER = "user",
  DRIVER = "driver", 
  HOSPITAL = "hospital",
  EMERGENCY_EXECUTIVE = "emergency_executive",
  ADMIN = "admin"
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive", 
  SUSPENDED = "suspended",
  PENDING_VERIFICATION = "pending_verification"
}

@Model({
  collection: "users",
  schemaOptions: {
    timestamps: true
  }
})
export class User {
  @ObjectID("id")
  _id: string;

  @Property()
  @Required()
  @Description("Full name of the user")
  fullName: string;

  @Property()
  @Required()
  @Email()
  @Unique()
  @Description("Email address for login")
  email: string;

  @Property()
  @Required()
  @Description("Phone number with country code")
  phone: string;

  @Property()
  @Required()
  @Description("Encrypted password")
  password: string;

  @Property()
  @Required()
  @Enum(UserRole)
  @Description("User role in the system")
  role: UserRole;

  @Property()
  @Enum(UserStatus)
  @Default(UserStatus.PENDING_VERIFICATION)
  @Description("Current status of user account")
  status: UserStatus;

  @Property()
  @Description("Profile image URL")
  profileImage?: string;

  @Property()
  @Description("Date of birth")
  dateOfBirth?: Date;

  @Property()
  @Description("Emergency contact number")
  emergencyContact?: string;

  @Property()
  @Description("Blood group")
  bloodGroup?: string;

  @Property()
  @Description("Medical conditions or allergies")
  medicalConditions?: string[];

  @Property()
  @Description("Preferred language")
  language?: string;

  @Property()
  @Description("Address object")
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  @Property()
  @Description("Email verification status")
  isEmailVerified?: boolean;

  @Property()
  @Description("Phone verification status") 
  isPhoneVerified?: boolean;

  @Property()
  @Description("Last login timestamp")
  lastLogin?: Date;

  @Property()
  @Description("FCM token for push notifications")
  fcmToken?: string;

  @Property()
  @Description("Account creation timestamp")
  createdAt?: Date;

  @Property()
  @Description("Last update timestamp")
  updatedAt?: Date;
}