import { Service } from "@tsed/di";
import { WebSocketService } from "./WebSocketService.js";
import { BookingService } from "./BookingService.js";

/**
 * 🔌 Real-time Service Integration
 * 
 * Properly wires up WebSocket service with other services to enable real-time features.
 * This avoids circular dependency issues by using constructor injection.
 */
@Service()
export class RealTimeServiceWiring {
  
  constructor(
    private webSocketService: WebSocketService,
    private bookingService: BookingService
  ) {
    // Wire up socket service to real-time enabled services
    setTimeout(() => {
      this.wireUpServices();
    }, 100); // Small delay to ensure all services are initialized
  }

  private wireUpServices(): void {
    try {
      this.bookingService.setSocketService(this.webSocketService);
      console.log("✅ Real-time services wired up successfully");
    } catch (error) {
      console.error("❌ Failed to wire up real-time services:", error);
    }
  }
}