import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, User, MapPin, Clock, Calendar, Edit, Check, Loader2, AlertCircle, CheckCircle, LogOut, LogIn } from "lucide-react";
import Header from "@/components/layout/header";
import RequestModal from "@/components/modals/request-modal";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentLocation, getLocationString } from "@/lib/geolocation";
import { getWorkingStatus, formatWorkingHours, DEFAULT_WORKING_HOURS } from "@/lib/working-hours";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Mobile() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentLocation, setCurrentLocation] = useState<string>("Getting location...");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
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

  // Get real-time location
  useEffect(() => {
    const updateLocation = async () => {
      try {
        setIsLoadingLocation(true);
        const location = await getLocationString();
        setCurrentLocation(location);
      } catch (error) {
        setCurrentLocation("Location unavailable");
      } finally {
        setIsLoadingLocation(false);
      }
    };

    updateLocation();
    const locationTimer = setInterval(updateLocation, 5 * 60 * 1000);
    return () => clearInterval(locationTimer);
  }, []);

  const workingStatus = getWorkingStatus(currentTime);

  const { data: userRequests } = useQuery({
    queryKey: ["/api/requests", { userId: user?.id }],
    enabled: !!user?.id,
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ['/api/attendance', { date: currentTime.toISOString().split('T')[0], userId: user?.id }],
    enabled: !!user?.id,
  });

  const userAttendance = Array.isArray(todayAttendance) ? todayAttendance.find((a: any) => a.userId === user?.id) : null;

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const location = await getLocationString();
      const response = await apiRequest("POST", "/api/attendance/checkin", {
        userId: user?.id,
        location: location
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      toast({
        title: "Checked in successfully",
        description: `Welcome! Checked in at ${currentTime.toLocaleTimeString()}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Check-out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/attendance/checkout", {
        userId: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      toast({
        title: "Checked out successfully",
        description: `See you tomorrow! Checked out at ${currentTime.toLocaleTimeString()}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-out failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="status-pending">Pending</Badge>;
      case "approved":
        return <Badge variant="default" className="status-approved">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="status-rejected">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const quickActions = [
    {
      icon: Calendar,
      iconBg: "bg-blue-100",
      iconColor: "text-primary",
      title: "Leave Request",
      subtitle: "Submit vacation or sick leave",
      action: () => setIsRequestModalOpen(true),
    },
    {
      icon: Clock,
      iconBg: "bg-orange-100",
      iconColor: "text-warning",
      title: "Overtime Request",
      subtitle: "Request overtime approval",
      action: () => setIsRequestModalOpen(true),
    },
    {
      icon: Edit,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      title: "Attendance Adjustment",
      subtitle: "Correct attendance records",
      action: () => setIsRequestModalOpen(true),
    },
  ];

  return (
    <>
      <Header 
        title="Mobile Employee Portal" 
        subtitle="Real-time attendance with geolocation tracking" 
      />
      
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
        <motion.div 
          className="mobile-app-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Mobile Header */}
          <motion.div 
            className="bg-gradient-to-r from-primary to-blue-600 text-white p-6 rounded-b-3xl shadow-lg"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">HRFlow</h3>
                <p className="text-sm opacity-90">Employee Portal</p>
              </div>
              <div className="flex items-center space-x-3">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Bell className="w-6 h-6" />
                </motion.div>
                <motion.div 
                  className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <User className="w-5 h-5" />
                </motion.div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{user?.name || 'Employee'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            </div>
          </motion.div>

          {/* Real-time Clock */}
          <motion.div 
            className="p-6 bg-white mx-4 -mt-4 rounded-2xl shadow-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="text-center">
              <motion.div 
                className="text-3xl font-bold text-gray-800 mb-2"
                key={currentTime.toLocaleTimeString()}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.1 }}
              >
                {currentTime.toLocaleTimeString()}
              </motion.div>
              <div className="flex items-center justify-center space-x-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Working Hours: {formatWorkingHours(DEFAULT_WORKING_HOURS)}</span>
              </div>
              
              {/* Working Status */}
              <motion.div 
                className="mt-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Badge 
                  variant={workingStatus.status === 'working-hours' ? 'default' : 
                          workingStatus.status === 'off-day' ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {workingStatus.message}
                </Badge>
              </motion.div>
            </div>
          </motion.div>

          {/* Location and Check-in/Check-out */}
          <motion.div 
            className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 mx-4 mt-4 rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                {isLoadingLocation ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.5 }}
                  >
                    <MapPin className="w-8 h-8 text-primary" />
                  </motion.div>
                )}
              </div>
              
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Current Location</h4>
              <p className="text-sm text-muted-foreground mb-4 font-mono">
                {currentLocation}
              </p>
              
              <div className="space-y-3">
                <AnimatePresence>
                  {!userAttendance?.checkIn ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Button 
                        className="w-full bg-green-600 text-white hover:bg-green-700"
                        onClick={() => checkInMutation.mutate()}
                        disabled={checkInMutation.isPending || !workingStatus.canCheckIn}
                      >
                        {checkInMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <LogIn className="w-4 h-4 mr-2" />
                        )}
                        Check In
                      </Button>
                    </motion.div>
                  ) : !userAttendance?.checkOut ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Button 
                        className="w-full bg-red-600 text-white hover:bg-red-700"
                        onClick={() => checkOutMutation.mutate()}
                        disabled={checkOutMutation.isPending}
                      >
                        {checkOutMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4 mr-2" />
                        )}
                        Check Out
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="flex items-center justify-center space-x-2 p-3 bg-green-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-green-800 font-medium">Work day completed</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Today's Summary */}
          <motion.div 
            className="p-6 mx-4 mt-4 bg-white rounded-2xl shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Today's Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                className="bg-gray-50 p-4 rounded-xl"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-xs text-muted-foreground mb-1">Check In</p>
                <p className="font-semibold text-gray-800">
                  {userAttendance?.checkIn 
                    ? new Date(userAttendance.checkIn).toLocaleTimeString()
                    : "Not checked in"
                  }
                </p>
              </motion.div>
              <motion.div 
                className="bg-gray-50 p-4 rounded-xl"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-xs text-muted-foreground mb-1">Hours Worked</p>
                <p className="font-semibold text-gray-800">
                  {userAttendance?.hoursWorked 
                    ? `${userAttendance.hoursWorked}h`
                    : "0h"
                  }
                </p>
              </motion.div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div 
            className="p-6 mx-4 mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h4>
            <div className="space-y-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center space-x-3 p-4 bg-white rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                  >
                    <div className={`w-12 h-12 ${action.iconBg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${action.iconColor}`} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.subtitle}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Recent Requests Status */}
          <motion.div 
            className="p-6 mx-4 mt-4 mb-6 bg-gray-50 rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent Requests</h4>
            <div className="space-y-3">
              {Array.isArray(userRequests) && userRequests.slice(0, 3).map((request: any, index: number) => (
                <motion.div 
                  key={request.id} 
                  className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                >
                  <div>
                    <p className="font-medium text-gray-800">
                      {request.type === "leave" ? "Leave Request" :
                       request.type === "overtime" ? "Overtime Request" :
                       "Attendance Adjustment"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {request.startDate}
                      {request.endDate && request.endDate !== request.startDate && ` - ${request.endDate}`}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </motion.div>
              )) || (
                <motion.div 
                  className="text-center py-8 text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No recent requests</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>

      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        userId={user?.id || 1}
      />
    </>
  );
}