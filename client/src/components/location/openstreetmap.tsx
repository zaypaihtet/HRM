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

interface OpenStreetMapProps {
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
  className?: string;
}

export default function OpenStreetMap({ onLocationChange, className }: OpenStreetMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [map, setMap] = useState<any>(null);
  const [userMarker, setUserMarker] = useState<any>(null);
  const [isInZone, setIsInZone] = useState<boolean>(false);
  const [nearestZone, setNearestZone] = useState<string | null>(null);

  // Fetch check-in zones
  const { data: checkinZones = [] } = useQuery<CheckinZone[]>({
    queryKey: ['/api/checkin-zones'],
  });

  // Initialize OpenStreetMap with Leaflet
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      // Dynamically import Leaflet
      const L = await import('leaflet');
      
      // Create map
      const mapInstance = L.map(mapRef.current).setView([40.7128, -74.0060], 13); // Default to NYC

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstance);

      setMap(mapInstance);

      // Get user's current location
      try {
        const location = await getCurrentLocation();
        const userLatLng: [number, number] = [location.latitude, location.longitude];
        
        // Center map on user location
        mapInstance.setView(userLatLng, 16);
        
        // Add user marker
        const marker = L.marker(userLatLng, {
          icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="background: #3b82f6; border: 3px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(mapInstance);
        
        setUserMarker(marker);
        setCurrentLocation(location);
        
        if (onLocationChange) {
          onLocationChange(location);
        }

        // Set location accuracy
        setLocationAccuracy(location.accuracy || null);
        
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    initMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Add check-in zones to map
  useEffect(() => {
    if (!map || !checkinZones.length) return;

    const L = require('leaflet');
    
    checkinZones.forEach(zone => {
      if (zone.isActive) {
        // Add zone circle
        const circle = L.circle([zone.latitude, zone.longitude], {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.2,
          radius: zone.radius
        }).addTo(map);

        // Add zone marker
        const zoneMarker = L.marker([zone.latitude, zone.longitude], {
          icon: L.divIcon({
            className: 'zone-marker',
            html: `<div style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap;">${zone.name}</div>`,
            iconSize: [100, 30],
            iconAnchor: [50, 15]
          })
        }).addTo(map);
      }
    });
  }, [map, checkinZones]);

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

        // Update user marker position
        if (userMarker && map) {
          const L = require('leaflet');
          userMarker.setLatLng([location.latitude, location.longitude]);
          map.setView([location.latitude, location.longitude], map.getZoom());
        }

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
  }, [isTrackingLocation, userMarker, map, checkinZones, onLocationChange]);

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
      
      if (map) {
        map.setView([location.latitude, location.longitude], 16);
        
        if (userMarker) {
          const L = require('leaflet');
          userMarker.setLatLng([location.latitude, location.longitude]);
        }
      }
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
        {/* Location Status */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">
              {currentLocation 
                ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
                : 'Getting location...'
              }
            </span>
            {locationAccuracy && (
              <Badge variant="outline" className="text-xs">
                ±{Math.round(locationAccuracy)}m
              </Badge>
            )}
          </div>
        </div>

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
      </div>
    </div>
  );
}