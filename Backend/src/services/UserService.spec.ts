import { describe, it, expect, beforeEach } from "vitest";
import { UserService, UserRegistrationDTO, UserLoginDTO } from "../services/UserService.js";
import { UserRole, UserStatus } from "../models/User.js";

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe("User Registration", () => {
    it("should register a new user successfully", async () => {
      const userData: UserRegistrationDTO = {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "+1234567892",
        password: "password123",
        role: UserRole.USER
      };

      const user = await userService.register(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.fullName).toBe(userData.fullName);
      expect(user.role).toBe(UserRole.USER);
      expect(user.status).toBe(UserStatus.PENDING_VERIFICATION);
      expect((user as any).password).toBeUndefined(); // Password should not be in response
    });

    it("should throw error for duplicate email", async () => {
      const userData: UserRegistrationDTO = {
        fullName: "Test User 2",
        email: "user@demo.com", // This email exists in mock data
        phone: "+1234567893",
        password: "password123",
        role: UserRole.USER
      };

      await expect(userService.register(userData)).rejects.toThrow("Email already registered");
    });
  });

  describe("User Login", () => {
    it("should login with valid credentials", async () => {
      const loginData: UserLoginDTO = {
        email: "user@demo.com",
        password: "password123"
      };

      const result = await userService.login(loginData);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(loginData.email);
      expect((result.user as any).password).toBeUndefined();
      expect(result.token).toContain("mock-jwt-");
    });

    it("should throw error for invalid credentials", async () => {
      const loginData: UserLoginDTO = {
        email: "user@demo.com",
        password: "wrongpassword"
      };

      await expect(userService.login(loginData)).rejects.toThrow("Invalid email or password");
    });

    it("should throw error for non-existent user", async () => {
      const loginData: UserLoginDTO = {
        email: "nonexistent@example.com",
        password: "password123"
      };

      await expect(userService.login(loginData)).rejects.toThrow("Invalid email or password");
    });
  });

  describe("User Management", () => {
    it("should get user by ID", async () => {
      const user = await userService.getUserById("demo-user-1");

      expect(user).toBeDefined();
      expect(user._id).toBe("demo-user-1");
      expect(user.email).toBe("user@demo.com");
      expect((user as any).password).toBeUndefined();
    });

    it("should update user profile", async () => {
      const updateData = {
        fullName: "Updated Name",
        phone: "+1234567899"
      };

      const user = await userService.updateUser("demo-user-1", updateData);

      expect(user.fullName).toBe("Updated Name");
      expect(user.phone).toBe("+1234567899");
    });

    it("should get users by role", async () => {
      const drivers = await userService.getUsersByRole(UserRole.DRIVER);
      
      expect(drivers).toBeDefined();
      expect(drivers.length).toBeGreaterThan(0);
      expect(drivers[0].role).toBe(UserRole.DRIVER);
    });

    it("should search users", async () => {
      const results = await userService.searchUsers("Demo");
      
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].fullName).toContain("Demo");
    });
  });

  describe("User Verification", () => {
    it("should verify email", async () => {
      const user = await userService.verifyEmail("demo-user-1");

      expect(user.isEmailVerified).toBe(true);
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it("should verify phone", async () => {
      const user = await userService.verifyPhone("demo-user-1");

      expect(user.isPhoneVerified).toBe(true);
    });
  });

  describe("Password Management", () => {
    it("should change password with valid old password", async () => {
      await expect(
        userService.changePassword("demo-user-1", "password123", "newpassword123")
      ).resolves.not.toThrow();
    });

    it("should throw error for incorrect old password", async () => {
      await expect(
        userService.changePassword("demo-user-1", "wrongpassword", "newpassword123")
      ).rejects.toThrow("Current password is incorrect");
    });
  });
});