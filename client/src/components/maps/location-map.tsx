import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { useQuery } from "@tanstack/react-query";
import { getCurrentLocation } from "@/lib/geolocation";
import { Loader2, MapPin } from "lucide-react";

interface LocationMapProps {
  className?: string;
  showUserLocation?: boolean;
  showCheckinZones?: boolean;
  height?: string;
}

export default function LocationMap({ 
  className = "", 
  showUserLocation = true, 
  showCheckinZones = true,
  height = "400px"
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userMarker, setUserMarker] = useState<google.maps.Marker | null>(null);
  const [zoneCircles, setZoneCircles] = useState<google.maps.Circle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get checkin zones
  const { data: checkinZones } = useQuery({
    queryKey: ['/api/checkin-zones'],
    enabled: showCheckinZones,
  });

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: "", // We'll use environment variable or public maps
          version: "weekly",
          libraries: ["geometry"]
        });

        await loader.load();

        if (!mapRef.current) return;

        // Default location (fallback)
        let defaultLocation = { lat: 37.7749, lng: -122.4194 }; // San Francisco

        try {
          if (showUserLocation) {
            const userLocation = await getCurrentLocation();
            defaultLocation = {
              lat: userLocation.latitude,
              lng: userLocation.longitude
            };
          }
        } catch (err) {
          console.log("Could not get user location, using default");
        }

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: defaultLocation,
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        });

        setMap(mapInstance);
        setIsLoading(false);

        // Add user location marker
        if (showUserLocation) {
          const marker = new google.maps.Marker({
            position: defaultLocation,
            map: mapInstance,
            title: "Your Location",
            icon: {
              url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12)
            }
          });

          setUserMarker(marker);

          // Update user location every 30 seconds
          const locationInterval = setInterval(async () => {
            try {
              const newLocation = await getCurrentLocation();
              const newPos = {
                lat: newLocation.latitude,
                lng: newLocation.longitude
              };
              marker.setPosition(newPos);
              
              // Optionally recenter map
              // mapInstance.setCenter(newPos);
            } catch (err) {
              console.log("Could not update location");
            }
          }, 30000);

          return () => clearInterval(locationInterval);
        }

      } catch (err) {
        console.error("Error initializing map:", err);
        setError("Could not load map. Using basic location display.");
        setIsLoading(false);
      }
    };

    initMap();
  }, [showUserLocation]);

  // Add checkin zones
  useEffect(() => {
    if (!map || !checkinZones || !showCheckinZones) return;

    // Clear existing circles
    zoneCircles.forEach(circle => circle.setMap(null));
    setZoneCircles([]);

    const newCircles: google.maps.Circle[] = [];

    checkinZones.forEach((zone: any) => {
      if (!zone.isActive) return;

      const center = {
        lat: parseFloat(zone.latitude),
        lng: parseFloat(zone.longitude)
      };

      // Green zone circle
      const circle = new google.maps.Circle({
        strokeColor: "#10B981",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#10B981",
        fillOpacity: 0.2,
        map: map,
        center: center,
        radius: zone.radius, // radius in meters
      });

      // Zone marker
      const marker = new google.maps.Marker({
        position: center,
        map: map,
        title: zone.name,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="14" fill="#10B981" stroke="white" stroke-width="2"/>
              <path d="M12 16L14.5 18.5L20 13" stroke="white" stroke-width="2" fill="none"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 16)
        }
      });

      // Info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; color: #1F2937;">${zone.name}</h3>
            <p style="margin: 0; color: #6B7280; font-size: 14px;">
              Check-in Zone • ${zone.radius}m radius
            </p>
          </div>
        `
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      newCircles.push(circle);
    });

    setZoneCircles(newCircles);
  }, [map, checkinZones, showCheckinZones]);

  // Fallback display when maps can't load
  if (error) {
    return (
      <div 
        className={`flex flex-col items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height }}
      >
        <MapPin className="w-12 h-12 text-gray-400 mb-3" />
        <p className="text-gray-600 text-center px-4">
          Map view unavailable
        </p>
        <p className="text-sm text-gray-500 text-center px-4 mt-1">
          Location services are working in the background
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10"
          style={{ height }}
        >
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        className="w-full rounded-lg border"
        style={{ height }}
      />

      {showCheckinZones && checkinZones && (
        <div className="absolute top-3 left-3 bg-white rounded-lg shadow-md p-2 z-10">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-green-500 rounded-full opacity-60"></div>
            <span className="text-gray-700">Check-in Zones</span>
          </div>
        </div>
      )}

      {showUserLocation && (
        <div className="absolute top-3 right-3 bg-white rounded-lg shadow-md p-2 z-10">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-700">Your Location</span>
          </div>
        </div>
      )}
    </div>
  );
}