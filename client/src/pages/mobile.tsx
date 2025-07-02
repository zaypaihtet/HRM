import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, User, MapPin, Clock, Calendar, Edit, Check } from "lucide-react";
import Header from "@/components/layout/header";
import RequestModal from "@/components/modals/request-modal";
import { useAuth } from "@/lib/auth";

export default function Mobile() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const { user } = useAuth();

  const { data: userRequests } = useQuery({
    queryKey: ["/api/requests"],
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["/api/attendance"],
  });

  const mockUserAttendance = todayAttendance?.find((a: any) => a.userId === 2); // Mock employee

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

  const mockQuickActions = [
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
        title="Mobile App Preview" 
        subtitle="Employee mobile interface demonstration" 
      />
      
      <div className="max-w-md mx-auto">
        <div className="mobile-app-container">
          {/* Mobile Header */}
          <div className="bg-primary text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">HRFlow</h3>
                <p className="text-xs opacity-90">Employee Portal</p>
              </div>
              <div className="flex items-center space-x-3">
                <Bell className="text-lg" />
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <User className="text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Check-in/Check-out Section */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="text-center">
              <div className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-white text-2xl" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 mb-2">Office Location</h4>
              <p className="text-sm text-muted-foreground mb-4">You are within the office zone</p>
              
              <div className="space-y-3">
                <Button className="w-full bg-success text-white hover:bg-success/90">
                  <MapPin className="w-4 h-4 mr-2" />
                  Check In
                </Button>
                <Button className="w-full bg-destructive text-white hover:bg-destructive/90">
                  <MapPin className="w-4 h-4 mr-2" />
                  Check Out
                </Button>
              </div>
            </div>
          </div>

          {/* Today's Summary */}
          <div className="p-6 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Today's Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Check In</p>
                <p className="font-semibold text-gray-800">
                  {mockUserAttendance?.checkIn 
                    ? new Date(mockUserAttendance.checkIn).toLocaleTimeString()
                    : "Not checked in"
                  }
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Hours Worked</p>
                <p className="font-semibold text-gray-800">
                  {mockUserAttendance?.hoursWorked 
                    ? `${mockUserAttendance.hoursWorked}h`
                    : "0h"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h4>
            <div className="space-y-3">
              {mockQuickActions.map((action, index) => {
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
          </div>

          {/* Recent Requests Status */}
          <div className="p-6 bg-gray-50">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent Requests</h4>
            <div className="space-y-3">
              {userRequests?.slice(0, 3).map((request: any) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
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
                </div>
              )) || (
                <div className="text-center py-4 text-muted-foreground">
                  No recent requests
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        userId={user?.id || 2}
      />
    </>
  );
}
