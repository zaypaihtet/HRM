import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, CheckCircle, AlertTriangle, Navigation, Target, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentLocation } from "@/lib/geolocation";

declare global {
  interface Window {
    google: any;
  }
}

interface GoogleMapsProps {
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
  className?: string;
}

interface CheckinZone {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  radius: number;
  isActive: boolean;
}

export default function GoogleMaps({ onLocationChange, className = "" }: GoogleMapsProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [userMarker, setUserMarker] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isInZone, setIsInZone] = useState(false);
  const [currentZone, setCurrentZone] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locationUpdateCount, setLocationUpdateCount] = useState(0);

  // Get check-in zones
  const { data: checkinZones = [] } = useQuery({
    queryKey: ["/api/checkin-zones"],
  });

  // Wait for Google Maps to load
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setMapLoaded(true);
        setError(null);
        return;
      }
      setTimeout(checkGoogleMaps, 100);
    };
    checkGoogleMaps();
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const initMap = async () => {
      try {
        setIsLoading(true);
        const { latitude, longitude } = await getCurrentLocation();
        setUserLocation({ latitude, longitude });

        const mapOptions = {
          center: { lat: latitude, lng: longitude },
          zoom: 17,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          gestureHandling: 'cooperative',
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
          ]
        };

        const newMap = new window.google.maps.Map(mapRef.current, mapOptions);
        setMap(newMap);

        // Create user location marker with pulsing animation
        const userIcon = {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#4285F4",
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 4,
          strokeOpacity: 1,
        };

        const newUserMarker = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: newMap,
          icon: userIcon,
          title: "Your Location",
          zIndex: 1000,
        });

        setUserMarker(newUserMarker);

        // Add check-in zones
        if (Array.isArray(checkinZones)) {
          checkinZones.forEach((zone: CheckinZone) => {
            if (zone.isActive) {
              const circle = new window.google.maps.Circle({
                strokeColor: "#10B981",
                strokeOpacity: 0.8,
                strokeWeight: 3,
                fillColor: "#10B981",
                fillOpacity: 0.2,
                map: newMap,
                center: { lat: parseFloat(zone.latitude), lng: parseFloat(zone.longitude) },
                radius: zone.radius,
              });

              // Add zone label
              const zoneMarker = new window.google.maps.Marker({
                position: { lat: parseFloat(zone.latitude), lng: parseFloat(zone.longitude) },
                map: newMap,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "#10B981",
                  fillOpacity: 1,
                  strokeColor: "#ffffff",
                  strokeWeight: 2,
                },
                title: zone.name,
                zIndex: 500,
              });

              // Create info window for zone
              const infoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="padding: 8px; font-family: system-ui;">
                    <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #10B981;">
                      ${zone.name}
                    </h3>
                    <p style="margin: 0; font-size: 12px; color: #6B7280;">
                      Check-in Zone • ${zone.radius}m radius
                    </p>
                  </div>
                `,
              });

              zoneMarker.addListener("click", () => {
                infoWindow.open(newMap, zoneMarker);
              });
            }
          });
        }

        onLocationChange?.({ latitude, longitude });
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setError("Failed to get your location. Please enable location services.");
        setIsLoading(false);
      }
    };

    initMap();
  }, [mapLoaded, checkinZones]);

  // Real-time location updates
  useEffect(() => {
    if (!map || !userMarker) return;

    const updateUserLocation = async () => {
      try {
        const { latitude, longitude } = await getCurrentLocation();
        const newPosition = { lat: latitude, lng: longitude };

        // Update marker position with smooth animation
        userMarker.setPosition(newPosition);
        
        // Check if user is in any check-in zone
        let inZone = false;
        let zoneName = "";

        if (Array.isArray(checkinZones)) {
          checkinZones.forEach((zone: CheckinZone) => {
            if (zone.isActive) {
              const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
                newPosition,
                new window.google.maps.LatLng(parseFloat(zone.latitude), parseFloat(zone.longitude))
              );

              if (distance <= zone.radius) {
                inZone = true;
                zoneName = zone.name;
              }
            }
          });
        }

        setIsInZone(inZone);
        setCurrentZone(zoneName);
        setUserLocation({ latitude, longitude });
        setLocationUpdateCount(prev => prev + 1);
        onLocationChange?.({ latitude, longitude });
      } catch (error) {
        console.error("Failed to update location:", error);
      }
    };

    // Update location every 15 seconds
    const locationInterval = setInterval(updateUserLocation, 15000);
    return () => clearInterval(locationInterval);
  }, [map, userMarker, checkinZones, onLocationChange]);

  // Center map on user location
  const centerOnUser = () => {
    if (map && userLocation) {
      map.setCenter({ lat: userLocation.latitude, lng: userLocation.longitude });
      map.setZoom(18);
    }
  };

  if (!mapLoaded || isLoading) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 text-center border border-blue-100 ${className}`}>
        <Loader2 className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
        <h3 className="font-medium text-blue-900 mb-2">Loading Google Maps</h3>
        <p className="text-sm text-blue-700">Initializing real-time location tracking...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-8 text-center border border-red-100 ${className}`}>
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="font-medium text-red-900 mb-2">Maps Error</h3>
        <p className="text-sm text-red-700 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} size="sm" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Location Status */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Navigation className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Live Location Tracking</h3>
              <p className="text-sm text-gray-600">Updated {locationUpdateCount} times</p>
            </div>
          </div>
          <Button onClick={centerOnUser} size="sm" variant="outline">
            <Crosshair className="w-4 h-4 mr-1" />
            Center
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isInZone ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></div>
            <span className="text-sm font-medium">
              {isInZone ? `In ${currentZone}` : 'Outside check-in zones'}
            </span>
          </div>
          <Badge variant={isInZone ? "default" : "secondary"} className={isInZone ? "bg-green-100 text-green-800 border-green-200" : ""}>
            {isInZone ? "Can Check In" : "Location Required"}
          </Badge>
        </div>

        {userLocation && (
          <div className="mt-3 text-xs text-gray-500 space-y-1 font-mono">
            <p>Lat: {userLocation.latitude.toFixed(6)}</p>
            <p>Lng: {userLocation.longitude.toFixed(6)}</p>
          </div>
        )}
      </div>

      {/* Google Maps Container */}
      <div className="relative bg-white rounded-xl overflow-hidden shadow-sm border">
        <div 
          ref={mapRef} 
          className="w-full h-80"
          style={{ minHeight: '320px' }}
        />
        
        {/* Map Controls Overlay */}
        <div className="absolute top-4 right-4 space-y-2">
          <Button onClick={centerOnUser} size="sm" className="bg-white text-gray-700 hover:bg-gray-50 shadow-lg">
            <Target className="w-4 h-4" />
          </Button>
        </div>

        {/* Zone Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg p-3 shadow-lg border">
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Your Location</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full opacity-60"></div>
              <span>Check-in Zones</span>
            </div>
          </div>
        </div>
      </div>

      {/* Check-in Zones List */}
      {Array.isArray(checkinZones) && checkinZones.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-green-600" />
            Check-in Zones ({checkinZones.filter((z: CheckinZone) => z.isActive).length})
          </h3>
          <div className="space-y-2">
            {checkinZones.filter((z: CheckinZone) => z.isActive).map((zone: CheckinZone) => (
              <div key={zone.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm text-gray-900">{zone.name}</p>
                  <p className="text-xs text-gray-600">{zone.radius}m radius</p>
                </div>
                {currentZone === zone.name && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}