import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MapPin, 
  Navigation, 
  Hospital, 
  Ambulance, 
  Route,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Satellite,
  Map as MapIcon,
  Car,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface SimpleGoogleMapsProps {
  pickupLocation: Location;
  destination?: Location;
  driverLocation?: { latitude: number; longitude: number };
  bookingStatus: string;
}

// Get API key from environment
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const SimpleGoogleMaps: React.FC<SimpleGoogleMapsProps> = ({
  pickupLocation,
  destination,
  driverLocation,
  bookingStatus
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [showTraffic, setShowTraffic] = useState(true);

  // Create Google Maps embed URL
  const createMapUrl = () => {
    const baseUrl = 'https://www.google.com/maps/embed/v1/directions';
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY || 'DEMO_KEY',
      origin: `${pickupLocation.latitude},${pickupLocation.longitude}`,
      destination: destination 
        ? `${destination.latitude},${destination.longitude}` 
        : `${pickupLocation.latitude + 0.01},${pickupLocation.longitude + 0.01}`,
      maptype: mapType,
      mode: 'driving',
      avoid: 'tolls',
      zoom: '14'
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  // Create static map URL for fallback
  const createStaticMapUrl = () => {
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const markers = [
      `color:red|label:P|${pickupLocation.latitude},${pickupLocation.longitude}`,
    ];
    
    if (destination) {
      markers.push(`color:green|label:H|${destination.latitude},${destination.longitude}`);
    }
    
    if (driverLocation) {
      markers.push(`color:orange|label:A|${driverLocation.latitude},${driverLocation.longitude}`);
    }
    
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_API_KEY || 'DEMO_KEY',
      size: '800x400',
      zoom: '13',
      maptype: mapType,
      markers: markers.join('&markers='),
      format: 'png'
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  // Open in Google Maps app/website
  const openInGoogleMaps = () => {
    const url = destination
      ? `https://www.google.com/maps/dir/${pickupLocation.latitude},${pickupLocation.longitude}/${destination.latitude},${destination.longitude}`
      : `https://www.google.com/maps/@${pickupLocation.latitude},${pickupLocation.longitude},15z`;
    
    window.open(url, '_blank');
  };

  const toggleFullscreen = () => setIsFullscreen(prev => !prev);

  // Show setup instructions if no API key
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Google Maps Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={openInGoogleMaps}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Maps
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${pickupLocation.latitude},${pickupLocation.longitude}`);
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Copy Pickup Coords
            </Button>
            {destination && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${destination.latitude},${destination.longitude}`);
                }}
              >
                <Hospital className="h-4 w-4 mr-2" />
                Copy Hospital Coords
              </Button>
            )}
          </div>

          {/* Location Info */}
          <div className="space-y-2 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">📍 Pickup Location</p>
              <p className="text-gray-600">{pickupLocation.address}</p>
              <p className="text-xs text-gray-500">
                {pickupLocation.latitude.toFixed(6)}, {pickupLocation.longitude.toFixed(6)}
              </p>
            </div>
            
            {destination && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">🏥 Hospital Destination</p>
                <p className="text-gray-600">{destination.address}</p>
                <p className="text-xs text-gray-500">
                  {destination.latitude.toFixed(6)}, {destination.longitude.toFixed(6)}
                </p>
              </div>
            )}
            
            {driverLocation && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="font-medium">🚑 Live Ambulance Location</p>
                <p className="text-xs text-gray-500">
                  {driverLocation.latitude.toFixed(6)}, {driverLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-green-600 font-medium">● Live tracking active</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Google Maps Live Tracking
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={bookingStatus === 'driver_enroute' ? 'default' : 'secondary'}>
              {bookingStatus === 'driver_enroute' ? '🔴 Live Tracking' : 'Route Preview'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {/* Google Maps Embed */}
        <div className={`relative ${isFullscreen ? 'h-screen' : 'h-96'} bg-gray-100 rounded-lg overflow-hidden`}>
          <iframe
            src={createMapUrl()}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="rounded-lg"
          />
          
          {/* Controls Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={toggleFullscreen}
              className="w-10 h-10 p-0 bg-white/90 backdrop-blur-sm"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Map Type Toggle */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Button
              size="sm"
              variant={mapType === 'roadmap' ? 'default' : 'secondary'}
              onClick={() => setMapType('roadmap')}
              className="bg-white/90 backdrop-blur-sm"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={mapType === 'satellite' ? 'default' : 'secondary'}
              onClick={() => setMapType('satellite')}
              className="bg-white/90 backdrop-blur-sm"
            >
              <Satellite className="h-4 w-4" />
            </Button>
          </div>

          {/* Live Status */}
          {driverLocation && (
            <div className="absolute bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-medium text-sm">Google Maps Live</span>
              </div>
              <div className="text-xs space-y-1">
                <div>Status: <span className="text-green-400">Tracking Active</span></div>
                <div>Provider: <span className="text-blue-400">Google Maps</span></div>
                <div>Updated: <span className="text-gray-300">Real-time</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={openInGoogleMaps}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Maps
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((position) => {
                    const url = `https://www.google.com/maps/@${position.coords.latitude},${position.coords.longitude},15z`;
                    window.open(url, '_blank');
                  });
                }
              }}
            >
              <Navigation className="h-4 w-4 mr-2" />
              My Location
            </Button>
            {destination && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const url = `https://www.google.com/maps/@${destination.latitude},${destination.longitude},16z`;
                  window.open(url, '_blank');
                }}
              >
                <Hospital className="h-4 w-4 mr-2" />
                Hospital Details
              </Button>
            )}
            {driverLocation && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const url = `https://www.google.com/maps/@${driverLocation.latitude},${driverLocation.longitude},17z`;
                  window.open(url, '_blank');
                }}
              >
                <Ambulance className="h-4 w-4 mr-2" />
                Live Ambulance
              </Button>
            )}
          </div>
          
          {/* Coordinates Display */}
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <div>📍 Pickup: {pickupLocation.latitude.toFixed(4)}, {pickupLocation.longitude.toFixed(4)}</div>
            {destination && (
              <div>🏥 Hospital: {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}</div>
            )}
            {driverLocation && (
              <div>🚑 Ambulance: {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleGoogleMaps;