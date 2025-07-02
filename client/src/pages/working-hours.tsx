import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Clock, Settings, Save, Calendar, Users } from "lucide-react";
import Header from "@/components/layout/header";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const workingHoursSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  workDays: z.array(z.number()).min(1, "At least one work day must be selected"),
  breakDuration: z.number().min(0).max(480), // Max 8 hours
});

type WorkingHoursFormData = z.infer<typeof workingHoursSchema>;

const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', short: 'Sun' },
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

export default function WorkingHours() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current working hours
  const { data: workingHours, isLoading } = useQuery({
    queryKey: ['/api/working-hours'],
  });

  const currentConfig = workingHours?.[0] || {
    startTime: "09:30",
    endTime: "17:00",
    workDays: "2,3,4,5,6,0",
    breakDuration: 60
  };

  const form = useForm<WorkingHoursFormData>({
    resolver: zodResolver(workingHoursSchema),
    defaultValues: {
      startTime: currentConfig.startTime,
      endTime: currentConfig.endTime,
      workDays: currentConfig.workDays.split(',').map(Number),
      breakDuration: currentConfig.breakDuration || 60,
    },
  });

  // Update working hours mutation
  const updateWorkingHoursMutation = useMutation({
    mutationFn: async (data: WorkingHoursFormData) => {
      const payload = {
        ...data,
        workDays: data.workDays.join(','),
        createdBy: user?.id,
      };
      
      const response = await apiRequest("POST", "/api/working-hours", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/working-hours'] });
      toast({
        title: "Working hours updated",
        description: "The new working hours configuration has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update working hours",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkingHoursFormData) => {
    updateWorkingHoursMutation.mutate(data);
  };

  const calculateWorkHours = () => {
    const start = form.watch('startTime');
    const end = form.watch('endTime');
    const breakMinutes = form.watch('breakDuration');
    
    if (start && end) {
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      
      const startTotalMinutes = startHour * 60 + startMin;
      const endTotalMinutes = endHour * 60 + endMin;
      
      const workMinutes = endTotalMinutes - startTotalMinutes - (breakMinutes || 0);
      const workHours = (workMinutes / 60).toFixed(1);
      
      return `${workHours} hours`;
    }
    return '0 hours';
  };

  const selectedDays = form.watch('workDays') || [];

  return (
    <>
      <Header 
        title="Working Hours Configuration" 
        subtitle="Manage company working hours and schedules" 
      />
      
      <div className="space-y-6">
        {/* Current Configuration Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Current Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Work Schedule</Label>
                <div className="text-lg font-semibold">
                  {currentConfig.startTime} - {currentConfig.endTime}
                </div>
                <p className="text-sm text-gray-500">
                  Daily working hours: {calculateWorkHours()}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Work Days</Label>
                <div className="flex flex-wrap gap-1">
                  {currentConfig.workDays.split(',').map((dayId: string) => {
                    const day = DAYS_OF_WEEK.find(d => d.id === parseInt(dayId));
                    return day ? (
                      <Badge key={dayId} variant="default" className="text-xs">
                        {day.short}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-600">Break Duration</Label>
                <div className="text-lg font-semibold">
                  {currentConfig.breakDuration} minutes
                </div>
                <p className="text-sm text-gray-500">
                  {(currentConfig.breakDuration / 60).toFixed(1)} hours break
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Update Working Hours</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Time Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field}
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Break Duration */}
                <FormField
                  control={form.control}
                  name="breakDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Break Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="480"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className="w-full md:w-48"
                        />
                      </FormControl>
                      <p className="text-sm text-gray-500">
                        Lunch break and other breaks (0-480 minutes)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Work Days Selection */}
                <FormField
                  control={form.control}
                  name="workDays"
                  render={() => (
                    <FormItem>
                      <FormLabel>Work Days</FormLabel>
                      <div className="grid grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <FormField
                            key={day.id}
                            control={form.control}
                            name="workDays"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={day.id}
                                  className="flex flex-col items-center space-y-2"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day.id)}
                                      onCheckedChange={(checked) => {
                                        const updatedDays = checked
                                          ? [...(field.value || []), day.id]
                                          : (field.value || []).filter((value) => value !== day.id);
                                        field.onChange(updatedDays);
                                      }}
                                    />
                                  </FormControl>
                                  <Label className="text-xs text-center">
                                    {day.short}
                                  </Label>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-500">
                        Select the days employees are expected to work
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Summary */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Configuration Summary</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p>
                      <strong>Schedule:</strong> {form.watch('startTime')} - {form.watch('endTime')}
                    </p>
                    <p>
                      <strong>Daily Hours:</strong> {calculateWorkHours()}
                    </p>
                    <p>
                      <strong>Work Days:</strong> {selectedDays.length} days per week
                    </p>
                    <p>
                      <strong>Weekly Hours:</strong> {(parseFloat(calculateWorkHours()) * selectedDays.length).toFixed(1)} hours
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center space-x-4">
                  <Button 
                    type="submit"
                    disabled={updateWorkingHoursMutation.isPending}
                    className="flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {updateWorkingHoursMutation.isPending ? 'Saving...' : 'Save Configuration'}
                    </span>
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Impact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Implementation Notes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <Calendar className="w-4 h-4 mt-1 text-blue-500" />
                <p>
                  <strong>Real-time Effect:</strong> Changes take effect immediately for all employees using the mobile app
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Clock className="w-4 h-4 mt-1 text-green-500" />
                <p>
                  <strong>Check-in Rules:</strong> Employees can only check in during configured working hours and work days
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <Users className="w-4 h-4 mt-1 text-purple-500" />
                <p>
                  <strong>Employee Notification:</strong> Employees will see the updated schedule on their mobile interface
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}