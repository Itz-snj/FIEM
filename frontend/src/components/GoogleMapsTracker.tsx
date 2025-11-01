import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
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
  Car, // Using Car instead of Traffic
  AlertCircle
} from 'lucide-react';

// Get API key from environment variables
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface GoogleMapProps {
  pickupLocation: Location;
  destination?: Location;
  driverLocation?: { latitude: number; longitude: number };
  bookingStatus: string;
  estimatedRoute?: Array<[number, number]>;
}

// Map component that uses Google Maps API
const GoogleMapComponent: React.FC<{
  center: google.maps.LatLng;
  zoom: number;
  pickupLocation: Location;
  destination?: Location;
  driverLocation?: { latitude: number; longitude: number };
  bookingStatus: string;
  onMapLoad?: (map: google.maps.Map) => void;
}> = ({ center, zoom, pickupLocation, destination, driverLocation, bookingStatus, onMapLoad }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [trafficLayer, setTrafficLayer] = useState<google.maps.TrafficLayer | null>(null);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !map) {
      const newMap = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          },
          {
            featureType: "transit",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: false,
        zoomControl: false
      });

      setMap(newMap);
      setDirectionsService(new google.maps.DirectionsService());
      setDirectionsRenderer(new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 4,
          strokeOpacity: 0.8
        }
      }));
      setTrafficLayer(new google.maps.TrafficLayer());

      if (onMapLoad) {
        onMapLoad(newMap);
      }
    }
  }, [center, zoom, map, onMapLoad]);

  // Set up directions renderer
  useEffect(() => {
    if (map && directionsRenderer) {
      directionsRenderer.setMap(map);
    }
  }, [map, directionsRenderer]);

  // Clear existing markers
  const clearMarkers = useCallback(() => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
  }, [markers]);

  // Create custom marker with emergency styling
  const createMarker = useCallback((
    position: google.maps.LatLng,
    title: string,
    icon: string,
    color: string,
    isDriver: boolean = false
  ) => {
    if (!map) return null;

    const marker = new google.maps.Marker({
      position,
      map,
      title,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="3"/>
            <text x="20" y="26" font-family="Arial" font-size="16" fill="white" text-anchor="middle">${icon}</text>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20)
      },
      animation: isDriver ? google.maps.Animation.BOUNCE : undefined
    });

    // Add info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="p-2">
          <h3 class="font-bold text-sm">${title}</h3>
          <p class="text-xs text-gray-600">
            ${isDriver ? 'Live tracking active' : 'Emergency location'}
          </p>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    return marker;
  }, [map]);

  // Update markers when locations change
  useEffect(() => {
    if (!map) return;

    clearMarkers();
    const newMarkers: google.maps.Marker[] = [];

    // Pickup location marker
    const pickupMarker = createMarker(
      new google.maps.LatLng(pickupLocation.latitude, pickupLocation.longitude),
      'Pickup Location',
      '📍',
      '#ef4444'
    );
    if (pickupMarker) newMarkers.push(pickupMarker);

    // Destination marker
    if (destination) {
      const destMarker = createMarker(
        new google.maps.LatLng(destination.latitude, destination.longitude),
        destination.address,
        '🏥',
        '#22c55e'
      );
      if (destMarker) newMarkers.push(destMarker);
    }

    // Driver location marker (with animation)
    if (driverLocation) {
      const driverMarker = createMarker(
        new google.maps.LatLng(driverLocation.latitude, driverLocation.longitude),
        'Ambulance Location',
        '🚑',
        '#f59e0b',
        true
      );
      if (driverMarker) newMarkers.push(driverMarker);
    }

    setMarkers(newMarkers);
  }, [map, pickupLocation, destination, driverLocation, createMarker, clearMarkers]);

  // Calculate and display route
  useEffect(() => {
    if (!map || !directionsService || !directionsRenderer || !destination) return;

    const origin = driverLocation 
      ? new google.maps.LatLng(driverLocation.latitude, driverLocation.longitude)
      : new google.maps.LatLng(pickupLocation.latitude, pickupLocation.longitude);
    
    const dest = new google.maps.LatLng(destination.latitude, destination.longitude);

    directionsService.route({
      origin,
      destination: dest,
      travelMode: google.maps.TravelMode.DRIVING,
      avoidHighways: false,
      avoidTolls: false
    }, (result, status) => {
      if (status === 'OK' && result) {
        directionsRenderer.setDirections(result);
      }
    });
  }, [map, directionsService, directionsRenderer, pickupLocation, destination, driverLocation]);

  return <div ref={mapRef} className="w-full h-full" />;
};

