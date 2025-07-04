import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, CheckCircle, AlertTriangle, Navigation, Target, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentLocation } from "@/lib/geolocation";

interface CheckinZone {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
}

interface SimpleMapProps {
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
  className?: string;
}

export default function SimpleMap({ onLocationChange, className }: SimpleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isInZone, setIsInZone] = useState<boolean>(false);
  const [nearestZone, setNearestZone] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Fetch check-in zones
  const { data: checkinZones = [] } = useQuery<CheckinZone[]>({
    queryKey: ['/api/checkin-zones'],
  });

  // Initialize simple map display
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        // Create a simple map container
        mapRef.current.innerHTML = `
          <div class="w-full h-full bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center relative">
            <div class="text-center p-6">
              <div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-700 mb-2">Location Tracking</h3>
              <p class="text-sm text-gray-500">OpenStreetMap Integration Active</p>
            </div>
            
            <!-- Location display -->
            <div id="location-display" class="absolute bottom-4 left-4 right-4 bg-white rounded-lg p-3 shadow-lg">
              <div class="text-xs text-gray-500">Getting location...</div>
            </div>
          </div>
        `;

        setIsMapLoaded(true);
        
        // Get initial location
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        setLocationAccuracy(location.accuracy || null);
        
        if (onLocationChange) {
          onLocationChange(location);
        }

        // Update location display
        updateLocationDisplay(location);
        
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();
  }, []);

  // Update location display
  const updateLocationDisplay = (location: { latitude: number; longitude: number }) => {
    const displayElement = mapRef.current?.querySelector('#location-display');
    if (displayElement) {
      displayElement.innerHTML = `
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span class="text-sm font-medium">
            ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
          </span>
          ${locationAccuracy ? `<span class="text-xs text-gray-500">±${Math.round(locationAccuracy)}m</span>` : ''}
        </div>
      `;
    }
  };

  // Real-time location tracking
  useEffect(() => {
    if (!isTrackingLocation) return;

    const trackLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        setLocationAccuracy(location.accuracy || null);
        
        if (onLocationChange) {
          onLocationChange(location);
        }

        updateLocationDisplay(location);

        // Check if user is in any check-in zone
        let inAnyZone = false;
        let closestZone = null;

        for (const zone of checkinZones) {
          if (zone.isActive) {
            const distance = calculateDistance(
              location.latitude,
              location.longitude,
              zone.latitude,
              zone.longitude
            );
            
            if (distance <= zone.radius) {
              inAnyZone = true;
              closestZone = zone.name;
              break;
            }
          }
        }

        setIsInZone(inAnyZone);
        setNearestZone(closestZone);

      } catch (error) {
        console.error('Error tracking location:', error);
      }
    };

    // Track location every 15 seconds
    const interval = setInterval(trackLocation, 15000);
    
    // Get initial location
    trackLocation();

    return () => clearInterval(interval);
  }, [isTrackingLocation, checkinZones, onLocationChange, locationAccuracy]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const startTracking = () => {
    setIsTrackingLocation(true);
  };

  const stopTracking = () => {
    setIsTrackingLocation(false);
  };

  const centerOnUser = async () => {
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      updateLocationDisplay(location);
    } catch (error) {
      console.error('Error centering on user:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-96 rounded-lg border border-gray-200 bg-gray-100"
      />

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 space-y-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={centerOnUser}
          className="bg-white/90 backdrop-blur-sm shadow-lg"
        >
          <Crosshair className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant={isTrackingLocation ? "destructive" : "default"}
          onClick={isTrackingLocation ? stopTracking : startTracking}
          className="bg-white/90 backdrop-blur-sm shadow-lg"
        >
          <Navigation className="w-4 h-4" />
        </Button>
      </div>

      {/* Status Overlay */}
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        {/* Zone Status */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            {isInZone ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  In Check-in Zone: {nearestZone}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">
                  Not in Check-in Zone
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tracking Status */}
        {isTrackingLocation && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm font-medium text-blue-700">
                Real-time tracking active
              </span>
            </div>
          </div>
        )}

        {/* Check-in Zones Info */}
        {checkinZones.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                {checkinZones.filter(z => z.isActive).length} Active Check-in Zones
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}