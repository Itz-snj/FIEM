/**
 * 🚑 UBER-FOR-AMBULANCE API CLIENT
 * 
 * Complete TypeScript API client for the ambulance booking system.
 * This file provides type-safe interfaces and functions for all backend endpoints.
 * 
 * Base URL: http://localhost:8083/rest
 * Authentication: JWT Bearer tokens
 * 
 * FEATURES COVERED:
 * - User Management (Registration, Login, Profile Management)
 * - Driver Management (Status, Location, Statistics, Earnings) 
 * - Location Services (GPS Tracking, Nearest Search, Route Calculation)
 * - Booking System (Create, Manage, Status Updates, History)
 * - Emergency Services (SOS, Real-time Dispatch, Alerts)
 * - Hospital Integration (Search, Bed Reservation, Capacity)
 * - Real-time Features (Socket.io Events, Live Updates)
 * - Analytics & Reporting (Dispatch Stats, Hospital Analytics)
 */

// Note: Install axios with: npm install axios
// import axios from 'axios';

// For demo purposes, using fetch API instead of axios
// In production, install axios: npm install axios @types/axios

// =============================================================================
// CONFIGURATION & BASE SETUP
// =============================================================================

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083/rest';

// Simple fetch wrapper for API calls
const api = {
  async get(url: string, config?: { params?: Record<string, any> }) {
    const fullUrl = `${API_BASE_URL}${url}`;
    const searchParams = config?.params ? '?' + new URLSearchParams(config.params).toString() : '';
    const response = await fetch(fullUrl + searchParams, {
      headers: this.getHeaders()
    });
    return { data: await response.json() };
  },
  
  async post(url: string, data?: any, config?: any) {
    const fullUrl = `${API_BASE_URL}${url}`;
    console.log('📤 API POST Request:', { url: fullUrl, data });
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined
    });
    
    const responseData = await response.json();
    console.log('📥 API POST Response:', { status: response.status, data: responseData });
    
    if (!response.ok) {
      console.error('❌ API Error:', response.status, responseData);
      throw new Error(`API Error: ${response.status} - ${responseData.message || 'Unknown error'}`);
    }
    
    return { data: responseData };
  },
  
  async put(url: string, data?: any) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined
    });
    return { data: await response.json() };
  },
  
  async delete(url: string, config?: { data?: any }) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: config?.data ? JSON.stringify(config.data) : undefined
    });
    return { data: await response.json() };
  },
  
  getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    const token = (typeof window !== 'undefined' && window.localStorage) ? localStorage.getItem('auth_token') : null;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }
};

// =============================================================================
// TYPE DEFINITIONS & INTERFACES
// =============================================================================

