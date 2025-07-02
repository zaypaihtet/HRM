import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DollarSign, Clock, FileText, Download, Play, Eye, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generatePayslipPDF } from "@/lib/pdf";
import Header from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Payroll() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payrollData, isLoading } = useQuery({
    queryKey: ["/api/payroll", selectedMonth, selectedYear],
  });

  const runPayrollMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/payroll/run", {
        month: selectedMonth,
        year: selectedYear,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Payroll processed",
        description: `Successfully processed payroll for ${data.records} employees.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
    },
    onError: () => {
      toast({
        title: "Payroll failed",
        description: "Failed to process payroll. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGeneratePayslip = (payroll: any) => {
    if (!payroll.user) return;
    
    const payslipData = {
      employee: {
        name: payroll.user.name,
        id: `EMP${payroll.user.id.toString().padStart(3, '0')}`,
        position: payroll.user.position || "Employee",
        department: payroll.user.department || "General",
      },
      period: {
        month: new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' }),
        year: selectedYear,
      },
      salary: {
        base: parseFloat(payroll.baseSalary),
        overtime: parseFloat(payroll.overtimePay),
        deductions: parseFloat(payroll.deductions),
        net: parseFloat(payroll.netPay),
      },
      attendance: {
        daysWorked: 22, // Mock value
        overtimeHours: parseFloat(payroll.overtimePay) / 25, // Mock calculation
      },
    };

    generatePayslipPDF(payslipData);
    toast({
      title: "Payslip generated",
      description: `Payslip for ${payroll.user.name} has been downloaded.`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return <Badge variant="default" className="status-processed">Processed</Badge>;
      case "pending":
        return <Badge variant="secondary" className="status-pending">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const calculateTotals = () => {
    if (!payrollData) return { total: 0, overtime: 0, payslips: 0 };
    
    const total = payrollData.reduce((sum: number, p: any) => sum + parseFloat(p.netPay), 0);
    const overtime = payrollData.reduce((sum: number, p: any) => sum + parseFloat(p.overtimePay), 0);
    
    return {
      total,
      overtime,
      payslips: payrollData.length,
    };
  };

  const totals = calculateTotals();

  return (
    <>
      <Header 
        title="Payroll Management" 
        subtitle="Process payroll and generate payslips" 
      />
      
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payroll</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ${totals.total.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-success text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Overtime Pay</p>
                  <p className="text-2xl font-bold text-warning">
                    ${totals.overtime.toLocaleString()}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Payslips Generated</p>
                  <p className="text-2xl font-bold text-primary">
                    {totals.payslips}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-primary text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Management */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Payroll Management</h3>
              <div className="flex items-center space-x-4">
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => runPayrollMutation.mutate()}
                  disabled={runPayrollMutation.isPending}
                  className="btn-success"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {runPayrollMutation.isPending ? "Processing..." : "Run Payroll"}
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
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
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : payrollData?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payroll records found for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payrollData?.map((record: any) => (
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
                              <p className="text-sm text-muted-foreground">
                                EMP{record.user?.id.toString().padStart(3, '0')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          ${parseFloat(record.baseSalary).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          ${parseFloat(record.overtimePay).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          ${parseFloat(record.deductions).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-800">
                          ${parseFloat(record.netPay).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(record.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleGeneratePayslip(record)}
                              title="Generate Payslip"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Send Email">
                              <Mail className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="View Details">
                              <Eye className="w-4 h-4" />
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
      </div>
    </>
  );
}
