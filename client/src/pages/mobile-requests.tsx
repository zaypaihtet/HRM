import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, Edit, Plus, Filter, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import RequestModal from "@/components/modals/request-modal";
import { Link } from "wouter";

type RequestType = "leave" | "overtime" | "attendance";
type FilterType = "all" | "pending" | "approved" | "rejected";

export default function MobileRequests() {
  const { user } = useAuth();
  const [activeRequestType, setActiveRequestType] = useState<RequestType>("leave");
  const [filterStatus, setFilterStatus] = useState<FilterType>("all");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Get user requests
  const { data: userRequests, isLoading } = useQuery({
    queryKey: ["/api/requests", { userId: user?.id }],
    enabled: !!user?.id,
  });

  const getFilteredRequests = (type: RequestType) => {
    if (!Array.isArray(userRequests)) return [];
    
    let filtered = userRequests.filter((request: any) => request.type === type);
    
    if (filterStatus !== "all") {
      filtered = filtered.filter((request: any) => request.status === filterStatus);
    }
    
    return filtered.sort((a: any, b: any) => 
      new Date(b.createdAt || b.requestDate).getTime() - new Date(a.createdAt || a.requestDate).getTime()
    );
  };

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

  const getRequestIcon = (type: RequestType) => {
    switch (type) {
      case "leave": return CalendarDays;
      case "overtime": return Clock;
      case "attendance": return Edit;
    }
  };

  const getRequestTitle = (type: RequestType) => {
    switch (type) {
      case "leave": return "Leave Requests";
      case "overtime": return "Overtime Requests";
      case "attendance": return "Attendance Adjustments";
    }
  };

  const getRequestDescription = (request: any) => {
    if (request.type === "leave") {
      return `${request.startDate}${request.endDate && request.endDate !== request.startDate ? ` - ${request.endDate}` : ''}`;
    } else if (request.type === "overtime") {
      return `${request.startDate} • ${request.hours || 0} hours`;
    } else {
      return `${request.startDate} • Adjustment`;
    }
  };

  const filterButtons = [
    { key: "all" as FilterType, label: "All", count: getFilteredRequests(activeRequestType).length },
    { key: "pending" as FilterType, label: "Pending", count: userRequests?.filter((r: any) => r.type === activeRequestType && r.status === "pending").length || 0 },
    { key: "approved" as FilterType, label: "Approved", count: userRequests?.filter((r: any) => r.type === activeRequestType && r.status === "approved").length || 0 },
    { key: "rejected" as FilterType, label: "Rejected", count: userRequests?.filter((r: any) => r.type === activeRequestType && r.status === "rejected").length || 0 },
  ];

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <motion.div 
        className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white p-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <Link href="/mobile-real">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white hover:bg-opacity-20 p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">My Requests</h1>
            <p className="text-sm opacity-90">Leave, Overtime & Attendance</p>
          </div>
        </div>

        {/* Quick Add Button */}
        <Button
          onClick={() => setIsRequestModalOpen(true)}
          className="w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-white border-opacity-30"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Request
        </Button>
      </motion.div>

      {/* Request Type Tabs */}
      <motion.div 
        className="p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeRequestType} onValueChange={(value) => {
          setActiveRequestType(value as RequestType);
          setFilterStatus("all");
        }}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="leave" className="flex items-center space-x-1">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Leave</span>
            </TabsTrigger>
            <TabsTrigger value="overtime" className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Overtime</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center space-x-1">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Attendance</span>
            </TabsTrigger>
          </TabsList>

          {/* Filter Buttons */}
          <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
            {filterButtons.map((filter) => (
              <Button
                key={filter.key}
                variant={filterStatus === filter.key ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(filter.key)}
                className="flex items-center space-x-1 whitespace-nowrap"
              >
                <Filter className="w-3 h-3" />
                <span>{filter.label}</span>
                {filter.count > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {filter.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Request Lists */}
          <TabsContent value="leave" className="space-y-4">
            <RequestList 
              requests={getFilteredRequests("leave")}
              type="leave"
              isLoading={isLoading}
              filterStatus={filterStatus}
            />
          </TabsContent>

          <TabsContent value="overtime" className="space-y-4">
            <RequestList 
              requests={getFilteredRequests("overtime")}
              type="overtime"
              isLoading={isLoading}
              filterStatus={filterStatus}
            />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <RequestList 
              requests={getFilteredRequests("attendance")}
              type="attendance"
              isLoading={isLoading}
              filterStatus={filterStatus}
            />
          </TabsContent>
        </Tabs>
      </motion.div>

      <RequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        userId={user?.id || 1}
      />
    </div>
  );
}

interface RequestListProps {
  requests: any[];
  type: RequestType;
  isLoading: boolean;
  filterStatus: FilterType;
}

function RequestList({ requests, type, isLoading, filterStatus }: RequestListProps) {
  const getRequestIcon = (type: RequestType) => {
    switch (type) {
      case "leave": return CalendarDays;
      case "overtime": return Clock;
      case "attendance": return Edit;
    }
  };

  const getRequestDescription = (request: any) => {
    if (request.type === "leave") {
      return `${request.startDate}${request.endDate && request.endDate !== request.startDate ? ` - ${request.endDate}` : ''}`;
    } else if (request.type === "overtime") {
      return `${request.startDate} • ${request.hours || 0} hours`;
    } else {
      return `${request.startDate} • Adjustment`;
    }
  };

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    const Icon = getRequestIcon(type);
    return (
      <motion.div 
        className="text-center py-12"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Icon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-800 mb-2">
          No {type} requests
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          {filterStatus === "all" 
            ? `You haven't submitted any ${type} requests yet.`
            : `No ${filterStatus} ${type} requests found.`
          }
        </p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <div className="space-y-3">
        {requests.map((request, index) => {
          const Icon = getRequestIcon(type);
          return (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              layout
            >
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {type === "leave" ? "Leave Request" :
                           type === "overtime" ? "Overtime Request" :
                           "Attendance Adjustment"}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {getRequestDescription(request)}
                        </p>
                        {request.reason && (
                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {request.reason}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Submitted: {new Date(request.createdAt || request.requestDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {getStatusBadge(request.status)}
                      {request.reviewedBy && (
                        <p className="text-xs text-gray-400">
                          by {request.reviewedBy}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {request.reviewerComments && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        <strong>Review Comments:</strong> {request.reviewerComments}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </AnimatePresence>
  );
}