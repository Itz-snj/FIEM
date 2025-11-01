import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Route, Navigation, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapComponentProps {
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  destinationLocation?: {
    latitude: number;
    longitude: number;
  };
  pickupLocation?: {
    latitude: number;
    longitude: number;
  };
  routeData?: {
    distance: number;
    estimatedTime: number;
    waypoints: Array<{
      latitude: number;
      longitude: number;
    }>;
  };
  onNavigate?: () => void;
  className?: string;
}

export function MapComponent({
  currentLocation,
  destinationLocation,
  pickupLocation,
  routeData,
  onNavigate,
  className = ""
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Mock real-time location updates
  const [liveLocation, setLiveLocation] = useState(currentLocation);

  useEffect(() => {
    // Simulate live location updates
    const interval = setInterval(() => {
      if (currentLocation && pickupLocation) {
        // Simulate movement towards pickup location
        setLiveLocation(prev => {
          if (!prev) return currentLocation;
          
          const deltaLat = (pickupLocation.latitude - prev.latitude) * 0.01;
          const deltaLng = (pickupLocation.longitude - prev.longitude) * 0.01;
          
          return {
            latitude: prev.latitude + deltaLat,
            longitude: prev.longitude + deltaLng
          };
        });
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [currentLocation, pickupLocation]);

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleOpenInGoogleMaps = () => {
    if (!pickupLocation) return;
    
    let url = `https://www.google.com/maps/dir/`;
    
    if (currentLocation) {
      url += `${currentLocation.latitude},${currentLocation.longitude}/`;
    }
    
    url += `${pickupLocation.latitude},${pickupLocation.longitude}`;
    
    if (destinationLocation) {
      url += `/${destinationLocation.latitude},${destinationLocation.longitude}`;
    }
    
    url += `?travelmode=driving`;
    window.open(url, '_blank');
  };

  if (!mapLoaded) {
    return (
      <div className={`bg-gray-100 rounded-lg border ${className}`}>
        <div className="h-80 flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Loading Real-time Map...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to GPS and route services</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-blue-200 ${className}`}>
      <div className="h-80 p-6 flex flex-col">
        {/* Map Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Route className="w-5 h-5 text-blue-600" />
            Live Route Map
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-700 font-medium">LIVE</span>
          </div>
        </div>

        {/* Mock Map Visualization */}
        <div className="flex-1 bg-white rounded-lg border relative overflow-hidden">
          {/* Map Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-blue-50 to-green-100 opacity-50"></div>
          
          {/* Route Visualization */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full max-w-md max-h-md">
              
              {/* Current Location (Driver) */}
              {liveLocation && (
                <div className="absolute" style={{ 
                  left: '20%', 
                  top: '70%',
                  animation: 'pulse 2s infinite'
                }}>
                  <div className="relative">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-blue-700 whitespace-nowrap">
                      You (Live)
                    </div>
                  </div>
                </div>
              )}

              {/* Pickup Location */}
              {pickupLocation && (
                <div className="absolute" style={{ left: '70%', top: '30%' }}>
                  <div className="relative">
                    <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <MapPin className="w-3 h-3 text-white" />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-red-700 whitespace-nowrap">
                      Pickup
                    </div>
                  </div>
                </div>
              )}

              {/* Destination (Hospital) */}
              {destinationLocation && (
                <div className="absolute" style={{ left: '80%', top: '50%' }}>
                  <div className="relative">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-xs font-bold">H</span>
                    </div>
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-green-700 whitespace-nowrap">
                      Hospital
                    </div>
                  </div>
                </div>
              )}

              {/* Route Line */}
              {liveLocation && pickupLocation && (
                <svg className="absolute inset-0 w-full h-full">
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor:'#3B82F6', stopOpacity:0.8}} />
                      <stop offset="50%" style={{stopColor:'#8B5CF6', stopOpacity:0.6}} />
                      <stop offset="100%" style={{stopColor:'#EF4444', stopOpacity:0.8}} />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 20% 70% Q 45% 35% 70% 30%"
                    stroke="url(#routeGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray="10,5"
                    className="animate-pulse"
                  />
                </svg>
              )}

              {/* Distance and Time Info */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-md">
                <div className="text-sm space-y-1">
                  {routeData ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold">{routeData.distance}km</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-green-600" />
                        <span className="font-semibold">{Math.round(routeData.estimatedTime)}min</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">Calculating route...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Actions */}
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleOpenInGoogleMaps}
            className="flex-1"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Open in Google Maps
          </Button>
          {onNavigate && (
            <Button 
              onClick={onNavigate}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Route className="w-4 h-4 mr-2" />
              Start Navigation
            </Button>
          )}
        </div>

        {/* Live Update Indicator */}
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-600">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
          <span>Real-time GPS tracking active</span>
        </div>
      </div>
    </div>
  );
}

export default MapComponent;