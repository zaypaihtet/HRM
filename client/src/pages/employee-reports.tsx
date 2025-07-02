import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Download, Filter, Users, Clock, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { generateAttendanceReportPDF } from "@/lib/pdf";
import Header from "@/components/layout/header";

interface EmployeeReport {
  employee: {
    id: number;
    name: string;
    email: string;
    department: string;
    position: string;
  };
  attendance: {
    totalDays: number;
    totalHours: number;
    totalOvertimeHours: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
  };
  requests: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  payroll: {
    records: number;
    totalEarnings: number;
  };
}

export default function EmployeeReports() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedReport, setSelectedReport] = useState<EmployeeReport | null>(null);

  const { data: reports = [], isLoading, refetch } = useQuery<EmployeeReport[]>({
    queryKey: ["/api/reports/employees", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      
      const response = await fetch(`/api/reports/employees?${params}`);
      if (!response.ok) throw new Error("Failed to fetch reports");
      return response.json();
    },
  });

  const handleGenerateReport = () => {
    refetch();
  };

  const handleExportPDF = () => {
    const reportData = reports.map(report => ({
      employee: report.employee.name,
      department: report.employee.department,
      position: report.employee.position,
      totalDays: report.attendance.totalDays,
      totalHours: report.attendance.totalHours.toFixed(2),
      overtimeHours: report.attendance.totalOvertimeHours.toFixed(2),
      presentDays: report.attendance.presentDays,
      absentDays: report.attendance.absentDays,
      lateDays: report.attendance.lateDays,
      totalRequests: report.requests.total,
      pendingRequests: report.requests.pending,
      totalEarnings: report.payroll.totalEarnings.toFixed(2),
    }));

    generateAttendanceReportPDF(reportData);
  };

  const getAttendanceRate = (report: EmployeeReport) => {
    if (report.attendance.totalDays === 0) return "0";
    return ((report.attendance.presentDays / report.attendance.totalDays) * 100).toFixed(1);
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 85) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <>
      <Header title="Employee Reports" subtitle="Generate comprehensive employee performance reports" />
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Report Filters
            </CardTitle>
            <CardDescription>
              Select date range to generate detailed employee reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-x-2">
                <Button onClick={handleGenerateReport} disabled={isLoading}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
                {reports.length > 0 && (
                  <Button variant="outline" onClick={handleExportPDF}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {reports.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reports.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Attendance Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reports.length > 0 
                    ? (reports.reduce((sum, r) => sum + parseFloat(getAttendanceRate(r)), 0) / reports.length).toFixed(1)
                    : '0'}%
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reports.reduce((sum, r) => sum + r.attendance.totalHours, 0).toFixed(0)}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reports.reduce((sum, r) => sum + r.requests.pending, 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reports Table */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : reports.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Employee Performance Report</CardTitle>
              <CardDescription>
                Detailed breakdown of employee attendance, requests, and performance metrics
                {startDate && endDate && ` (${startDate} to ${endDate})`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Attendance Rate</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const attendanceRate = parseFloat(getAttendanceRate(report));
                    return (
                      <TableRow key={report.employee.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{report.employee.name}</div>
                            <div className="text-sm text-muted-foreground">{report.employee.position}</div>
                          </div>
                        </TableCell>
                        <TableCell>{report.employee.department}</TableCell>
                        <TableCell>
                          <div className={`font-medium ${getStatusColor(attendanceRate)}`}>
                            {attendanceRate}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {report.attendance.presentDays}/{report.attendance.totalDays} days
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{report.attendance.totalHours.toFixed(1)}h</div>
                          {report.attendance.absentDays > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {report.attendance.absentDays} absent
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {report.attendance.totalOvertimeHours.toFixed(1)}h
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              Total: {report.requests.total}
                            </div>
                            {report.requests.pending > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {report.requests.pending} pending
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedReport(report)}
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{report.employee.name} - Detailed Report</DialogTitle>
                                <DialogDescription>
                                  Comprehensive performance metrics and statistics
                                </DialogDescription>
                              </DialogHeader>
                              
                              {selectedReport && (
                                <div className="grid gap-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Attendance Summary</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>Total Days:</span>
                                          <span className="font-medium">{selectedReport.attendance.totalDays}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Present:</span>
                                          <span className="font-medium text-green-600">{selectedReport.attendance.presentDays}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Absent:</span>
                                          <span className="font-medium text-red-600">{selectedReport.attendance.absentDays}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Late:</span>
                                          <span className="font-medium text-yellow-600">{selectedReport.attendance.lateDays}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Total Hours:</span>
                                          <span className="font-medium">{selectedReport.attendance.totalHours.toFixed(1)}h</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Overtime:</span>
                                          <span className="font-medium">{selectedReport.attendance.totalOvertimeHours.toFixed(1)}h</span>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    
                                    <Card>
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Requests & Payroll</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span>Total Requests:</span>
                                          <span className="font-medium">{selectedReport.requests.total}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Pending:</span>
                                          <span className="font-medium text-yellow-600">{selectedReport.requests.pending}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Approved:</span>
                                          <span className="font-medium text-green-600">{selectedReport.requests.approved}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Rejected:</span>
                                          <span className="font-medium text-red-600">{selectedReport.requests.rejected}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Payroll Records:</span>
                                          <span className="font-medium">{selectedReport.payroll.records}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Total Earnings:</span>
                                          <span className="font-medium">${selectedReport.payroll.totalEarnings.toFixed(2)}</span>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reports generated</h3>
              <p className="text-muted-foreground text-center mb-4">
                Select a date range and click "Generate Report" to view employee performance data.
              </p>
              <Button onClick={handleGenerateReport} disabled={isLoading}>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}