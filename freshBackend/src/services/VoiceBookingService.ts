import { Service } from '@tsed/di';
import { Logger } from '@tsed/logger';
import { BookingService } from './BookingService.js';
import { UserService } from './UserService.js';
import { BookingType, Priority } from '../models/Booking.js';
import { AmbulanceType } from '../models/Driver.js';

// Voice command patterns for ambulance booking
interface VoiceCommand {
  pattern: RegExp;
  intent: string;
  confidence: number;
}

interface VoiceBookingData {
  transcription: string;
  intent: string;
  entities: {
    location?: string;
    emergency_level?: 'low' | 'medium' | 'high' | 'critical';
    patient_name?: string;
    condition?: string;
    age?: string;
  };
  confidence: number;
}

@Service()
export class VoiceBookingService {
  constructor(
    private logger: Logger,
    private bookingService: BookingService,
    private userService: UserService
  ) {}

  // Voice command patterns for emergency booking
  private voiceCommands: VoiceCommand[] = [
    {
      pattern: /need.*ambulance|emergency.*ambulance|call.*ambulance/i,
      intent: 'emergency_booking',
      confidence: 0.9
    },
    {
      pattern: /chest.*pain|heart.*attack|cardiac.*emergency/i,
      intent: 'cardiac_emergency',
      confidence: 0.95
    },
    {
      pattern: /accident|crashed|injured|bleeding/i,
      intent: 'trauma_emergency',
      confidence: 0.9
    },
    {
      pattern: /breathing.*problem|can't.*breathe|shortness.*breath/i,
      intent: 'respiratory_emergency',
      confidence: 0.9
    },
    {
      pattern: /stroke|paralyzed|face.*drooping|speech.*slurred/i,
      intent: 'stroke_emergency',
      confidence: 0.95
    },
    {
      pattern: /unconscious|passed.*out|not.*responding/i,
      intent: 'unconscious_emergency',
      confidence: 0.9
    },
    {
      pattern: /book.*ambulance|schedule.*ambulance|routine.*transport/i,
      intent: 'routine_booking',
      confidence: 0.8
    }
  ];

