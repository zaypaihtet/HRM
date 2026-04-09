import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Target, Navigation, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentLocation } from "@/lib/geolocation";

interface CheckinZone {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
}

interface LeafletMapProps {
  onLocationChange?: (location: { latitude: number; longitude: number }) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  height?: string;
  showCreateZone?: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

export default function LeafletMap({ 
  onLocationChange, 
  onMapClick, 
  className = "", 
  height = "h-96",
  showCreateZone = false 
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [userMarker, setUserMarker] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Fetch check-in zones
  const { data: checkinZones = [] } = useQuery<CheckinZone[]>({
    queryKey: ['/api/checkin-zones'],
  });

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      if (window.L) {
        initializeMap();
        return;
      }

      try {
        // Load Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          // Wait a bit for Leaflet to fully initialize
          setTimeout(initializeMap, 100);
        };
        document.body.appendChild(script);
      } catch (error) {
        console.error('Error loading Leaflet:', error);
        setIsLoading(false);
      }
    };

    loadLeaflet();
  }, []);

  const initializeMap = async () => {
    if (!mapRef.current || map) return;

    try {
      // Get user's current location
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      // Initialize map
      const newMap = window.L.map(mapRef.current).setView([location.latitude, location.longitude], 16);

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(newMap);

      // Add user marker
      const userIcon = window.L.divIcon({
        className: 'user-location-marker',
        html: `<div style="
          width: 20px; 
          height: 20px; 
          background: #3b82f6; 
          border: 3px solid white; 
          border-radius: 50%; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          animation: pulse 2s infinite;
        "></div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = window.L.marker([location.latitude, location.longitude], { icon: userIcon }).addTo(newMap);
      setUserMarker(marker);

      // Add click handler for zone creation
      if (showCreateZone && onMapClick) {
        newMap.on('click', (e: any) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      setMap(newMap);
      setIsLoading(false);

      if (onLocationChange) {
        onLocationChange(location);
      }

    } catch (error) {
      console.error('Error initializing map:', error);
      setIsLoading(false);
    }
  };

  // Add check-in zones to map
  useEffect(() => {
    if (!map || !checkinZones.length) return;

    checkinZones.forEach(zone => {
      if (zone.isActive) {
        // Add zone circle
        const circle = window.L.circle([zone.latitude, zone.longitude], {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.2,
          radius: zone.radius
        }).addTo(map);

        // Add zone label
        const zoneIcon = window.L.divIcon({
          className: 'zone-label',
          html: `<div style="
            background: #10b981; 
            color: white; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 12px; 
            font-weight: bold; 
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          ">${zone.name}</div>`,
          iconSize: [100, 30],
          iconAnchor: [50, 15]
        });

        window.L.marker([zone.latitude, zone.longitude], { icon: zoneIcon }).addTo(map);
      }
    });
  }, [map, checkinZones]);

  // Real-time location tracking
  useEffect(() => {
    if (!isTracking || !map) return;

    const trackLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setCurrentLocation(location);

        if (userMarker) {
          userMarker.setLatLng([location.latitude, location.longitude]);
        }

        if (onLocationChange) {
          onLocationChange(location);
        }
      } catch (error) {
        console.error('Error tracking location:', error);
      }
    };

    const interval = setInterval(trackLocation, 15000);
    trackLocation(); // Initial call

    return () => clearInterval(interval);
  }, [isTracking, map, userMarker, onLocationChange]);

  const startTracking = () => {
    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
  };

  const centerOnUser = async () => {
    if (!map) return;

    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
      map.setView([location.latitude, location.longitude], 16);
      
      if (userMarker) {
        userMarker.setLatLng([location.latitude, location.longitude]);
      }

      if (onLocationChange) {
        onLocationChange(location);
      }
    } catch (error) {
      console.error('Error centering on user:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={`${height} ${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading OpenStreetMap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className={`w-full ${height} rounded-lg border border-gray-200`}
      />

      {/* Controls */}
      <div className="absolute top-4 right-4 space-y-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={centerOnUser}
          className="bg-white/90 backdrop-blur-sm shadow-lg"
          title="Center on my location"
        >
          <Crosshair className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant={isTracking ? "destructive" : "default"}
          onClick={isTracking ? stopTracking : startTracking}
          className="bg-white/90 backdrop-blur-sm shadow-lg"
          title={isTracking ? "Stop tracking" : "Start tracking"}
        >
          <Navigation className="w-4 h-4" />
        </Button>
      </div>

      {/* Location Info */}
      {currentLocation && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">
              {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
            </span>
            {isTracking && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600">Live</span>
              </div>
            )}
          </div>
          
          {showCreateZone && (
            <p className="text-xs text-gray-500 mt-1">
              Click on the map to create a check-in zone
            </p>
          )}
        </div>
      )}

      {/* Zone Info */}
      {checkinZones.length > 0 && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">
              {checkinZones.filter(z => z.isActive).length} Active Zones
            </span>
          </div>
        </div>
      )}
    </div>
  );
}