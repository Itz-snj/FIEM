import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, 
  Navigation, 
  Phone, 
  MessageCircle, 
  MapPin, 
  Clock, 
  User, 
  Ambulance, 
  Hospital, 
  Star, 
  Shield, 
  Activity, 
  Heart, 
  AlertCircle,
  CheckCircle2,
  Timer,
  Route,
  Zap,
  FileText,
  Bell,
  Share2
} from 'lucide-react';

interface CurrentRide {
  id: string;
  bookingNumber: string;
  status: 'assigned' | 'en-route' | 'arrived' | 'patient-loaded' | 'heading-to-hospital' | 'at-hospital' | 'completed';
  estimatedArrival: string;
  actualArrival?: string;
  driver: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    photo?: string;
    experience: string;
    totalRides: number;
  };
  ambulance: {
    number: string;
    type: 'basic' | 'advanced' | 'cardiac' | 'icu';
    features: string[];
    equipment: string[];
  };
  patient: {
    name: string;
    age: number;
    condition: string;
    emergencyContact: {
      name: string;
      phone: string;
    };
  };
  route: {
    pickup: {
      address: string;
      coordinates: [number, number];
    };
    destination?: {
      address: string;
      coordinates: [number, number];
    };
    currentLocation: [number, number];
    distance: string;
    duration: string;
  };
  timeline: Array<{
    status: string;
    timestamp: string;
    location?: string;
    notes?: string;
  }>;
  communication: Array<{
    type: 'call' | 'message' | 'system';
    timestamp: string;
    content: string;
    from: string;
  }>;
}

