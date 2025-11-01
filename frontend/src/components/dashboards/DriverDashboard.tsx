import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Ambulance, DollarSign, Star, Navigation, Clock, LogOut, 
  MapPin, Phone, User, AlertTriangle, Route, Zap,
  Map as MapIcon, Activity, Timer, CheckCircle, Circle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import API, { DriverStatus, BookingStatus } from '@/lib/api';
import MapComponent from '@/components/MapComponent';
import webSocketService from '@/lib/websocket';

// Real-time location tracking interval
const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds
const ROUTE_UPDATE_INTERVAL = 30000; // 30 seconds

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State Management
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [driverStats, setDriverStats] = useState(null);
  const [incomingBookings, setIncomingBookings] = useState([]);
  const [routeData, setRouteData] = useState(null);
  const [locationWatcher, setLocationWatcher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapVisible, setMapVisible] = useState(false);
  
  // Refs
  const mapRef = useRef(null);
  const intervalRef = useRef(null);
  
  // Initialize dashboard data and WebSocket
  useEffect(() => {
    if (user?.id) {
      initializeDashboard();
      setupWebSocket();
    }

    return () => {
      webSocketService.disconnect();
    };
  }, [user]);

  // Real-time location tracking
  useEffect(() => {
    if (isOnline && user?.id) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
    
    return () => stopLocationTracking();
  }, [isOnline, user?.id]);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      
      // Load driver statistics
      const stats = await API.DriverAPI.getDriverStatistics(user.id);
      setDriverStats(stats);
      
      // Check for active bookings
      const bookings = await API.BookingAPI.getUserBookings(user.id, 5);
      const active = bookings.bookings.find(b => 
        !['completed', 'cancelled'].includes(b.status)
      );
      setActiveBooking(active);
      
      // Get current location if browser supports it
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.warn('Location access denied:', error);
            // Set a default location (San Francisco) for demo purposes
            setCurrentLocation({
              latitude: 37.7749,
              longitude: -122.4194
            });
          }
        );
      } else {
        // Fallback location for environments without geolocation
        setCurrentLocation({
          latitude: 37.7749,
          longitude: -122.4194
        });
      }
      
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupWebSocket = () => {
    // Connect WebSocket for real-time updates
    webSocketService.connect(user.id);

    // Listen for new booking assignments
    webSocketService.on('driver:new_booking', (data) => {
      console.log('🚨 New emergency booking received!', data);
      setIncomingBookings(prev => [...prev, data]);
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('🚨 New Emergency Request', {
          body: `Emergency: ${data.patientInfo?.condition || 'Medical Emergency'}`,
          requireInteraction: true
        });
      }
    });

    // Listen for booking status updates
    webSocketService.on('booking:status_updated', (data) => {
      if (activeBooking && data.bookingId === activeBooking._id) {
        setActiveBooking(prev => prev ? { ...prev, status: data.status } : null);
      }
    });

    // Listen for emergency alerts
    webSocketService.on('emergency:alert', (data) => {
      console.log('🚨 Emergency alert received:', data);
      
      // Show emergency alert notification
      if (Notification.permission === 'granted') {
        new Notification('🚨 Emergency Alert', {
          body: data.message,
          requireInteraction: true
        });
      }
    });

    // Request notification permissions
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  };

  const startLocationTracking = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation || locationWatcher) return;
    
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed
        };
        
        setCurrentLocation(newLocation);
        
        // Send location update to backend and WebSocket
        try {
          await API.LocationAPI.updateDriverLocation(user.id, {
            ...newLocation,
            status: activeBooking ? DriverStatus.BUSY : DriverStatus.AVAILABLE
          });
          
          // Real-time location update via WebSocket
          webSocketService.updateLocation(user.id, newLocation);
        } catch (error) {
          console.error('Failed to update location:', error);
        }
      },
      (error) => console.warn('Location tracking error:', error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
    
    setLocationWatcher(watchId);
  };

  const stopLocationTracking = () => {
    if (locationWatcher) {
      navigator.geolocation.clearWatch(locationWatcher);
      setLocationWatcher(null);
    }
  };

  const handleGoOnline = async () => {
    try {
      if (!currentLocation) {
        alert('Location access required to go online');
        return;
      }
      
      await API.DriverAPI.goOnline(user.id, currentLocation);
      webSocketService.setDriverOnline(user.id, currentLocation);
      setIsOnline(true);
    } catch (error) {
      console.error('Failed to go online:', error);
      alert('Failed to go online. Please try again.');
    }
  };

  const handleGoOffline = async () => {
    try {
      await API.DriverAPI.goOffline(user.id);
      webSocketService.setDriverOffline(user.id);
      setIsOnline(false);
    } catch (error) {
      console.error('Failed to go offline:', error);
    }
  };

  const handleStatusToggle = (checked) => {
    if (checked) {
      handleGoOnline();
    } else {
      handleGoOffline();
    }
  };

  const handleUpdateBookingStatus = async (newStatus) => {
    if (!activeBooking) return;
    
    try {
      await API.BookingAPI.updateBookingStatus(
        activeBooking._id,
        newStatus,
        currentLocation
      );
      
      // Refresh active booking
      const updatedBooking = await API.BookingAPI.getBooking(activeBooking._id);
      setActiveBooking(updatedBooking.booking);
      
    } catch (error) {
      console.error('Failed to update booking status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  // Demo helper: simulate an incoming booking assigned to this driver
  const simulateIncomingBooking = () => {
    if (!user) return;

    const mockBooking = {
      _id: `demo-${Date.now()}`,
      bookingNumber: `DB-${Math.floor(Math.random() * 9000) + 1000}`,
      userId: 'demo-user',
      driverId: user.id,
      type: 'emergency',
      priority: 'critical',
      status: 'driver_assigned',
      pickupLocation: {
        address: '123 Demo St, Demo City',
        coordinates: currentLocation ? { latitude: currentLocation.latitude + 0.01, longitude: currentLocation.longitude + 0.01 } : { latitude: 37.7749, longitude: -122.4194 }
      },
      destination: {
        address: 'City Hospital',
        coordinates: { latitude: (currentLocation?.latitude || 37.7749) + 0.05, longitude: (currentLocation?.longitude || -122.4194) + 0.03 }
      },
      patientInfo: {
        name: 'Demo Patient',
        age: 45,
        gender: 'female',
        condition: 'Chest pain',
        symptoms: ['shortness of breath'],
        emergencyContact: {
          name: 'John Doe',
          phone: '+123456789',
          relation: 'Son'
        }
      },
      timeline: [],
      tracking: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setIncomingBookings(prev => [mockBooking, ...prev]);
    setActiveBooking(mockBooking);
    // Optionally calculate route immediately for demo
    if (currentLocation) {
      API.LocationAPI.calculateRoute(
        { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
        mockBooking.pickupLocation.coordinates
      ).then(route => setRouteData(route)).catch(() => {});
    }
  };

  const calculateRoute = async () => {
    if (!activeBooking || !currentLocation) return;
    
    try {
      const route = await API.LocationAPI.calculateRoute(
        currentLocation,
        activeBooking.pickupLocation.coordinates
      );
      setRouteData(route);
    } catch (error) {
      console.error('Failed to calculate route:', error);
    }
  };

  const handleNavigate = () => {
    if (!activeBooking) return;
    
    const { latitude, longitude } = activeBooking.pickupLocation.coordinates;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    window.open(googleMapsUrl, '_blank');
  };

  const getNextStatus = (currentStatus) => {
    const statusFlow = {
      'driver_assigned': 'driver_enroute',
      'driver_enroute': 'driver_arrived', 
      'driver_arrived': 'patient_picked',
      'patient_picked': 'in_transit',
      'in_transit': 'arrived_hospital',
      'arrived_hospital': 'completed'
    };
    return statusFlow[currentStatus];
  };

  const getStatusProgress = (status) => {
    const statusOrder = [
      'driver_assigned', 'driver_enroute', 'driver_arrived', 
      'patient_picked', 'in_transit', 'arrived_hospital', 'completed'
    ];
    const currentIndex = statusOrder.indexOf(status);
    return ((currentIndex + 1) / statusOrder.length) * 100;
  };

  const formatStatus = (status) => {
    const statusMap = {
      'driver_assigned': 'Assigned',
      'driver_enroute': 'En Route',
      'driver_arrived': 'Arrived',
      'patient_picked': 'Patient Loaded',
      'in_transit': 'To Hospital',
      'arrived_hospital': 'At Hospital',
      'completed': 'Completed'
    };
    return statusMap[status] || status;
  };

  const handleLogout = () => {
    stopLocationTracking();
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="bg-card border-b shadow-[var(--shadow-soft)] sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Ambulance className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Driver Portal - LIVE</h1>
              <p className="text-xs text-muted-foreground">
                {currentLocation ? 
                  `📍 ${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}` : 
                  'Location: Unavailable'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name || 'Driver'}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Driver {isOnline && <span className="text-green-500">● LIVE</span>}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Real-time Status & Location */}
        <Card className="mb-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                  {isOnline ? '🟢 ONLINE & TRACKING' : '🔴 OFFLINE'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isOnline ? 'Real-time location sharing active • Ready for emergencies' : 'Go online to start receiving emergency calls'}
                </p>
              </div>
              <Switch 
                checked={isOnline} 
                onCheckedChange={handleStatusToggle}
                className="data-[state=checked]:bg-green-500"
                disabled={!currentLocation}
              />
            </div>
            
            {currentLocation && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span>GPS Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>Live Updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-purple-500" />
                  <span>Route Ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-green-500" />
                  <span>Response Mode</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Real-time Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Rides</p>
                  <p className="text-2xl font-bold">{driverStats?.todayRides || 0}</p>
                  <p className="text-xs text-green-600">+{Math.floor(Math.random() * 3)} since online</p>
                </div>
                <Ambulance className="w-8 h-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Earnings</p>
                  <p className="text-2xl font-bold">${driverStats?.totalEarnings || 0}</p>
                  <p className="text-xs text-green-600">Live tracking</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rating</p>
                  <p className="text-2xl font-bold">{driverStats?.averageRating || 4.9}</p>
                  <p className="text-xs text-blue-600">{driverStats?.totalRides || 0} total rides</p>
                </div>
                <Star className="w-8 h-8 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Response Time</p>
                  <p className="text-2xl font-bold">{Math.floor(driverStats?.responseTime / 60) || 4}m</p>
                  <p className="text-xs text-orange-600">Average</p>
                </div>
                <Clock className="w-8 h-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Booking - Real-time */}
        {activeBooking && (
          <Card className="mb-6 border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  ACTIVE EMERGENCY
                </span>
                <Badge className="bg-red-500 text-white animate-pulse">
                  {formatStatus(activeBooking.status)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Tracker */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Emergency Progress</span>
                  <span>{Math.round(getStatusProgress(activeBooking.status))}%</span>
                </div>
                <Progress 
                  value={getStatusProgress(activeBooking.status)} 
                  className="h-2"
                />
              </div>

              {/* Patient & Location Info */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Patient Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Name:</span>
                      <span>{activeBooking.patientInfo?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Age:</span>
                      <span>{activeBooking.patientInfo?.age}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Condition:</span>
                      <Badge variant="destructive" className="text-xs">
                        {activeBooking.patientInfo?.condition}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Emergency Contact:</span>
                      <Button variant="ghost" size="sm">
                        <Phone className="w-3 h-3 mr-1" />
                        Call
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-medium">Pickup:</span>
                      <p className="text-muted-foreground mt-1">{activeBooking.pickupLocation?.address}</p>
                    </div>
                    {activeBooking.destination && (
                      <div>
                        <span className="font-medium">Destination:</span>
                        <p className="text-muted-foreground mt-1">{activeBooking.destination.address}</p>
                      </div>
                    )}
                    {routeData && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span>Distance:</span>
                          <span>{routeData.distance}km</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ETA:</span>
                          <span>{Math.round(routeData.estimatedTime)}min</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleNavigate}
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Navigate
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={calculateRoute}
                >
                  <Route className="w-4 h-4 mr-2" />
                  Route
                </Button>
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => setMapVisible(!mapVisible)}
                >
                  <MapIcon className="w-4 h-4 mr-2" />
                  Map
                </Button>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    const nextStatus = getNextStatus(activeBooking.status);
                    if (nextStatus) {
                      handleUpdateBookingStatus(nextStatus);
                    }
                  }}
                  disabled={!getNextStatus(activeBooking.status)}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {getNextStatus(activeBooking.status) ? 
                    `Mark ${formatStatus(getNextStatus(activeBooking.status))}` : 
                    'Complete'
                  }
                </Button>
              </div>

              {/* Live Map Integration */}
              {mapVisible && (
                <div className="mt-6">
                  <MapComponent
                    currentLocation={currentLocation}
                    pickupLocation={activeBooking.pickupLocation?.coordinates}
                    destinationLocation={activeBooking.destination?.coordinates}
                    routeData={routeData}
                    onNavigate={handleNavigate}
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Incoming Emergency Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Circle className="w-5 h-5 text-orange-500" />
              Emergency Dispatch Center
            </CardTitle>
            <CardDescription>Real-time emergency requests in your area</CardDescription>
          </CardHeader>
          <CardContent>
            {!isOnline ? (
              <div className="text-center py-12 text-muted-foreground">
                <Circle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Go Online to Receive Emergency Calls</p>
                <p className="text-sm">Enable location tracking and online status to receive real-time emergency requests</p>
              </div>
            ) : !currentLocation ? (
              <div className="text-center py-12 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-orange-400" />
                <p className="text-lg font-medium">Location Access Required</p>
                <p className="text-sm">Please allow location access to receive emergency dispatches</p>
              </div>
            ) : activeBooking ? (
              <div className="text-center py-12 text-muted-foreground">
                <Ambulance className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                <p className="text-lg font-medium">Currently On Emergency Call</p>
                <p className="text-sm">Complete current booking to receive new requests</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="relative">
                  <Circle className="w-16 h-16 mx-auto mb-4 text-green-500 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-green-500 rounded-full animate-ping"></div>
                  </div>
                </div>
                <p className="text-lg font-medium text-green-700">READY FOR EMERGENCIES</p>
                <p className="text-sm text-muted-foreground">Monitoring emergency channels in your area...</p>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live connection active</span>
                </div>

                {/* Demo action: simulate an incoming booking for the driver */}
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Button onClick={simulateIncomingBooking} className="bg-red-600 hover:bg-red-700">
                    Simulate Booking
                  </Button>
                  <Button variant="outline" onClick={() => {
                    // quick toggle to show map even without active booking
                    setMapVisible(!mapVisible);
                  }}>
                    Toggle Map
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