export enum UserRole {
  USER = 'user',
  DRIVER = 'driver',
  HOSPITAL = 'hospital',
  EMERGENCY_EXECUTIVE = 'emergency_executive',
  ADMIN = 'admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}

export enum BookingStatus {
  REQUESTED = 'requested',
  CONFIRMED = 'confirmed',
  DRIVER_ASSIGNED = 'driver_assigned',
  DRIVER_ENROUTE = 'driver_enroute',
  DRIVER_ARRIVED = 'driver_arrived',
  PATIENT_PICKED = 'patient_picked',
  IN_TRANSIT = 'in_transit',
  ARRIVED_HOSPITAL = 'arrived_hospital',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum BookingType {
  EMERGENCY = 'emergency',
  SCHEDULED = 'scheduled',
  TRANSFER = 'transfer'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum DriverStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ON_DUTY = 'on_duty'
}

export enum AmbulanceType {
  BASIC = 'basic',
  ADVANCED = 'advanced',
  EMERGENCY = 'emergency',
  ICU = 'icu',
  CARDIAC = 'cardiac'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed'
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPoint extends Coordinates {
  timestamp?: Date;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  dateOfBirth?: Date;
  emergencyContact?: string;
  bloodGroup?: string;
  address?: any;
  profileImage?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  _id: string;
  bookingNumber: string;
  userId: string;
  driverId?: string;
  hospitalId?: string;
  type: BookingType;
  priority: Priority;
  status: BookingStatus;
  pickupLocation: {
    address: string;
    coordinates: Coordinates;
    landmarks?: string;
    contactPerson?: {
      name: string;
      phone: string;
    };
  };
  destination?: {
    address: string;
    coordinates: Coordinates;
    hospitalName?: string;
    department?: string;
  };
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
  };
  ambulanceRequirements?: {
    type: string;
    equipment: string[];
    medicalStaff: boolean;
    oxygenRequired: boolean;
    stretcher: boolean;
    ventilator: boolean;
  };
  payment: {
    amount: number;
    currency: string;
    status: PaymentStatus;
    breakdown?: {
      baseFare: number;
      distanceCharge: number;
      timeCharge: number;
      emergencyCharge?: number;
      taxes: number;
    };
  };
  timeline: Array<{
    status: BookingStatus;
    timestamp: Date;
    location?: Coordinates;
    notes?: string;
  }>;
  tracking?: {
    driverLocation?: LocationPoint;
    estimatedArrivalTime?: Date;
    distance?: number;
    duration?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DriverProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  vehicle: {
    registrationNumber: string;
    type: AmbulanceType;
    capacity: number;
    facilities: string[];
    insuranceExpiry: Date;
    lastServiceDate: Date;
  };
  currentLocation?: LocationPoint;
  rating: {
    average: number;
    totalRatings: number;
  };
  statistics: {
    totalRides: number;
    totalDistance: number;
    averageRating: number;
    totalEarnings: number;
    responseTime: number;
    todayRides: number;
    weeklyRides: number;
    monthlyRides: number;
  };
  certifications: string[];
  isOnline: boolean;
}

// =============================================================================
// USER MANAGEMENT APIs
// =============================================================================

/**
 * 👥 USER AUTHENTICATION & PROFILE MANAGEMENT
 * Handles user registration, login, profile updates for all user types
 */
class UserAPI {
  
  /**
   * Register a new user account (Patient, Driver, Hospital, Emergency Executive)
   * @param userData - User registration information
   * @returns Promise<User> - Created user profile
   */
  static async register(userData: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: UserRole;
    dateOfBirth?: Date;
    emergencyContact?: string;
    bloodGroup?: string;
    address?: any;
  }): Promise<User> {
    const response = await api.post('/users/register', userData);
    return response.data;
  }

  /**
   * Login user and get authentication token
   * @param credentials - Email and password
   * @returns Promise<{user: User, token: string}> - User data and JWT token
   */
  static async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ user: User; token: string }> {
    const response = await api.post('/users/login', credentials);
    
    // Store token for future requests
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    
    return response.data;
  }

  /**
   * Get user profile by ID
   * @param userId - User ID
   * @returns Promise<User> - User profile data
   */
  static async getUserById(userId: string): Promise<User> {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  }

  /**
   * Update user profile information
   * @param userId - User ID
   * @param updateData - Fields to update
   * @returns Promise<User> - Updated user profile
   */
  static async updateUser(userId: string, updateData: {
    fullName?: string;
    phone?: string;
    dateOfBirth?: Date;
    emergencyContact?: string;
    bloodGroup?: string;
    address?: any;
    profileImage?: string;
    language?: string;
  }): Promise<User> {
    const response = await api.put(`/users/${userId}`, updateData);
    return response.data;
  }

  /**
   * Change user password
   * @param userId - User ID
   * @param oldPassword - Current password
   * @param newPassword - New password
   * @returns Promise<{message: string}> - Success message
   */
  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const response = await api.put(`/users/${userId}/change-password`, {
      oldPassword,
      newPassword
    });
    return response.data;
  }

  /**
   * Get all users by role (Admin function)
   * @param role - User role to filter by
   * @returns Promise<User[]> - List of users with specified role
   */
  static async getUsersByRole(role: UserRole): Promise<User[]> {
    const response = await api.get(`/users/role/${role}`);
    return response.data;
  }

  /**
   * Search users by name, email, or phone
   * @param query - Search query string
   * @param role - Optional role filter
   * @returns Promise<User[]> - Matching users
   */
  static async searchUsers(query: string, role?: UserRole): Promise<User[]> {
    const response = await api.get(`/users/search/${encodeURIComponent(query)}`, {
      params: role ? { role } : {}
    });
    return response.data;
  }

