import { Service } from "@tsed/di";
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
  // In-memory storage for demo purposes
  private users: any[] = [
    {
      _id: "demo-user-1",
      fullName: "Demo User",
      email: "user@demo.com",
      phone: "+1234567890",
      password: "password123",
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: "demo-driver-1", 
      fullName: "Demo Driver",
      email: "driver@demo.com",
      phone: "+1234567891",
      password: "password123",
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  async register(userData: UserRegistrationDTO): Promise<User> {
    // Check if user already exists
    const existingUser = this.users.find(u => 
      u.email === userData.email || u.phone === userData.phone
    );

    if (existingUser) {
      if (existingUser.email === userData.email) {
        throw new BadRequest("Email already registered");
      }
      throw new BadRequest("Phone number already registered");
    }

    // Create new user
    const newUser: any = {
      _id: "user-" + Date.now() + Math.random().toString(36).substr(2, 9),
      ...userData,
      status: UserStatus.PENDING_VERIFICATION,
      isEmailVerified: false,
      isPhoneVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.push(newUser);
    
    // Remove password from response
    const { password, ...userResponse } = newUser;
    return userResponse;
  }

  async login(loginData: UserLoginDTO): Promise<{ user: User; token: string }> {
    const user = this.users.find(u => u.email === loginData.email);

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
    user.lastLogin = new Date();
    user.updatedAt = new Date();

    const token = this.generateMockToken(user);
    
    // Remove password from response
    const { password, ...userResponse } = user;

    return {
      user: userResponse,
      token
    };
  }

  async getUserById(userId: string): Promise<User> {
    const user = this.users.find(u => u._id === userId);
    
    if (!user) {
      throw new NotFound("User not found");
    }

    const { password, ...userResponse } = user;
    return userResponse;
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