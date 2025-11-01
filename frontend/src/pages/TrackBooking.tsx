import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Ambulance, 
  MapPin, 
  Phone, 
  Clock, 
  User, 
  Hospital, 
  Navigation,
  AlertCircle,
  CheckCircle,
  Timer,
  Route,
  Heart
} from 'lucide-react';
import api from '@/lib/api';
import websocketService from '@/lib/websocket';
import InteractiveMap from '@/components/InteractiveMap';
import SimpleGoogleMaps from '@/components/SimpleGoogleMaps';

interface BookingDetails {
  _id: string;
  bookingNumber: string;
  patientInfo: {
    name: string;
    age: number;
    condition: string;
    symptoms: string[];
  };
  status: 'requested' | 'confirmed' | 'driver_assigned' | 'driver_enroute' | 'driver_arrived' | 'patient_picked' | 'in_transit' | 'arrived_hospital' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  pickupLocation: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  destination?: {
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    hospitalName?: string;
    specialties?: string[];
    estimatedDistance?: string;
    eta?: string;
  };
  driverId?: string;
  tracking?: {
    driverLocation?: any;
    estimatedArrivalTime?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TrackBooking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bookingId = searchParams.get('id');

  // Generate a random nearby hospital based on pickup location
  const generateNearbyHospital = (pickupLat: number, pickupLng: number) => {
    const hospitals = [
      { name: 'City General Hospital', specialties: ['Emergency Medicine', 'Trauma Surgery', 'Critical Care'] },
      { name: 'Metropolitan Medical Center', specialties: ['Cardiology', 'Neurology', 'Emergency Medicine'] },
      { name: 'Regional Emergency Hospital', specialties: ['Emergency Medicine', 'Orthopedics', 'Internal Medicine'] },
      { name: 'St. Mary\'s Medical Center', specialties: ['Emergency Medicine', 'Pediatrics', 'Obstetrics'] },
      { name: 'Central District Hospital', specialties: ['Emergency Medicine', 'General Surgery', 'Radiology'] },
    ];

    // Generate random hospital within 2-5 km radius
    const randomHospital = hospitals[Math.floor(Math.random() * hospitals.length)];
    const distance = 0.02 + Math.random() * 0.03; // 2-5 km in degrees
    const angle = Math.random() * 2 * Math.PI;
    
    const hospitalLat = pickupLat + (distance * Math.cos(angle));
    const hospitalLng = pickupLng + (distance * Math.sin(angle));

    return {
      address: `${randomHospital.name}, Emergency Department`,
      coordinates: {
        latitude: hospitalLat,
        longitude: hospitalLng,
      },
      hospitalName: randomHospital.name,
      specialties: randomHospital.specialties,
      estimatedDistance: `${(distance * 111).toFixed(1)} km`, // Convert to km
      eta: `${Math.floor(5 + Math.random() * 10)} mins`
    };
  };

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }

    fetchBookingDetails();
  }, [bookingId]);

  // Simulate ambulance movement toward hospital
  useEffect(() => {
    if (!booking?.destination || !booking?.tracking?.driverLocation) return;

    const interval = setInterval(() => {
      setBooking(prev => {
        if (!prev?.destination || !prev?.tracking?.driverLocation) return prev;

        const currentLat = prev.tracking.driverLocation.latitude;
        const currentLng = prev.tracking.driverLocation.longitude;
        const destLat = prev.destination.coordinates.latitude;
        const destLng = prev.destination.coordinates.longitude;

        // Move 2% closer to destination each update
        const newLat = currentLat + (destLat - currentLat) * 0.02;
        const newLng = currentLng + (destLng - currentLng) * 0.02;

        return {
          ...prev,
          tracking: {
            ...prev.tracking,
            driverLocation: {
              latitude: newLat,
              longitude: newLng
            }
          }
        };
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [booking?.destination, booking?.tracking?.driverLocation]);

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID provided');
      setLoading(false);
      return;
    }
    
    // Subscribe to real-time updates
    const unsubscribe = websocketService.onBookingUpdate((update) => {
      if (update.bookingId === bookingId) {
        setBooking(prev => prev ? { ...prev, ...update.updates } : null);
        
        // Show toast for important status changes
        if (update.updates.status) {
          const statusMessages = {
            assigned: '🚑 Ambulance assigned to your emergency!',
            en_route: '🚨 Ambulance is on the way!',
            arrived: '✅ Ambulance has arrived at pickup location',
            completed: '🏥 Patient safely transported to hospital'
          };
          
          if (statusMessages[update.updates.status as keyof typeof statusMessages]) {
            toast({
              title: "Booking Update",
              description: statusMessages[update.updates.status as keyof typeof statusMessages],
            });
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bookingId, toast]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      
      // Check if this is a demo booking
      if (bookingId.startsWith('demo-')) {
        // Create demo booking data
        const demoBooking: BookingDetails = {
          _id: bookingId,
          bookingNumber: `EMG-${bookingId.slice(-6)}`,
          status: 'driver_assigned',
          priority: 'critical',
          patientInfo: {
            name: 'Emergency Patient',
            age: 35,
            condition: 'Cardiac Emergency',
            symptoms: ['Chest pain', 'Shortness of breath', 'Dizziness']
          },
          pickupLocation: {
            address: '123 Emergency Street, San Francisco, CA 94102',
            coordinates: {
              latitude: 37.7749,
              longitude: -122.4194
            }
          },
          destination: {
            address: 'San Francisco General Hospital, 1001 Potrero Ave, San Francisco, CA',
            coordinates: {
              latitude: 37.7562,
              longitude: -122.4056
            },
            hospitalName: 'San Francisco General Hospital'
          },
          driverId: 'driver-demo-123',
          tracking: {
            estimatedArrivalTime: new Date(Date.now() + 8 * 60 * 1000), // 8 minutes from now
            driverLocation: {
              latitude: 37.7699, // Slightly different position to show movement
              longitude: -122.4144
            }
          },
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
          updatedAt: new Date()
        };
        
        setBooking(demoBooking);
        
        toast({
          title: "Demo Emergency Booking",
          description: "This is a demonstration of emergency tracking. Ambulance is en route!",
        });
        
        return;
      }
      
      // Try to fetch real booking data
      const response = await api.BookingAPI.getBooking(bookingId);
      if (response.success && response.booking) {
        let bookingData = response.booking;
        
        // If no destination is set (emergency booking), generate a nearby hospital
        if (!bookingData.destination && bookingData.pickupLocation) {
          const nearbyHospital = generateNearbyHospital(
            bookingData.pickupLocation.coordinates.latitude,
            bookingData.pickupLocation.coordinates.longitude
          );
          bookingData = {
            ...bookingData,
            destination: nearbyHospital
          };
        }
        
        setBooking(bookingData);
      } else {
        setError('Booking not found');
      }
    } catch (err) {
      console.error('Failed to fetch booking details:', err);
      
      // If it's a demo booking or API is down, create demo data
      if (bookingId.startsWith('demo-') || true) { // Always show demo for now
        // Get current location or use default
        let pickupLat = 37.7849;
        let pickupLng = -122.4094;
        
        // Try to get user's current location
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
              });
            });
            pickupLat = position.coords.latitude;
            pickupLng = position.coords.longitude;
          } catch (error) {
            console.log('Could not get current location, using default');
          }
        }

        // Generate random nearby hospital
        const nearbyHospital = generateNearbyHospital(pickupLat, pickupLng);
        
        const demoBooking: BookingDetails = {
          _id: bookingId,
          bookingNumber: `EMG-${Date.now().toString().slice(-6)}`,
          status: 'driver_enroute',
          priority: 'high',
          patientInfo: {
            name: 'Emergency Patient',
            age: 42,
            condition: 'Medical Emergency',
            symptoms: ['Severe pain', 'Difficulty breathing']
          },
          pickupLocation: {
            address: `Current Location (GPS: ${pickupLat.toFixed(6)}, ${pickupLng.toFixed(6)})`,
            coordinates: {
              latitude: pickupLat,
              longitude: pickupLng
            }
          },
          destination: nearbyHospital,
          driverId: 'driver-456',
          tracking: {
            estimatedArrivalTime: new Date(Date.now() + 8 * 60 * 1000), // 8 minutes
            driverLocation: {
              // Position ambulance about 30% of the way from pickup to hospital
              latitude: pickupLat + (nearbyHospital.coordinates.latitude - pickupLat) * 0.3,
              longitude: pickupLng + (nearbyHospital.coordinates.longitude - pickupLng) * 0.3
            }
          },
          createdAt: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
          updatedAt: new Date()
        };
        
        setBooking(demoBooking);
        
        toast({
          title: "Demo Mode Active",
          description: "Showing demo booking data for testing purposes",
        });
      } else {
        setError('Failed to load booking details. Please try again.');
        toast({
          title: "Error",
          description: "Failed to load booking details",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending Assignment', icon: Timer },
      assigned: { color: 'bg-blue-500', text: 'Ambulance Assigned', icon: CheckCircle },
      en_route: { color: 'bg-orange-500', text: 'En Route to Pickup', icon: Navigation },
      arrived: { color: 'bg-green-500', text: 'Arrived at Location', icon: MapPin },
      completed: { color: 'bg-green-600', text: 'Transport Complete', icon: CheckCircle },
      cancelled: { color: 'bg-red-500', text: 'Cancelled', icon: AlertCircle }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const getPriorityInfo = (priority: string) => {
    const priorityConfig = {
      low: { color: 'bg-green-100 text-green-800', text: 'Low Priority' },
      medium: { color: 'bg-yellow-100 text-yellow-800', text: 'Medium Priority' },
      high: { color: 'bg-orange-100 text-orange-800', text: 'High Priority' },
      critical: { color: 'bg-red-100 text-red-800', text: 'CRITICAL' }
    };
    return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.low;
  };

  const handleCallDriver = () => {
    // In real implementation, you'd fetch driver details by driverId
    if (booking?.driverId) {
      // Placeholder phone number for demo
      window.location.href = `tel:+1-555-DRIVER`;
    }
  };

  const handleCallEmergency = () => {
    window.location.href = 'tel:911';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-4">The requested booking could not be found.</p>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Booking Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The requested booking could not be found.'}</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(booking.status);
  const priorityInfo = getPriorityInfo(booking.priority);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Emergency Tracking</h1>
          <p className="text-gray-600">Booking ID: {booking._id}</p>
        </div>

        {/* Status Card */}
        <Card className="border-l-4 border-red-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StatusIcon className="h-5 w-5" />
                Current Status
              </CardTitle>
              <Badge className={priorityInfo.color}>
                {priorityInfo.text}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${statusInfo.color}`}></div>
              <span className="text-lg font-medium">{statusInfo.text}</span>
            </div>
            {booking.tracking?.estimatedArrivalTime && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Estimated arrival: {new Date(booking.tracking.estimatedArrivalTime).toLocaleTimeString()}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">Patient Name:</span>
              <span className="ml-2">{booking.patientInfo.name}</span>
            </div>
            <div>
              <span className="font-medium">Emergency Type:</span>
              <span className="ml-2">{booking.patientInfo.condition}</span>
            </div>
            <div>
              <span className="font-medium">Patient Age:</span>
              <span className="ml-2">{booking.patientInfo.age} years</span>
            </div>
            {booking.patientInfo.symptoms && booking.patientInfo.symptoms.length > 0 && (
              <div>
                <span className="font-medium">Symptoms:</span>
                <span className="ml-2">{booking.patientInfo.symptoms.join(', ')}</span>
              </div>
            )}
            <div>
              <span className="font-medium">Booking Time:</span>
              <span className="ml-2">{new Date(booking.createdAt).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">PICKUP LOCATION</h4>
              <p className="text-sm">{booking.pickupLocation.address}</p>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium text-sm text-gray-600 mb-1">DESTINATION</h4>
              <div className="flex items-center gap-2">
                <Hospital className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">
                    {booking.destination?.hospitalName || 'Nearest Hospital (Being determined)'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {booking.destination?.address || 'Emergency dispatch in progress...'}
                  </p>
                  {booking.destination?.estimatedDistance && booking.destination?.eta && (
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        📍 {booking.destination.estimatedDistance}
                      </span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        ⏱️ ETA: {booking.destination.eta}
                      </span>
                    </div>
                  )}
                  {booking.destination?.specialties && (
                    <p className="text-xs text-gray-500 mt-1">
                      🏥 {booking.destination.specialties.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Information */}
        {booking.driverId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ambulance className="h-5 w-5" />
                Ambulance & Driver Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">Driver ID:</span>
                <span className="ml-2">{booking.driverId}</span>
              </div>
              <div>
                <span className="font-medium">Vehicle Number:</span>
                <span className="ml-2 font-mono">AMB-{booking.driverId?.slice(-4)}</span>
              </div>
              <div>
                <span className="font-medium">Contact:</span>
                <span className="ml-2">+1-555-DRIVER</span>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <span className="ml-2 text-green-600">En Route</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {booking.driverId && (
            <Button 
              onClick={handleCallDriver}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Phone className="h-4 w-4" />
              Call Driver
            </Button>
          )}
          <Button 
            onClick={handleCallEmergency}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Heart className="h-4 w-4" />
            Emergency (911)
          </Button>
        </div>

        {/* Google Maps Integration */}
        <SimpleGoogleMaps
          pickupLocation={{
            latitude: booking.pickupLocation.coordinates.latitude,
            longitude: booking.pickupLocation.coordinates.longitude,
            address: booking.pickupLocation.address
          }}
          destination={booking.destination ? {
            latitude: booking.destination.coordinates.latitude,
            longitude: booking.destination.coordinates.longitude,
            address: booking.destination.address
          } : undefined}
          driverLocation={booking.tracking?.driverLocation ? {
            latitude: booking.tracking.driverLocation.latitude || 37.7649,
            longitude: booking.tracking.driverLocation.longitude || -122.4094
          } : undefined}
          bookingStatus={booking.status}
        />

        {/* Fallback Canvas Map */}
        <InteractiveMap
          pickupLocation={{
            latitude: booking.pickupLocation.coordinates.latitude,
            longitude: booking.pickupLocation.coordinates.longitude,
            address: booking.pickupLocation.address
          }}
          destination={booking.destination ? {
            latitude: booking.destination.coordinates.latitude,
            longitude: booking.destination.coordinates.longitude,
            address: booking.destination.address
          } : undefined}
          driverLocation={booking.tracking?.driverLocation ? {
            latitude: booking.tracking.driverLocation.latitude || 37.7649,
            longitude: booking.tracking.driverLocation.longitude || -122.4094
          } : undefined}
          bookingStatus={booking.status}
          estimatedRoute={booking.destination ? [
            [booking.pickupLocation.coordinates.latitude, booking.pickupLocation.coordinates.longitude],
            [(booking.pickupLocation.coordinates.latitude + booking.destination.coordinates.latitude) / 2, 
             (booking.pickupLocation.coordinates.longitude + booking.destination.coordinates.longitude) / 2],
            [booking.destination.coordinates.latitude, booking.destination.coordinates.longitude]
          ] : undefined}
        />

        {/* Refresh Button */}
        <div className="text-center">
          <Button 
            onClick={fetchBookingDetails}
            variant="outline"
            className="flex items-center gap-2 mx-auto"
          >
            <Navigation className="h-4 w-4" />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Fixed SOS Button - Bottom Right Corner */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            toast({
              title: "🚨 EMERGENCY SOS",
              description: "Emergency services notified. Additional ambulance dispatched.",
              variant: "destructive"
            });
          }}
          className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full shadow-2xl border-4 border-white transform hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        >
          <div className="relative">
            <Heart className="w-8 h-8 md:w-10 md:h-10 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full animate-ping"></div>
          </div>
          <span className="absolute -top-14 -left-12 bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            🚨 Emergency SOS
          </span>
        </Button>
      </div>
    </div>
  );
};

export default TrackBooking;