  /**
   * Verify user email address
   * @param userId - User ID
   * @returns Promise<User> - Updated user with verified email
   */
  static async verifyEmail(userId: string): Promise<User> {
    const response = await api.post(`/users/${userId}/verify-email`);
    return response.data;
  }

  /**
   * Verify user phone number
   * @param userId - User ID
   * @returns Promise<User> - Updated user with verified phone
   */
  static async verifyPhone(userId: string): Promise<User> {
    const response = await api.post(`/users/${userId}/verify-phone`);
    return response.data;
  }

  /**
   * Update user account status (Admin only)
   * @param userId - User ID
   * @param status - New status
   * @returns Promise<User> - Updated user
   */
  static async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    const response = await api.put(`/users/${userId}/status`, { status });
    return response.data;
  }
}

// =============================================================================
// DRIVER MANAGEMENT APIs
// =============================================================================

/**
 * 🚑 DRIVER OPERATIONS & MANAGEMENT
 * Handles driver-specific functionality, status updates, statistics, earnings
 */
class DriverAPI {

  /**
   * Get comprehensive driver profile with vehicle info and stats
   * @param driverId - Driver ID
   * @returns Promise<DriverProfile> - Complete driver profile
   */
  static async getDriverProfile(driverId: string): Promise<DriverProfile> {
    const response = await api.get(`/drivers/${driverId}/profile`);
    return response.data;
  }

  /**
   * Update driver availability status and location
   * @param driverId - Driver ID
   * @param statusUpdate - Status and optional location
   * @returns Promise<{success: boolean, message: string, currentStatus: DriverStatus}>
   */
  static async updateDriverStatus(
    driverId: string,
    statusUpdate: {
      status: DriverStatus;
      location?: LocationPoint;
    }
  ): Promise<{ success: boolean; message: string; currentStatus: DriverStatus }> {
    const response = await api.put(`/drivers/${driverId}/status`, statusUpdate);
    return response.data;
  }

  /**
   * Set driver online with current location
   * @param driverId - Driver ID
   * @param location - Current GPS location
   * @returns Promise<{success: boolean, message: string}>
   */
  static async goOnline(
    driverId: string,
    location: LocationPoint
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/drivers/${driverId}/go-online`, { location });
    return response.data;
  }

  /**
   * Set driver offline
   * @param driverId - Driver ID
   * @returns Promise<{success: boolean, message: string}>
   */
  static async goOffline(driverId: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/drivers/${driverId}/go-offline`);
    return response.data;
  }

  /**
   * Get driver performance statistics
   * @param driverId - Driver ID
   * @param period - Time period for stats
   * @returns Promise<DriverStatistics> - Performance metrics
   */
  static async getDriverStatistics(
    driverId: string,
    period: 'today' | 'week' | 'month' | 'year' = 'month'
  ): Promise<{
    totalRides: number;
    totalDistance: number;
    averageRating: number;
    totalEarnings: number;
    responseTime: number;
    todayRides: number;
    weeklyRides: number;
    monthlyRides: number;
  }> {
    const response = await api.get(`/drivers/${driverId}/statistics`, {
      params: { period }
    });
    return response.data;
  }

  /**
   * Get detailed driver earnings breakdown
   * @param driverId - Driver ID
   * @param period - Time period for earnings
   * @returns Promise<EarningsData> - Earnings breakdown
   */
  static async getDriverEarnings(
    driverId: string,
    period: 'today' | 'week' | 'month' | 'year' = 'month'
  ): Promise<{
    totalEarnings: number;
    tripEarnings: number;
    bonuses: number;
    deductions: number;
    netEarnings: number;
    tripsCompleted: number;
    averageEarningPerTrip: number;
  }> {
    const response = await api.get(`/drivers/${driverId}/earnings`, {
      params: { period }
    });
    return response.data;
  }

  /**
   * Update driver working hours and availability schedule
   * @param driverId - Driver ID
   * @param workingHours - Schedule configuration
   * @returns Promise<{success: boolean, message: string}>
   */
  static async updateWorkingHours(
    driverId: string,
    workingHours: {
      startTime: string; // HH:MM format
      endTime: string; // HH:MM format
      daysOfWeek: string[];
      isActive: boolean;
    }
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/drivers/${driverId}/working-hours`, workingHours);
    return response.data;
  }

  /**
   * Get nearby drivers for admin/emergency use
   * @param location - Center coordinates
   * @param radiusKm - Search radius
   * @param status - Filter by driver status
   * @returns Promise<DriverInfo[]> - Nearby drivers
   */
  static async getNearbyDrivers(
    location: Coordinates,
    radiusKm: number = 10,
    status?: DriverStatus
  ): Promise<any[]> {
    const response = await api.get('/drivers/nearby', {
      params: {
        lat: location.latitude,
        lng: location.longitude,
        radius: radiusKm,
        status
      }
    });
    return response.data;
  }

  /**
   * Activate emergency mode for driver
   * @param driverId - Driver ID
   * @param emergencyType - Type of emergency
   * @param location - Current location
   * @returns Promise<{success: boolean, message: string}>
   */
  static async activateEmergencyMode(
    driverId: string,
    emergencyType: string,
    location: LocationPoint
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/drivers/${driverId}/emergency-mode`, {
      emergencyType,
      location
    });
    return response.data;
  }
}

