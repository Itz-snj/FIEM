/**
 * 📡 REAL-TIME WEBSOCKET SERVICE
 * 
 * Handles real-time connections for live updates in the driver dashboard.
 * Integrates with backend Phase 4 real-time services.
 * 
 * Note: This is a mock implementation. To use real WebSockets:
 * 1. Install: npm install socket.io-client
 * 2. Uncomment the real Socket.io implementation below
 * 3. Enable the backend WebSocket server
 */

// Mock Socket interface for development
interface MockSocket {
  connected: boolean;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  emit: (event: string, data?: any) => void;
  disconnect: () => void;
}

interface SocketEvents {
  // Driver specific events
  'driver:location_update': (data: { driverId: string; location: any }) => void;
  'driver:status_change': (data: { driverId: string; status: string }) => void;
  'driver:booking_assigned': (data: { bookingId: string; booking: any }) => void;
  
  // Booking events
  'booking:status_updated': (data: { bookingId: string; status: string; location?: any }) => void;
  'booking:new_request': (data: { bookingId: string; booking: any }) => void;
  'booking:cancelled': (data: { bookingId: string; reason: string }) => void;
  
  // Emergency events
  'emergency:alert': (data: { alertId: string; message: string; location: any }) => void;
  'emergency:broadcast': (data: { message: string; priority: string }) => void;
  
  // System events
  'system:health_update': (data: { status: string; metrics: any }) => void;
  'connection:status': (data: { connected: boolean }) => void;
}

class WebSocketService {
  private socket: MockSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isDriverOnline = false;
  private currentDriverId: string | null = null;
  private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();
  
  constructor() {
    this.connect();
  }

  /**
   * Initialize WebSocket connection to backend (Mock Implementation)
   */
  connect(driverId?: string) {
    try {
      // Mock WebSocket connection
      this.socket = {
        connected: true,
        on: (event: string, callback: (...args: any[]) => void) => {
          if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
          }
          this.eventListeners.get(event)!.push(callback);
        },
        off: (event: string, callback?: (...args: any[]) => void) => {
          if (!callback) {
            this.eventListeners.delete(event);
          } else {
            const listeners = this.eventListeners.get(event) || [];
            const index = listeners.indexOf(callback);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        },
        emit: (event: string, data?: any) => {
          console.log(`📡 Mock WebSocket emit: ${event}`, data);
          // Mock server responses
          this.handleMockServerResponse(event, data);
        },
        disconnect: () => {
          this.socket!.connected = false;
          console.log('🔌 Mock WebSocket disconnected');
        }
      };

      this.currentDriverId = driverId || null;
      this.setupEventListeners();
      
      // Simulate connection success
      setTimeout(() => {
        this.emitToListeners('connect', {});
      }, 100);
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.handleReconnect();
    }
  }

  /**
   * Handle mock server responses
   */
  private handleMockServerResponse(event: string, data: any) {
    switch (event) {
      case 'driver:join':
        console.log(`🚑 Mock: Driver joined room ${data.driverId}`);
        break;
      case 'driver:online':
        console.log('🟢 Mock: Driver status updated to online');
        // Simulate receiving nearby emergency after going online
        setTimeout(() => {
          this.simulateEmergencyRequest();
        }, 10000); // 10 seconds after going online
        break;
      case 'location:update':
        console.log('📍 Mock: Location updated', data);
        break;
      case 'booking:status_update':
        console.log('📊 Mock: Booking status updated', data);
        break;
    }
  }

  /**
   * Simulate emergency request for demo
   */
  private simulateEmergencyRequest() {
    const mockEmergency = {
      bookingId: `emergency-${Date.now()}`,
      patientInfo: {
        name: 'Emergency Patient',
        age: 45,
        condition: 'Cardiac Emergency'
      },
      pickupLocation: {
        address: '123 Emergency St, San Francisco, CA',
        coordinates: {
          latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.01
        }
      },
      priority: 'CRITICAL'
    };

    this.emitToListeners('driver:new_booking', mockEmergency);
  }

