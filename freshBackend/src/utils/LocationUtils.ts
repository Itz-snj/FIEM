/**
 * Location utilities for GPS coordinate handling, distance calculation, and geofencing
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationPoint extends Coordinates {
  timestamp?: Date;
  accuracy?: number; // in meters
  heading?: number; // degrees
  speed?: number; // km/h
}

export interface GeoFence {
  center: Coordinates;
  radius: number; // in kilometers
}

export interface BoundingBox {
  northEast: Coordinates;
  southWest: Coordinates;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  
  const lat1Rad = toRadians(coord1.latitude);
  const lat2Rad = toRadians(coord2.latitude);
  const deltaLatRad = toRadians(coord2.latitude - coord1.latitude);
  const deltaLngRad = toRadians(coord2.longitude - coord1.longitude);

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Calculate bearing (direction) from one coordinate to another
 * @param from Starting coordinate
 * @param to Ending coordinate
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  const lat1Rad = toRadians(from.latitude);
  const lat2Rad = toRadians(to.latitude);
  const deltaLngRad = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLngRad) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(deltaLngRad);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = toDegrees(bearingRad);
  
  return (bearingDeg + 360) % 360;
}

/**
 * Check if a point is within a geofence (circular area)
 * @param point Point to check
 * @param geofence Geofence definition
 * @returns True if point is within geofence
 */
export function isWithinGeofence(point: Coordinates, geofence: GeoFence): boolean {
  const distance = calculateDistance(point, geofence.center);
  return distance <= geofence.radius;
}

/**
 * Check if coordinates are valid GPS coordinates
 * @param coords Coordinates to validate
 * @returns True if valid
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  const { latitude, longitude } = coords;
  
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180 &&
    !isNaN(latitude) && !isNaN(longitude)
  );
}

/**
 * Find the nearest points from a list based on distance
 * @param origin Origin point
 * @param points Array of points with coordinates
 * @param limit Maximum number of results
 * @returns Sorted array of nearest points with distances
 */
export function findNearestPoints<T extends { coordinates?: Coordinates; location?: Coordinates }>(
  origin: Coordinates,
  points: T[],
  limit: number = 10
): Array<T & { distance: number }> {
  const pointsWithDistance = points
    .filter(point => {
      const coords = point.coordinates || point.location;
      return coords && isValidCoordinates(coords);
    })
    .map(point => {
      const coords = point.coordinates || point.location!;
      const distance = calculateDistance(origin, coords);
      return { ...point, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);

  return pointsWithDistance;
}

/**
 * Create a bounding box around a center point with given radius
 * @param center Center coordinates
 * @param radiusKm Radius in kilometers
 * @returns Bounding box coordinates
 */
export function createBoundingBox(center: Coordinates, radiusKm: number): BoundingBox {
  const lat = center.latitude;
  const lng = center.longitude;
  
  // Approximate degrees per km (varies by latitude)
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = Math.cos(toRadians(lat)) * 111.32;
  
  const deltaLat = radiusKm / kmPerDegreeLat;
  const deltaLng = radiusKm / kmPerDegreeLng;
  
  return {
    northEast: {
      latitude: lat + deltaLat,
      longitude: lng + deltaLng
    },
    southWest: {
      latitude: lat - deltaLat,
      longitude: lng - deltaLng
    }
  };
}

/**
 * Check if a point is within a bounding box
 * @param point Point to check
 * @param boundingBox Bounding box
 * @returns True if point is within bounding box
 */
export function isWithinBoundingBox(point: Coordinates, boundingBox: BoundingBox): boolean {
  return (
    point.latitude >= boundingBox.southWest.latitude &&
    point.latitude <= boundingBox.northEast.latitude &&
    point.longitude >= boundingBox.southWest.longitude &&
    point.longitude <= boundingBox.northEast.longitude
  );
}

/**
 * Calculate estimated travel time based on distance and average speed
 * @param distanceKm Distance in kilometers
 * @param averageSpeedKmh Average speed in km/h (default: 40 km/h for city driving)
 * @returns Estimated time in minutes
 */
export function estimateTravelTime(distanceKm: number, averageSpeedKmh: number = 40): number {
  const timeHours = distanceKm / averageSpeedKmh;
  return Math.round(timeHours * 60); // Convert to minutes
}

/**
 * Generate a random location within a radius of a center point (for testing)
 * @param center Center coordinates
 * @param radiusKm Maximum radius in kilometers
 * @returns Random coordinates within the radius
 */
export function generateRandomLocation(center: Coordinates, radiusKm: number): Coordinates {
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.random() * radiusKm;
  
  // Convert to approximate degrees
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLng = Math.cos(toRadians(center.latitude)) * 111.32;
  
  const deltaLat = (radius * Math.cos(angle)) / kmPerDegreeLat;
  const deltaLng = (radius * Math.sin(angle)) / kmPerDegreeLng;
  
  return {
    latitude: center.latitude + deltaLat,
    longitude: center.longitude + deltaLng
  };
}

/**
 * Format coordinates for display
 * @param coords Coordinates to format
 * @param precision Number of decimal places
 * @returns Formatted string
 */
export function formatCoordinates(coords: Coordinates, precision: number = 6): string {
  return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`;
}

/**
 * Parse coordinates from string format
 * @param coordString String in format "lat, lng" or "lat,lng"
 * @returns Parsed coordinates or null if invalid
 */
export function parseCoordinates(coordString: string): Coordinates | null {
  try {
    const parts = coordString.split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    
    const latitude = parseFloat(parts[0]);
    const longitude = parseFloat(parts[1]);
    
    const coords = { latitude, longitude };
    return isValidCoordinates(coords) ? coords : null;
  } catch {
    return null;
  }
}

// Helper functions
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

// Common location constants
export const LOCATION_CONSTANTS = {
  EARTH_RADIUS_KM: 6371,
  DEFAULT_SEARCH_RADIUS_KM: 10,
  MAX_SEARCH_RADIUS_KM: 100,
  MIN_ACCURACY_METERS: 100,
  AMBULANCE_AVERAGE_SPEED_KMH: 45, // City driving with traffic
  EMERGENCY_RESPONSE_RADIUS_KM: 25,
  GPS_UPDATE_INTERVAL_MS: 5000, // 5 seconds
  GEOFENCE_BUFFER_KM: 0.1 // 100 meters buffer
} as const;