// =============================================================================
// LOCATION SERVICES APIs
// =============================================================================

/**
 * 📍 GPS & LOCATION MANAGEMENT
 * Handles real-time location tracking, nearest search, route calculation
 */
class LocationAPI {

  /**
   * Update driver's real-time location and status
   * @param driverId - Driver ID
   * @param locationData - GPS coordinates and status
   * @returns Promise<{success: boolean, message: string}>
   */
  static async updateDriverLocation(
    driverId: string,
    locationData: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      heading?: number;
      speed?: number;
      status: DriverStatus;
    }
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/location/drivers/${driverId}/update`, locationData);
    return response.data;
  }

  /**
   * Get all active driver locations for monitoring dashboard
   * @returns Promise<DriverLocation[]> - All active driver locations
   */
  static async getAllActiveDrivers(): Promise<any[]> {
    const response = await api.get('/location/drivers/active');
    return response.data;
  }

  /**
   * Get specific driver's current location
   * @param driverId - Driver ID
   * @returns Promise<LocationData> - Driver's current location and status
   */
  static async getDriverLocation(driverId: string): Promise<any> {
    const response = await api.get(`/location/drivers/${driverId}`);
    return response.data;
  }

  /**
   * Find nearest available ambulance drivers
   * @param searchRequest - Location and search parameters
   * @returns Promise<NearestDriverResult[]> - Nearby available drivers
   */
  static async findNearestDrivers(searchRequest: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    maxResults?: number;
    ambulanceType?: AmbulanceType;
  }): Promise<any[]> {
    const response = await api.post('/location/drivers/nearest', searchRequest);
    return response.data;
  }

  /**
   * Find nearest hospitals with optional filters
   * @param searchRequest - Location and hospital requirements
   * @returns Promise<NearestHospitalResult[]> - Nearby hospitals
   */
  static async findNearestHospitals(searchRequest: {
    latitude: number;
    longitude: number;
    radiusKm?: number;
    maxResults?: number;
    requireEmergencyServices?: boolean;
    requiredSpecializations?: string[];
  }): Promise<any[]> {
    const response = await api.post('/location/hospitals/nearest', searchRequest);
    return response.data;
  }

  /**
   * Calculate route between two points
   * @param from - Origin coordinates
   * @param to - Destination coordinates
   * @returns Promise<RouteData> - Distance, time, and waypoints
   */
  static async calculateRoute(
    from: Coordinates,
    to: Coordinates
  ): Promise<{
    distance: number;
    estimatedTime: number;
    waypoints: Coordinates[];
  }> {
    const response = await api.post('/location/route/calculate', { from, to });
    return response.data;
  }

  /**
   * Get area coverage statistics
   * @param center - Center coordinates
   * @param radiusKm - Analysis radius
   * @returns Promise<CoverageStats> - Driver availability statistics
   */
  static async getAreaCoverage(
    center: Coordinates,
    radiusKm: number = 10
  ): Promise<{
    totalDrivers: number;
    availableDrivers: number;
    averageDistance: number;
    ambulanceTypes: Record<AmbulanceType, number>;
  }> {
    const response = await api.get('/location/area/coverage', {
      params: {
        lat: center.latitude,
        lng: center.longitude,
        radius: radiusKm
      }
    });
    return response.data;
  }

  /**
   * Emergency nearest search for critical situations
   * @param location - Emergency location
   * @param ambulanceType - Required ambulance type
   * @returns Promise<EmergencySearchResult> - Nearest resources
   */
  static async emergencyNearestSearch(
    location: Coordinates,
    ambulanceType?: AmbulanceType
  ): Promise<{
    nearestDriver: any | null;
    nearestHospital: any | null;
    alternativeDrivers: any[];
    alternativeHospitals: any[];
  }> {
    const response = await api.get('/location/emergency/nearest', {
      params: {
        lat: location.latitude,
        lng: location.longitude,
        type: ambulanceType
      }
    });
    return response.data;
  }

  /**
   * Set driver availability with optional location
   * @param driverId - Driver ID
   * @param isAvailable - Availability status
   * @param location - Optional location update
   * @returns Promise<{success: boolean, message: string}>
   */
  static async setDriverAvailability(
    driverId: string,
    isAvailable: boolean,
    location?: LocationPoint
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/location/drivers/${driverId}/availability`, {
      isAvailable,
      location
    });
    return response.data;
  }
}

