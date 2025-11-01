import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Ambulance, 
  MapPin, 
  Clock, 
  User,
  Phone,
  Calendar,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Navigation,
  Hospital,
  CreditCard,
  Heart,
  Activity,
  Shield,
  Star,
  Timer,
  Users
} from 'lucide-react';

// Types
interface Location {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface PatientInfo {
  name: string;
  age: string;
  gender: string;
  condition: string;
  symptoms: string[];
  allergies: string;
  medications: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
}

interface BookingFormData {
  pickupLocation: Location;
  destinationLocation?: Location;
  scheduledTime?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  ambulanceType: 'basic' | 'advanced' | 'cardiac' | 'icu';
  patientInfo: PatientInfo;
  specialRequirements: string[];
  notes: string;
}

export default function BookingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [formData, setFormData] = useState<BookingFormData>({
    pickupLocation: {
      address: '',
      coordinates: { latitude: 0, longitude: 0 }
    },
    destinationLocation: undefined,
    priority: 'medium',
    ambulanceType: 'basic',
    patientInfo: {
      name: '',
      age: '',
      gender: '',
      condition: '',
      symptoms: [],
      allergies: '',
      medications: '',
      emergencyContact: {
        name: '',
        phone: '',
        relation: ''
      }
    },
    specialRequirements: [],
    notes: ''
  });

  const steps = [
    { 
      id: 1, 
      title: 'Location & Schedule', 
      subtitle: 'Where & When',
      icon: MapPin,
      color: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 2, 
      title: 'Patient Information', 
      subtitle: 'Medical Details',
      icon: User,
      color: 'from-green-500 to-emerald-500'
    },
    { 
      id: 3, 
      title: 'Service Selection', 
      subtitle: 'Ambulance & Care Level',
      icon: Ambulance,
      color: 'from-purple-500 to-pink-500'
    },
    { 
      id: 4, 
      title: 'Confirmation', 
      subtitle: 'Review & Book',
      icon: CheckCircle2,
      color: 'from-orange-500 to-red-500'
    }
  ];

  const ambulanceTypes = [
    {
      id: 'basic',
      name: 'Basic Life Support',
      shortName: 'BLS',
      description: 'Essential medical transport with trained EMTs',
      features: ['Basic First Aid', 'Oxygen Support', 'Patient Monitoring', 'Comfortable Transport'],
      equipment: ['Stretcher', 'Oxygen Cylinder', 'Basic Medical Kit', 'Communication System'],
      responseTime: '8-12 minutes',
      price: 1500,
      icon: Ambulance,
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      gradient: 'from-blue-400 to-blue-600'
    },
    {
      id: 'advanced',
      name: 'Advanced Life Support',
      shortName: 'ALS',
      description: 'Advanced medical care with paramedics and equipment',
      features: ['Paramedic Team', 'Advanced Monitoring', 'IV Therapy', 'Emergency Medications'],
      equipment: ['Defibrillator', 'ECG Monitor', 'IV Equipment', 'Advanced Airway Tools'],
      responseTime: '6-10 minutes',
      price: 2500,
      icon: Activity,
      color: 'bg-green-50 border-green-200 text-green-900',
      gradient: 'from-green-400 to-green-600'
    },
    {
      id: 'cardiac',
      name: 'Cardiac Care Unit',
      shortName: 'CCU',
      description: 'Specialized cardiac emergency response team',
      features: ['Cardiac Specialists', '12-Lead ECG', 'Cardiac Medications', 'Telemetry'],
      equipment: ['Cardiac Monitor', 'Defibrillator', 'Pacemaker', 'Cardiac Drug Kit'],
      responseTime: '5-8 minutes',
      price: 3500,
      icon: Heart,
      color: 'bg-red-50 border-red-200 text-red-900',
      gradient: 'from-red-400 to-red-600'
    },
    {
      id: 'icu',
      name: 'Mobile Intensive Care',
      shortName: 'ICU',
      description: 'Critical care transport with ICU-level equipment',
      features: ['ICU Specialist', 'Ventilator Support', 'Critical Monitoring', 'Life Support'],
      equipment: ['Ventilator', 'Multi-parameter Monitor', 'Infusion Pumps', 'Critical Care Kit'],
      responseTime: '4-6 minutes',
      price: 5000,
      icon: Shield,
      color: 'bg-purple-50 border-purple-200 text-purple-900',
      gradient: 'from-purple-400 to-purple-600'
    }
  ];

