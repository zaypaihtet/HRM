import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, MapPin, Edit2, Trash2 } from "lucide-react";
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
import LeafletMap from "@/components/location/leaflet-map";

const checkinZoneFormSchema = insertCheckinZoneSchema.extend({
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  radius: z.string().min(1, "Radius is required"),
});

type CheckinZoneFormData = z.infer<typeof checkinZoneFormSchema>;

export default function CheckinZones() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<CheckinZone | null>(null);
  const [showMap, setShowMap] = useState(false);
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

  const createMutation = useMutation({
    mutationFn: async (data: CheckinZoneFormData) => {
      const response = await apiRequest("POST", "/api/checkin-zones", {
        ...data,
        latitude: data.latitude, // Keep as string for decimal precision
        longitude: data.longitude, // Keep as string for decimal precision
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
        latitude: data.latitude, // Keep as string for decimal precision
        longitude: data.longitude, // Keep as string for decimal precision
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
          form.setValue("latitude", position.coords.latitude.toString());
          form.setValue("longitude", position.coords.longitude.toString());
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

  const handleMapClick = (lat: number, lng: number) => {
    form.setValue("latitude", lat.toString());
    form.setValue("longitude", lng.toString());
    toast({
      title: "Location selected",
      description: "Zone location has been set from map",
    });
  };

  return (
    <>
      <Header title="Check-in Zones" subtitle="Manage office locations for employee check-ins" />
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Check-in Zones</h2>
            <p className="text-muted-foreground">Configure allowed locations for employee attendance</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingZone(null);
                form.reset();
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingZone ? "Edit Check-in Zone" : "Create Check-in Zone"}
                </DialogTitle>
                <DialogDescription>
                  Define a geographic zone where employees can check in and out. Click on the map to set location.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Map Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Select Location</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click on the map to set the check-in zone location
                    </p>
                  </div>
                  
                  <LeafletMap 
                    className="w-full"
                    height="h-96"
                    onMapClick={handleMapClick}
                    showCreateZone={true}
                  />
                </div>

                {/* Form Section */}
                <div className="space-y-4">
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
                        <MapPin className="mr-2 h-4 w-4" />
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
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {zones.map((zone) => (
              <Card key={zone.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{zone.name}</CardTitle>
                  <Badge variant={zone.isActive ? "default" : "secondary"}>
                    {zone.isActive ? "Active" : "Inactive"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-3 w-3" />
                      {zone.latitude}, {zone.longitude}
                    </div>
                    <div>Radius: {zone.radius}m</div>
                    <div className="flex justify-end space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(zone)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
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
          </div>
        )}
        
        {zones.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No check-in zones</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first check-in zone to enable location-based attendance tracking.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Zone
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}