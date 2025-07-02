import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentLocation } from "@/lib/geolocation";

interface GoogleMapsLocationProps {
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
  showCheckinZones?: boolean;
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

export default function GoogleMapsLocation({ 
  onLocationChange, 
  showCheckinZones = true,
  className = "" 
}: GoogleMapsLocationProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isInZone, setIsInZone] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get check-in zones
  const { data: checkinZones = [] } = useQuery({
    queryKey: ["/api/checkin-zones"],
    enabled: showCheckinZones,
  });

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        // Check if Google Maps is loaded
        if (!window.google) {
          throw new Error("Google Maps not loaded");
        }

        const { latitude, longitude } = await getCurrentLocation();
        setUserLocation({ latitude, longitude });

        if (!mapRef.current) return;

        const mapOptions: google.maps.MapOptions = {
          center: { lat: latitude, lng: longitude },
          zoom: 16,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        };

        const newMap = new window.google.maps.Map(mapRef.current, mapOptions);
        setMap(newMap);

        // Create user location marker
        const marker = new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map: newMap,
          title: "Your Location",
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        setUserMarker(marker);
        setIsLoading(false);

        // Call location change callback
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
  }, [onLocationChange]);

  // Add check-in zones to map
  useEffect(() => {
    if (!map || !checkinZones.length) return;

    const circles: google.maps.Circle[] = [];

    checkinZones.forEach((zone: CheckinZone) => {
      if (!zone.isActive) return;

      const center = {
        lat: parseFloat(zone.latitude),
        lng: parseFloat(zone.longitude)
      };

      // Create zone circle
      const circle = new window.google.maps.Circle({
        strokeColor: "#22c55e",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#22c55e",
        fillOpacity: 0.2,
        map: map,
        center: center,
        radius: zone.radius,
      });

      circles.push(circle);

      // Create zone marker
      new window.google.maps.Marker({
        position: center,
        map: map,
        title: zone.name,
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 1,
        },
      });

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold text-gray-800">${zone.name}</h3>
            <p class="text-sm text-gray-600">Check-in Zone</p>
            <p class="text-xs text-gray-500">Radius: ${zone.radius}m</p>
          </div>
        `,
      });

      circle.addListener("click", () => {
        infoWindow.setPosition(center);
        infoWindow.open(map);
      });
    });

    return () => {
      circles.forEach(circle => circle.setMap(null));
    };
  }, [map, checkinZones]);

  // Check if user is in any check-in zone
  useEffect(() => {
    if (!userLocation || !checkinZones.length) return;

    const isUserInZone = checkinZones.some((zone: CheckinZone) => {
      if (!zone.isActive) return false;

      const zoneCenter = {
        lat: parseFloat(zone.latitude),
        lng: parseFloat(zone.longitude)
      };

      const distance = window.google?.maps?.geometry?.spherical?.computeDistanceBetween(
        new window.google.maps.LatLng(userLocation.latitude, userLocation.longitude),
        new window.google.maps.LatLng(zoneCenter.lat, zoneCenter.lng)
      );

      return distance <= zone.radius;
    });

    setIsInZone(isUserInZone);
  }, [userLocation, checkinZones]);

  // Update user location periodically
  useEffect(() => {
    const updateLocation = async () => {
      try {
        const { latitude, longitude } = await getCurrentLocation();
        setUserLocation({ latitude, longitude });

        if (userMarker) {
          userMarker.setPosition({ lat: latitude, lng: longitude });
        }

        if (map) {
          map.panTo({ lat: latitude, lng: longitude });
        }

        if (onLocationChange) {
          onLocationChange({ latitude, longitude });
        }
      } catch (err) {
        console.error("Error updating location:", err);
      }
    };

    const interval = setInterval(updateLocation, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [map, userMarker, onLocationChange]);

  const centerOnUser = () => {
    if (map && userLocation) {
      map.panTo({ lat: userLocation.latitude, lng: userLocation.longitude });
      map.setZoom(16);
    }
  };

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <h3 className="font-medium text-red-800">Map Error</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
        <Button 
          onClick={() => window.location.reload()} 
          size="sm" 
          className="mt-3"
        >
          Reload Map
        </Button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-64 rounded-lg border border-gray-200 bg-gray-100"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>

      {/* Location Status */}
      {!isLoading && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Current Location</span>
            </div>
            <Button onClick={centerOnUser} size="sm" variant="outline">
              Center Map
            </Button>
          </div>

          {showCheckinZones && (
            <div className="flex items-center space-x-2">
              {isInZone ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    In Check-in Zone
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                    Outside Check-in Zone
                  </Badge>
                </>
              )}
            </div>
          )}

          {userLocation && (
            <div className="text-xs text-gray-500 font-mono">
              {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}