// =============================================================================
// BOOKING MANAGEMENT APIs
// =============================================================================

/**
 * 📋 AMBULANCE BOOKING SYSTEM
 * Handles booking creation, management, status updates, and history
 */
class BookingAPI {

  /**
   * Create a new ambulance booking with automatic dispatch
   * @param bookingRequest - Complete booking information
   * @returns Promise<BookingResponse> - Created booking details
   */
  static async createBooking(bookingRequest: {
    userId: string;
    pickupLocation: {
      address: string;
      coordinates?: Coordinates;
      latitude?: number;
      longitude?: number;
    };
    destinationLocation?: {
      address: string;
      coordinates?: Coordinates;
      latitude?: number;
      longitude?: number;
    };
    priority?: Priority;
    type?: BookingType;
    ambulanceType?: AmbulanceType;
    patientInfo: {
      name: string;
      age: number;
      gender: string;
      condition: string;
      symptoms?: string[];
      emergencyContact?: {
        name: string;
        phone: string;
        relation: string;
      };
    };
    specialRequirements?: string[];
  }): Promise<{
    success: boolean;
    bookingId: string;
    status: BookingStatus;
    hospitalRecommendations: any[];
    dispatchInfo: any;
    message: string;
  }> {
    const response = await api.post('/bookings', bookingRequest);
    return response.data;
  }

  /**
   * Get detailed booking information
   * @param bookingId - Booking ID
   * @returns Promise<BookingDetails> - Complete booking data
   */
  static async getBooking(bookingId: string): Promise<{
    success: boolean;
    booking: Booking;
    message: string;
  }> {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  }

  /**
   * Get user's booking history
   * @param userId - User ID
   * @param limit - Number of bookings to fetch
   * @returns Promise<UserBookings> - User's booking history
   */
  static async getUserBookings(
    userId: string,
    limit: number = 10
  ): Promise<{
    success: boolean;
    bookings: Booking[];
    message: string;
  }> {
    const response = await api.get(`/bookings/user/${userId}`, {
      params: { limit }
    });
    return response.data;
  }

  /**
   * Manually dispatch ambulance using smart algorithm
   * @param bookingId - Booking ID
   * @param options - Dispatch options
   * @returns Promise<DispatchResult> - Dispatch outcome
   */
  static async dispatchAmbulance(
    bookingId: string,
    options: { maxDistance?: number } = {}
  ): Promise<{
    success: boolean;
    message: string;
    assignedDriver: any;
    alternativeDrivers: any[];
    dispatchTime: Date;
  }> {
    const response = await api.post(`/bookings/${bookingId}/dispatch`, options);
    return response.data;
  }

