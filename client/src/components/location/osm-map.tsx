import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Navigation, Target, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentLocation } from '@/lib/geolocation';
import { isLocationInGeofence } from '@/lib/geofence';

interface OSMMapProps {
  className?: string;
  showCheckinZones?: boolean;
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  onZoneStatusChange?: (isInZone: boolean, zoneName?: string) => void;
}

interface MapLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface CheckinZone {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  radius: number;
  isActive: boolean;
}

export default function OSMMap({ 
  className = "", 
  showCheckinZones = true,
  onLocationChange,
  onZoneStatusChange 
}: OSMMapProps) {
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isInZone, setIsInZone] = useState<boolean | null>(null);
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<MapLocation>({ lat: 16.8616299, lng: 96.1222073 }); // Default to Myanmar coordinates
  const [zoom, setZoom] = useState(15);
  const mapRef = useRef<HTMLDivElement>(null);

  // Get checkin zones
  const { data: checkinZones = [] } = useQuery<CheckinZone[]>({
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
        const newLocation = {
          lat: location.latitude,
          lng: location.longitude,
          accuracy: location.accuracy
        };
        
        setCurrentLocation(newLocation);
        setMapCenter(newLocation);
        
        // Check if user is in any check-in zone
        let inZone = false;
        let zoneName = null;
        
        if (showCheckinZones && checkinZones.length > 0) {
          for (const zone of checkinZones) {
            const isInThisZone = isLocationInGeofence(
              { latitude: location.latitude, longitude: location.longitude },
              {
                center: {
                  latitude: parseFloat(zone.latitude),
                  longitude: parseFloat(zone.longitude)
                },
                radius: zone.radius,
                name: zone.name
              }
            );
            
            if (isInThisZone) {
              inZone = true;
              zoneName = zone.name;
              break;
            }
          }
        }
        
        setIsInZone(inZone);
        setCurrentZone(zoneName);
        
        // Notify parent components
        onLocationChange?.(newLocation);
        onZoneStatusChange?.(inZone, zoneName || undefined);
        
      } catch (error) {
        setLocationError("Unable to get location");
        setCurrentLocation(null);
        setIsInZone(null);
        setCurrentZone(null);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    updateLocation();
    const locationTimer = setInterval(updateLocation, 15000); // Update every 15 seconds
    return () => clearInterval(locationTimer);
  }, [checkinZones, showCheckinZones, onLocationChange, onZoneStatusChange]);

  // Initialize OpenStreetMap
  useEffect(() => {
    if (!mapRef.current) return;

    // Create map container
    const mapContainer = mapRef.current;
    mapContainer.innerHTML = '';

    // Create OSM map using Leaflet-like implementation
    const createOSMMap = () => {
      const mapDiv = document.createElement('div');
      mapDiv.className = 'osm-map-container';
      mapDiv.style.cssText = `
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        background: #f0f0f0;
        border-radius: 12px;
      `;

      // Create tile layer
      const createTileLayer = () => {
        const tileSize = 256;
        const maxZoom = 18;
        
        const tilesContainer = document.createElement('div');
        tilesContainer.className = 'tiles-container';
        tilesContainer.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transform-origin: 0 0;
        `;

        const loadTiles = (center: MapLocation, zoom: number) => {
          tilesContainer.innerHTML = '';
          
          const scale = Math.pow(2, zoom);
          const tileX = Math.floor((center.lng + 180) / 360 * scale);
          const tileY = Math.floor((1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * scale);
          
          // Load surrounding tiles
          for (let x = tileX - 1; x <= tileX + 1; x++) {
            for (let y = tileY - 1; y <= tileY + 1; y++) {
              const tile = document.createElement('img');
              tile.src = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
              tile.style.cssText = `
                position: absolute;
                width: ${tileSize}px;
                height: ${tileSize}px;
                left: ${(x - tileX) * tileSize + mapContainer.offsetWidth / 2 - tileSize / 2}px;
                top: ${(y - tileY) * tileSize + mapContainer.offsetHeight / 2 - tileSize / 2}px;
                opacity: 0;
                transition: opacity 0.3s ease;
              `;
              
              tile.onload = () => {
                tile.style.opacity = '1';
              };
              
              tile.onerror = () => {
                tile.style.backgroundColor = '#e0e0e0';
                tile.style.border = '1px solid #ccc';
              };
              
              tilesContainer.appendChild(tile);
            }
          }
        };

        loadTiles(mapCenter, zoom);
        return { tilesContainer, loadTiles };
      };

      const { tilesContainer, loadTiles } = createTileLayer();
      mapDiv.appendChild(tilesContainer);

      // Create markers layer
      const markersContainer = document.createElement('div');
      markersContainer.className = 'markers-container';
      markersContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      `;

      const addMarker = (location: MapLocation, type: 'user' | 'zone', label?: string) => {
        const marker = document.createElement('div');
        marker.className = `marker marker-${type}`;
        
        if (type === 'user') {
          marker.innerHTML = `
            <div class="user-marker">
              <div class="user-marker-dot"></div>
              <div class="user-marker-pulse"></div>
            </div>
          `;
          marker.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
          `;
        } else if (type === 'zone') {
          marker.innerHTML = `
            <div class="zone-marker">
              <div class="zone-marker-center"></div>
              <div class="zone-marker-ring"></div>
              ${label ? `<div class="zone-marker-label">${label}</div>` : ''}
            </div>
          `;
          
          // Calculate position based on lat/lng
          const x = mapContainer.offsetWidth / 2;
          const y = mapContainer.offsetHeight / 2;
          
          marker.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            transform: translate(-50%, -50%);
            z-index: 999;
          `;
        }
        
        markersContainer.appendChild(marker);
        return marker;
      };

      mapDiv.appendChild(markersContainer);

      // Add current location marker
      if (currentLocation) {
        addMarker(currentLocation, 'user');
      }

      // Add zone markers
      if (showCheckinZones && checkinZones.length > 0) {
        checkinZones.forEach(zone => {
          if (zone.isActive) {
            addMarker(
              { lat: parseFloat(zone.latitude), lng: parseFloat(zone.longitude) },
              'zone',
              zone.name
            );
          }
        });
      }

      // Update tiles when location changes
      if (currentLocation) {
        loadTiles(currentLocation, zoom);
      }

      return mapDiv;
    };

    const map = createOSMMap();
    mapContainer.appendChild(map);

    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
      .user-marker-dot {
        width: 16px;
        height: 16px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }
      
      .user-marker-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 32px;
        height: 32px;
        background: #3b82f6;
        border-radius: 50%;
        opacity: 0.3;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.3; }
        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.1; }
        100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
      }
      
      .zone-marker-center {
        width: 12px;
        height: 12px;
        background: #10b981;
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      }
      
      .zone-marker-ring {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        border: 2px solid #10b981;
        border-radius: 50%;
        opacity: 0.5;
        background: rgba(16, 185, 129, 0.1);
      }
      
      .zone-marker-label {
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: #10b981;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .zone-marker-label:after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-top: 4px solid #10b981;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, [currentLocation, checkinZones, showCheckinZones, mapCenter, zoom]);

  const centerOnLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const location = await getCurrentLocation();
      setMapCenter({ lat: location.latitude, lng: location.longitude });
    } catch (error) {
      setLocationError("Unable to center on location");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  return (
    <div className={`osm-map-wrapper ${className}`}>
      {/* Location Status */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">Current Location</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={centerOnLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {locationError ? (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{locationError}</span>
          </div>
        ) : currentLocation ? (
          <div className="text-sm text-gray-600">
            {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
            {currentLocation.accuracy && (
              <span className="ml-2 text-xs text-gray-500">
                (±{Math.round(currentLocation.accuracy)}m)
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Getting location...</span>
          </div>
        )}
      </div>

      {/* Zone Status */}
      {showCheckinZones && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-4"
          >
            {isInZone === null ? (
              <Badge variant="outline" className="w-full justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Checking zones...
              </Badge>
            ) : isInZone ? (
              <Badge variant="default" className="w-full justify-center py-2 bg-green-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                In Check-in Zone: {currentZone}
              </Badge>
            ) : (
              <Badge variant="destructive" className="w-full justify-center py-2">
                <AlertCircle className="w-4 h-4 mr-2" />
                Not in Check-in Zone
              </Badge>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Map Container */}
      <div className="relative">
        <div 
          ref={mapRef}
          className="w-full h-64 bg-gray-100 rounded-lg border shadow-sm"
        />
        
        {/* Map Controls */}
        <div className="absolute top-2 right-2 flex flex-col space-y-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.min(zoom + 1, 18))}
            className="w-8 h-8 p-0"
          >
            +
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.max(zoom - 1, 10))}
            className="w-8 h-8 p-0"
          >
            -
          </Button>
        </div>
        
        {/* Location Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={centerOnLocation}
          disabled={isLoadingLocation}
          className="absolute bottom-2 right-2"
        >
          {isLoadingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Zone Legend */}
      {showCheckinZones && checkinZones.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Check-in Zones</h4>
          <div className="space-y-1">
            {checkinZones.filter(zone => zone.isActive).map((zone) => (
              <div key={zone.id} className="flex items-center space-x-2 text-sm">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>{zone.name}</span>
                <span className="text-gray-500">({zone.radius}m radius)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}