  // Location extraction patterns
  private locationPatterns: RegExp[] = [
    /(?:at|from|located.*at|address.*is|I'm.*at)\s+([^.!?]+)/i,
    /(\d+.*(?:street|road|avenue|lane|drive|way|boulevard).*)/i,
    /(?:near|close.*to|by)\s+([^.!?]+)/i
  ];

  // Emergency level patterns
  private emergencyPatterns = {
    critical: /critical|dying|life.*threatening|emergency|urgent.*help/i,
    high: /severe|bad.*pain|accident|bleeding|urgent/i,
    medium: /moderate|need.*help|not.*feeling.*well/i,
    low: /routine|scheduled|non.*urgent|check.*up/i
  };

  /**
   * Process voice transcription and extract booking intent
   */
  async processVoiceCommand(transcription: string, userId?: string): Promise<VoiceBookingData> {
    this.logger.info(`Processing voice command: ${transcription}`);

    const result: VoiceBookingData = {
      transcription,
      intent: 'unknown',
      entities: {},
      confidence: 0
    };

    // Extract intent from voice commands
    let bestMatch: VoiceCommand | null = null;
    let highestConfidence = 0;

    for (const command of this.voiceCommands) {
      if (command.pattern.test(transcription)) {
        if (command.confidence > highestConfidence) {
          bestMatch = command;
          highestConfidence = command.confidence;
        }
      }
    }

    if (bestMatch) {
      result.intent = bestMatch.intent;
      result.confidence = bestMatch.confidence;
    }

    // Extract location
    result.entities.location = this.extractLocation(transcription);

    // Extract emergency level
    result.entities.emergency_level = this.extractEmergencyLevel(transcription);

    // Extract patient name
    result.entities.patient_name = this.extractPatientName(transcription);

    // Extract medical condition
    result.entities.condition = this.extractCondition(transcription);

    // Extract age
    result.entities.age = this.extractAge(transcription);

    this.logger.info(`Voice processing result:`, result);
    return result;
  }

  /**
   * Convert voice booking data to actual booking
   */
  async createBookingFromVoice(voiceData: VoiceBookingData, userId: string): Promise<any> {
    try {
      // Build booking request from voice data
      const bookingRequest = {
        userId,
        pickupLocation: {
          address: voiceData.entities.location || 'Voice booking - location to be confirmed',
          coordinates: {
            latitude: 0,
            longitude: 0
          }
        },
        priority: this.mapEmergencyLevelToPriority(voiceData.entities.emergency_level),
        type: voiceData.intent.includes('emergency') ? BookingType.EMERGENCY : BookingType.SCHEDULED,
        ambulanceRequirements: {
          type: this.selectAmbulanceType(voiceData),
          equipment: [],
          medicalStaff: voiceData.intent.includes('emergency'),
          oxygenRequired: ['cardiac_emergency', 'respiratory_emergency'].includes(voiceData.intent),
          stretcher: true,
          ventilator: voiceData.intent === 'respiratory_emergency'
        },
        patientInfo: {
          name: voiceData.entities.patient_name || 'Voice Booking Patient',
          age: parseInt(voiceData.entities.age || '30'),
          gender: 'unknown' as const,
          condition: voiceData.entities.condition || this.getConditionFromIntent(voiceData.intent),
          symptoms: [voiceData.entities.condition || 'Voice reported emergency'],
          emergencyContact: {
            name: 'Emergency Contact',
            phone: 'To be provided',
            relation: 'family'
          }
        },
        specialRequirements: this.getSpecialRequirements(voiceData),
        notes: `Voice booking: "${voiceData.transcription}"`
      };

      // Create the booking
      const booking = await this.bookingService.createBooking(bookingRequest);
      
      this.logger.info(`Voice booking created successfully: ${booking.bookingId}`);
      return booking;

    } catch (error) {
      this.logger.error('Failed to create booking from voice:', error);
      throw error;
    }
  }

  /**
   * Extract location from transcription
   */
  private extractLocation(text: string): string | undefined {
    for (const pattern of this.locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  /**
   * Extract emergency level from transcription
   */
  private extractEmergencyLevel(text: string): 'low' | 'medium' | 'high' | 'critical' {
    if (this.emergencyPatterns.critical.test(text)) return 'critical';
    if (this.emergencyPatterns.high.test(text)) return 'high';
    if (this.emergencyPatterns.medium.test(text)) return 'medium';
    return 'low';
  }

  /**
   * Extract patient name from transcription
   */
  private extractPatientName(text: string): string | undefined {
    const patterns = [
      /(?:patient.*is|name.*is|this.*is|I'm|my.*name.*is)\s+([A-Za-z\s]+)/i,
      /for\s+([A-Za-z\s]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Basic validation - should be reasonable length and contain letters
        if (name.length > 2 && name.length < 50 && /[A-Za-z]/.test(name)) {
          return name;
        }
      }
    }
    return undefined;
  }

  /**
   * Extract medical condition from transcription
   */
  private extractCondition(text: string): string | undefined {
    const conditionPatterns = [
      /(?:having|suffering.*from|experiencing)\s+([^.!?]+)/i,
      /(?:chest.*pain|heart.*attack|stroke|bleeding|breathing.*problem)/i,
      /(?:broken|injured|hurt)\s+([^.!?]+)/i
    ];

    for (const pattern of conditionPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }
    return undefined;
  }

  /**
   * Extract age from transcription
   */
  private extractAge(text: string): string | undefined {
    const agePattern = /(?:age|aged|years.*old|year.*old)\s*(?:is\s*)?(\d{1,3})/i;
    const match = text.match(agePattern);
    if (match && match[1]) {
      const age = parseInt(match[1]);
      if (age > 0 && age < 120) {
        return age.toString();
      }
    }
    return undefined;
  }

  /**
   * Map emergency level to booking priority
   */
  private mapEmergencyLevelToPriority(level?: string): Priority {
    switch (level) {
      case 'critical': return Priority.CRITICAL;
      case 'high': return Priority.HIGH;
      case 'medium': return Priority.MEDIUM;
      default: return Priority.LOW;
    }
  }

  /**
   * Select appropriate ambulance type based on voice data
   */
  private selectAmbulanceType(voiceData: VoiceBookingData): AmbulanceType {
    if (voiceData.intent === 'cardiac_emergency') return AmbulanceType.CARDIAC;
    if (voiceData.intent === 'stroke_emergency') return AmbulanceType.ADVANCED;
    if (voiceData.intent === 'trauma_emergency') return AmbulanceType.ADVANCED;
    if (voiceData.entities.emergency_level === 'critical') return AmbulanceType.EMERGENCY;
    if (voiceData.entities.emergency_level === 'high') return AmbulanceType.ADVANCED;
    return AmbulanceType.BASIC;
  }

  /**
   * Get medical condition from intent
   */
  private getConditionFromIntent(intent: string): string {
    switch (intent) {
      case 'cardiac_emergency': return 'Cardiac Emergency';
      case 'respiratory_emergency': return 'Breathing Difficulty';
      case 'trauma_emergency': return 'Trauma/Accident';
      case 'stroke_emergency': return 'Stroke Symptoms';
      case 'unconscious_emergency': return 'Unconscious Patient';
      default: return 'Medical Emergency';
    }
  }

  /**
   * Get special requirements based on voice data
   */
  private getSpecialRequirements(voiceData: VoiceBookingData): string[] {
    const requirements: string[] = ['voice-booking'];
    
    if (voiceData.intent === 'cardiac_emergency') {
      requirements.push('cardiac-monitor', 'emergency-medications');
    }
    if (voiceData.intent === 'respiratory_emergency') {
      requirements.push('oxygen-support', 'respiratory-equipment');
    }
    if (voiceData.intent === 'trauma_emergency') {
      requirements.push('trauma-kit', 'immobilization-equipment');
    }
    
    return requirements;
  }

  /**
   * Generate voice booking confirmation message
   */
  generateConfirmationMessage(voiceData: VoiceBookingData, bookingId: string): string {
    const location = voiceData.entities.location || 'your location';
    const condition = voiceData.entities.condition || 'the reported emergency';
    
    return `Emergency booking confirmed. Booking ID: ${bookingId}. 
    Ambulance dispatched to ${location} for ${condition}. 
    Please stay calm and keep your phone nearby. Help is on the way.`;
  }
}