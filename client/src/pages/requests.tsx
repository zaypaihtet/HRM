import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Check, X, Calendar, Edit, Eye } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import Header from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Requests() {
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["/api/requests", filterStatus === "pending" ? "pending" : ""],
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, reviewComment }: { id: number; status: string; reviewComment?: string }) => {
      const response = await apiRequest("PUT", `/api/requests/${id}`, {
        status,
        reviewerId: user?.id,
        reviewComment,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Request updated",
        description: `Request has been ${data.status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleApproveRequest = (id: number) => {
    updateRequestMutation.mutate({ id, status: "approved", reviewComment: "Approved by HR" });
  };

  const handleRejectRequest = (id: number) => {
    updateRequestMutation.mutate({ id, status: "rejected", reviewComment: "Rejected by HR" });
  };

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

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case "leave":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Calendar className="w-3 h-3 mr-1" />
            Leave Request
          </Badge>
        );
      case "overtime":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <Clock className="w-3 h-3 mr-1" />
            Overtime Request
          </Badge>
        );
      case "attendance_adjustment":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <Edit className="w-3 h-3 mr-1" />
            Attendance Adjustment
          </Badge>
        );
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredRequests = requestsData?.filter((request: any) => {
    if (filterStatus === "all") return true;
    return request.status === filterStatus;
  });

  const pendingCount = requestsData?.filter((r: any) => r.status === "pending").length || 0;
  const approvedCount = requestsData?.filter((r: any) => r.status === "approved").length || 0;
  const rejectedCount = requestsData?.filter((r: any) => r.status === "rejected").length || 0;

  return (
    <>
      <Header 
        title="Employee Requests" 
        subtitle="Review and approve employee requests" 
      />
      
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                  <p className="text-2xl font-bold text-warning">{pendingCount}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="text-warning text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved Today</p>
                  <p className="text-2xl font-bold text-success">{approvedCount}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Check className="text-success text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <X className="text-destructive text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Table */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Employee Requests</h3>
              <div className="flex items-center space-x-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Request Type</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div>
                              <Skeleton className="h-4 w-32 mb-1" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredRequests?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests?.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback className="bg-primary text-white">
                                {getInitials(request.user?.name || "")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-800">{request.user?.name}</p>
                              <p className="text-sm text-muted-foreground">{request.user?.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRequestTypeBadge(request.type)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {request.startDate}
                          {request.endDate && request.endDate !== request.startDate && (
                            <> - {request.endDate}</>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-xs truncate">
                          {request.reason}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(request.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {request.status === "pending" ? (
                              <>
                                <Button 
                                  size="sm"
                                  className="btn-success"
                                  onClick={() => handleApproveRequest(request.id)}
                                  disabled={updateRequestMutation.isPending}
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRejectRequest(request.id)}
                                  disabled={updateRequestMutation.isPending}
                                >
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
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
    </>
  );
}
