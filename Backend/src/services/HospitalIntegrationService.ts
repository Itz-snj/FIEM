import { Service } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { LocationService } from "./LocationService.js";
import { WebSocketService } from "./WebSocketService.js";

// Define interfaces locally
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface HospitalCapacity {
  hospitalId: string;
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  emergencyBeds: number;
  availableEmergencyBeds: number;
  lastUpdated: Date;
}

interface HospitalSpecialty {
  hospitalId: string;
  specialties: string[];
  certifications: string[];
  equipmentAvailable: string[];
  doctorsOnDuty: {
    specialty: string;
    count: number;
    availability: 'low' | 'medium' | 'high';
  }[];
}

interface HospitalRecommendation {
  hospitalId: string;
  name: string;
  address: string;
  location: Coordinates;
  distance: number;
  estimatedArrival: number;
  suitabilityScore: number;
  availableBeds: number;
  specialties: string[];
  reasons: string[];
  currentLoad: 'low' | 'medium' | 'high';
  acceptingPatients: boolean;
  estimatedWaitTime: number;
}

interface RecommendationRequest {
  patientLocation: Coordinates;
  patientCondition: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiredSpecialties?: string[];
  maxDistance?: number;
  insuranceType?: string;
  patientAge?: number;
  preferredHospitals?: string[];
}

@Service()
export class HospitalIntegrationService {
  private hospitalCapacities = new Map<string, HospitalCapacity>();
  private hospitalSpecialties = new Map<string, HospitalSpecialty>();
  private capacityUpdateHistory: Array<{
    hospitalId: string;
    updateTime: Date;
    capacity: HospitalCapacity;
  }> = [];

  private socketService?: WebSocketService; // Optional to avoid circular dependencies

  constructor(
    private locationService: LocationService
  ) {
    this.initializeDemoData();
  }