  /**
   * Emit events to registered listeners
   */
  private emitToListeners(event: string, data: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Setup Socket.io event listeners
   */
  private setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      this.reconnectAttempts = 0;
      
      if (this.currentDriverId) {
        this.joinDriverRoom(this.currentDriverId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      if (reason === 'io server disconnect') {
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      this.handleReconnect();
    });

    // Driver-specific events
    this.socket.on('driver:new_booking', (data) => {
      console.log('📋 New booking assigned:', data);
      this.notifyNewBooking(data);
    });

    this.socket.on('booking:status_updated', (data) => {
      console.log('📊 Booking status updated:', data);
      // Trigger UI update for booking status
    });

    this.socket.on('emergency:alert', (data) => {
      console.log('🚨 Emergency alert:', data);
      this.showEmergencyAlert(data);
    });

    // Location updates
    this.socket.on('location:update_request', () => {
      console.log('📍 Location update requested');
      // Trigger location update from the dashboard
    });
  }

  /**
   * Join driver-specific room for targeted updates
   */
  joinDriverRoom(driverId: string) {
    if (!this.socket || !driverId) return;

    this.currentDriverId = driverId;
    this.socket.emit('driver:join', { driverId });
    console.log(`🚑 Joined driver room: ${driverId}`);
  }

  /**
   * Update driver online status
   */
  setDriverOnline(driverId: string, location: any) {
    if (!this.socket) return;

    this.isDriverOnline = true;
    this.socket.emit('driver:online', {
      driverId,
      location,
      timestamp: new Date().toISOString()
    });
    console.log('🟢 Driver went online');
  }

  /**
   * Update driver offline status
   */
  setDriverOffline(driverId: string) {
    if (!this.socket) return;

    this.isDriverOnline = false;
    this.socket.emit('driver:offline', {
      driverId,
      timestamp: new Date().toISOString()
    });
    console.log('🔴 Driver went offline');
  }

  /**
   * Send real-time location update
   */
  updateLocation(driverId: string, location: any) {
    if (!this.socket || !this.isDriverOnline) return;

    this.socket.emit('location:update', {
      driverId,
      location: {
        ...location,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Update booking status with real-time broadcast
   */
  updateBookingStatus(bookingId: string, status: string, location?: any) {
    if (!this.socket) return;

    this.socket.emit('booking:status_update', {
      bookingId,
      status,
      location,
      driverId: this.currentDriverId,
      timestamp: new Date().toISOString()
    });
    console.log(`📊 Booking status updated: ${status}`);
  }

  /**
   * Join specific booking room for updates
   */
  joinBookingRoom(bookingId: string) {
    if (!this.socket) return;

    this.socket.emit('booking:join', { 
      bookingId,
      userType: 'driver',
      userId: this.currentDriverId 
    });
    console.log(`📋 Joined booking room: ${bookingId}`);
  }

  /**
   * Send driver message to booking stakeholders
   */
  sendBookingMessage(bookingId: string, message: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    if (!this.socket) return;

    this.socket.emit('booking:message', {
      bookingId,
      fromType: 'driver',
      fromId: this.currentDriverId,
      message,
      priority,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle reconnection attempts
   */
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔌 Max reconnection attempts reached');
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      console.log(`🔌 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect(this.currentDriverId || undefined);
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Show new booking notification
   */
  private notifyNewBooking(data: any) {
    // Create browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Emergency Request', {
        body: `New emergency booking: ${data.patientInfo?.condition || 'Emergency'}`,
        icon: '/ambulance-icon.png',
        badge: '/emergency-badge.png',
        tag: 'emergency-booking',
        requireInteraction: true
      });
    }

    // Play emergency sound
    this.playEmergencySound();

    // Dispatch custom event for UI handling
    window.dispatchEvent(new CustomEvent('newBookingReceived', { detail: data }));
  }

  /**
   * Show emergency alert notification
   */
  private showEmergencyAlert(data: any) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Emergency Alert', {
        body: data.message,
        icon: '/emergency-icon.png',
        tag: 'emergency-alert',
        requireInteraction: true
      });
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('emergencyAlert', { detail: data }));
  }

  /**
   * Play emergency notification sound
   */
  private playEmergencySound() {
    try {
      const audio = new Audio('/sounds/emergency-alert.mp3');
      audio.volume = 0.7;
      audio.play().catch(e => console.warn('Could not play sound:', e));
    } catch (error) {
      console.warn('Emergency sound not available:', error);
    }
  }

  /**
   * Request notification permissions
   */
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.socket) {
      if (this.currentDriverId) {
        this.setDriverOffline(this.currentDriverId);
      }
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 WebSocket disconnected');
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Subscribe to booking status updates
   */
  onBookingUpdate(callback: (update: { bookingId: string; updates: any }) => void) {
    this.on('booking:status_updated', callback);
    
    // Return unsubscribe function
    return () => {
      this.off('booking:status_updated', callback);
    };
  }

  /**
   * Listen for custom events
   */
  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) return;
    this.socket.on(event, callback);
  }

  /**
   * Remove event listeners
   */
  off(event: string, callback?: (...args: any[]) => void) {
    if (!this.socket) return;
    this.socket.off(event, callback);
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;