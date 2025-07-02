import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Download, Edit, Trash2, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateAttendanceReportPDF } from "@/lib/pdf";
import Header from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Attendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ["/api/attendance", selectedDate],
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/attendance/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Record deleted",
        description: "Attendance record has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete attendance record.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    if (attendanceData) {
      generateAttendanceReportPDF(attendanceData);
      toast({
        title: "Export successful",
        description: "Attendance report has been downloaded.",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "present":
        return <Badge variant="default" className="status-present">Present</Badge>;
      case "absent":
        return <Badge variant="destructive" className="status-absent">Absent</Badge>;
      case "late":
        return <Badge variant="secondary" className="status-pending">Late</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <>
      <Header 
        title="Attendance Management" 
        subtitle="Track and manage employee attendance records" 
      />
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Attendance Records</h3>
            <div className="flex items-center space-x-4">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <Button onClick={handleExport} disabled={!attendanceData}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Hours</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : attendanceData?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No attendance records found for this date.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendanceData?.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary text-white">
                              {getInitials(record.user?.name || "")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-800">{record.user?.name}</p>
                            <p className="text-sm text-muted-foreground">{record.user?.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "-"}
                      </TableCell>
                      <TableCell>
                        {record.location ? (
                          <Badge variant="outline" className="status-present">
                            <MapPin className="w-3 h-3 mr-1" />
                            {record.location}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {record.hoursWorked ? `${record.hoursWorked}h` : "0h"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteAttendanceMutation.mutate(record.id)}
                            disabled={deleteAttendanceMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
    </>
  );
}
