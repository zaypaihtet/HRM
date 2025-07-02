export interface Location {
  latitude: number;
  longitude: number;
}

export interface GeofenceZone {
  center: Location;
  radius: number; // in meters
  name: string;
}

// Mock office location
export const OFFICE_LOCATION: GeofenceZone = {
  center: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  radius: 100, // 100 meters
  name: "Office"
};

// Calculate distance between two points using Haversine formula
function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.latitude * Math.PI / 180;
  const φ2 = point2.latitude * Math.PI / 180;
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Check if a location is within a geofence
export function isLocationInGeofence(location: Location, geofence: GeofenceZone): boolean {
  const distance = calculateDistance(location, geofence.center);
  return distance <= geofence.radius;
}

// Get current location (mock implementation)
export function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.warn("Geolocation error:", error);
          // Return mock location near office for demo
          resolve({
            latitude: 40.7128 + (Math.random() - 0.5) * 0.001,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.001
          });
        }
      );
    } else {
      // Fallback to mock location
      resolve({
        latitude: 40.7128 + (Math.random() - 0.5) * 0.001,
        longitude: -74.0060 + (Math.random() - 0.5) * 0.001
      });
    }
  });
}

// Validate check-in/check-out location
export async function validateCheckInLocation(): Promise<{ isValid: boolean; location: string }> {
  try {
    const currentLocation = await getCurrentLocation();
    const isInOffice = isLocationInGeofence(currentLocation, OFFICE_LOCATION);
    
    return {
      isValid: isInOffice,
      location: isInOffice ? "Office" : "Outside Office Zone"
    };
  } catch (error) {
    console.error("Location validation error:", error);
    // For demo purposes, allow check-in with mock validation
    return {
      isValid: true,
      location: "Office (Mock)"
    };
  }
}