  /**
   * Update booking status with optional location
   * @param bookingId - Booking ID
   * @param status - New status
   * @param location - Optional location update
   * @returns Promise<BookingUpdate> - Updated booking
   */
  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    location?: Coordinates
  ): Promise<{
    success: boolean;
    message: string;
    booking: Booking;
  }> {
    const response = await api.put(`/bookings/${bookingId}/status`, {
      status,
      location
    });
    return response.data;
  }

  /**
   * Cancel existing booking
   * @param bookingId - Booking ID
   * @param reason - Cancellation reason
   * @param cancelledBy - Who cancelled the booking
   * @returns Promise<CancellationResult> - Cancellation details
   */
  static async cancelBooking(
    bookingId: string,
    reason: string,
    cancelledBy: string
  ): Promise<{
    success: boolean;
    message: string;
    refundAmount: number;
  }> {
    const response = await api.delete(`/bookings/${bookingId}`, {
      data: { reason, cancelledBy }
    });
    return response.data;
  }

  /**
   * Search and get hospital recommendations
   * @param searchRequest - Location and patient requirements
   * @returns Promise<HospitalRecommendations> - Suitable hospitals
   */
  static async searchHospitals(searchRequest: {
    latitude: number;
    longitude: number;
    patientCondition?: string;
    priority?: Priority;
    requiredSpecialties?: string[];
    maxDistance?: number;
    insuranceType?: string;
    patientAge?: number;
  }): Promise<{
    success: boolean;
    hospitals: any[];
    message: string;
  }> {
    const response = await api.post('/bookings/hospitals/search', searchRequest);
    return response.data;
  }

  /**
   * Manual dispatch override for emergency executives
   * @param bookingId - Booking ID
   * @param driverId - Specific driver to assign
   * @param reason - Reason for manual assignment
   * @returns Promise<ManualDispatchResult> - Assignment result
   */
  static async manualDispatch(
    bookingId: string,
    driverId: string,
    reason: string
  ): Promise<any> {
    const response = await api.post(`/bookings/${bookingId}/dispatch/manual`, {
      driverId,
      reason
    });
    return response.data;
  }

  /**
   * Reserve hospital bed
   * @param hospitalId - Hospital ID
   * @param bedType - Type of bed required
   * @param bookingId - Optional booking ID
   * @returns Promise<BedReservation> - Reservation result
   */
  static async reserveHospitalBed(
    hospitalId: string,
    bedType: string = 'emergency',
    bookingId?: string
  ): Promise<any> {
    const response = await api.post(`/bookings/hospitals/${hospitalId}/reserve`, {
      bedType,
      bookingId
    });
    return response.data;
  }

  /**
   * Get all bookings (Admin/Debug endpoint)
   * @param limit - Number of bookings to fetch
   * @param status - Optional status filter
   * @returns Promise<AllBookings> - All bookings in system
   */
  static async getAllBookings(
    limit: number = 20,
    status?: string
  ): Promise<{
    success: boolean;
    bookings: Booking[];
    total: number;
    message: string;
    source?: string;
  }> {
    const params: any = { limit };
    if (status) params.status = status;
    
    const response = await api.get('/bookings/all', { params });
    return response.data;
  }

  /**
   * Get database connection status
   * @returns Promise<DatabaseStatus> - Database connection info
   */
  static async getDatabaseStatus(): Promise<{
    success: boolean;
    database: {
      connected: boolean;
      totalBookings?: number;
      mongoUri: string;
      status: string;
      error?: string;
    };
    message: string;
    timestamp: Date;
  }> {
    const response = await api.get('/bookings/db-status');
    return response.data;
  }
}

// =============================================================================
// EMERGENCY SERVICES APIs
// =============================================================================

/**
 * 🚨 EMERGENCY & SOS SERVICES
 * Handles emergency bookings, SOS alerts, and critical dispatch
 */
class EmergencyAPI {