export default function CurrentRidePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  
  const [currentRide, setCurrentRide] = useState<CurrentRide | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Sample current ride data
  const sampleRide: CurrentRide = {
    id: bookingId || 'booking-current-123',
    bookingNumber: 'AMB-2025',
    status: 'en-route',
    estimatedArrival: '8 mins',
    driver: {
      id: 'driver-001',
      name: 'Rajesh Kumar',
      phone: '+91 98765 43210',
      rating: 4.8,
      experience: '8 years',
      totalRides: 2340
    },
    ambulance: {
      number: 'KA-05-MH-1234',
      type: 'advanced',
      features: ['Paramedic Team', 'Advanced Monitoring', 'IV Therapy', 'Emergency Medications'],
      equipment: ['Defibrillator', 'ECG Monitor', 'IV Equipment', 'Advanced Airway Tools']
    },
    patient: {
      name: 'John Doe',
      age: 45,
      condition: 'Chest Pain',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '+91 98765 12345'
      }
    },
    route: {
      pickup: {
        address: 'MG Road Metro Station, Bangalore',
        coordinates: [77.6033, 12.9762]
      },
      destination: {
        address: 'Apollo Hospital, Sheshadripuram',
        coordinates: [77.5946, 12.9876]
      },
      currentLocation: [77.6000, 12.9800],
      distance: '4.2 km',
      duration: '12 mins'
    },
    timeline: [
      {
        status: 'Booking Confirmed',
        timestamp: '2025-11-01T10:30:00Z',
        notes: 'Ambulance booking confirmed and dispatched'
      },
      {
        status: 'Driver Assigned',
        timestamp: '2025-11-01T10:32:00Z',
        notes: 'Rajesh Kumar assigned as your driver'
      },
      {
        status: 'En Route to Pickup',
        timestamp: '2025-11-01T10:35:00Z',
        location: 'Brigade Road',
        notes: 'Driver is on the way to pickup location'
      }
    ],
    communication: [
      {
        type: 'system',
        timestamp: '2025-11-01T10:35:00Z',
        content: 'Driver is on the way. ETA: 8 minutes',
        from: 'System'
      }
    ]
  };

  useEffect(() => {
    loadCurrentRide();
  }, [bookingId]);

  useEffect(() => {
    if (autoRefresh && currentRide) {
      const interval = setInterval(() => {
        updateRideStatus();
      }, 30000); // Update every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh, currentRide]);

  const loadCurrentRide = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real app, fetch from API
      // const response = await API.BookingAPI.getCurrentRide(bookingId);
      
      setCurrentRide(sampleRide);
      
      toast({
        title: "🚑 Ride Loaded",
        description: "Real-time tracking active",
      });
    } catch (error) {
      toast({
        title: "❌ Load Failed",
        description: "Could not load ride information",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateRideStatus = async () => {
    if (!currentRide) return;
    
    try {
      // Simulate real-time updates
      // In real app, this would be WebSocket or polling
      const updatedETA = Math.max(1, parseInt(currentRide.estimatedArrival) - 1);
      setCurrentRide(prev => prev ? {
        ...prev,
        estimatedArrival: `${updatedETA} mins`
      } : null);
    } catch (error) {
      console.error('Failed to update ride status:', error);
    }
  };

  const callDriver = () => {
    if (currentRide?.driver.phone) {
      window.location.href = `tel:${currentRide.driver.phone}`;
    }
  };

  const messageDriver = () => {
    toast({
      title: "💬 Message Sent",
      description: "Your message has been sent to the driver",
    });
  };

  const shareLocation = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Ambulance Location',
        text: `Tracking ambulance ${currentRide?.ambulance.number}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "🔗 Link Copied",
        description: "Tracking link copied to clipboard",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'en-route':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'arrived':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'patient-loaded':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'heading-to-hospital':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'at-hospital':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAmbulanceIcon = (type: string) => {
    switch (type) {
      case 'cardiac':
        return Heart;
      case 'icu':
        return Shield;
      case 'advanced':
        return Activity;
      default:
        return Ambulance;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ride information...</p>
        </div>
      </div>
    );
  }

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Ride</h3>
            <p className="text-gray-500 mb-6">You don't have any current or upcoming rides.</p>
            <Button onClick={() => navigate('/book')} className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Ambulance className="w-5 h-5 mr-2" />
              Book Ambulance
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const AmbulanceIcon = getAmbulanceIcon(currentRide.ambulance.type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-green-400/20 to-emerald-600/20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-600/20 blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-pink-400/10 to-orange-600/10 blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/90 backdrop-blur-xl shadow-2xl border-b border-white/20">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 via-blue-600/10 to-purple-600/10"></div>
        <div className="relative container mx-auto px-4 py-6 md:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 md:space-x-6">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/dashboard')}
                className="hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 md:w-18 md:h-18 rounded-3xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-300">
                    <AmbulanceIcon className="w-8 h-8 md:w-9 md:h-9 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-3 border-white animate-pulse flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-green-900 to-blue-900 bg-clip-text text-transparent">
                    {currentRide.bookingNumber}
                  </h1>
                  <p className="text-sm md:text-base text-gray-600 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live Tracking Active
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor(currentRide.status)} border-0 text-sm px-4 py-2 rounded-full shadow-lg animate-pulse`}>
                <Timer className="w-4 h-4 mr-2" />
                <span className="capitalize font-semibold">{currentRide.status.replace('-', ' ')}</span>
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="relative container mx-auto px-4 py-8 space-y-8">
        {/* ETA Card */}
        <Card className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white shadow-2xl border-0 rounded-3xl overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
          <div className="absolute inset-0 opacity-20">
            <div className="w-full h-full bg-white/10"></div>
          </div>
          <CardContent className="relative p-8 md:p-10">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold">ETA: {currentRide.estimatedArrival}</h2>
                    <p className="text-green-100 text-lg">🚑 Ambulance en route to you</p>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="relative w-24 h-24 md:w-32 md:h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="white"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={251}
                      strokeDashoffset={251 - (251 * (10 - parseInt(currentRide.estimatedArrival))) / 10}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-4xl md:text-5xl font-bold">{parseInt(currentRide.estimatedArrival)}</div>
                    <div className="text-sm text-green-100">minutes</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Driver Information */}
          <Card className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden group hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Your Driver</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-3 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{currentRide.driver.name}</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-bold text-yellow-700">{currentRide.driver.rating}</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600 font-medium">{currentRide.driver.totalRides} rides</span>
                  </div>
                  <p className="text-gray-600 font-medium">{currentRide.driver.experience} experience</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={callDriver} 
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl py-3 font-semibold shadow-lg transform hover:scale-105 transition-all duration-300"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Call Driver
                </Button>
                <Button 
                  onClick={messageDriver} 
                  variant="outline" 
                  className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-2xl py-3 font-semibold backdrop-blur-sm"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Message
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ambulance Information */}
          <Card className="bg-white/60 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl overflow-hidden group hover:shadow-3xl transition-all duration-500 transform hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                  <AmbulanceIcon className="w-5 h-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">Ambulance Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-6">
              <div className="text-center p-4 bg-gradient-to-r from-gray-50 to-red-50 rounded-2xl border border-red-100">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{currentRide.ambulance.number}</h3>
                <p className="text-red-700 font-semibold capitalize">{currentRide.ambulance.type} Life Support</p>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Medical Equipment
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {currentRide.ambulance.equipment.map((item, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs justify-center py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl"
                    >
                      ✓ {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Care Features
                </h4>
                <div className="space-y-2">
                  {currentRide.ambulance.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center gap-3 text-sm p-3 bg-green-50 rounded-xl border border-green-200">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="font-medium text-green-800">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Route Information */}
        <Card className="shadow-xl border-2 border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Route className="w-6 h-6 text-purple-600" />
              Route Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">Pickup Location</p>
                  <p className="text-gray-600 break-words">{currentRide.route.pickup.address}</p>
                </div>
              </div>

              {currentRide.route.destination && (
                <div className="flex items-start gap-3">
                  <Hospital className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">Destination</p>
                    <p className="text-gray-600 break-words">{currentRide.route.destination.address}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{currentRide.route.distance}</div>
                <div className="text-sm text-gray-600">Distance</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{currentRide.route.duration}</div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast({ title: "🗺️ Opening Maps" })}>
                <Navigation className="w-4 h-4 mr-2" />
                View Map
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Patient Information */}
        <Card className="shadow-xl border-2 border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-600" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{currentRide.patient.name}</h3>
                <p className="text-gray-600">{currentRide.patient.age} years old</p>
                <p className="text-gray-900 font-semibold mt-2">Condition: {currentRide.patient.condition}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Emergency Contact</h4>
                <p className="text-gray-900">{currentRide.patient.emergencyContact.name}</p>
                <p className="text-gray-600">{currentRide.patient.emergencyContact.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="shadow-xl border-2 border-gray-100">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-green-600" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentRide.timeline.map((event, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">{event.status}</h4>
                      <span className="text-sm text-gray-500">{formatTimestamp(event.timestamp)}</span>
                    </div>
                    <p className="text-gray-600 text-sm">{event.notes}</p>
                    {event.location && (
                      <p className="text-gray-500 text-xs mt-1">📍 {event.location}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={shareLocation} variant="outline" className="flex-1">
            <Share2 className="w-4 h-4 mr-2" />
            Share Location
          </Button>
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)} 
            variant="outline" 
            className="flex-1"
          >
            <Zap className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-500' : 'text-gray-500'}`} />
            Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={() => navigate('/history')} variant="outline" className="flex-1">
            <FileText className="w-4 h-4 mr-2" />
            View History
          </Button>
        </div>
      </div>

      {/* Fixed SOS Button - Bottom Right Corner */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            toast({
              title: "🚨 EMERGENCY SOS",
              description: "Additional emergency services activated. Medical team notified.",
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
}