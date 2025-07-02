import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, User, MapPin, Clock, Calendar, Edit, Loader2, CheckCircle, LogOut, LogIn, Wifi, WifiOff } from "lucide-react";
import Header from "@/components/layout/header";
import RequestModal from "@/components/modals/request-modal";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentLocation, getLocationString } from "@/lib/geolocation";
import { getWorkingStatus, formatWorkingHours, DEFAULT_WORKING_HOURS } from "@/lib/working-hours";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function MobileReal() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentLocation, setCurrentLocation] = useState<string>("Getting location...");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time location tracking
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
    const locationTimer = setInterval(updateLocation, 30000); // Update every 30 seconds
    return () => clearInterval(locationTimer);
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const workingStatus = getWorkingStatus(currentTime);

  // Get today's attendance
  const { data: todayAttendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['/api/attendance', { date: currentTime.toISOString().split('T')[0], userId: user?.id }],
    enabled: !!user?.id && isOnline,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get user requests
  const { data: userRequests } = useQuery({
    queryKey: ["/api/requests", { userId: user?.id }],
    enabled: !!user?.id && isOnline,
  });

  const userAttendance = Array.isArray(todayAttendance) ? 
    todayAttendance.find((a: any) => a.userId === user?.id) : null;

  // Check-in mutation with real-time location
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
        title: "✓ Checked in successfully",
        description: `Welcome! Time: ${currentTime.toLocaleTimeString()}`,
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
        title: "✓ Checked out successfully",
        description: `See you tomorrow! Time: ${currentTime.toLocaleTimeString()}`,
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
    const variants = {
      pending: { variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800" },
      approved: { variant: "default" as const, className: "bg-green-100 text-green-800" },
      rejected: { variant: "destructive" as const, className: "bg-red-100 text-red-800" }
    };
    
    const config = variants[status as keyof typeof variants] || { variant: "outline" as const, className: "" };
    
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const quickActions = [
    {
      icon: Calendar,
      title: "Leave Request",
      subtitle: "Submit vacation or sick leave",
      color: "from-blue-500 to-blue-600",
      action: () => setIsRequestModalOpen(true),
    },
    {
      icon: Clock,
      title: "Overtime Request", 
      subtitle: "Request overtime approval",
      color: "from-orange-500 to-orange-600",
      action: () => setIsRequestModalOpen(true),
    },
    {
      icon: Edit,
      title: "Attendance Adjustment",
      subtitle: "Correct attendance records", 
      color: "from-purple-500 to-purple-600",
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
          {/* Status Bar */}
          <motion.div 
            className="flex items-center justify-between p-4 bg-white border-b"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs text-gray-600">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <motion.div 
              className="text-xs font-mono text-gray-600"
              key={currentTime.toLocaleTimeString()}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.1 }}
            >
              {currentTime.toLocaleTimeString()}
            </motion.div>
          </motion.div>

          {/* Header */}
          <motion.div 
            className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white p-6"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <motion.h1 
                  className="text-2xl font-bold"
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  HRFlow
                </motion.h1>
                <motion.p 
                  className="text-sm opacity-90"
                  initial={{ x: -20 }}
                  animate={{ x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Employee Portal
                </motion.p>
              </div>
              <div className="flex items-center space-x-3">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative"
                >
                  <Bell className="w-6 h-6" />
                  {userRequests && Array.isArray(userRequests) && userRequests.length > 0 && (
                    <motion.div 
                      className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                    />
                  )}
                </motion.div>
                <motion.div 
                  className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <User className="w-5 h-5" />
                </motion.div>
              </div>
            </div>
            
            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{user?.name || 'Employee'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric'
                })}</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Real-time Clock & Status */}
          <motion.div 
            className="p-6 bg-white mx-4 -mt-6 rounded-2xl shadow-lg z-10 relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="text-center">
              <motion.div 
                className="text-4xl font-bold text-gray-800 mb-3"
                key={currentTime.toLocaleTimeString()}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.1 }}
              >
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </motion.div>
              
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-3">
                <Clock className="w-4 h-4" />
                <span>Work: {formatWorkingHours(DEFAULT_WORKING_HOURS)}</span>
              </div>
              
              <motion.div 
                className="mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Badge 
                  variant={workingStatus.status === 'working-hours' ? 'default' : 
                          workingStatus.status === 'off-day' ? 'secondary' : 'outline'}
                  className="text-xs px-3 py-1"
                >
                  {workingStatus.message}
                </Badge>
              </motion.div>

              {/* Location Display */}
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                {isLoadingLocation ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <MapPin className="w-3 h-3" />
                )}
                <span className="font-mono">{currentLocation}</span>
              </div>
            </div>
          </motion.div>

          {/* Check-in/Check-out Section */}
          <motion.div 
            className="p-6 mx-4 mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {!userAttendance?.checkIn ? (
                  <motion.div
                    key="checkin"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-3"
                  >
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg"
                      onClick={() => checkInMutation.mutate()}
                      disabled={checkInMutation.isPending || !workingStatus.canCheckIn || !isOnline}
                    >
                      {checkInMutation.isPending ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Checking in...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <LogIn className="w-5 h-5" />
                          <span>Check In</span>
                        </div>
                      )}
                    </Button>
                    {!workingStatus.canCheckIn && (
                      <p className="text-xs text-center text-gray-500">
                        Check-in available during working hours
                      </p>
                    )}
                  </motion.div>
                ) : !userAttendance?.checkOut ? (
                  <motion.div
                    key="checkout"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg"
                      onClick={() => checkOutMutation.mutate()}
                      disabled={checkOutMutation.isPending || !isOnline}
                    >
                      {checkOutMutation.isPending ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Checking out...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <LogOut className="w-5 h-5" />
                          <span>Check Out</span>
                        </div>
                      )}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="completed"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center space-x-3 p-4 bg-green-50 rounded-xl border border-green-200"
                  >
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-green-800 font-medium">Work day completed!</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Today's Summary */}
          <motion.div 
            className="p-6 mx-4 mt-4 bg-white rounded-2xl shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <motion.div 
                className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-xs text-blue-600 font-medium mb-1">Check In</p>
                <p className="font-bold text-gray-800">
                  {userAttendance?.checkIn 
                    ? new Date(userAttendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : "Not checked in"
                  }
                </p>
              </motion.div>
              <motion.div 
                className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl"
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-xs text-green-600 font-medium mb-1">Hours Worked</p>
                <p className="font-bold text-gray-800">
                  {userAttendance?.hoursWorked 
                    ? `${parseFloat(userAttendance.hoursWorked).toFixed(1)}h`
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
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={index}
                    onClick={action.action}
                    className={`w-full p-4 bg-gradient-to-r ${action.color} text-white rounded-xl shadow-lg`}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-6 h-6" />
                      <div className="text-left">
                        <p className="font-semibold">{action.title}</p>
                        <p className="text-sm opacity-90">{action.subtitle}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Recent Requests */}
          <motion.div 
            className="p-6 mx-4 mt-4 mb-6 bg-gray-50 rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Requests</h3>
            <div className="space-y-3">
              {Array.isArray(userRequests) && userRequests.length > 0 ? (
                userRequests.slice(0, 3).map((request: any, index: number) => (
                  <motion.div 
                    key={request.id} 
                    className="p-4 bg-white rounded-xl shadow-sm"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          {request.type === "leave" ? "Leave Request" :
                           request.type === "overtime" ? "Overtime Request" :
                           "Attendance Adjustment"}
                        </p>
                        <p className="text-sm text-gray-600">
                          {request.startDate}
                          {request.endDate && request.endDate !== request.startDate && ` - ${request.endDate}`}
                        </p>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  className="text-center py-8 text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                >
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
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