// Main Google Maps wrapper component
const GoogleMapsTracker: React.FC<GoogleMapProps> = ({
  pickupLocation,
  destination,
  driverLocation,
  bookingStatus,
  estimatedRoute
}) => {
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [showTraffic, setShowTraffic] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [trafficLayer, setTrafficLayer] = useState<google.maps.TrafficLayer | null>(null);

  // Calculate center point
  const center = React.useMemo(() => {
    if (driverLocation) {
      return new google.maps.LatLng(driverLocation.latitude, driverLocation.longitude);
    }
    return new google.maps.LatLng(pickupLocation.latitude, pickupLocation.longitude);
  }, [pickupLocation, driverLocation]);

  // Handle map load
  const handleMapLoad = useCallback((loadedMap: google.maps.Map) => {
    setMap(loadedMap);
    const traffic = new google.maps.TrafficLayer();
    setTrafficLayer(traffic);
    if (showTraffic) {
      traffic.setMap(loadedMap);
    }
  }, [showTraffic]);

  // Toggle traffic layer
  const toggleTraffic = useCallback(() => {
    if (map && trafficLayer) {
      if (showTraffic) {
        trafficLayer.setMap(null);
      } else {
        trafficLayer.setMap(map);
      }
      setShowTraffic(!showTraffic);
    }
  }, [map, trafficLayer, showTraffic]);

  // Change map type
  const changeMapType = useCallback((type: 'roadmap' | 'satellite' | 'hybrid') => {
    if (map) {
      map.setMapTypeId(type);
      setMapType(type);
    }
  }, [map]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    if (map) {
      map.setZoom((map.getZoom() || 15) + 1);
    }
  }, [map]);

  const zoomOut = useCallback(() => {
    if (map) {
      map.setZoom((map.getZoom() || 15) - 1);
    }
  }, [map]);

  // Center on different locations
  const centerOnPickup = useCallback(() => {
    if (map) {
      map.panTo(new google.maps.LatLng(pickupLocation.latitude, pickupLocation.longitude));
      map.setZoom(16);
    }
  }, [map, pickupLocation]);

  const centerOnDestination = useCallback(() => {
    if (map && destination) {
      map.panTo(new google.maps.LatLng(destination.latitude, destination.longitude));
      map.setZoom(16);
    }
  }, [map, destination]);

  const centerOnDriver = useCallback(() => {
    if (map && driverLocation) {
      map.panTo(new google.maps.LatLng(driverLocation.latitude, driverLocation.longitude));
      map.setZoom(16);
    }
  }, [map, driverLocation]);

  // Fit all markers in view
  const fitAllMarkers = useCallback(() => {
    if (!map) return;
    
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(new google.maps.LatLng(pickupLocation.latitude, pickupLocation.longitude));
    
    if (destination) {
      bounds.extend(new google.maps.LatLng(destination.latitude, destination.longitude));
    }
    
    if (driverLocation) {
      bounds.extend(new google.maps.LatLng(driverLocation.latitude, driverLocation.longitude));
    }
    
    map.fitBounds(bounds);
  }, [map, pickupLocation, destination, driverLocation]);

  const toggleFullscreen = () => setIsFullscreen(prev => !prev);

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
        {/* Google Maps Container */}
        <div className={`relative ${isFullscreen ? 'h-screen' : 'h-96'} bg-gray-100 rounded-lg overflow-hidden`}>
          <GoogleMapComponent
            center={center}
            zoom={14}
            pickupLocation={pickupLocation}
            destination={destination}
            driverLocation={driverLocation}
            bookingStatus={bookingStatus}
            onMapLoad={handleMapLoad}
          />
          
          {/* Map Controls Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={toggleFullscreen}
              className="w-10 h-10 p-0"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={zoomIn}
              className="w-10 h-10 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={zoomOut}
              className="w-10 h-10 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={fitAllMarkers}
              className="w-10 h-10 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Map Type Controls */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <Button
              size="sm"
              variant={mapType === 'roadmap' ? 'default' : 'secondary'}
              onClick={() => changeMapType('roadmap')}
              className="w-10 h-10 p-0"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={mapType === 'satellite' ? 'default' : 'secondary'}
              onClick={() => changeMapType('satellite')}
              className="w-10 h-10 p-0"
            >
              <Satellite className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={showTraffic ? 'default' : 'secondary'}
              onClick={toggleTraffic}
              className="w-10 h-10 p-0"
            >
              <Car className="h-4 w-4" />
            </Button>
          </div>

          {/* Live Status Overlay */}
          {driverLocation && (
            <div className="absolute bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-medium text-sm">Live Tracking</span>
              </div>
              <div className="text-xs space-y-1">
                <div>Status: <span className="text-green-400">En Route</span></div>
                <div>Speed: <span className="text-blue-400">{Math.floor(Math.random() * 20 + 30)} km/h</span></div>
                <div>Updated: <span className="text-gray-300">Just now</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Buttons */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={centerOnPickup}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Pickup
            </Button>
            {destination && (
              <Button
                size="sm"
                variant="outline"
                onClick={centerOnDestination}
              >
                <Hospital className="h-4 w-4 mr-2" />
                Hospital
              </Button>
            )}
            {driverLocation && (
              <Button
                size="sm"
                variant="outline"
                onClick={centerOnDriver}
              >
                <Ambulance className="h-4 w-4 mr-2" />
                Track Ambulance
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={fitAllMarkers}
            >
              <Navigation className="h-4 w-4 mr-2" />
              View All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Wrapper component with error handling
const GoogleMapsWrapper: React.FC<GoogleMapProps> = (props) => {
  const render = (status: Status) => {
    switch (status) {
      case Status.LOADING:
        return (
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-sm text-gray-600">Loading Google Maps...</p>
              </div>
            </CardContent>
          </Card>
        );
      case Status.FAILURE:
        return (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="space-y-2">
                <p className="font-medium">Google Maps failed to load</p>
                <p className="text-sm">Please check your API key configuration:</p>
                <ol className="text-xs list-decimal list-inside space-y-1 mt-2">
                  <li>Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your .env file</li>
                  <li>Enable Maps JavaScript API in Google Cloud Console</li>
                  <li>Ensure billing is enabled for your Google Cloud project</li>
                </ol>
                <p className="text-xs mt-2 text-gray-600">
                  Current API key: {GOOGLE_MAPS_API_KEY ? '✓ Present' : '✗ Missing'}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        );
      default:
        return <GoogleMapsTracker {...props} />;
    }
  };

  // Only load Google Maps if API key is available and not placeholder
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return (
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <div className="space-y-2">
            <p className="font-medium">Google Maps API Key Required</p>
            <p className="text-sm">To use Google Maps, please:</p>
            <ol className="text-xs list-decimal list-inside space-y-1 mt-2">
              <li>Get an API key from <a href="https://console.cloud.google.com/" className="underline" target="_blank" rel="noopener">Google Cloud Console</a></li>
              <li>Enable the Maps JavaScript API</li>
              <li>Add <code>VITE_GOOGLE_MAPS_API_KEY=your_key_here</code> to your .env file</li>
              <li>Restart the development server</li>
            </ol>
            <p className="text-xs mt-2">
              💡 <strong>For demo purposes:</strong> The Canvas-based map is still working below.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Wrapper 
      apiKey={GOOGLE_MAPS_API_KEY}
      render={render}
      libraries={['geometry', 'drawing']}
    />
  );
};

export default GoogleMapsWrapper;