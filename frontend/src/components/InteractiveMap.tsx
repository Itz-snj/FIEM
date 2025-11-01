import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Navigation, 
  Hospital, 
  Ambulance, 
  Route,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface MapProps {
  pickupLocation: Location;
  destination?: Location;
  driverLocation?: { latitude: number; longitude: number };
  bookingStatus: string;
  estimatedRoute?: Array<[number, number]>;
}

// Fallback map using Canvas API (no external dependencies)
const InteractiveMap: React.FC<MapProps> = ({
  pickupLocation,
  destination,
  driverLocation,
  bookingStatus,
  estimatedRoute
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(13);
  const [center, setCenter] = useState({
    lat: pickupLocation.latitude,
    lng: pickupLocation.longitude
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Calculate bounds to fit all points
  const calculateBounds = () => {
    const points = [
      [pickupLocation.latitude, pickupLocation.longitude],
      ...(destination ? [[destination.latitude, destination.longitude]] : []),
      ...(driverLocation ? [[driverLocation.latitude, driverLocation.longitude]] : [])
    ];
    
    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    
    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs)
    };
  };

  // Convert lat/lng to canvas coordinates
  const latLngToCanvas = (lat: number, lng: number, canvas: HTMLCanvasElement) => {
    const bounds = calculateBounds();
    const padding = 0.005; // Add some padding
    
    const normalizedX = (lng - (bounds.west - padding)) / ((bounds.east + padding) - (bounds.west - padding));
    const normalizedY = 1 - (lat - (bounds.south - padding)) / ((bounds.north + padding) - (bounds.south - padding));
    
    return {
      x: normalizedX * canvas.width,
      y: normalizedY * canvas.height
    };
  };

  // Draw the map
  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;

    // Draw background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    // Draw grid pattern to simulate streets
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const gridSize = 30;
    
    for (let i = 0; i <= displayWidth; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, displayHeight);
      ctx.stroke();
    }
    
    for (let i = 0; i <= displayHeight; i += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(displayWidth, i);
      ctx.stroke();
    }

    // Draw route if available
    if (destination && estimatedRoute && estimatedRoute.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      
      estimatedRoute.forEach((point, index) => {
        const canvasPoint = latLngToCanvas(point[0], point[1], canvas);
        if (index === 0) {
          ctx.moveTo(canvasPoint.x / window.devicePixelRatio, canvasPoint.y / window.devicePixelRatio);
        } else {
          ctx.lineTo(canvasPoint.x / window.devicePixelRatio, canvasPoint.y / window.devicePixelRatio);
        }
      });
      
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (destination) {
      // Draw straight line if no route available
      const pickupCanvas = latLngToCanvas(pickupLocation.latitude, pickupLocation.longitude, canvas);
      const destCanvas = latLngToCanvas(destination.latitude, destination.longitude, canvas);
      
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(pickupCanvas.x / window.devicePixelRatio, pickupCanvas.y / window.devicePixelRatio);
      ctx.lineTo(destCanvas.x / window.devicePixelRatio, destCanvas.y / window.devicePixelRatio);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw pickup location
    const pickupCanvas = latLngToCanvas(pickupLocation.latitude, pickupLocation.longitude, canvas);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(pickupCanvas.x / window.devicePixelRatio, pickupCanvas.y / window.devicePixelRatio, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Pickup label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('📍', pickupCanvas.x / window.devicePixelRatio, pickupCanvas.y / window.devicePixelRatio + 4);

    // Draw destination
    if (destination) {
      const destCanvas = latLngToCanvas(destination.latitude, destination.longitude, canvas);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(destCanvas.x / window.devicePixelRatio, destCanvas.y / window.devicePixelRatio, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Hospital label
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🏥', destCanvas.x / window.devicePixelRatio, destCanvas.y / window.devicePixelRatio + 4);
    }

    // Draw driver location
    if (driverLocation) {
      const driverCanvas = latLngToCanvas(driverLocation.latitude, driverLocation.longitude, canvas);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(driverCanvas.x / window.devicePixelRatio, driverCanvas.y / window.devicePixelRatio, 10, 0, 2 * Math.PI);
      ctx.fill();
      
      // Ambulance emoji
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px system-ui';
      ctx.fillText('🚑', driverCanvas.x / window.devicePixelRatio, driverCanvas.y / window.devicePixelRatio + 5);

      // Driver pulse effect
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      const pulseRadius = 15 + Math.sin(Date.now() / 500) * 5;
      ctx.beginPath();
      ctx.arc(driverCanvas.x / window.devicePixelRatio, driverCanvas.y / window.devicePixelRatio, pulseRadius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw distance and ETA if available
    if (destination && driverLocation) {
      const distance = calculateDistance(
        driverLocation.latitude, 
        driverLocation.longitude,
        destination.latitude,
        destination.longitude
      );
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(10, 10, 200, 60);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`Distance: ${distance.toFixed(1)} km`, 20, 30);
      ctx.fillText(`ETA: ${Math.ceil(distance * 2)} minutes`, 20, 50);
    }
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Animation loop for live updates
  useEffect(() => {
    const interval = setInterval(drawMap, 1000); // Redraw every second for animations
    drawMap(); // Initial draw
    
    return () => clearInterval(interval);
  }, [pickupLocation, destination, driverLocation, zoom, center]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => drawMap();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const zoomIn = () => setZoom(prev => Math.min(prev + 1, 18));
  const zoomOut = () => setZoom(prev => Math.max(prev - 1, 8));
  const resetView = () => {
    setCenter({
      lat: pickupLocation.latitude,
      lng: pickupLocation.longitude
    });
    setZoom(13);
  };

  const toggleFullscreen = () => setIsFullscreen(prev => !prev);

  return (
    <Card className={isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Live Tracking Map
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={bookingStatus === 'driver_enroute' ? 'default' : 'secondary'}>
              {bookingStatus === 'driver_enroute' ? 'Live Tracking' : 'Route Preview'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        {/* Map Canvas */}
        <div className={`relative ${isFullscreen ? 'h-screen' : 'h-96'} bg-gray-100 rounded-lg overflow-hidden`}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          />
          
          {/* Map Controls */}
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
              onClick={resetView}
              className="w-10 h-10 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>📍 Pickup Location</span>
              </div>
              {destination && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>🏥 Hospital</span>
                </div>
              )}
              {driverLocation && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span>🚑 Ambulance (Live)</span>
                </div>
              )}
              {destination && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-blue-500 border-dashed"></div>
                  <span>Route</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Overlay */}
          {driverLocation && (
            <div className="absolute top-4 left-4 bg-black/80 text-white p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Ambulance className="h-4 w-4" />
                <span className="font-medium">Ambulance Status</span>
              </div>
              <div className="text-sm space-y-1">
                <div>Status: <span className="text-green-400">En Route</span></div>
                <div>Speed: <span className="text-blue-400">{Math.floor(Math.random() * 20 + 30)} km/h</span></div>
                <div>Last Update: <span className="text-gray-300">Just now</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Map Actions */}
        <div className="p-4 border-t">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((position) => {
                    setCenter({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                    });
                  });
                }
              }}
            >
              <Navigation className="h-4 w-4 mr-2" />
              My Location
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (destination) {
                  setCenter({
                    lat: destination.latitude,
                    lng: destination.longitude
                  });
                }
              }}
            >
              <Hospital className="h-4 w-4 mr-2" />
              View Hospital
            </Button>
            {driverLocation && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCenter({
                    lat: driverLocation.latitude,
                    lng: driverLocation.longitude
                  });
                }}
              >
                <Ambulance className="h-4 w-4 mr-2" />
                Track Ambulance
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveMap;