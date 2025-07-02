import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Bell, User, MapPin, Clock, Calendar, Edit, Loader2, CheckCircle, 
  LogOut, LogIn, Wifi, WifiOff, ArrowRight, Plus, Home, Activity,
  Settings, ChevronRight, Navigation, Target, Zap, Coffee, XCircle
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentLocation, getLocationString } from "@/lib/geolocation";
import { getWorkingStatus, formatWorkingHours, DEFAULT_WORKING_HOURS } from "@/lib/working-hours";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import RequestModal from "@/components/modals/request-modal";
import { useNotifications } from "@/hooks/use-notifications";

export default function MobileApp() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentLocation, setCurrentLocation] = useState<string>("Getting location...");
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState("home");
  const [showNotifications, setShowNotifications] = useState(false);
  const [isInZone, setIsInZone] = useState<boolean | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{lat: number, lng: number} | null>(null);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { notifications, unreadCount, markAsRead, clearNotification } = useNotifications();

  // Fetch check-in zones and working hours
  const { data: checkinZones = [] } = useQuery<any[]>({
    queryKey: ["/api/checkin-zones"],
  });

  const { data: workingHours = [] } = useQuery<any[]>({
    queryKey: ["/api/working-hours"],
  });

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Zone validation function
  const checkIfInZone = (userLat: number, userLng: number, zones: any[]) => {
    if (!zones || zones.length === 0) return false;
    
    for (const zone of zones) {
      const zoneLat = parseFloat(zone.latitude);
      const zoneLng = parseFloat(zone.longitude);
      const radius = zone.radius; // in meters
      
      // Calculate distance using Haversine formula
      const R = 6371000; // Earth's radius in meters
      const dLat = (zoneLat - userLat) * Math.PI / 180;
      const dLng = (zoneLng - userLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(userLat * Math.PI / 180) * Math.cos(zoneLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      if (distance <= radius) {
        return true;
      }
    }
    return false;
  };

  // Real-time location tracking with zone validation
  useEffect(() => {
    const updateLocation = async () => {
      try {
        setIsLoadingLocation(true);
        const coords = await getCurrentLocation();
        const location = await getLocationString();
        setCurrentLocation(location);
        setUserCoordinates({ lat: coords.latitude, lng: coords.longitude });
        
        // Check if user is in any check-in zone
        if (Array.isArray(checkinZones) && checkinZones.length > 0) {
          const inZone = checkIfInZone(coords.latitude, coords.longitude, checkinZones);
          setIsInZone(inZone);
        } else {
          setIsInZone(false);
        }
      } catch (error) {
        setCurrentLocation("Location unavailable");
        setIsInZone(false);
      } finally {
        setIsLoadingLocation(false);
      }
    };

    updateLocation();
    const locationTimer = setInterval(updateLocation, 30000);
    return () => clearInterval(locationTimer);
  }, [checkinZones]);

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
    refetchInterval: 30000,
  });

  // Get user requests
  const { data: userRequests = [] } = useQuery({
    queryKey: ["/api/requests", { userId: user?.id }],
    enabled: !!user?.id && isOnline,
  });

  const userAttendance = Array.isArray(todayAttendance) ? 
    todayAttendance.find((a: any) => a.userId === user?.id) : null;

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

  const quickActions = [
    {
      icon: Calendar,
      title: "Leave",
      subtitle: "Request time off",
      color: "#3B82F6",
      bgColor: "bg-blue-500",
      lightBg: "bg-blue-50",
      action: () => setIsRequestModalOpen(true),
    },
    {
      icon: Clock,
      title: "Overtime", 
      subtitle: "Extra hours",
      color: "#F59E0B",
      bgColor: "bg-amber-500",
      lightBg: "bg-amber-50",
      action: () => setIsRequestModalOpen(true),
    },
    {
      icon: Edit,
      title: "Adjust",
      subtitle: "Fix attendance", 
      color: "#8B5CF6",
      bgColor: "bg-purple-500",
      lightBg: "bg-purple-50",
      action: () => setIsRequestModalOpen(true),
    },
    {
      icon: Target,
      title: "Track",
      subtitle: "View location",
      color: "#10B981",
      bgColor: "bg-green-500",
      lightBg: "bg-green-50",
      href: "/mobile-location",
      action: () => {},
    },
  ];

  const menuItems = [
    { icon: Calendar, title: "Att Report", subtitle: "Track work hours", href: "/mobile-attendance" },
    { icon: MapPin, title: "Live Location", subtitle: "GPS & check-in zones", href: "/mobile-location" },
    { icon: Coffee, title: "Holidays", subtitle: "Company holidays", href: "/mobile-holidays" },
  ];

  return (
    <>
      {/* Mobile App Container */}
      <div className="w-full sm:max-w-sm mx-auto bg-black min-h-screen relative overflow-hidden">
        {/* Status Bar - Hidden on mobile as requested */}
        <div className="hidden"></div>

        {/* App Content */}
        <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-t-3xl min-h-screen">
          {/* Header */}
          <motion.div 
            className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-t-3xl text-white"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Header Content */}
            <div className="px-6 py-8 pb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <motion.div 
                    className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <User className="w-6 h-6" />
                  </motion.div>
                  <div>
                    <h1 className="text-xl font-bold">HRFlow</h1>
                    <p className="text-sm opacity-90">Employee App</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <motion.div
                    className="relative cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <Bell className="w-5 h-5" />
                    </div>
                    <AnimatePresence>
                      {unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                        >
                          <span className="text-xs font-bold text-white">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  
                  <Link href="/mobile-profile">
                    <motion.div
                      className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <User className="w-5 h-5" />
                    </motion.div>
                  </Link>
                </div>
              </div>

              {/* User Info */}
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold">Hello, {user?.name?.split(' ')[0] || 'Employee'}</h2>
                <p className="text-sm opacity-90">{user?.position} • {user?.department}</p>
                <div className="flex items-center space-x-2 text-sm opacity-80">
                  <Calendar className="w-4 h-4" />
                  <span>{currentTime.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric'
                  })}</span>
                </div>
              </motion.div>
            </div>

            {/* Floating Clock Card */}
            <motion.div 
              className="mx-6 mb-6 bg-white/95 backdrop-blur-lg rounded-3xl p-6 shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="text-center">
                <motion.div 
                  className="text-5xl font-bold text-gray-800 mb-2"
                  key={currentTime.toLocaleTimeString()}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.1 }}
                >
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </motion.div>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-4">
                  <Clock className="w-4 h-4" />
                  <span>{formatWorkingHours(DEFAULT_WORKING_HOURS)}</span>
                </div>
                
                <Badge 
                  variant={workingStatus.status === 'working-hours' ? 'default' : 'secondary'}
                  className={`px-4 py-1 ${
                    workingStatus.status === 'working-hours' 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-orange-100 text-orange-800 border-orange-200'
                  }`}
                >
                  {workingStatus.message}
                </Badge>

                {/* Location Status */}
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <Link href="/mobile-location" className="w-full">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 hover:shadow-sm transition-all">
                      <div className="flex items-center space-x-3">
                        {isLoadingLocation ? (
                          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                        ) : (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-green-800">GPS Location Active</p>
                          <p className="text-xs text-green-600 truncate">{currentLocation}</p>
                        </div>
                        <Navigation className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Zone Validation Status */}
                {!isLoadingLocation && (
                  <motion.div 
                    className="flex items-center justify-center mt-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {isInZone === true ? (
                      <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-800">In Check-in Zone</span>
                      </div>
                    ) : isInZone === false ? (
                      <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-medium text-red-800">Not in Zone</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                        <MapPin className="w-4 h-4 text-gray-600" />
                        <span className="text-xs font-medium text-gray-800">Checking zone...</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>

          {/* Content Area */}
          <div className="px-6 py-6 space-y-6">
            {/* Check-in/Check-out */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <AnimatePresence mode="wait">
                {!userAttendance?.checkIn ? (
                  <motion.div
                    key="checkin"
                    className="space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Button 
                      className={`w-full h-16 font-bold rounded-2xl shadow-xl text-lg ${
                        isInZone === false 
                          ? 'bg-gray-400 hover:bg-gray-500 text-gray-700' 
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                      }`}
                      onClick={() => checkInMutation.mutate()}
                      disabled={checkInMutation.isPending || !workingStatus.canCheckIn || !isOnline || isInZone === false}
                    >
                      {checkInMutation.isPending ? (
                        <div className="flex items-center space-x-3">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>Checking in...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <LogIn className="w-6 h-6" />
                          <span>Check In to Work</span>
                        </div>
                      )}
                    </Button>
                    {!workingStatus.canCheckIn && (
                      <p className="text-xs text-center text-gray-500">
                        Check-in available during working hours
                      </p>
                    )}
                    {isInZone === false && (
                      <p className="text-xs text-center text-red-600 font-medium">
                        Must be in designated check-in zone to continue
                      </p>
                    )}
                  </motion.div>
                ) : !userAttendance?.checkOut ? (
                  <motion.div
                    key="checkout"
                    className="space-y-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Button 
                      className="w-full h-16 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-2xl shadow-xl text-lg"
                      onClick={() => checkOutMutation.mutate()}
                      disabled={checkOutMutation.isPending || !isOnline}
                    >
                      {checkOutMutation.isPending ? (
                        <div className="flex items-center space-x-3">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>Checking out...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <LogOut className="w-6 h-6" />
                          <span>Check Out from Work</span>
                        </div>
                      )}
                    </Button>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-800 font-medium">
                          Checked in at {userAttendance?.checkIn ? new Date(userAttendance.checkIn).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="completed"
                    className="bg-green-50 border border-green-200 rounded-2xl p-6"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-green-800 mb-1">Work Day Complete!</h3>
                      <p className="text-sm text-green-600">
                        {userAttendance?.hoursWorked ? `${userAttendance.hoursWorked} hours worked` : 'Great job today!'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Quick Actions Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">Quick Actions</h3>
                <Link href="/mobile-requests">
                  <motion.button
                    className="flex items-center space-x-1 text-blue-600 text-sm font-medium"
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>View All</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  
                  return action.href ? (
                    <Link key={index} href={action.href}>
                      <motion.div
                        className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                      >
                        <div className={`w-14 h-14 ${action.lightBg} rounded-2xl flex items-center justify-center mb-4`}>
                          <Icon className="w-7 h-7" style={{ color: action.color }} />
                        </div>
                        <h4 className="font-bold text-gray-800 mb-1">{action.title}</h4>
                        <p className="text-xs text-gray-500">{action.subtitle}</p>
                      </motion.div>
                    </Link>
                  ) : (
                    <motion.button
                      key={index}
                      onClick={action.action}
                      className="text-left"
                    >
                      <motion.div
                        className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 + index * 0.1 }}
                      >
                        <div className={`w-14 h-14 ${action.lightBg} rounded-2xl flex items-center justify-center mb-4`}>
                          <Icon className="w-7 h-7" style={{ color: action.color }} />
                        </div>
                        <h4 className="font-bold text-gray-800 mb-1">{action.title}</h4>
                        <p className="text-xs text-gray-500">{action.subtitle}</p>
                      </motion.div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Menu Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <h3 className="text-lg font-bold text-gray-800 mb-4">More Options</h3>
              <div className="space-y-3">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <Link key={index} href={item.href}>
                      <motion.div
                        className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.1 + index * 0.1 }}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                            <Icon className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">{item.title}</h4>
                            <p className="text-sm text-gray-500">{item.subtitle}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* Bottom Spacing */}
            <div className="h-20"></div>
          </div>
        </div>
      </div>

      {/* Notification Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setShowNotifications(false)}
            />

            {/* Notification Panel */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-4 left-4 right-4 bg-white rounded-2xl shadow-2xl border z-50 max-h-96 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Notifications</h3>
                    <p className="text-sm opacity-90">
                      {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNotifications(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-2 h-8 w-8"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No notifications yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      We'll notify you about request updates
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 ${notification.read ? 'bg-gray-50' : 'bg-white border-l-4 border-l-blue-500'}`}
                        onClick={() => {
                          if (!notification.read) {
                            markAsRead(notification.id);
                          }
                        }}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {notification.type === 'request_approved' ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : notification.type === 'request_rejected' ? (
                              <XCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                              {notification.title}
                            </p>
                            <p className={`text-sm mt-1 ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                              {notification.message}
                            </p>
                            
                            {/* Action Buttons */}
                            <div className="flex items-center space-x-2 mt-3">
                              {notification.redirectUrl && (
                                <Link href={notification.redirectUrl}>
                                  <Button
                                    size="sm"
                                    className="text-xs px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowNotifications(false);
                                    }}
                                  >
                                    View Details
                                  </Button>
                                </Link>
                              )}
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearNotification(notification.id);
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                          </div>
                          
                          {!notification.read && (
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <RequestModal 
        isOpen={isRequestModalOpen} 
        onClose={() => setIsRequestModalOpen(false)} 
        userId={user?.id || 0}
      />
    </>
  );
}