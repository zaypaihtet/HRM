import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Clock, Calendar, Save, RotateCcw, CheckCircle2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";

interface WorkingHours {
  id?: number;
  startTime: string;
  endTime: string;
  workDays: number[];
  breakDuration: number;
  isActive: boolean;
  createdBy?: number;
  updatedAt?: string;
}

const DAYS_OF_WEEK = [
  { id: 0, name: "Sunday", short: "Sun" },
  { id: 1, name: "Monday", short: "Mon" },
  { id: 2, name: "Tuesday", short: "Tue" },
  { id: 3, name: "Wednesday", short: "Wed" },
  { id: 4, name: "Thursday", short: "Thu" },
  { id: 5, name: "Friday", short: "Fri" },
  { id: 6, name: "Saturday", short: "Sat" },
];

export default function WorkingHours() {
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("17:00");
  const [breakDuration, setBreakDuration] = useState(60);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // Tue-Sun
  const [isActive, setIsActive] = useState(true);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current working hours
  const { data: workingHours = [], isLoading } = useQuery({
    queryKey: ["/api/working-hours"],
  });

  const currentWorkingHours = Array.isArray(workingHours) && workingHours.length > 0 
    ? workingHours[0] 
    : null;

  // Load current settings when data is available
  useState(() => {
    if (currentWorkingHours) {
      setStartTime(currentWorkingHours.startTime || "09:30");
      setEndTime(currentWorkingHours.endTime || "17:00");
      setBreakDuration(currentWorkingHours.breakDuration || 60);
      setSelectedDays(currentWorkingHours.workDays || [1, 2, 3, 4, 5, 6]);
      setIsActive(currentWorkingHours.isActive !== false);
    }
  });

  // Save working hours mutation
  const saveWorkingHoursMutation = useMutation({
    mutationFn: async (data: Omit<WorkingHours, 'id' | 'createdBy' | 'updatedAt'>) => {
      const response = await apiRequest("POST", "/api/working-hours", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/working-hours"] });
      toast({
        title: "Working Hours Updated",
        description: "New working hours have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save working hours",
        variant: "destructive",
      });
    },
  });

  const handleDayToggle = (dayId: number) => {
    setSelectedDays(prev => 
      prev.includes(dayId)
        ? prev.filter(id => id !== dayId)
        : [...prev, dayId].sort()
    );
  };

  const handleSave = () => {
    if (selectedDays.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one working day.",
        variant: "destructive",
      });
      return;
    }

    if (!startTime || !endTime) {
      toast({
        title: "Error",
        description: "Please set both start and end times.",
        variant: "destructive",
      });
      return;
    }

    saveWorkingHoursMutation.mutate({
      startTime,
      endTime,
      workDays: selectedDays,
      breakDuration,
      isActive,
    });
  };

  const handleReset = () => {
    setStartTime("09:30");
    setEndTime("17:00");
    setBreakDuration(60);
    setSelectedDays([1, 2, 3, 4, 5, 6]);
    setIsActive(true);
  };

  const calculateWorkingHours = () => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0, diffHours - (breakDuration / 60));
  };

  const formatWorkingDays = () => {
    if (selectedDays.length === 0) return "None";
    if (selectedDays.length === 7) return "Every Day";
    
    const dayNames = selectedDays
      .map(id => DAYS_OF_WEEK.find(day => day.id === id)?.short)
      .filter(Boolean);
    
    return dayNames.join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Working Hours Management</h1>
            <p className="text-gray-600 mt-1">Configure shift times and working schedule for all employees</p>
          </div>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Working Hours Configuration */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Shift Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Time Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breakDuration">Break Duration (minutes)</Label>
                  <Input
                    id="breakDuration"
                    type="number"
                    min="0"
                    max="480"
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(Number(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              {/* Working Days */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Working Days</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <Button
                      key={day.id}
                      variant={selectedDays.includes(day.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleDayToggle(day.id)}
                      className="flex flex-col h-16"
                    >
                      <span className="text-xs font-medium">{day.short}</span>
                      <span className="text-xs opacity-80">{day.name.slice(0, 3)}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Active Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Schedule Status</Label>
                  <p className="text-sm text-gray-600">
                    Enable or disable this working hours schedule
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button 
                  onClick={handleSave}
                  disabled={saveWorkingHoursMutation.isPending}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveWorkingHoursMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview & Summary */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Schedule Preview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Working Hours Summary */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">
                    {calculateWorkingHours().toFixed(1)} hrs
                  </div>
                  <div className="text-sm text-blue-700">Daily Working Hours</div>
                </div>
              </div>

              {/* Schedule Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Start Time:</span>
                  <span className="font-medium">{startTime || "--:--"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">End Time:</span>
                  <span className="font-medium">{endTime || "--:--"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Break:</span>
                  <span className="font-medium">{breakDuration} min</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600">Working Days:</span>
                  <span className="font-medium text-right text-sm">{formatWorkingDays()}</span>
                </div>
              </div>

              <Separator />

              {/* Weekly Summary */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-900">
                    {(calculateWorkingHours() * selectedDays.length).toFixed(1)} hrs
                  </div>
                  <div className="text-sm text-green-700">Total Weekly Hours</div>
                </div>
              </div>

              {/* Current Status */}
              {currentWorkingHours && (
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">Current Schedule</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Last updated: {currentWorkingHours.updatedAt 
                      ? new Date(currentWorkingHours.updatedAt).toLocaleDateString()
                      : "Unknown"
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}