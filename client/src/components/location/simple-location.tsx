import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCurrentLocation, getLocationString } from "@/lib/geolocation";
import { MapPin, Loader2, CheckCircle2, Navigation, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SimpleLocationProps {
  className?: string;
  showCheckinZones?: boolean;
}

export default function SimpleLocation({ className = "", showCheckinZones = true }: SimpleLocationProps) {
  const [currentLocation, setCurrentLocation] = useState<string>("Getting location...");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get checkin zones
  const { data: checkinZones } = useQuery({
    queryKey: ['/api/checkin-zones'],
    enabled: showCheckinZones,
  });

  // Real-time location tracking
  useEffect(() => {
    const updateLocation = async () => {
      try {
        setIsLoadingLocation(true);
        setLocationError(null);
        
        const location = await getCurrentLocation();
        const locationString = await getLocationString();
        
        setCoordinates({ lat: location.latitude, lng: location.longitude });
        setCurrentLocation(locationString);
      } catch (error) {
        setLocationError("Location unavailable");
        setCurrentLocation("Location services disabled");
      } finally {
        setIsLoadingLocation(false);
      }
    };

    updateLocation();
    const locationTimer = setInterval(updateLocation, 30000); // Update every 30 seconds
    return () => clearInterval(locationTimer);
  }, []);

  // Check if user is in any checkin zone
  const checkInZoneStatus = () => {
    if (!coordinates || !checkinZones || !Array.isArray(checkinZones)) {
      return { inZone: false, zoneName: null };
    }

    for (const zone of checkinZones) {
      if (!zone.isActive) continue;
      
      const zoneCenter = {
        lat: parseFloat(zone.latitude),
        lng: parseFloat(zone.longitude)
      };
      
      // Calculate distance using Haversine formula
      const R = 6371e3; // Earth's radius in meters
      const φ1 = coordinates.lat * Math.PI/180;
      const φ2 = zoneCenter.lat * Math.PI/180;
      const Δφ = (zoneCenter.lat - coordinates.lat) * Math.PI/180;
      const Δλ = (zoneCenter.lng - coordinates.lng) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;

      if (distance <= zone.radius) {
        return { inZone: true, zoneName: zone.name };
      }
    }

    return { inZone: false, zoneName: null };
  };

  const zoneStatus = checkInZoneStatus();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Location */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Navigation className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Your Current Location</h3>
            <p className="text-sm text-gray-600">Real-time GPS tracking</p>
          </div>
          {isLoadingLocation && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-mono text-gray-800">{currentLocation}</span>
          </div>
          
          {coordinates && (
            <div className="text-xs text-gray-500 space-y-1">
              <p>Latitude: {coordinates.lat.toFixed(6)}</p>
              <p>Longitude: {coordinates.lng.toFixed(6)}</p>
            </div>
          )}
          
          {locationError && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              {locationError}
            </div>
          )}
        </div>
      </div>

      {/* Zone Status */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center space-x-3 mb-3">
          <div className={`p-2 rounded-lg ${zoneStatus.inZone ? 'bg-green-50' : 'bg-gray-50'}`}>
            <Building className={`w-5 h-5 ${zoneStatus.inZone ? 'text-green-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Check-in Zone Status</h3>
            <p className="text-sm text-gray-600">Current zone availability</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {zoneStatus.inZone ? (
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">
                Inside "{zoneStatus.zoneName}" zone
              </span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Can Check In
              </Badge>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Outside check-in zones
              </span>
              <Badge variant="outline" className="text-gray-600">
                Cannot Check In
              </Badge>
            </div>
          )}
          
          {showCheckinZones && checkinZones && Array.isArray(checkinZones) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-2">Available Check-in Zones:</p>
              <div className="space-y-1">
                {checkinZones
                  .filter((zone: any) => zone.isActive)
                  .map((zone: any) => (
                    <div key={zone.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{zone.name}</span>
                      <span className="text-gray-500">{zone.radius}m radius</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Location Map Placeholder */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center border border-blue-100">
        <MapPin className="w-12 h-12 text-blue-400 mx-auto mb-3" />
        <h3 className="font-medium text-blue-900 mb-2">Interactive Map</h3>
        <p className="text-sm text-blue-700 mb-3">
          Full Google Maps integration with real-time location and zone visualization coming soon
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-600">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Your Location</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full opacity-60"></div>
            <span>Check-in Zones</span>
          </div>
        </div>
      </div>
    </div>
  );
}