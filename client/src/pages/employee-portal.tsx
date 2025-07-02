import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, User, MapPin, Clock, Calendar, Edit, LogOut, Users, Activity } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { validateCheckInLocation } from "@/lib/geofence";
import RequestModal from "@/components/modals/request-modal";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeePortal() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/requests", user?.id],
  });

  const { data: myAttendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/attendance", user?.id],
  });

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = myAttendance?.find((a: any) => a.date === today);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const locationValidation = await validateCheckInLocation();
      if (!locationValidation.isValid) {
        throw new Error("You must be within the office zone to check in");
      }
      
      const response = await apiRequest("POST", "/api/attendance/checkin", {
        userId: user?.id,
        location: locationValidation.location,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Checked in successfully",
        description: "Your attendance has been recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/attendance/checkout", {
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Checked out successfully",
        description: "Have a great day!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: (error: any) => {
      toast({
        title: "Check-out failed",
        description: "Failed to check out. Please try again.",
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

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "leave": return "Leave Request";
      case "overtime": return "Overtime Request";
      case "attendance_adjustment": return "Attendance Adjustment";
      default: return type;
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-primary text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Users className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold">HRFlow</h1>
              <p className="text-xs opacity-90">Employee Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Bell className="text-lg" />
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white hover:bg-white/20"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-sm opacity-90">Welcome back, {user?.name}</p>
          <p className="text-xs opacity-75">{user?.position} • {user?.department}</p>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Check-in/Check-out Section */}
        <Card>
          <CardContent className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="text-center">
              <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-white text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Office Location</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {todayAttendance?.checkIn && !todayAttendance?.checkOut
                  ? "You are checked in"
                  : "You are within the office zone"
                }
              </p>
              
              <div className="space-y-3">
                <Button 
                  className="w-full bg-success text-white hover:bg-success/90"
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending || (todayAttendance?.checkIn && !todayAttendance?.checkOut)}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {checkInMutation.isPending ? "Checking in..." : "Check In"}
                </Button>
                <Button 
                  className="w-full bg-destructive text-white hover:bg-destructive/90"
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending || !todayAttendance?.checkIn || todayAttendance?.checkOut}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Today's Summary</h3>
            {attendanceLoading ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Check In</p>
                  <p className="font-semibold text-gray-800">
                    {todayAttendance?.checkIn 
                      ? new Date(todayAttendance.checkIn).toLocaleTimeString()
                      : "Not checked in"
                    }
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground">Hours Worked</p>
                  <p className="font-semibold text-gray-800">
                    {todayAttendance?.hoursWorked 
                      ? `${todayAttendance.hoursWorked}h`
                      : "0h"
                    }
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    className="w-full flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className={`w-10 h-10 ${action.iconBg} rounded-lg flex items-center justify-center`}>
                      <Icon className={action.iconColor} />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">{action.title}</p>
                      <p className="text-sm text-muted-foreground">{action.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* My Requests */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">My Requests</h3>
            {requestsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : myRequests?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No requests submitted yet</p>
                <p className="text-sm">Use quick actions above to submit your first request</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests?.slice(0, 5).map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">
                        {getRequestTypeLabel(request.type)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.startDate}
                        {request.endDate && request.endDate !== request.startDate && ` - ${request.endDate}`}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Attendance History (Desktop view) */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Attendance</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : myAttendance?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No attendance records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      myAttendance?.slice(0, 10).map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">
                            {new Date(record.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.hoursWorked ? `${record.hoursWorked}h` : "0h"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={record.status === "present" ? "default" : "destructive"} className="text-xs">
                              {record.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        userId={user?.id || 1}
      />
    </div>
  );
}