  const priorityLevels = [
    {
      value: 'low',
      label: 'Routine',
      description: 'Scheduled, non-urgent transport',
      color: 'bg-green-100 border-green-300 text-green-800',
      icon: Clock,
      multiplier: 1
    },
    {
      value: 'medium',
      label: 'Urgent',
      description: 'Prompt medical attention needed',
      color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      icon: Timer,
      multiplier: 1.2
    },
    {
      value: 'high',
      label: 'Emergency',
      description: 'Immediate medical response required',
      color: 'bg-orange-100 border-orange-300 text-orange-800',
      icon: AlertCircle,
      multiplier: 1.5
    },
    {
      value: 'critical',
      label: 'Life-Threatening',
      description: 'Critical emergency, fastest response',
      color: 'bg-red-100 border-red-300 text-red-800',
      icon: Heart,
      multiplier: 2
    }
  ];

  const specialRequirements = [
    { id: 'wheelchair', label: 'Wheelchair Access', icon: '♿' },
    { id: 'oxygen', label: 'Oxygen Support', icon: '🫁' },
    { id: 'cardiac', label: 'Cardiac Monitor', icon: '💓' },
    { id: 'pediatric', label: 'Pediatric Care', icon: '👶' },
    { id: 'bariatric', label: 'Bariatric Support', icon: '🏋️' },
    { id: 'isolation', label: 'Isolation Protocol', icon: '🛡️' },
    { id: 'mental', label: 'Mental Health', icon: '🧠' },
    { id: 'interpreter', label: 'Interpreter', icon: '🗣️' }
  ];

