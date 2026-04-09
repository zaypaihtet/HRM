import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Check, Clock, CalendarX, Activity, DollarSign } from "lucide-react";
import AttendanceChart from "@/components/charts/attendance-chart";
import Header from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/requests"],
  });

  const { data: todayAttendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/attendance"],
  });

  const statsCards = [
    {
      title: "Total Employees",
      value: stats?.totalEmployees || 0,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-blue-100",
    },
    {
      title: "Present Today",
      value: stats?.presentToday || 0,
      icon: Check,
      color: "text-success",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending Requests",
      value: stats?.pendingRequests || 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-orange-100",
    },
    {
      title: "On Leave",
      value: stats?.onLeave || 0,
      icon: CalendarX,
      color: "text-destructive",
      bgColor: "bg-red-100",
    },
  ];

  const getRecentActivities = () => {
    const activities = [];
    
    if (todayAttendance) {
      todayAttendance.slice(0, 3).forEach((attendance: any) => {
        if (attendance.checkIn) {
          activities.push({
            icon: Activity,
            iconColor: "text-success",
            iconBg: "bg-green-100",
            title: `${attendance.user?.name} checked in`,
            subtitle: `${attendance.location} • ${new Date(attendance.checkIn).toLocaleTimeString()}`,
          });
        }
      });
    }

    if (recentRequests) {
      recentRequests.slice(0, 2).forEach((request: any) => {
        activities.push({
          icon: Clock,
          iconColor: "text-warning",
          iconBg: "bg-orange-100",
          title: `${request.user?.name} submitted ${request.type.replace('_', ' ')} request`,
          subtitle: `${request.type.charAt(0).toUpperCase() + request.type.slice(1)} • ${new Date(request.createdAt).toLocaleDateString()}`,
        });
      });
    }

    return activities.slice(0, 3);
  };

  return (
    <>
      <Header />
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="stats-card">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className={`text-3xl font-bold ${stat.color}`}>
                        {stat.value}
                      </p>
                    )}
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`${stat.color} text-xl`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
              <div className="space-y-4">
                {requestsLoading || attendanceLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-48 mb-2" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))
                ) : (
                  getRecentActivities().map((activity, index) => {
                    const Icon = activity.icon;
                    return (
                      <div key={index} className="flex items-center space-x-4 p-3 bg-muted rounded-lg">
                        <div className={`w-10 h-10 ${activity.iconBg} rounded-full flex items-center justify-center`}>
                          <Icon className={`${activity.iconColor} text-sm`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                          <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attendance Chart */}
          <AttendanceChart />
        </div>
      </div>
    </>
  );
}
