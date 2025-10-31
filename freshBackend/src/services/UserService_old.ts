import { Service } from "@tsed/di";
import { MongooseModel } from "@tsed/mongoose";
import { Inject } from "@tsed/di";
import { BadRequest, Unauthorized, NotFound } from "@tsed/exceptions";
import { User, UserRole, UserStatus } from "../models/User.js";

export interface UserRegistrationDTO {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  dateOfBirth?: Date;
  emergencyContact?: string;
  bloodGroup?: string;
  address?: any;
}

export interface UserLoginDTO {
  email: string;
  password: string;
}

export interface UserUpdateDTO {
  fullName?: string;
  phone?: string;
  dateOfBirth?: Date;
  emergencyContact?: string;
  bloodGroup?: string;
  address?: any;
  profileImage?: string;
  language?: string;
}

@Service()
export class UserService {
  @Inject()
  private userModel: MongooseModel<User>;

  async register(userData: UserRegistrationDTO): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [
        { email: userData.email },
        { phone: userData.phone }
      ]
    });

    if (existingUser) {
      if (existingUser.email === userData.email) {
        throw new BadRequest("Email already registered");
      }
      throw new BadRequest("Phone number already registered");
    }

    // Create new user
    const newUser = new this.userModel({
      name: userData.fullName,
      email: userData.email,
      phone: userData.phone,
      password: userData.password, // In production, hash this!
      role: userData.role,
      status: UserStatus.PENDING_VERIFICATION,
      isEmailVerified: false,
      isPhoneVerified: false
    });

    const savedUser = await newUser.save();
    
    // Convert to plain object and remove password
    const userObj = savedUser.toObject();
    const { password, ...userResponse } = userObj;
    
    return {
      id: userObj._id.toString(),
      ...userResponse
    };
  }

  async login(loginData: UserLoginDTO): Promise<{ user: User; token: string }> {
    const user = await this.userModel.findOne({ email: loginData.email });

    if (!user) {
      throw new Unauthorized("Invalid email or password");
    }

    if (loginData.password !== user.password) {
      throw new Unauthorized("Invalid email or password");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new Unauthorized("Account is suspended. Please contact support.");
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new Unauthorized("Account is inactive. Please contact support.");
    }

    // Update last login
    await this.userModel.updateOne(
      { _id: user._id },
      { 
        lastLogin: new Date(),
        updatedAt: new Date()
      }
    );

    const token = this.generateMockToken(user);
    
    // Remove password from response
    const userObj = user.toObject();
    const { password, ...userResponse } = userObj;

    return {
      user: {
        id: userObj._id.toString(),
        ...userResponse
      },
      token
    };
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new NotFound("User not found");
    }

    const userObj = user.toObject();
    const { password, ...userResponse } = userObj;
    return {
      id: userObj._id.toString(),
      ...userResponse
    };
  }

  async updateUser(userId: string, updateData: UserUpdateDTO): Promise<User> {
    const userIndex = this.users.findIndex(u => u._id === userId);

    if (userIndex === -1) {
      throw new NotFound("User not found");
    }

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...updateData,
      updatedAt: new Date()
    };

    const { password, ...userResponse } = this.users[userIndex];
    return userResponse;
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    const userIndex = this.users.findIndex(u => u._id === userId);

    if (userIndex === -1) {
      throw new NotFound("User not found");
    }

    this.users[userIndex].status = status;
    this.users[userIndex].updatedAt = new Date();

    const { password, ...userResponse } = this.users[userIndex];
    return userResponse;
  }

  async verifyEmail(userId: string): Promise<User> {
    const userIndex = this.users.findIndex(u => u._id === userId);

    if (userIndex === -1) {
      throw new NotFound("User not found");
    }

    this.users[userIndex].isEmailVerified = true;
    this.users[userIndex].status = UserStatus.ACTIVE;
    this.users[userIndex].updatedAt = new Date();

    const { password, ...userResponse } = this.users[userIndex];
    return userResponse;
  }

  async verifyPhone(userId: string): Promise<User> {
    const userIndex = this.users.findIndex(u => u._id === userId);

    if (userIndex === -1) {
      throw new NotFound("User not found");
    }

    this.users[userIndex].isPhoneVerified = true;
    this.users[userIndex].updatedAt = new Date();

    const { password, ...userResponse } = this.users[userIndex];
    return userResponse;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = this.users.find(u => u._id === userId);

    if (!user) {
      throw new NotFound("User not found");
    }

    if (oldPassword !== user.password) {
      throw new BadRequest("Current password is incorrect");
    }

    user.password = newPassword;
    user.updatedAt = new Date();
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return this.users
      .filter(u => u.role === role)
      .map(({ password, ...user }) => user);
  }

  async searchUsers(query: string, role?: UserRole): Promise<User[]> {
    let filteredUsers = this.users.filter(user => 
      user.fullName.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      user.phone.includes(query)
    );

    if (role) {
      filteredUsers = filteredUsers.filter(u => u.role === role);
    }

    return filteredUsers.map(({ password, ...user }) => user);
  }

  private generateMockToken(user: any): string {
    return `mock-jwt-${user._id}-${Date.now()}`;
  }
}