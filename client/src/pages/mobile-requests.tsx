import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Calendar, Edit, CheckCircle, X, Filter, Plus } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import RequestModal from "@/components/modals/request-modal";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileRequests() {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");
  const { user } = useAuth();

  const { data: userRequests, isLoading } = useQuery({
    queryKey: ["/api/requests", { userId: user?.id }],
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      approved: { variant: "default" as const, className: "bg-green-100 text-green-800 border-green-200" },
      rejected: { variant: "destructive" as const, className: "bg-red-100 text-red-800 border-red-200" }
    };
    
    const config = variants[status as keyof typeof variants] || { variant: "outline" as const, className: "" };
    
    return (
      <Badge variant={config.variant} className={`${config.className} border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRequestIcon = (type: string) => {
    switch (type) {
      case "leave": return Calendar;
      case "overtime": return Clock;
      case "attendance_adjustment": return Edit;
      default: return Calendar;
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

  const filterRequests = (status?: string) => {
    if (!userRequests || !Array.isArray(userRequests)) return [];
    if (!status || status === "all") return userRequests;
    return userRequests.filter((request: any) => request.status === status);
  };

  const getTabCount = (status?: string) => {
    const filtered = filterRequests(status);
    return filtered.length;
  };

  return (
    <>
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white p-4"
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
                <h1 className="text-xl font-bold">My Requests</h1>
                <p className="text-sm opacity-90">Track your submissions</p>
              </div>
            </div>
            <Button
              onClick={() => setIsRequestModalOpen(true)}
              size="sm"
              className="bg-white/20 hover:bg-white/30 border-white/30"
            >
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div 
          className="p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
              <TabsTrigger value="all" className="text-xs">
                All ({getTabCount()})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">
                Pending ({getTabCount("pending")})
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-xs">
                Approved ({getTabCount("approved")})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs">
                Rejected ({getTabCount("rejected")})
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              {["all", "pending", "approved", "rejected"].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {isLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Card key={i}>
                            <CardContent className="p-4">
                              <div className="animate-pulse">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                                </div>
                                <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-40"></div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : filterRequests(tab === "all" ? undefined : tab).length === 0 ? (
                      <motion.div 
                        className="text-center py-12"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Filter className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-800 mb-2">
                          No {tab === "all" ? "" : tab} requests
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {tab === "all" 
                            ? "You haven't submitted any requests yet"
                            : `No ${tab} requests found`
                          }
                        </p>
                        {tab === "all" && (
                          <Button 
                            onClick={() => setIsRequestModalOpen(true)}
                            className="bg-gradient-to-r from-blue-500 to-purple-600"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Submit First Request
                          </Button>
                        )}
                      </motion.div>
                    ) : (
                      <div className="space-y-3">
                        {filterRequests(tab === "all" ? undefined : tab).map((request: any, index: number) => {
                          const Icon = getRequestIcon(request.type);
                          return (
                            <motion.div
                              key={request.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                            >
                              <Card className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Icon className="w-5 h-5 text-blue-600" />
                                      </div>
                                      <div>
                                        <h3 className="font-medium text-gray-800">
                                          {getRequestTypeLabel(request.type)}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                          Submitted {new Date(request.createdAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                    </div>
                                    {getStatusBadge(request.status)}
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">Date Range:</span>
                                      <span className="font-medium">
                                        {request.startDate}
                                        {request.endDate && request.endDate !== request.startDate && ` - ${request.endDate}`}
                                      </span>
                                    </div>
                                    
                                    {request.reason && (
                                      <div className="text-sm">
                                        <span className="text-gray-600">Reason:</span>
                                        <p className="text-gray-800 mt-1">{request.reason}</p>
                                      </div>
                                    )}
                                    
                                    {request.reviewerComment && (
                                      <div className="text-sm bg-gray-50 p-2 rounded">
                                        <span className="text-gray-600">Review Comment:</span>
                                        <p className="text-gray-800 mt-1">{request.reviewerComment}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {request.status === "approved" && (
                                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span className="text-sm text-green-700 font-medium">Approved</span>
                                    </div>
                                  )}
                                  
                                  {request.status === "rejected" && (
                                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
                                      <X className="w-4 h-4 text-red-600" />
                                      <span className="text-sm text-red-700 font-medium">Rejected</span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </TabsContent>
              ))}
            </AnimatePresence>
          </Tabs>
        </motion.div>
      </div>

      <RequestModal 
        isOpen={isRequestModalOpen} 
        onClose={() => setIsRequestModalOpen(false)} 
        userId={user?.id || 0}
      />
    </>
  );
}