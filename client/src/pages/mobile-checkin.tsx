import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MapPin, Clock, CheckCircle, XCircle, Loader2, LogIn, LogOut, Navigation } from 'lucide-react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getWorkingStatus, formatWorkingHours, DEFAULT_WORKING_HOURS } from '@/lib/working-hours';
import OSMMap from '@/components/location/osm-map';

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  location: string;
  notes?: string;
  hoursWorked?: number;
}

export default function MobileCheckin() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isInZone, setIsInZone] = useState<boolean | null>(null);
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [locationString, setLocationString] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get today's attendance
  const { data: attendanceRecords = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get working hours
  const { data: workingHours = [] } = useQuery<any[]>({
    queryKey: ['/api/working-hours'],
  });

  const currentWorkingHours = workingHours.length > 0 ? workingHours[0] : DEFAULT_WORKING_HOURS;
  const workingStatus = getWorkingStatus(currentTime, currentWorkingHours);

  // Find today's attendance record
  const todayDate = currentTime.toISOString().split('T')[0];
  const todayAttendance = attendanceRecords.find(
    record => record.date === todayDate && record.userId === user?.id
  );

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!currentLocation) {
        throw new Error('Location not available');
      }

      const locationStr = `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;
      
      return apiRequest('/api/attendance', 'POST', {
        userId: user?.id,
        date: todayDate,
        checkInTime: currentTime.toISOString(),
        status: 'present',
        location: locationStr,
        notes: currentZone ? `Checked in at ${currentZone}` : 'Mobile check-in'
      });
    },
    onSuccess: () => {
      toast({
        title: "Check-in Successful",
        description: `Checked in at ${currentTime.toLocaleTimeString()}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in Failed",
        description: error.message || "Unable to check in. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!todayAttendance) {
        throw new Error('No check-in record found for today');
      }

      if (!currentLocation) {
        throw new Error('Location not available');
      }

      const locationStr = `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`;
      
      return apiRequest(`/api/attendance/${todayAttendance.id}`, 'PUT', {
        checkOutTime: currentTime.toISOString(),
        location: locationStr,
        notes: currentZone ? `Checked out at ${currentZone}` : 'Mobile check-out'
      });
    },
    onSuccess: () => {
      toast({
        title: "Check-out Successful",
        description: `Checked out at ${currentTime.toLocaleTimeString()}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Check-out Failed",
        description: error.message || "Unable to check out. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckIn = () => {
    if (!isInZone) {
      toast({
        title: "Check-in Not Allowed",
        description: "You must be in a designated check-in zone to check in.",
        variant: "destructive",
      });
      return;
    }

    if (!workingStatus.canCheckIn) {
      toast({
        title: "Check-in Not Allowed",
        description: workingStatus.message,
        variant: "destructive",
      });
      return;
    }

    checkInMutation.mutate();
  };

  const handleCheckOut = () => {
    if (!isInZone) {
      toast({
        title: "Check-out Not Allowed",
        description: "You must be in a designated check-in zone to check out.",
        variant: "destructive",
      });
      return;
    }

    checkOutMutation.mutate();
  };

  const handleLocationChange = (location: { lat: number; lng: number }) => {
    setCurrentLocation(location);
    setLocationString(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
  };

  const handleZoneStatusChange = (inZone: boolean, zoneName?: string) => {
    setIsInZone(inZone);
    setCurrentZone(zoneName || null);
  };

  const isCheckedIn = todayAttendance && todayAttendance.checkInTime && !todayAttendance.checkOutTime;
  const isCheckedOut = todayAttendance && todayAttendance.checkInTime && todayAttendance.checkOutTime;

  return (
    <div className="w-full sm:max-w-sm mx-auto bg-black min-h-screen relative overflow-hidden">
      {/* App Content */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-t-3xl min-h-screen">
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-t-3xl text-white p-4"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Link href="/mobile-app">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Check In/Out</h1>
                <p className="text-sm opacity-90">Location-based attendance</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <MapPin className="w-5 h-5" />
            </div>
          </div>

          {/* Current Time */}
          <div className="text-center mb-4">
            <motion.div
              key={currentTime.toLocaleTimeString()}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.1 }}
              className="text-3xl font-bold mb-1"
            >
              {currentTime.toLocaleTimeString()}
            </motion.div>
            <div className="text-sm opacity-90">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>

          {/* Working Status */}
          <div className="text-center">
            <Badge 
              variant={workingStatus.canCheckIn ? "default" : "secondary"}
              className="mb-2"
            >
              {workingStatus.status === 'off-day' ? "Non-Working Day" : "Working Day"}
            </Badge>
            <div className="text-sm opacity-90">
              {formatWorkingHours(currentWorkingHours)}
            </div>
          </div>
        </motion.div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Attendance Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Today's Attendance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayAttendance ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Check-in</span>
                      <div className="flex items-center space-x-2">
                        {todayAttendance.checkInTime ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="font-medium">
                              {new Date(todayAttendance.checkInTime).toLocaleTimeString()}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">Not checked in</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Check-out</span>
                      <div className="flex items-center space-x-2">
                        {todayAttendance.checkOutTime ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="font-medium">
                              {new Date(todayAttendance.checkOutTime).toLocaleTimeString()}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-400">Not checked out</span>
                          </>
                        )}
                      </div>
                    </div>
                    {todayAttendance.hoursWorked && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Hours Worked</span>
                        <span className="font-medium">{todayAttendance.hoursWorked.toFixed(1)}h</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <XCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No attendance record for today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location & Map */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <Navigation className="w-5 h-5" />
                <span>Location & Check-in Zones</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OSMMap
                showCheckinZones={true}
                onLocationChange={handleLocationChange}
                onZoneStatusChange={handleZoneStatusChange}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Check-in/Check-out Actions */}
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {!isCheckedIn && !isCheckedOut && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    onClick={handleCheckIn}
                    disabled={!isInZone || checkInMutation.isPending || !workingStatus.canCheckIn}
                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium"
                  >
                    {checkInMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <LogIn className="w-5 h-5 mr-2" />
                    )}
                    Check In
                  </Button>
                </motion.div>
              )}

              {isCheckedIn && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    onClick={handleCheckOut}
                    disabled={!isInZone || checkOutMutation.isPending}
                    className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium"
                  >
                    {checkOutMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <LogOut className="w-5 h-5 mr-2" />
                    )}
                    Check Out
                  </Button>
                </motion.div>
              )}

              {isCheckedOut && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-4"
                >
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p className="text-lg font-medium text-green-600">Work Day Complete</p>
                  <p className="text-sm text-gray-600">You have successfully checked out</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Zone Status Message */}
            {isInZone === false && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-center"
              >
                <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-sm text-red-600">
                  You need to be in a check-in zone to proceed
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}