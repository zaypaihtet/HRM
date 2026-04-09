import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader } from "@googlemaps/js-api-loader";
import { Plus, MapPin, Edit2, Trash2, Target, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertCheckinZoneSchema, type CheckinZone } from "@shared/schema";
import Header from "@/components/layout/header";

const checkinZoneFormSchema = insertCheckinZoneSchema.extend({
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  radius: z.string().min(1, "Radius is required"),
});

type CheckinZoneFormData = z.infer<typeof checkinZoneFormSchema>;

export default function CheckinZonesMap() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<CheckinZone | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const { toast } = useToast();

  const { data: zones = [], isLoading } = useQuery<CheckinZone[]>({
    queryKey: ["/api/checkin-zones"],
  });

  const form = useForm<CheckinZoneFormData>({
    resolver: zodResolver(checkinZoneFormSchema),
    defaultValues: {
      name: "",
      latitude: "",
      longitude: "",
      radius: "",
      isActive: true,
    },
  });

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      const loader = new Loader({
        apiKey: "YOUR_GOOGLE_MAPS_API_KEY", // In production, this should come from environment
        version: "weekly",
      });

      try {
        await loader.load();
        
        if (mapRef.current && !mapInstance.current) {
          // Get user's current location
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const userLocation = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                setCurrentLocation(userLocation);
                initializeMap(userLocation);
              },
              () => {
                // Default to San Francisco if location access denied
                const defaultLocation = { lat: 37.7749, lng: -122.4194 };
                setCurrentLocation(defaultLocation);
                initializeMap(defaultLocation);
              }
            );
          }
        }
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        toast({
          title: "Maps Error",
          description: "Unable to load Google Maps. Check your API key.",
          variant: "destructive",
        });
      }
    };

    const initializeMap = (center: { lat: number; lng: number }) => {
      if (!mapRef.current) return;

      mapInstance.current = new google.maps.Map(mapRef.current, {
        zoom: 15,
        center,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
      });

      // Add current location marker
      new google.maps.Marker({
        position: center,
        map: mapInstance.current,
        title: "Your Current Location",
        icon: {
          url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%234285f4'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3C/svg%3E",
          scaledSize: new google.maps.Size(24, 24),
        },
      });

      // Add click listener to add new zones
      mapInstance.current.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          form.setValue("latitude", lat.toString());
          form.setValue("longitude", lng.toString());
          if (!form.getValues("radius")) {
            form.setValue("radius", "100");
          }
          setIsDialogOpen(true);
        }
      });
    };

    initMap();
  }, []);

  // Update map markers when zones change
  useEffect(() => {
    if (!mapInstance.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for each zone
    zones.forEach(zone => {
      const marker = new google.maps.Marker({
        position: {
          lat: parseFloat(zone.latitude),
          lng: parseFloat(zone.longitude),
        },
        map: mapInstance.current,
        title: zone.name,
        icon: {
          url: zone.isActive 
            ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%2316a34a'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E"
            : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
          scaledSize: new google.maps.Size(32, 32),
        },
      });

      // Add circle to show the zone radius
      const circle = new google.maps.Circle({
        strokeColor: zone.isActive ? "#16a34a" : "#dc2626",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: zone.isActive ? "#16a34a" : "#dc2626",
        fillOpacity: 0.15,
        map: mapInstance.current,
        center: {
          lat: parseFloat(zone.latitude),
          lng: parseFloat(zone.longitude),
        },
        radius: zone.radius,
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${zone.name}</h3>
            <p style="margin: 0; font-size: 14px;">Radius: ${zone.radius}m</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: ${zone.isActive ? '#16a34a' : '#dc2626'};">
              ${zone.isActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        `,
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstance.current, marker);
      });

      markersRef.current.push(marker);
    });
  }, [zones]);

  const createMutation = useMutation({
    mutationFn: async (data: CheckinZoneFormData) => {
      const response = await apiRequest("POST", "/api/checkin-zones", {
        ...data,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        radius: parseInt(data.radius),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Check-in zone created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/checkin-zones"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create check-in zone",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CheckinZoneFormData }) => {
      const response = await apiRequest("PUT", `/api/checkin-zones/${id}`, {
        ...data,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        radius: parseInt(data.radius),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Check-in zone updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/checkin-zones"] });
      setIsDialogOpen(false);
      setEditingZone(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update check-in zone",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/checkin-zones/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Check-in zone deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/checkin-zones"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete check-in zone",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CheckinZoneFormData) => {
    if (editingZone) {
      updateMutation.mutate({ id: editingZone.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (zone: CheckinZone) => {
    setEditingZone(zone);
    form.reset({
      name: zone.name,
      latitude: zone.latitude.toString(),
      longitude: zone.longitude.toString(),
      radius: zone.radius.toString(),
      isActive: zone.isActive || true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this check-in zone?")) {
      deleteMutation.mutate(id);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toString();
          const lng = position.coords.longitude.toString();
          form.setValue("latitude", lat);
          form.setValue("longitude", lng);
          
          // Pan map to current location
          if (mapInstance.current) {
            mapInstance.current.panTo({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
          
          toast({
            title: "Location detected",
            description: "Current location has been set",
          });
        },
        (error) => {
          toast({
            title: "Location error",
            description: "Unable to get current location",
            variant: "destructive",
          });
        }
      );
    }
  };

  return (
    <>
      <Header title="Check-in Zones with Maps" subtitle="Manage office locations with real-time map visualization" />
      
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="mr-2 h-5 w-5" />
                  Interactive Map
                </CardTitle>
                <CardDescription>
                  Click on the map to add new check-in zones. Green zones are active, red zones are inactive.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  ref={mapRef}
                  className="w-full h-96 rounded-lg border"
                  style={{ minHeight: "400px" }}
                />
                {!currentLocation && (
                  <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Loading map...</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Zones List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Active Zones</h3>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => {
                    setEditingZone(null);
                    form.reset();
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Zone
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingZone ? "Edit Check-in Zone" : "Create Check-in Zone"}
                    </DialogTitle>
                    <DialogDescription>
                      Define a geographic zone where employees can check in and out.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zone Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Main Office" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="latitude"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Latitude</FormLabel>
                              <FormControl>
                                <Input placeholder="37.7749" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="longitude"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Longitude</FormLabel>
                              <FormControl>
                                <Input placeholder="-122.4194" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <Button type="button" variant="outline" onClick={getCurrentLocation} className="w-full">
                        <Navigation className="mr-2 h-4 w-4" />
                        Use Current Location
                      </Button>
                      
                      <FormField
                        control={form.control}
                        name="radius"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Radius (meters)</FormLabel>
                            <FormControl>
                              <Input placeholder="100" type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                          {editingZone ? "Update" : "Create"} Zone
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {zones.map((zone) => (
                  <Card key={zone.id} className="border-l-4" style={{
                    borderLeftColor: zone.isActive ? "#16a34a" : "#dc2626"
                  }}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{zone.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {zone.radius}m radius
                          </p>
                          <div className="flex items-center mt-1">
                            <Target className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {parseFloat(zone.latitude).toFixed(4)}, {parseFloat(zone.longitude).toFixed(4)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Badge variant={zone.isActive ? "default" : "secondary"} className="text-xs">
                            {zone.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(zone)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(zone.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {zones.length === 0 && (
                  <Card className="text-center p-6">
                    <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No zones yet</p>
                    <p className="text-xs text-muted-foreground">Click on the map to add one</p>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}