  // Get current location
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Not Available",
        description: "Please enable location services or enter address manually.",
        variant: "destructive"
      });
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      const address = `📍 Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
      
      setFormData(prev => ({
        ...prev,
        pickupLocation: {
          address,
          coordinates: { latitude, longitude }
        }
      }));

      toast({
        title: "✅ Location Detected",
        description: "Your current location has been set as pickup point.",
      });
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Could not detect location. Please enter address manually.",
        variant: "destructive"
      });
    }
  };

  // Calculate estimated cost
  useEffect(() => {
    const selectedAmbulance = ambulanceTypes.find(type => type.id === formData.ambulanceType);
    const selectedPriority = priorityLevels.find(p => p.value === formData.priority);
    
    if (selectedAmbulance && selectedPriority) {
      const basePrice = selectedAmbulance.price;
      const priorityMultiplier = selectedPriority.multiplier;
      const distanceCharge = 50 * 8; // ₹50 per km (estimated 8km)
      const specialRequirementCharge = formData.specialRequirements.length * 200;
      
      const subtotal = (basePrice * priorityMultiplier) + distanceCharge + specialRequirementCharge;
      const gst = subtotal * 0.18;
      const total = subtotal + gst;
      
      setEstimatedCost(Math.round(total));
    }
  }, [formData.ambulanceType, formData.priority, formData.specialRequirements]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to continue booking",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      // Import the API
      const API = await import('@/lib/api');
      
      console.log('🚀 Starting booking submission...');
      console.log('User:', user);
      console.log('Form Data:', formData);
      
      // Test backend connection first
      try {
        const testResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8083/rest'}/bookings/db-status`);
        const testData = await testResponse.json();
        console.log('🔗 Backend connection test:', testData);
        
        if (!testResponse.ok) {
          throw new Error(`Backend not responding: ${testResponse.status}`);
        }
      } catch (testError) {
        console.error('❌ Backend connection failed:', testError);
        throw new Error(`Backend server is not reachable. Please ensure the backend is running on port 8083.`);
      }
      
      // Validate required fields
      if (!formData.pickupLocation.address) {
        throw new Error('Pickup location is required');
      }
      if (!formData.patientInfo.name) {
        throw new Error('Patient name is required');
      }
      if (!formData.patientInfo.emergencyContact.name || !formData.patientInfo.emergencyContact.phone) {
        throw new Error('Emergency contact information is required');
      }
      
      // Prepare booking data for backend
      const bookingRequest = {
        userId: user.id,
        pickupLocation: {
          address: formData.pickupLocation.address,
          coordinates: {
            latitude: formData.pickupLocation.coordinates.latitude || 0,
            longitude: formData.pickupLocation.coordinates.longitude || 0
          }
        },
        destinationLocation: formData.destinationLocation ? {
          address: formData.destinationLocation.address,
          coordinates: {
            latitude: formData.destinationLocation.coordinates.latitude || 0,
            longitude: formData.destinationLocation.coordinates.longitude || 0
          }
        } : undefined,
        priority: formData.priority.toUpperCase() as any,
        type: formData.scheduledTime ? 'SCHEDULED' : 'EMERGENCY',
        ambulanceType: formData.ambulanceType.toUpperCase() as any,
        patientInfo: {
          name: formData.patientInfo.name,
          age: parseInt(formData.patientInfo.age) || 25,
          gender: formData.patientInfo.gender || 'unknown',
          condition: formData.patientInfo.condition || 'General medical condition',
          symptoms: formData.patientInfo.symptoms.length > 0 ? formData.patientInfo.symptoms : [formData.patientInfo.condition || 'Medical emergency'],
          emergencyContact: {
            name: formData.patientInfo.emergencyContact.name,
            phone: formData.patientInfo.emergencyContact.phone,
            relation: formData.patientInfo.emergencyContact.relation || 'family'
          }
        },
        specialRequirements: formData.specialRequirements || [],
        scheduledTime: formData.scheduledTime
      };

      console.log('📤 Sending booking request:', bookingRequest);

      // Create booking via API
      const response = await API.default.BookingAPI.createBooking(bookingRequest as any);
      
      console.log('📥 API Response:', response);

      if (response && response.success && response.bookingId) {
        console.log('✅ Booking successful:', response.bookingId);
        
        toast({
          title: "🚑 Booking Confirmed!",
          description: `Booking ID: ${response.bookingId}. Driver assignment in progress.`,
        });

        // Store booking data for local access
        const bookingData = {
          ...formData,
          userId: user.id,
          timestamp: new Date().toISOString(),
          status: response.status || 'confirmed',
          bookingId: response.bookingId,
          hospitalRecommendations: response.hospitalRecommendations,
          dispatchInfo: response.dispatchInfo
        };

        const existingBookings = JSON.parse(localStorage.getItem('user_bookings') || '[]');
        existingBookings.push(bookingData);
        localStorage.setItem('user_bookings', JSON.stringify(existingBookings));

        // Redirect to tracking page
        setTimeout(() => {
          navigate(`/track?id=${response.bookingId}`);
        }, 1500);
      } else {
        console.error('❌ API returned unsuccessful response:', response);
        throw new Error(response?.message || 'Booking creation failed - invalid response');
      }

    } catch (error) {
      console.error('❌ Booking API Error:', error);
      
      // Show specific error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      toast({
        title: "❌ Booking Failed",
        description: `Error: ${errorMessage}. Please check the console for details.`,
        variant: "destructive"
      });
      
      // Only fall back to demo if backend is completely unreachable
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        console.log('🔄 Backend unreachable, using demo mode...');
        
        const demoBookingId = 'book-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
        
        const demoBookingData = {
          ...formData,
          userId: user.id,
          timestamp: new Date().toISOString(),
          status: 'confirmed',
          bookingId: demoBookingId
        };

        const existingBookings = JSON.parse(localStorage.getItem('user_bookings') || '[]');
        existingBookings.push(demoBookingData);
        localStorage.setItem('user_bookings', JSON.stringify(existingBookings));

        toast({
          title: "⚠️ Demo Mode",
          description: `Backend unavailable. Demo booking created: ${demoBookingId}`,
        });

        setTimeout(() => {
          navigate(`/track?id=${demoBookingId}`);
        }, 1500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const currentStepData = steps[currentStep - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-600/20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-pink-400/20 to-orange-600/20 blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-green-400/10 to-teal-600/10 blur-3xl"></div>
      </div>

      {/* Animated Header */}
      <header className="relative bg-white/90 backdrop-blur-xl shadow-2xl border-b border-white/20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
        <div className="relative container mx-auto px-4 py-6 md:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/dashboard')}
                className="hover:bg-white/20 backdrop-blur-sm transition-all duration-300 hover:scale-105"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
              
              <div className="flex items-center space-x-2 md:space-x-4">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-3xl bg-gradient-to-r ${currentStepData.color} flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-300`}>
                  <currentStepData.icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                    Emergency Booking
                  </h1>
                  <p className="text-sm md:text-base text-gray-600">{currentStepData.title} • {currentStepData.subtitle}</p>
                </div>
              </div>
            </div>

            {/* Enhanced Progress Bar - Hidden on mobile */}
            <div className="hidden xl:flex items-center space-x-2">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className={`relative flex items-center space-x-3 px-4 py-3 rounded-2xl border-2 transition-all duration-300 ${
                    currentStep === step.id 
                      ? `bg-gradient-to-r ${step.color} text-white shadow-lg scale-105 border-transparent` 
                      : currentStep > step.id 
                        ? 'bg-green-100 text-green-800 border-green-200 shadow-md'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                    <div className="text-sm">
                      <div className="font-semibold">{step.title}</div>
                      <div className="text-xs opacity-75">{step.subtitle}</div>
                    </div>
                    {currentStep === step.id && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-1 rounded-full transition-all duration-300 ${
                      currentStep > step.id ? 'bg-green-400 shadow-sm' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Mobile Progress Indicator */}
            <div className="xl:hidden">
              <div className="bg-white/20 px-3 py-1 rounded-full text-sm text-gray-700 font-medium">
                {currentStep}/{steps.length}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Progress Steps */}
      <div className="xl:hidden bg-white border-b px-4 py-3">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${
                currentStep === step.id 
                  ? `bg-gradient-to-r ${step.color} text-white shadow-lg scale-110` 
                  : currentStep > step.id 
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}>
                {currentStep > step.id ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-bold">{step.id}</span>
                )}
              </div>
              <div className="text-xs font-medium text-center text-gray-600 hidden sm:block">
                {step.title.split(' ')[0]}
              </div>
              {index < steps.length - 1 && (
                <div className={`absolute top-4 w-full h-0.5 transition-all -z-10 ${
                  currentStep > step.id ? 'bg-green-400' : 'bg-gray-200'
                }`} style={{ left: '50%', width: 'calc(100% / 4)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-6 md:py-8 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container mx-auto px-4 max-w-5xl">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold">🚑 Emergency Medical Booking</h2>
              <p className="text-blue-100 text-lg">Professional ambulance service • Available 24/7 • Expert medical care</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/30">
                <span className="text-white font-semibold">Step {currentStep} of {steps.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-100 font-medium">Live Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed SOS Button for Mobile */}
      <Button
        onClick={() => {
          // Quick SOS booking with current location
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const sosBooking = {
                  patientInfo: {
                    name: 'Emergency Patient',
                    age: '0',
                    gender: 'unknown',
                    condition: 'Emergency SOS',
                    emergencyContact: {
                      name: 'Emergency Contact',
                      phone: '911',
                      relation: 'emergency'
                    }
                  },
                  pickupLocation: {
                    address: `SOS Location: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
                    coordinates: {
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude
                    }
                  },
                  priority: 'critical',
                  type: 'emergency',
                  ambulanceType: 'advanced'
                };
                
                setFormData(sosBooking as any);
                setCurrentStep(4); // Go directly to confirmation
                
                toast({
                  title: "🚨 SOS Activated",
                  description: "Emergency booking prepared. Review and confirm.",
                  variant: "destructive"
                });
              },
              () => {
                toast({
                  title: "Location Required",
                  description: "Please enable GPS for SOS booking",
                  variant: "destructive"
                });
              }
            );
          }
        }}
        className="fixed bottom-6 right-6 z-50 w-20 h-20 md:w-24 md:h-24 bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 rounded-full shadow-2xl border-4 border-white transform hover:scale-110 transition-all duration-300 flex items-center justify-center group"
      >
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
          <div className="relative w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 md:w-8 md:h-8 text-red-600 animate-pulse" />
          </div>
        </div>
        <span className="absolute -top-16 -left-12 bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
          🚨 Emergency SOS
        </span>
      </Button>

      <main className="container mx-auto px-4 py-4 md:py-8 max-w-5xl pb-24 md:pb-8">
        
        {/* Step 1: Location & Schedule */}
        {currentStep === 1 && (
          <div className="space-y-6 md:space-y-8">
            <Card className="shadow-xl md:shadow-2xl border-0 bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-sm">
              <CardHeader className="pb-4 md:pb-6 px-4 md:px-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <MapPin className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl md:text-2xl">📍 Pickup & Destination</CardTitle>
                    <CardDescription className="text-sm md:text-lg">Tell us where you need ambulance service</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8 px-4 md:px-6">
                {/* Pickup Location */}
                <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-blue-100 shadow-md md:shadow-lg">
                  <Label className="text-base md:text-lg font-semibold flex items-center gap-2 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <MapPin className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                    Pickup Location *
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="Enter pickup address or landmark..."
                      value={formData.pickupLocation.address}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        pickupLocation: { ...prev.pickupLocation, address: e.target.value }
                      }))}
                      className="flex-1 h-11 md:h-12 text-base md:text-lg border-2 rounded-xl"
                    />
                    <Button 
                      onClick={getCurrentLocation}
                      className="h-11 md:h-12 px-4 md:px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-sm md:text-base"
                    >
                      <Navigation className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      GPS Location
                    </Button>
                  </div>
                </div>

                {/* Destination */}
                <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-purple-100 shadow-md md:shadow-lg">
                  <Label className="text-base md:text-lg font-semibold flex items-center gap-2 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Hospital className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                    Destination (Optional)
                  </Label>
                  <Input
                    placeholder="Enter hospital or destination address..."
                    value={formData.destinationLocation?.address || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      destinationLocation: e.target.value ? {
                        address: e.target.value,
                        coordinates: { latitude: 0, longitude: 0 }
                      } : undefined
                    }))}
                    className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl"
                  />
                  <p className="text-xs md:text-sm text-gray-500 mt-2 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />
                    We'll recommend the best hospital if left empty
                  </p>
                </div>

                {/* Scheduling */}
                <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-orange-100 shadow-md md:shadow-lg">
                  <Label className="text-base md:text-lg font-semibold flex items-center gap-2 mb-3 md:mb-4">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                    When do you need the ambulance?
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <Button
                      variant={!formData.scheduledTime ? "default" : "outline"}
                      onClick={() => setFormData(prev => ({ ...prev, scheduledTime: undefined }))}
                      className="h-14 md:h-16 text-sm md:text-lg flex items-center justify-center space-x-2 md:space-x-3"
                    >
                      <AlertCircle className="w-5 h-5 md:w-6 md:h-6" />
                      <span>Immediate Dispatch</span>
                    </Button>
                    <Button
                      variant={formData.scheduledTime ? "default" : "outline"}
                      onClick={() => setFormData(prev => ({ ...prev, scheduledTime: new Date() }))}
                      className="h-14 md:h-16 text-sm md:text-lg flex items-center justify-center space-x-2 md:space-x-3"
                    >
                      <Clock className="w-5 h-5 md:w-6 md:h-6" />
                      <span>Schedule Later</span>
                    </Button>
                  </div>
                  
                  {formData.scheduledTime && (
                    <div className="mt-4">
                      <Input
                        type="datetime-local"
                        min={new Date().toISOString().slice(0, 16)}
                        className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl"
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          scheduledTime: new Date(e.target.value)
                        }))}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={nextStep} 
                    className="w-full sm:w-auto px-6 md:px-8 py-3 text-base md:text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    Continue to Patient Details
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 ml-2 rotate-180" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Patient Details */}
        {currentStep === 2 && (
          <div className="space-y-6 md:space-y-8">
            <Card className="shadow-xl md:shadow-2xl border-0 bg-gradient-to-br from-white to-green-50/50">
              <CardHeader className="pb-4 md:pb-6 px-4 md:px-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl md:text-2xl">👤 Patient Information</CardTitle>
                    <CardDescription className="text-sm md:text-lg">Medical details for proper care coordination</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8 px-4 md:px-6">
                
                {/* Basic Information */}
                <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-green-100 shadow-md md:shadow-lg">
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Patient Name *</Label>
                      <Input
                        placeholder="Full name"
                        value={formData.patientInfo.name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          patientInfo: { ...prev.patientInfo, name: e.target.value }
                        }))}
                        className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Age *</Label>
                      <Input
                        type="number"
                        placeholder="Age"
                        value={formData.patientInfo.age}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          patientInfo: { ...prev.patientInfo, age: e.target.value }
                        }))}
                        className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Gender *</Label>
                      <Select 
                        value={formData.patientInfo.gender}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          patientInfo: { ...prev.patientInfo, gender: value }
                        }))}
                      >
                        <SelectTrigger className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-blue-100 shadow-md md:shadow-lg">
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    Medical Details
                  </h3>
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Medical Condition *</Label>
                      <Input
                        placeholder="Brief description of medical condition"
                        value={formData.patientInfo.condition}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          patientInfo: { ...prev.patientInfo, condition: e.target.value }
                        }))}
                        className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Known Allergies</Label>
                        <Input
                          placeholder="List any allergies"
                          value={formData.patientInfo.allergies}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            patientInfo: { ...prev.patientInfo, allergies: e.target.value }
                          }))}
                          className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-semibold mb-2 block">Current Medications</Label>
                        <Input
                          placeholder="List current medications"
                          value={formData.patientInfo.medications}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            patientInfo: { ...prev.patientInfo, medications: e.target.value }
                          }))}
                          className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-red-100 shadow-md md:shadow-lg">
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
                    Emergency Contact
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Contact Name *</Label>
                      <Input
                        placeholder="Emergency contact name"
                        value={formData.patientInfo.emergencyContact.name}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          patientInfo: {
                            ...prev.patientInfo,
                            emergencyContact: { ...prev.patientInfo.emergencyContact, name: e.target.value }
                          }
                        }))}
                        className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Phone Number *</Label>
                      <Input
                        placeholder="Contact phone"
                        value={formData.patientInfo.emergencyContact.phone}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          patientInfo: {
                            ...prev.patientInfo,
                            emergencyContact: { ...prev.patientInfo.emergencyContact, phone: e.target.value }
                          }
                        }))}
                        className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold mb-2 block">Relationship *</Label>
                      <Select 
                        value={formData.patientInfo.emergencyContact.relation}
                        onValueChange={(value) => setFormData(prev => ({
                          ...prev,
                          patientInfo: {
                            ...prev.patientInfo,
                            emergencyContact: { ...prev.patientInfo.emergencyContact, relation: value }
                          }
                        }))}
                      >
                        <SelectTrigger className="h-11 md:h-12 text-base md:text-lg border-2 rounded-xl">
                          <SelectValue placeholder="Relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <Button variant="outline" onClick={prevStep} className="w-full sm:w-auto px-6 md:px-8 py-3 text-base md:text-lg">
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={nextStep} 
                    className="w-full sm:w-auto px-6 md:px-8 py-3 text-base md:text-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    Continue to Service Selection
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 ml-2 rotate-180" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Service Selection */}
        {currentStep === 3 && (
          <div className="space-y-6 md:space-y-8">
            <Card className="shadow-xl md:shadow-2xl border-0 bg-gradient-to-br from-white to-purple-50/50">
              <CardHeader className="pb-4 md:pb-6 px-4 md:px-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Ambulance className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl md:text-2xl">🚑 Service Selection</CardTitle>
                    <CardDescription className="text-sm md:text-lg">Choose the right ambulance and care level</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8 px-4 md:px-6">

                {/* Priority Selection */}
                <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-yellow-100 shadow-md md:shadow-lg">
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
                    Priority Level
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    {priorityLevels.map((priority) => {
                      const IconComponent = priority.icon;
                      return (
                        <button
                          key={priority.value}
                          onClick={() => setFormData(prev => ({ ...prev, priority: priority.value as any }))}
                          className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-200 ${
                            formData.priority === priority.value 
                              ? priority.color + ' shadow-lg transform scale-105'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:shadow-md'
                          }`}
                        >
                          <IconComponent className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2" />
                          <div className="font-semibold text-xs md:text-sm">{priority.label}</div>
                          <div className="text-xs opacity-75 mt-1 hidden md:block">{priority.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ambulance Selection */}
                <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-purple-100 shadow-md md:shadow-lg">
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <Ambulance className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                    Ambulance Type
                  </h3>
                  <div className="grid gap-4 md:gap-6">
                    {ambulanceTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <div
                          key={type.id}
                          onClick={() => setFormData(prev => ({ ...prev, ambulanceType: type.id as any }))}
                          className={`p-4 md:p-6 rounded-xl md:rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                            formData.ambulanceType === type.id
                              ? type.color + ' shadow-xl transform scale-[1.02]'
                              : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-lg'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
                                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-r ${type.gradient} flex items-center justify-center shadow-lg`}>
                                  <IconComponent className="w-6 h-6 md:w-8 md:h-8 text-white" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-lg md:text-xl font-bold">{type.name}</h4>
                                  <p className="text-gray-600 text-sm md:text-base">{type.description}</p>
                                  <div className="flex items-center gap-2 md:gap-4 mt-2">
                                    <Badge variant="outline" className="font-semibold text-xs md:text-sm">₹{type.price}</Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      <Timer className="w-3 h-3 mr-1" />
                                      {type.responseTime}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                                <div>
                                  <h5 className="font-semibold text-sm mb-2 flex items-center gap-1">
                                    <Star className="w-4 h-4" />
                                    Key Features
                                  </h5>
                                  <div className="space-y-1">
                                    {type.features.slice(0, 3).map((feature, index) => (
                                      <div key={index} className="text-xs md:text-sm flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        {feature}
                                      </div>
                                    ))}
                                    {type.features.length > 3 && (
                                      <div className="text-xs text-gray-500">+{type.features.length - 3} more</div>
                                    )}
                                  </div>
                                </div>
                                <div className="hidden md:block">
                                  <h5 className="font-semibold text-sm mb-2 flex items-center gap-1">
                                    <Shield className="w-4 h-4" />
                                    Medical Equipment
                                  </h5>
                                  <div className="flex flex-wrap gap-1">
                                    {type.equipment.slice(0, 4).map((item, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {item}
                                      </Badge>
                                    ))}
                                    {type.equipment.length > 4 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{type.equipment.length - 4}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full border-2 transition-all ${
                              formData.ambulanceType === type.id
                                ? 'border-current bg-current text-white'
                                : 'border-gray-300'
                            }`}>
                              {formData.ambulanceType === type.id && (
                                <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Special Requirements */}
                <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-blue-100 shadow-md md:shadow-lg">
                  <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                    Special Requirements
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    {specialRequirements.map((requirement) => (
                      <button
                        key={requirement.id}
                        onClick={() => {
                          const isSelected = formData.specialRequirements.includes(requirement.label);
                          setFormData(prev => ({
                            ...prev,
                            specialRequirements: isSelected
                              ? prev.specialRequirements.filter(r => r !== requirement.label)
                              : [...prev.specialRequirements, requirement.label]
                          }));
                        }}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all ${
                          formData.specialRequirements.includes(requirement.label)
                            ? 'bg-blue-100 border-blue-500 text-blue-800 shadow-md'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-xl md:text-2xl mb-1">{requirement.icon}</div>
                        <div className="text-xs md:text-sm font-medium">{requirement.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="p-4 md:p-6 bg-white rounded-xl md:rounded-2xl border-2 border-gray-100 shadow-md md:shadow-lg">
                  <h3 className="text-base md:text-lg font-semibold mb-3">Additional Instructions</h3>
                  <Textarea
                    placeholder="Any special instructions, directions, or medical information for the crew..."
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="text-base md:text-lg border-2 rounded-xl"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <Button variant="outline" onClick={prevStep} className="w-full sm:w-auto px-6 md:px-8 py-3 text-base md:text-lg">
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Back
                  </Button>
                  <Button 
                    onClick={nextStep} 
                    className="w-full sm:w-auto px-6 md:px-8 py-3 text-base md:text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Review Booking
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 ml-2 rotate-180" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <div className="space-y-6 md:space-y-8">
            <Card className="shadow-xl md:shadow-2xl border-0 bg-gradient-to-br from-white to-orange-50/50">
              <CardHeader className="pb-4 md:pb-6 px-4 md:px-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl md:text-2xl">✅ Booking Confirmation</CardTitle>
                    <CardDescription className="text-sm md:text-lg">Review details and confirm your ambulance booking</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 md:space-y-8 px-4 md:px-6">
                
                <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
                  {/* Booking Summary */}
                  <div className="space-y-4 md:space-y-6">
                    <h3 className="text-lg md:text-xl font-semibold">📋 Booking Summary</h3>
                    
                    <div className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border-2 border-blue-100 shadow-md md:shadow-lg space-y-3 md:space-y-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm md:text-base">Pickup Location</div>
                          <div className="text-gray-600 text-sm md:text-base break-words">{formData.pickupLocation.address}</div>
                        </div>
                      </div>
                      
                      {formData.destinationLocation && (
                        <div className="flex items-start gap-3">
                          <Hospital className="w-4 h-4 md:w-5 md:h-5 text-purple-600 mt-1 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm md:text-base">Destination</div>
                            <div className="text-gray-600 text-sm md:text-base break-words">{formData.destinationLocation.address}</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 md:w-5 md:h-5 text-green-600 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm md:text-base">Patient</div>
                          <div className="text-gray-600 text-sm md:text-base">
                            {formData.patientInfo.name}, {formData.patientInfo.age} years ({formData.patientInfo.gender})
                          </div>
                          <div className="text-xs md:text-sm text-gray-500">{formData.patientInfo.condition}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Ambulance className="w-4 h-4 md:w-5 md:h-5 text-red-600 mt-1 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm md:text-base">Service Details</div>
                          <div className="text-gray-600 text-sm md:text-base">
                            {ambulanceTypes.find(t => t.id === formData.ambulanceType)?.name}
                          </div>
                          <Badge variant="outline" className="mt-1 capitalize text-xs">
                            {priorityLevels.find(p => p.value === formData.priority)?.label} Priority
                          </Badge>
                        </div>
                      </div>
                      
                      {formData.specialRequirements.length > 0 && (
                        <div className="flex items-start gap-3">
                          <Shield className="w-4 h-4 md:w-5 md:h-5 text-purple-600 mt-1 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-sm md:text-base">Special Requirements</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {formData.specialRequirements.map((req, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {req}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="space-y-4 md:space-y-6">
                    <h3 className="text-lg md:text-xl font-semibold">💰 Cost Estimate</h3>
                    
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 md:p-6 rounded-xl md:rounded-2xl border-2 border-green-200 shadow-md md:shadow-lg">
                      <div className="space-y-3 md:space-y-4">
                        <div className="flex justify-between items-center text-sm md:text-base">
                          <span>Base Service</span>
                          <span className="font-semibold">₹{ambulanceTypes.find(t => t.id === formData.ambulanceType)?.price}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm md:text-base">
                          <span>Priority ({priorityLevels.find(p => p.value === formData.priority)?.label})</span>
                          <span className="font-semibold">
                            +{((priorityLevels.find(p => p.value === formData.priority)?.multiplier || 1) - 1) * 100}%
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm md:text-base">
                          <span>Distance (Est. 8km)</span>
                          <span className="font-semibold">₹400</span>
                        </div>
                        
                        {formData.specialRequirements.length > 0 && (
                          <div className="flex justify-between items-center text-sm md:text-base">
                            <span>Special Requirements ({formData.specialRequirements.length})</span>
                            <span className="font-semibold">₹{formData.specialRequirements.length * 200}</span>
                          </div>
                        )}
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center text-sm md:text-base">
                          <span>Subtotal</span>
                          <span className="font-semibold">₹{estimatedCost ? Math.round(estimatedCost / 1.18) : 0}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs md:text-sm text-gray-600">
                          <span>GST (18%)</span>
                          <span>₹{estimatedCost ? Math.round(estimatedCost * 0.18 / 1.18) : 0}</span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center text-lg md:text-xl font-bold">
                          <span>Total Amount</span>
                          <span className="text-green-600">₹{estimatedCost || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl md:rounded-2xl p-4 md:p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-blue-600 mt-1 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-blue-800 text-sm md:text-base">Payment Information</div>
                          <p className="text-blue-700 text-xs md:text-sm mt-1">
                            Final amount based on actual distance and services. Payment via cash, card, or UPI after service.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t-2 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={prevStep}
                    className="w-full sm:w-auto px-6 md:px-8 py-3 text-base md:text-lg order-2 sm:order-1"
                  >
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Back to Edit
                  </Button>
                  
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 md:px-12 py-3 md:py-4 text-lg md:text-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-2xl transform hover:scale-105 transition-all order-1 sm:order-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                        Dispatching...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 mr-3" />
                        Confirm & Book Ambulance
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}