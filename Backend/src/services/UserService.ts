import { Service } from "@tsed/di";
import { Model } from "@tsed/mongoose";
import { Inject } from "@tsed/di";
import { BadRequest, Unauthorized, NotFound } from "@tsed/exceptions";
import { User, UserRole, UserStatus } from "../models/User.js";
import type { Model as MongooseModelType } from "mongoose";

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
  @Inject(User)
  private userModel: MongooseModelType<User>;

  async register(userData: UserRegistrationDTO): Promise<any> {
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
      fullName: userData.fullName,
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

  async login(loginData: UserLoginDTO): Promise<{ user: any; token: string }> {
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

  async getUserById(userId: string): Promise<any> {
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

  async updateUser(userId: string, updateData: UserUpdateDTO): Promise<any> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFound("User not found");
    }

    // Update user with new data
    await this.userModel.updateOne(
      { _id: userId },
      {
        ...updateData,
        updatedAt: new Date()
      }
    );

    // Return updated user
    return this.getUserById(userId);
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<any> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFound("User not found");
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        status,
        updatedAt: new Date()
      }
    );

    return this.getUserById(userId);
  }

  async verifyEmail(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFound("User not found");
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        isEmailVerified: true,
        status: UserStatus.ACTIVE,
        updatedAt: new Date()
      }
    );

    return this.getUserById(userId);
  }

  async verifyPhone(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFound("User not found");
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        isPhoneVerified: true,
        updatedAt: new Date()
      }
    );

    return this.getUserById(userId);
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<any> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFound("User not found");
    }

    if (oldPassword !== user.password) {
      throw new BadRequest("Current password is incorrect");
    }

    await this.userModel.updateOne(
      { _id: userId },
      {
        password: newPassword, // In production, hash this!
        updatedAt: new Date()
      }
    );

    return { message: "Password changed successfully" };
  }

  async getUsersByRole(role: UserRole): Promise<any[]> {
    const users = await this.userModel.find({ role }).select('-password');
    
    return users.map(user => {
      const userObj = user.toObject();
      return {
        id: userObj._id.toString(),
        ...userObj
      };
    });
  }

  async searchUsers(query: string): Promise<any[]> {
    const users = await this.userModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    }).select('-password');

    return users.map(user => {
      const userObj = user.toObject();
      return {
        id: userObj._id.toString(),
        ...userObj
      };
    });
  }

  // Helper method to generate mock JWT token
  private generateMockToken(user: any): string {
    // In production, use proper JWT signing
    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      iat: Date.now()
    };

    // For demo purposes, just return base64 encoded payload
    return Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
  }
}