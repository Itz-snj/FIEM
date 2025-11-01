import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Ambulance, Heart, MapPin, Phone, History, User, LogOut, X, Mic } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast, dismiss } = useToast();
  const [isEmergency, setIsEmergency] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [toastId, setToastId] = useState<any>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleEmergencySOS = () => {
    if (isEmergency) return; // Prevent multiple clicks during countdown
    
    setIsEmergency(true);
    setCountdown(10);

    // Show countdown toast with cancel option
    const id = toast({
      title: "🚨 Emergency SOS Activated",
      description: `Dispatching ambulance in ${countdown} seconds. Use the cancel button below to stop.`,
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={cancelEmergency}
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      ),
      duration: 11000, // Keep toast open for full countdown + 1 sec buffer
    });    setToastId(id);

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Countdown finished - dispatch emergency
          executeEmergencyDispatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelEmergency = () => {
    // Clear countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Reset state
    setIsEmergency(false);
    setCountdown(0);

    // Dismiss the countdown toast
    if (toastId && typeof toastId === 'object' && toastId.dismiss) {
      toastId.dismiss();
      setToastId(null);
    }

    // Show cancellation confirmation
    toast({
      title: "Emergency Cancelled",
      description: "Emergency dispatch has been cancelled. Stay safe!",
      variant: "default",
    });
  };

  const executeEmergencyDispatch = async () => {
    // Clear countdown interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Dismiss countdown toast
    if (toastId && typeof toastId === 'object' && toastId.dismiss) {
      toastId.dismiss();
      setToastId(null);
    }

    try {
      // Get user's current location
      let currentLocation = {
        latitude: 37.7749, // Default SF coordinates
        longitude: -122.4194,
        address: 'Current Location (GPS detected)'
      };

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });
          
          currentLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: `GPS: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          };
        } catch (geoError) {
          console.log('GPS not available, using default location');
        }
      }

      // Prepare emergency SOS data for backend API
      // For emergency SOS, always use emergency caller ID to avoid ObjectId issues
      const emergencyCallerId = 'emergency-caller-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
      
      const emergencyData = {
        userId: emergencyCallerId,
        location: currentLocation,
        patientDetails: {
          name: user?.name || 'Emergency Patient',
          age: 35,
          condition: 'Medical Emergency - SOS Request'
        },
        emergencyContact: user?.phone || user?.email || 'Not provided'
      };

      // Call the backend emergency SOS API
      const api = await import('@/lib/api');
      const response = await api.default.EmergencyAPI.emergencySOS(emergencyData);
      
      console.log('Emergency SOS Response:', response);
      
      if (response.success && response.bookingId) {
        toast({
          title: "🚑 Emergency Dispatched!",
          description: `${response.message}. Redirecting to live tracking...`,
        });

        // Wait 2 seconds then redirect to tracking with BACKEND booking ID
        setTimeout(() => {
          navigate(`/track?id=${response.bookingId}`);
        }, 2000);
      } else {
        throw new Error(response.message || 'Emergency dispatch failed - no booking ID returned');
      }
    } catch (error) {
      console.error('Emergency API call failed:', error);
      
      toast({
        title: "❌ Emergency Dispatch Failed", 
        description: "Could not connect to emergency services. Please call 911 directly.",
        variant: "destructive",
      });
    } finally {
      setIsEmergency(false);
      setCountdown(0);
    }
  };

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Handle countdown sound and vibration effects
  useEffect(() => {
    if (isEmergency && countdown > 0) {
      // Play beep sound (if available)
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmccBjmS2Oq8cyoGImDG8N8TpuPxvWgdBjiPz/bRew');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore if audio fails
      } catch (error) {
        // Ignore audio errors
      }

      // Vibrate device (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    }
  }, [countdown]);

    // Update toast description with current countdown (debounced to avoid React warnings)
  useEffect(() => {
    if (isEmergency && countdown > 0 && toastId) {
      // Use setTimeout to avoid updating during render
      const timeoutId = setTimeout(() => {
        if (typeof toastId === 'object' && toastId.update) {
          toastId.update({
            title: "🚨 Emergency SOS Activated",
            description: `Dispatching ambulance in ${countdown} seconds. Use the cancel button to stop.`,
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEmergency}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            ),
          });
        }
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [countdown]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 relative">
      {/* Header */}
      <header className="bg-card border-b shadow-[var(--shadow-soft)] sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Ambulance className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold">RapidAid</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Emergency Services</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">Patient</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 md:h-10 md:w-10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content with bottom padding to avoid SOS button overlap */}
      <main className="container mx-auto px-4 py-4 md:py-8 max-w-6xl pb-24 md:pb-8">
        {/* Welcome Section */}
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
            Welcome, {user?.name || 'Patient'}
          </h2>
          <p className="text-center text-muted-foreground text-sm md:text-base">
            Your emergency medical services dashboard
          </p>
        </div>

        {/* Quick Actions - Mobile First Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="hover:shadow-[var(--shadow-medium)] transition-all duration-300 cursor-pointer border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 transform hover:scale-105" onClick={() => navigate('/book')}>
            <CardHeader className="pb-2 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-blue-700 text-base md:text-lg">
                <Ambulance className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                Book Ambulance
              </CardTitle>
              <CardDescription className="text-blue-600 text-sm">
                Complete ambulance booking with real-time dispatch
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-[var(--shadow-medium)] transition-all duration-300 cursor-pointer border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 transform hover:scale-105" onClick={() => navigate('/voice-booking')}>
            <CardHeader className="pb-2 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-orange-700 text-base md:text-lg">
                <Mic className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                Voice Booking
              </CardTitle>
              <CardDescription className="text-orange-600 text-sm">
                Book ambulance using voice commands in Hindi/English
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-[var(--shadow-medium)] transition-all duration-300 cursor-pointer border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 transform hover:scale-105" onClick={() => navigate('/current-ride')}>
            <CardHeader className="pb-2 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-green-700 text-base md:text-lg">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                Current Ride
              </CardTitle>
              <CardDescription className="text-green-600 text-sm">
                Track your ambulance and driver in real-time
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-[var(--shadow-medium)] transition-all duration-300 cursor-pointer border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 transform hover:scale-105" onClick={() => navigate('/history')}>
            <CardHeader className="pb-2 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-purple-700 text-base md:text-lg">
                <History className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                Booking History
              </CardTitle>
              <CardDescription className="text-purple-600 text-sm">
                View past bookings and reorder
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-[var(--shadow-medium)] transition-all duration-300 cursor-pointer border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 transform hover:scale-105">
            <CardHeader className="pb-2 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-rose-700 text-base md:text-lg">
                <Heart className="w-5 h-5 md:w-6 md:h-6 text-rose-600" />
                Find Hospitals
              </CardTitle>
              <CardDescription className="text-rose-600 text-sm">
                Search nearby medical facilities
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Medical Profile Section - Mobile Optimized */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <User className="w-4 h-4 md:w-5 md:h-5" />
                Medical Profile
              </CardTitle>
              <CardDescription className="text-sm">Keep your medical information up to date</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 md:space-y-3">
              <div className="flex justify-between items-center p-2 md:p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Blood Type</span>
                <span className="text-sm text-muted-foreground">Not Set</span>
              </div>
              <div className="flex justify-between items-center p-2 md:p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Allergies</span>
                <span className="text-sm text-muted-foreground">Not Set</span>
              </div>
              <div className="flex justify-between items-center p-2 md:p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Conditions</span>
                <span className="text-sm text-muted-foreground">Not Set</span>
              </div>
              <Button variant="outline" className="w-full mt-3 md:mt-4 h-9 md:h-10 text-sm">
                Update Medical Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Phone className="w-4 h-4 md:w-5 md:h-5" />
                Emergency Contacts
              </CardTitle>
              <CardDescription className="text-sm">Manage your emergency contact list</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <p className="mb-3 md:mb-4 text-sm">No emergency contacts added</p>
                <Button className="h-9 md:h-10 text-sm">Add Contact</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Fixed SOS Button - Bottom Right Corner */}
      <div className="fixed bottom-4 right-4 z-50 md:hidden">
        <Button
          size="lg"
          onClick={handleEmergencySOS}
          disabled={isEmergency}
          className={`w-16 h-16 rounded-full shadow-2xl border-2 border-white/20 text-lg font-bold transition-all duration-300 ${
            isEmergency 
              ? 'bg-red-700 text-white animate-pulse scale-110 shadow-red-500/50' 
              : 'bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:scale-110 active:scale-95'
          }`}
        >
          {isEmergency ? (
            countdown > 0 ? (
              <span className="text-xl font-bold">{countdown}</span>
            ) : (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )
          ) : (
            <span className="text-lg">🚨</span>
          )}
        </Button>
      </div>

      {/* Emergency Countdown Overlay for Mobile */}
      {isEmergency && countdown > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center md:hidden">
          <Card className="m-4 max-w-sm w-full bg-gradient-to-r from-red-600 to-red-700 text-white border-0">
            <CardContent className="p-6 text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
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
                    strokeDashoffset={251 - (251 * (10 - countdown)) / 10}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{countdown}</span>
                </div>
              </div>
              <h3 className="text-lg font-bold mb-2">🚨 Emergency SOS Active</h3>
              <p className="text-white/90 mb-4 text-sm">
                Dispatching ambulance in {countdown} seconds
              </p>
              <Button 
                onClick={cancelEmergency}
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20 w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel Emergency
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
