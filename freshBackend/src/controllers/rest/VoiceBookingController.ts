import { Controller, Inject } from "@tsed/di";
import { Post, Returns, Summary, Description } from "@tsed/schema";
import { BodyParams } from "@tsed/platform-params";
import { VoiceBookingService } from "../../services/VoiceBookingService.js";
import { Logger } from "@tsed/logger";
import { BadRequest } from "@tsed/exceptions";

interface VoiceBookingRequest {
  transcription: string;
  userId?: string;
}

@Controller("/voice-booking")
export class VoiceBookingController {
  @Inject()
  private voiceBookingService: VoiceBookingService;

  @Inject()
  private logger: Logger;

  @Post("/")
  @Summary("Create booking from voice transcription")
  @Description("Process voice transcription text and create ambulance booking")
  async createVoiceBooking(
    @BodyParams() request: VoiceBookingRequest
  ): Promise<any> {
    try {
      this.logger.info(`Processing voice booking request for user: ${request.userId || 'anonymous'}`);

      if (!request.transcription || request.transcription.trim().length === 0) {
        throw new BadRequest("No transcription provided");
      }

      // Process the voice command
      const voiceData = await this.voiceBookingService.processVoiceCommand(
        request.transcription,
        request.userId
      );

      // Create booking from voice data
      const booking = await this.voiceBookingService.createBookingFromVoice(
        voiceData,
        request.userId || 'anonymous-voice-user'
      );

      return {
        success: true,
        transcription: request.transcription,
        confidence: voiceData.confidence,
        intent: voiceData.intent,
        entities: voiceData.entities,
        bookingId: booking.bookingId || booking._id
      };

    } catch (error) {
      this.logger.error('Voice booking error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      };
    }
  }

  @Post("/test")
  @Summary("Test voice booking with sample data")
  @Description("Test endpoint for voice booking using predefined sample data")
  async testVoiceBooking(
    @BodyParams("userId") userId?: string
  ): Promise<any> {
    try {
      this.logger.info(`Testing voice booking for user: ${userId || 'test-user'}`);

      const sampleTranscriptions = [
        "I need an ambulance at Main Street near the hospital, patient having chest pain, very urgent",
        "Emergency at MG Road, elderly person fell down, conscious but can't move leg",
        "Ambulance needed at Park Avenue, breathing problems, please send advanced life support",
        "Need medical transport from home to hospital, patient with diabetes emergency"
      ];

      const randomTranscription = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)];

      // Process the voice command
      const voiceData = await this.voiceBookingService.processVoiceCommand(
        randomTranscription,
        userId
      );

      // Create booking from voice data
      const booking = await this.voiceBookingService.createBookingFromVoice(
        voiceData,
        userId || 'test-user'
      );

      return {
        success: true,
        transcription: randomTranscription,
        confidence: 1.0,
        intent: voiceData.intent,
        entities: voiceData.entities,
        bookingId: booking.bookingId || booking._id
      };

    } catch (error) {
      this.logger.error('Test voice booking error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      };
    }
  }
}