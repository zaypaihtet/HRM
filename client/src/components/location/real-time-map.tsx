import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, CheckCircle, AlertTriangle, Navigation, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentLocation } from "@/lib/geolocation";

declare global {
  interface Window {
    google: any;
  }
}

interface RealTimeMapProps {
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

export default function RealTimeMap({ onLocationChange, className = "" }: RealTimeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [userMarker, setUserMarker] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isInZone, setIsInZone] = useState(false);
  const [currentZone, setCurrentZone] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Get check-in zones
  const { data: checkinZones = [] } = useQuery({
    queryKey: ["/api/checkin-zones"],
  });

  // Wait for Google Maps to load
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setMapLoaded(true);
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
          scale: 10,
          fillColor: "#4285F4",
          fillOpacity: 0.8,
          strokeColor: "#ffffff",
          strokeWeight: 3,
          strokeOpacity: 1,
        };

        const marker = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: newMap,
          title: "Your Current Location",
          icon: userIcon,
          animation: window.google.maps.Animation.BOUNCE,
          zIndex: 1000,
        });

        // Stop bounce animation after 2 seconds
        setTimeout(() => {
          marker.setAnimation(null);
        }, 2000);

        setUserMarker(marker);
        setIsLoading(false);

        if (onLocationChange) {
          onLocationChange({ latitude, longitude });
        }

      } catch (err) {
        console.error("Error initializing map:", err);
        setError(err instanceof Error ? err.message : "Failed to load map");
        setIsLoading(false);
      }
    };

    initMap();
  }, [mapLoaded, onLocationChange]);

  // Add check-in zones to map with green circles
  useEffect(() => {
    if (!map || !checkinZones.length || !Array.isArray(checkinZones)) return;

    const circles: any[] = [];
    const markers: any[] = [];

    checkinZones.forEach((zone: CheckinZone) => {
      if (!zone.isActive) return;

      const center = {
        lat: parseFloat(zone.latitude),
        lng: parseFloat(zone.longitude)
      };

      // Create green zone circle
      const circle = new window.google.maps.Circle({
        strokeColor: "#10B981",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: "#10B981",
        fillOpacity: 0.2,
        map: map,
        center: center,
        radius: zone.radius,
        clickable: true,
      });

      circles.push(circle);

      // Create zone center marker
      const zoneMarker = new window.google.maps.Marker({
        position: center,
        map: map,
        title: zone.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#10B981",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        zIndex: 999,
      });

      markers.push(zoneMarker);

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: Arial, sans-serif;">
            <h3 style="margin: 0 0 5px 0; color: #10B981; font-size: 16px; font-weight: bold;">${zone.name}</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">Check-in Zone</p>
            <p style="margin: 5px 0 0 0; color: #888; font-size: 12px;">Radius: ${zone.radius}m</p>
          </div>
        `,
      });

      // Add click listeners
      circle.addListener("click", () => {
        infoWindow.setPosition(center);
        infoWindow.open(map);
      });

      zoneMarker.addListener("click", () => {
        infoWindow.setPosition(center);
        infoWindow.open(map);
      });
    });

    return () => {
      circles.forEach(circle => circle.setMap(null));
      markers.forEach(marker => marker.setMap(null));
    };
  }, [map, checkinZones]);

  // Check if user is in any check-in zone
  useEffect(() => {
    if (!userLocation || !checkinZones.length || !Array.isArray(checkinZones) || !window.google?.maps?.geometry) return;

    let isUserInZone = false;
    let zoneName = "";

    checkinZones.forEach((zone: CheckinZone) => {
      if (!zone.isActive) return;

      const zoneCenter = new window.google.maps.LatLng(
        parseFloat(zone.latitude),
        parseFloat(zone.longitude)
      );
      const userPos = new window.google.maps.LatLng(
        userLocation.latitude,
        userLocation.longitude
      );

      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(userPos, zoneCenter);

      if (distance <= zone.radius) {
        isUserInZone = true;
        zoneName = zone.name;
      }
    });

    setIsInZone(isUserInZone);
    setCurrentZone(zoneName);
  }, [userLocation, checkinZones]);

  // Update user location periodically
  useEffect(() => {
    const updateLocation = async () => {
      try {
        const { latitude, longitude } = await getCurrentLocation();
        setUserLocation({ latitude, longitude });

        if (userMarker) {
          const newPosition = { lat: latitude, lng: longitude };
          userMarker.setPosition(newPosition);
          
          // Animate marker bounce briefly
          userMarker.setAnimation(window.google.maps.Animation.BOUNCE);
          setTimeout(() => {
            userMarker.setAnimation(null);
          }, 1000);
        }

        if (onLocationChange) {
          onLocationChange({ latitude, longitude });
        }
      } catch (err) {
        console.error("Error updating location:", err);
      }
    };

    const interval = setInterval(updateLocation, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, [userMarker, onLocationChange]);

  const centerOnUser = () => {
    if (map && userLocation) {
      map.panTo({ lat: userLocation.latitude, lng: userLocation.longitude });
      map.setZoom(17);
      
      // Animate marker
      if (userMarker) {
        userMarker.setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => {
          userMarker.setAnimation(null);
        }, 1500);
      }
    }
  };

  const toggleMapType = () => {
    if (map) {
      const currentType = map.getMapTypeId();
      map.setMapTypeId(currentType === 'roadmap' ? 'satellite' : 'roadmap');
    }
  };

  if (!mapLoaded || isLoading) {
    return (
      <div className={`bg-gray-100 rounded-2xl ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Loading Google Maps...</p>
            <p className="text-xs text-gray-500 mt-1">Getting your location</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-2xl p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-800">Map Error</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          size="sm" 
          className="mt-3 w-full"
        >
          Reload Map
        </Button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div className="relative overflow-hidden rounded-2xl shadow-lg border border-gray-200">
        <div 
          ref={mapRef} 
          className="w-full h-80 bg-gray-100"
        />
        
        {/* Map Controls */}
        <div className="absolute top-4 right-4 space-y-2">
          <Button
            onClick={centerOnUser}
            size="sm"
            className="w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg border border-gray-200 p-0"
            variant="outline"
          >
            <Target className="w-4 h-4 text-gray-700" />
          </Button>
          <Button
            onClick={toggleMapType}
            size="sm"
            className="w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg border border-gray-200 p-0"
            variant="outline"
          >
            <Navigation className="w-4 h-4 text-gray-700" />
          </Button>
        </div>

        {/* Zone Status Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-gray-200">
            <div className="flex items-center space-x-3">
              {isInZone ? (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800">✓ In Check-in Zone</p>
                    <p className="text-xs text-green-600">{currentZone}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-800">Outside Zone</p>
                    <p className="text-xs text-orange-600">Move closer to check-in area</p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Info */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Live Location</span>
          </div>
          <Badge 
            variant={isInZone ? "default" : "secondary"}
            className={isInZone ? "bg-green-100 text-green-800 border-green-200" : "bg-orange-100 text-orange-800 border-orange-200"}
          >
            {isInZone ? "In Zone" : "Outside"}
          </Badge>
        </div>

        {userLocation && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Coordinates</div>
            <div className="text-sm font-mono text-gray-700">
              {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center">
          📍 Location updates every 15 seconds • Green zones are check-in areas
        </div>
      </div>
    </div>
  );
}