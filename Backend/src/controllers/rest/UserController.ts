import { Controller } from "@tsed/di";
import { Post, Get, Put, Delete } from "@tsed/schema";
import { PathParams, BodyParams } from "@tsed/platform-params";
import { Description, Returns, Summary } from "@tsed/schema";
import { BadRequest, Unauthorized, NotFound } from "@tsed/exceptions";
import { UserService } from "../../services/UserService.js";
import { User, UserRole, UserStatus } from "../../models/User.js";

// Define DTOs locally to avoid import issues
interface UserRegistrationDTO {
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

interface UserLoginDTO {
  email: string;
  password: string;
}

interface UserUpdateDTO {
  fullName?: string;
  phone?: string;
  dateOfBirth?: Date;
  emergencyContact?: string;
  bloodGroup?: string;
  address?: any;
  profileImage?: string;
  language?: string;
}

@Controller("/users")
export class UserController {
  constructor(private userService: UserService) {}

  @Post("/register")
  @Summary("Register a new user")
  @Description("Register a new user with email, password and role")
  @Returns(201, User)
  async register(@BodyParams() userData: UserRegistrationDTO): Promise<User> {
    return this.userService.register(userData);
  }

  @Post("/login")
  @Summary("User login")
  @Description("Authenticate user and return JWT token")
  @Returns(200, Object)
  async login(@BodyParams() loginData: UserLoginDTO): Promise<{ user: User; token: string }> {
    return this.userService.login(loginData);
  }

  @Get("/:id")
  @Summary("Get user by ID")
  @Description("Retrieve user information by user ID")
  @Returns(200, User)
  @Returns(404, NotFound)
  async getUserById(@PathParams("id") id: string): Promise<User> {
    return this.userService.getUserById(id);
  }

  @Put("/:id")
  @Summary("Update user profile")
  @Description("Update user profile information")
  @Returns(200, User)
  @Returns(404, NotFound)
  async updateUser(
    @PathParams("id") id: string,
    @BodyParams() updateData: UserUpdateDTO
  ): Promise<User> {
    return this.userService.updateUser(id, updateData);
  }

  @Put("/:id/status")
  @Summary("Update user status")
  @Description("Update user account status (admin only)")
  @Returns(200, User)
  @Returns(404, NotFound)
  async updateUserStatus(
    @PathParams("id") id: string,
    @BodyParams("status") status: UserStatus
  ): Promise<User> {
    return this.userService.updateUserStatus(id, status);
  }

  @Post("/:id/verify-email")
  @Summary("Verify user email")
  @Description("Mark user email as verified")
  @Returns(200, User)
  @Returns(404, NotFound)
  async verifyEmail(@PathParams("id") id: string): Promise<User> {
    return this.userService.verifyEmail(id);
  }

  @Post("/:id/verify-phone")
  @Summary("Verify user phone")
  @Description("Mark user phone as verified")
  @Returns(200, User)
  @Returns(404, NotFound)
  async verifyPhone(@PathParams("id") id: string): Promise<User> {
    return this.userService.verifyPhone(id);
  }

  @Put("/:id/change-password")
  @Summary("Change user password")
  @Description("Change user password with current password verification")
  @Returns(200, Object)
  @Returns(400, BadRequest)
  @Returns(404, NotFound)
  async changePassword(
    @PathParams("id") id: string,
    @BodyParams("oldPassword") oldPassword: string,
    @BodyParams("newPassword") newPassword: string
  ): Promise<{ message: string }> {
    await this.userService.changePassword(id, oldPassword, newPassword);
    return { message: "Password changed successfully" };
  }

  @Get("/role/:role")
  @Summary("Get users by role")
  @Description("Retrieve all users with specific role")
  @Returns(200, Array)
  async getUsersByRole(@PathParams("role") role: UserRole): Promise<User[]> {
    return this.userService.getUsersByRole(role);
  }

  @Get("/search/:query")
  @Summary("Search users")
  @Description("Search users by name, email or phone")
  @Returns(200, Array)
  async searchUsers(
    @PathParams("query") query: string,
    @BodyParams("role") role?: UserRole
  ): Promise<User[]> {
    return this.userService.searchUsers(query, role);
  }
}