  /**
   * Get intelligent hospital recommendations
   */
  async getHospitalRecommendations(request: RecommendationRequest): Promise<HospitalRecommendation[]> {
    const maxDistance = request.maxDistance || this.getMaxDistanceForPriority(request.priority);
    
    // Get hospitals in range
    const nearbyHospitals = await this.locationService.findNearestHospitals(
      request.patientLocation,
      maxDistance
    );

    if (nearbyHospitals.length === 0) {
      return [];
    }

    // Score and rank hospitals
    const recommendations: HospitalRecommendation[] = [];
    
    for (const hospital of nearbyHospitals) {
      const recommendation = await this.evaluateHospital(hospital, request);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Sort by suitability score (highest first)
    return recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  }

  /**
   * Evaluate individual hospital suitability
   */
  private async evaluateHospital(
    hospital: any,
    request: RecommendationRequest
  ): Promise<HospitalRecommendation | null> {
    const capacity = this.hospitalCapacities.get(hospital.hospitalId);
    const specialties = this.hospitalSpecialties.get(hospital.hospitalId);

    if (!capacity || !specialties) {
      return null; // No capacity data available
    }

    // Check if hospital is accepting patients
    if (!this.isAcceptingPatients(capacity, request.priority)) {
      return null;
    }

    // Calculate suitability score
    const suitabilityScore = this.calculateHospitalScore(hospital, capacity, specialties, request);

    // Estimate wait time based on current load
    const currentLoad = this.calculateCurrentLoad(capacity);
    const estimatedWaitTime = this.estimateWaitTime(currentLoad, request.priority);

    // Generate recommendation reasons
    const reasons = this.generateRecommendationReasons(hospital, capacity, specialties, request);

    return {
      hospitalId: hospital.hospitalId,
      name: hospital.name,
      address: hospital.address,
      location: hospital.location,
      distance: hospital.distance,
      estimatedArrival: hospital.estimatedArrival,
      suitabilityScore,
      availableBeds: capacity.availableEmergencyBeds,
      specialties: specialties.specialties,
      reasons,
      currentLoad,
      acceptingPatients: true,
      estimatedWaitTime
    };
  }

  /**
   * Calculate comprehensive hospital suitability score
   */
  private calculateHospitalScore(
    hospital: any,
    capacity: HospitalCapacity,
    specialties: HospitalSpecialty,
    request: RecommendationRequest
  ): number {
    let score = 0;
    let maxScore = 0;

    // Distance factor (closer is better) - 30% weight
    const distanceFactor = Math.max(0, 1 - (hospital.distance / 50)); // Normalize to 50km
    score += distanceFactor * 0.3;
    maxScore += 0.3;

    // Capacity factor - 25% weight
    const capacityFactor = this.calculateCapacityFactor(capacity, request.priority);
    score += capacityFactor * 0.25;
    maxScore += 0.25;

    // Specialty match - 20% weight
    const specialtyFactor = this.calculateSpecialtyFactor(specialties, request);
    score += specialtyFactor * 0.2;
    maxScore += 0.2;

    // Hospital quality/rating - 15% weight
    const qualityFactor = hospital.rating ? (hospital.rating / 5.0) : 0.7; // Default rating
    score += qualityFactor * 0.15;
    maxScore += 0.15;

    // Current load factor (less busy is better) - 10% weight
    const loadFactor = this.calculateLoadFactor(capacity);
    score += loadFactor * 0.1;
    maxScore += 0.1;

    // Normalize score to 0-1 range
    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Calculate capacity factor based on available beds and priority
   */
  private calculateCapacityFactor(capacity: HospitalCapacity, priority: string): number {
    let requiredBeds = 1;
    let availableBeds = capacity.availableEmergencyBeds;

    // For critical cases, consider ICU availability
    if (priority === 'CRITICAL') {
      availableBeds = Math.min(capacity.availableEmergencyBeds, capacity.availableIcuBeds);
      if (availableBeds === 0) return 0; // No ICU beds available
    }

    // Calculate capacity factor
    if (availableBeds >= requiredBeds + 2) return 1.0; // Plenty of capacity
    if (availableBeds >= requiredBeds + 1) return 0.8; // Good capacity
    if (availableBeds >= requiredBeds) return 0.6;     // Minimal capacity
    return 0; // No capacity
  }

  /**
   * Calculate specialty matching factor
   */
  private calculateSpecialtyFactor(specialties: HospitalSpecialty, request: RecommendationRequest): number {
    if (!request.patientCondition && (!request.requiredSpecialties || request.requiredSpecialties.length === 0)) {
      return 1.0; // No specific requirements
    }

    let matchScore = 0;
    let totalRequirements = 0;

    // Check required specialties
    if (request.requiredSpecialties && request.requiredSpecialties.length > 0) {
      for (const requiredSpecialty of request.requiredSpecialties) {
        totalRequirements++;
        if (specialties.specialties.some(s => 
          s.toLowerCase().includes(requiredSpecialty.toLowerCase())
        )) {
          matchScore++;
        }
      }
    }

    // Infer specialties from patient condition
    const inferredSpecialties = this.inferRequiredSpecialties(request.patientCondition || '');
    for (const inferredSpecialty of inferredSpecialties) {
      totalRequirements++;
      if (specialties.specialties.some(s => 
        s.toLowerCase().includes(inferredSpecialty.toLowerCase())
      )) {
        matchScore++;
      }
    }

    return totalRequirements > 0 ? matchScore / totalRequirements : 1.0;
  }

  /**
   * Calculate load factor (lower load is better)
   */
  private calculateLoadFactor(capacity: HospitalCapacity): number {
    const totalBeds = capacity.totalBeds;
    const occupiedBeds = totalBeds - capacity.availableBeds;
    const occupancyRate = occupiedBeds / totalBeds;

    // Invert occupancy rate so lower load gets higher score
    return Math.max(0, 1 - occupancyRate);
  }

  /**
   * Infer required specialties from patient condition
   */
  private inferRequiredSpecialties(condition: string): string[] {
    const lowerCondition = condition.toLowerCase();
    const specialties: string[] = [];

    // Cardiac conditions
    if (lowerCondition.includes('chest') || lowerCondition.includes('heart') || 
        lowerCondition.includes('cardiac') || lowerCondition.includes('mi')) {
      specialties.push('cardiology');
    }

    // Neurological conditions
    if (lowerCondition.includes('stroke') || lowerCondition.includes('seizure') || 
        lowerCondition.includes('head') || lowerCondition.includes('neuro')) {
      specialties.push('neurology');
    }

    // Trauma conditions
    if (lowerCondition.includes('accident') || lowerCondition.includes('trauma') || 
        lowerCondition.includes('fracture') || lowerCondition.includes('bleeding')) {
      specialties.push('trauma surgery');
    }

    // Pediatric conditions
    if (lowerCondition.includes('child') || lowerCondition.includes('infant') || 
        lowerCondition.includes('pediatric')) {
      specialties.push('pediatrics');
    }

    // Obstetric conditions
    if (lowerCondition.includes('pregnancy') || lowerCondition.includes('labor') || 
        lowerCondition.includes('obstetric')) {
      specialties.push('obstetrics');
    }

    return specialties;
  }

  /**
   * Check if hospital is accepting patients
   */
  private isAcceptingPatients(capacity: HospitalCapacity, priority: string): boolean {
    // Always accept critical patients if any beds available
    if (priority === 'CRITICAL') {
      return capacity.availableEmergencyBeds > 0 || capacity.availableIcuBeds > 0;
    }

    // For non-critical, need at least 2 beds available
    return capacity.availableEmergencyBeds >= 2;
  }

  /**
   * Calculate current hospital load
   */
  private calculateCurrentLoad(capacity: HospitalCapacity): 'low' | 'medium' | 'high' {
    const occupancyRate = (capacity.totalBeds - capacity.availableBeds) / capacity.totalBeds;

    if (occupancyRate < 0.6) return 'low';
    if (occupancyRate < 0.8) return 'medium';
    return 'high';
  }

  /**
   * Estimate wait time based on load and priority
   */
  private estimateWaitTime(load: 'low' | 'medium' | 'high', priority: string): number {
    const baseTimes = {
      'CRITICAL': { low: 0, medium: 2, high: 5 },
      'HIGH': { low: 5, medium: 10, high: 20 },
      'MEDIUM': { low: 15, medium: 30, high: 60 },
      'LOW': { low: 30, medium: 60, high: 120 }
    };

    return baseTimes[priority as keyof typeof baseTimes]?.[load] || 30;
  }

  /**
   * Generate recommendation reasons
   */
  private generateRecommendationReasons(
    hospital: any,
    capacity: HospitalCapacity,
    specialties: HospitalSpecialty,
    request: RecommendationRequest
  ): string[] {
    const reasons: string[] = [];

    // Distance reasons
    if (hospital.distance < 5) {
      reasons.push("Very close to patient location");
    } else if (hospital.distance < 10) {
      reasons.push("Close proximity to patient");
    }

    // Capacity reasons
    if (capacity.availableEmergencyBeds > 5) {
      reasons.push("Excellent bed availability");
    } else if (capacity.availableEmergencyBeds > 2) {
      reasons.push("Good bed availability");
    }

    // Specialty reasons
    const inferredSpecialties = this.inferRequiredSpecialties(request.patientCondition || '');
    for (const specialty of inferredSpecialties) {
      if (specialties.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))) {
        reasons.push(`Specialized in ${specialty}`);
      }
    }

    // Quality reasons
    if (hospital.rating && hospital.rating > 4.5) {
      reasons.push("Highly rated hospital");
    }

    // Load reasons
    const load = this.calculateCurrentLoad(capacity);
    if (load === 'low') {
      reasons.push("Currently low patient volume");
    }

    return reasons.length > 0 ? reasons : ["Available for patient care"];
  }