  /**
   * Trigger Emergency SOS with immediate dispatch
   * @param emergencyRequest - Emergency details and location
   * @returns Promise<EmergencySOS> - Emergency response details
   */
  static async emergencySOS(emergencyRequest: {
    userId: string;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    patientDetails?: {
      name?: string;
      age?: number;
      condition?: string;
    };
    emergencyContact?: string;
  }): Promise<{
    success: boolean;
    bookingId: string;
    status: string;
    estimatedArrival?: Date;
    assignedDriver?: any;
    nearestHospitals: any[];
    emergencyNumber: string;
    message: string;
    dispatchTime: Date;
  }> {
    const response = await api.post('/bookings/emergency/sos', emergencyRequest);
    return response.data;
  }

  /**
   * Trigger emergency broadcast to all connected clients
   * @param broadcastData - Emergency message and priority
   * @returns Promise<BroadcastResult> - Broadcast confirmation
   */
  static async triggerEmergencyBroadcast(broadcastData: {
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    location?: Coordinates;
  }): Promise<{
    success: boolean;
    broadcastId: string;
    message: string;
    sentTo: {
      emergencyExecutives: string;
      drivers: string;
      hospitals: string;
    };
    timestamp: Date;
  }> {
    const response = await api.post('/bookings/realtime/emergency/broadcast', broadcastData);
    return response.data;
  }
}

// =============================================================================
// REAL-TIME & SOCKET APIs
// =============================================================================

/**
 * 📡 REAL-TIME FEATURES & SOCKET.IO
 * Handles live updates, real-time status, and socket connections
 */
class RealTimeAPI {

  /**
   * Get current real-time system status
   * @returns Promise<SystemStatus> - Real-time connections and health
   */
  static async getRealTimeStatus(): Promise<{
    success: boolean;
    realTimeStatus: {
      socketServiceActive: boolean;
      connections: {
        totalConnected: number;
        users: number;
        drivers: number;
        hospitals: number;
        executives: number;
      };
      systemHealth: {
        status: string;
        uptime: number;
        lastUpdate: Date;
      };
    };
    message: string;
  }> {
    const response = await api.get('/bookings/realtime/status');
    return response.data;
  }

  /**
   * Subscribe to real-time updates for specific booking
   * @param bookingId - Booking ID to monitor
   * @returns Promise<SubscriptionResult> - Socket room details
   */
  static async joinBookingUpdates(bookingId: string): Promise<{
    success: boolean;
    bookingId: string;
    socketRoom: string;
    message: string;
    events: string[];
  }> {
    const response = await api.post(`/bookings/realtime/booking/${bookingId}/join`);
    return response.data;
  }
}

// =============================================================================
// ANALYTICS & REPORTING APIs
// =============================================================================

/**
 * 📊 ANALYTICS & BUSINESS INTELLIGENCE
 * Handles dispatch analytics, hospital capacity, and performance metrics
 */
class AnalyticsAPI {

  /**
   * Get comprehensive dispatch analytics and statistics
   * @param timeframe - Analysis time period
   * @returns Promise<DispatchAnalytics> - Dispatch performance metrics
   */
  static async getDispatchAnalytics(
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    success: boolean;
    analytics: {
      totalDispatches: number;
      successRate: number;
      averageResponseTime: number;
      topPerformingDrivers: any[];
      dispatchByHour: number[];
    };
    generatedAt: Date;
  }> {
    const response = await api.get('/bookings/analytics/dispatch', {
      params: { timeframe }
    });
    return response.data;
  }

  /**
   * Get hospital capacity and utilization analytics
   * @returns Promise<HospitalAnalytics> - Hospital capacity data
   */
  static async getHospitalAnalytics(): Promise<{
    success: boolean;
    analytics: {
      averageOccupancy: number;
      hospitalUtilization: Array<{
        hospitalId: string;
        occupancyRate: number;
        trend: string;
      }>;
      capacityAlerts: Array<{
        hospitalId: string;
        alertType: string;
        severity: string;
        message: string;
      }>;
    };
    generatedAt: Date;
  }> {
    const response = await api.get('/bookings/analytics/hospitals');
    return response.data;
  }
}

// =============================================================================
// UTILITY FUNCTIONS & HELPERS
// =============================================================================

/**
 * 🛠️ UTILITY FUNCTIONS
 * Helper functions for common operations and data formatting
 */
class APIUtils {