  /**
   * Get maximum search distance based on priority
   */
  private getMaxDistanceForPriority(priority: string): number {
    switch (priority) {
      case 'CRITICAL': return 100; // 100km for critical
      case 'HIGH': return 50;      // 50km for high
      case 'MEDIUM': return 30;    // 30km for medium
      default: return 20;          // 20km for low
    }
  }

  /**
   * Update hospital capacity in real-time
   */
  async updateHospitalCapacity(hospitalId: string, capacity: Partial<HospitalCapacity>): Promise<void> {
    const currentCapacity = this.hospitalCapacities.get(hospitalId);
    if (!currentCapacity) {
      throw new NotFound(`Hospital ${hospitalId} not found`);
    }

    const updatedCapacity: HospitalCapacity = {
      ...currentCapacity,
      ...capacity,
      hospitalId,
      lastUpdated: new Date()
    };

    this.hospitalCapacities.set(hospitalId, updatedCapacity);

    // Record update history
    this.capacityUpdateHistory.push({
      hospitalId,
      updateTime: new Date(),
      capacity: updatedCapacity
    });

    // Keep only last 1000 updates
    if (this.capacityUpdateHistory.length > 1000) {
      this.capacityUpdateHistory = this.capacityUpdateHistory.slice(-1000);
    }

    // 🔔 Emit real-time hospital capacity update
    if (this.socketService) {
      this.socketService.broadcastToEmergencyExecutives('hospital:capacity_updated', {
        hospitalId,
        capacity: updatedCapacity,
        timestamp: new Date(),
        availabilityStatus: {
          totalBeds: updatedCapacity.totalBeds,
          availableBeds: updatedCapacity.availableBeds,
          icuAvailable: updatedCapacity.availableIcuBeds,
          emergencyAvailable: updatedCapacity.availableEmergencyBeds,
          occupancyRate: ((updatedCapacity.totalBeds - updatedCapacity.availableBeds) / updatedCapacity.totalBeds * 100).toFixed(1)
        },
        message: `Hospital ${hospitalId} capacity updated - ${updatedCapacity.availableBeds} beds available`
      });

      // Also notify hospitals namespace
      this.socketService.sendMessageToHospital(hospitalId, 'capacity:updated', {
        capacity: updatedCapacity,
        timestamp: new Date()
      });
    }

    console.log(`📡 Hospital ${hospitalId} capacity updated:`, updatedCapacity);
  }

  /**
   * Reserve bed at hospital
   */
  async reserveBed(hospitalId: string, bedType: 'emergency' | 'icu' | 'general' = 'emergency'): Promise<{
    success: boolean;
    reservationId?: string;
    message: string;
  }> {
    const capacity = this.hospitalCapacities.get(hospitalId);
    if (!capacity) {
      return {
        success: false,
        message: "Hospital not found or capacity data unavailable"
      };
    }

    // Check availability
    let availableBeds = 0;
    switch (bedType) {
      case 'emergency':
        availableBeds = capacity.availableEmergencyBeds;
        break;
      case 'icu':
        availableBeds = capacity.availableIcuBeds;
        break;
      case 'general':
        availableBeds = capacity.availableBeds;
        break;
    }

    if (availableBeds <= 0) {
      return {
        success: false,
        message: `No ${bedType} beds available`
      };
    }

    // Reserve bed (decrease availability)
    const updatedCapacity = { ...capacity };
    switch (bedType) {
      case 'emergency':
        updatedCapacity.availableEmergencyBeds--;
        break;
      case 'icu':
        updatedCapacity.availableIcuBeds--;
        break;
      case 'general':
        updatedCapacity.availableBeds--;
        break;
    }

    await this.updateHospitalCapacity(hospitalId, updatedCapacity);

    const reservationId = `RES_${hospitalId}_${Date.now()}`;

    return {
      success: true,
      reservationId,
      message: `${bedType} bed reserved successfully`
    };
  }