  /**
   * Format coordinates for API calls
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Coordinates - Formatted coordinates object
   */
  static formatCoordinates(lat: number, lng: number): Coordinates {
    return {
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6))
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param coord1 - First coordinate
   * @param coord2 - Second coordinate
   * @returns number - Distance in kilometers
   */
  static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const lat1Rad = (coord1.latitude * Math.PI) / 180;
    const lat2Rad = (coord2.latitude * Math.PI) / 180;
    const deltaLatRad = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const deltaLngRad = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Format booking status for display
   * @param status - Booking status enum
   * @returns string - Human readable status
   */
  static formatBookingStatus(status: BookingStatus): string {
    const statusMap: Record<BookingStatus, string> = {
      [BookingStatus.REQUESTED]: 'Booking Requested',
      [BookingStatus.CONFIRMED]: 'Booking Confirmed',
      [BookingStatus.DRIVER_ASSIGNED]: 'Driver Assigned',
      [BookingStatus.DRIVER_ENROUTE]: 'Driver En Route',
      [BookingStatus.DRIVER_ARRIVED]: 'Driver Arrived',
      [BookingStatus.PATIENT_PICKED]: 'Patient Picked Up',
      [BookingStatus.IN_TRANSIT]: 'In Transit to Hospital',
      [BookingStatus.ARRIVED_HOSPITAL]: 'Arrived at Hospital',
      [BookingStatus.COMPLETED]: 'Completed',
      [BookingStatus.CANCELLED]: 'Cancelled'
    };
    return statusMap[status] || status;
  }

  /**
   * Get status color for UI display
   * @param status - Booking status
   * @returns string - CSS color class or hex code
   */
  static getStatusColor(status: BookingStatus): string {
    const colorMap: Record<BookingStatus, string> = {
      [BookingStatus.REQUESTED]: '#f59e0b',
      [BookingStatus.CONFIRMED]: '#3b82f6',
      [BookingStatus.DRIVER_ASSIGNED]: '#8b5cf6',
      [BookingStatus.DRIVER_ENROUTE]: '#06b6d4',
      [BookingStatus.DRIVER_ARRIVED]: '#84cc16',
      [BookingStatus.PATIENT_PICKED]: '#10b981',
      [BookingStatus.IN_TRANSIT]: '#059669',
      [BookingStatus.ARRIVED_HOSPITAL]: '#0891b2',
      [BookingStatus.COMPLETED]: '#22c55e',
      [BookingStatus.CANCELLED]: '#ef4444'
    };
    return colorMap[status] || '#6b7280';
  }

  /**
   * Format priority for display
   * @param priority - Priority enum
   * @returns string - Human readable priority
   */
  static formatPriority(priority: Priority): string {
    const priorityMap: Record<Priority, string> = {
      [Priority.LOW]: 'Low Priority',
      [Priority.MEDIUM]: 'Medium Priority',
      [Priority.HIGH]: 'High Priority',
      [Priority.CRITICAL]: 'Critical Emergency'
    };
    return priorityMap[priority] || priority;
  }

  /**
   * Get priority color for UI
   * @param priority - Priority enum
   * @returns string - CSS color
   */
  static getPriorityColor(priority: Priority): string {
    const colorMap: Record<Priority, string> = {
      [Priority.LOW]: '#22c55e',
      [Priority.MEDIUM]: '#f59e0b',
      [Priority.HIGH]: '#f97316',
      [Priority.CRITICAL]: '#ef4444'
    };
    return colorMap[priority] || '#6b7280';
  }

  /**
   * Logout user and clear stored data
   */
  static logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    window.location.href = '/login';
  }

  /**
   * Check if user is authenticated
   * @returns boolean - Authentication status
   */
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  /**
   * Get stored user data
   * @returns User | null - Stored user data
   */
  static getCurrentUser(): User | null {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Store user data locally
   * @param user - User data to store
   */
  static setCurrentUser(user: User): void {
    localStorage.setItem('user_data', JSON.stringify(user));
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  UserAPI,
  DriverAPI,
  LocationAPI,
  BookingAPI,
  EmergencyAPI,
  RealTimeAPI,
  AnalyticsAPI,
  APIUtils
};