  /**
   * Get hospital capacity analytics
   */
  async getCapacityAnalytics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    averageOccupancy: number;
    hospitalUtilization: Array<{
      hospitalId: string;
      occupancyRate: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
    capacityAlerts: Array<{
      hospitalId: string;
      alertType: 'low_capacity' | 'high_utilization' | 'no_icu';
      severity: 'warning' | 'critical';
      message: string;
    }>;
  }> {
    const hospitalUtilization: Array<{
      hospitalId: string;
      occupancyRate: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }> = [];

    const capacityAlerts: Array<{
      hospitalId: string;
      alertType: 'low_capacity' | 'high_utilization' | 'no_icu';
      severity: 'warning' | 'critical';
      message: string;
    }> = [];

    let totalOccupancy = 0;
    let hospitalCount = 0;

    // Analyze each hospital
    for (const [hospitalId, capacity] of this.hospitalCapacities.entries()) {
      const occupancyRate = (capacity.totalBeds - capacity.availableBeds) / capacity.totalBeds;
      
      hospitalUtilization.push({
        hospitalId,
        occupancyRate,
        trend: this.calculateTrend(hospitalId, timeframe)
      });

      totalOccupancy += occupancyRate;
      hospitalCount++;

      // Generate alerts
      if (capacity.availableEmergencyBeds <= 1) {
        capacityAlerts.push({
          hospitalId,
          alertType: 'low_capacity',
          severity: capacity.availableEmergencyBeds === 0 ? 'critical' : 'warning',
          message: `Only ${capacity.availableEmergencyBeds} emergency bed(s) available`
        });
      }

      if (occupancyRate > 0.9) {
        capacityAlerts.push({
          hospitalId,
          alertType: 'high_utilization',
          severity: 'warning',
          message: `High utilization: ${(occupancyRate * 100).toFixed(1)}% occupied`
        });
      }

      if (capacity.availableIcuBeds === 0) {
        capacityAlerts.push({
          hospitalId,
          alertType: 'no_icu',
          severity: 'critical',
          message: 'No ICU beds available'
        });
      }
    }

    const averageOccupancy = hospitalCount > 0 ? totalOccupancy / hospitalCount : 0;

    return {
      averageOccupancy,
      hospitalUtilization,
      capacityAlerts
    };
  }

  /**
   * Calculate capacity trend for a hospital
   */
  private calculateTrend(hospitalId: string, timeframe: 'hour' | 'day' | 'week'): 'increasing' | 'decreasing' | 'stable' {
    // This would analyze historical capacity data in a real system
    // For demo, return random trend
    const trends: Array<'increasing' | 'decreasing' | 'stable'> = ['increasing', 'decreasing', 'stable'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  /**
   * Initialize demo data
   */
  private initializeDemoData(): void {
    // Demo hospital capacities
    const hospitals = [
      { id: 'hosp1', name: 'City General Hospital' },
      { id: 'hosp2', name: 'Emergency Medical Center' },
      { id: 'hosp3', name: 'Cardiac Specialty Hospital' },
      { id: 'hosp4', name: 'Trauma Center' },
      { id: 'hosp5', name: 'University Medical Center' }
    ];

    hospitals.forEach(hospital => {
      // Initialize capacity
      this.hospitalCapacities.set(hospital.id, {
        hospitalId: hospital.id,
        totalBeds: Math.floor(Math.random() * 200) + 100, // 100-300 beds
        availableBeds: Math.floor(Math.random() * 50) + 10, // 10-60 available
        icuBeds: Math.floor(Math.random() * 20) + 10, // 10-30 ICU beds
        availableIcuBeds: Math.floor(Math.random() * 5) + 1, // 1-6 available ICU
        emergencyBeds: Math.floor(Math.random() * 30) + 15, // 15-45 emergency beds
        availableEmergencyBeds: Math.floor(Math.random() * 10) + 2, // 2-12 available emergency
        lastUpdated: new Date()
      });

      // Initialize specialties
      const allSpecialties = [
        'Emergency Medicine', 'Cardiology', 'Neurology', 'Trauma Surgery',
        'Pediatrics', 'Obstetrics', 'Orthopedics', 'Internal Medicine',
        'Critical Care', 'Radiology', 'Anesthesiology'
      ];

      const hospitalSpecialties = allSpecialties
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 6) + 3); // 3-9 specialties

      this.hospitalSpecialties.set(hospital.id, {
        hospitalId: hospital.id,
        specialties: hospitalSpecialties,
        certifications: ['Joint Commission', 'Stroke Center'],
        equipmentAvailable: ['CT Scan', 'MRI', 'X-Ray', 'Ultrasound'],
        doctorsOnDuty: hospitalSpecialties.map(specialty => ({
          specialty,
          count: Math.floor(Math.random() * 5) + 1,
          availability: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high'
        }))
      });
    });

    console.log('Hospital integration demo data initialized');
  }

  /**
   * 🔔 Public method to set socket service (to avoid circular dependency)
   */
  public setSocketService(socketService: WebSocketService) {
    this.socketService = socketService;
  }
}