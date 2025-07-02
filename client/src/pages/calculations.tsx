import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Calculator, DollarSign, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const attendanceCalculationSchema = z.object({
  userId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

const payrollCalculationSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  month: z.string().min(1, "Month is required"),
  year: z.string().min(1, "Year is required"),
  baseSalary: z.string().min(1, "Base salary is required"),
  overtimeRate: z.string().optional(),
});

type AttendanceCalculationData = z.infer<typeof attendanceCalculationSchema>;
type PayrollCalculationData = z.infer<typeof payrollCalculationSchema>;

export default function Calculations() {
  const { toast } = useToast();
  const [attendanceResult, setAttendanceResult] = useState<any>(null);
  const [payrollResult, setPayrollResult] = useState<any>(null);

  // Get all users for selection
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
  });

  const attendanceForm = useForm<AttendanceCalculationData>({
    resolver: zodResolver(attendanceCalculationSchema),
    defaultValues: {
      userId: "",
      startDate: "",
      endDate: "",
    },
  });

  const payrollForm = useForm<PayrollCalculationData>({
    resolver: zodResolver(payrollCalculationSchema),
    defaultValues: {
      userId: "",
      month: "",
      year: new Date().getFullYear().toString(),
      baseSalary: "",
      overtimeRate: "1.5",
    },
  });

  const attendanceCalculation = useMutation({
    mutationFn: async (data: AttendanceCalculationData) => {
      return await apiRequest("/api/attendance/calculate", "POST", {
        userId: data.userId && data.userId !== "all" ? parseInt(data.userId) : undefined,
        startDate: data.startDate,
        endDate: data.endDate,
      });
    },
    onSuccess: (data) => {
      setAttendanceResult(data);
      toast({
        title: "Success",
        description: "Attendance calculated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to calculate attendance",
        variant: "destructive",
      });
    },
  });

  const payrollCalculation = useMutation({
    mutationFn: async (data: PayrollCalculationData) => {
      return await apiRequest("/api/payroll/calculate", "POST", {
        userId: parseInt(data.userId),
        month: parseInt(data.month),
        year: parseInt(data.year),
        baseSalary: parseFloat(data.baseSalary),
        overtimeRate: data.overtimeRate ? parseFloat(data.overtimeRate) : 1.5,
      });
    },
    onSuccess: (data) => {
      setPayrollResult(data);
      toast({
        title: "Success",
        description: "Payroll calculated and saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to calculate payroll",
        variant: "destructive",
      });
    },
  });

  const onAttendanceSubmit = (data: AttendanceCalculationData) => {
    attendanceCalculation.mutate(data);
  };

  const onPayrollSubmit = (data: PayrollCalculationData) => {
    payrollCalculation.mutate(data);
  };

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calculations</h1>
        <p className="text-muted-foreground">
          Calculate attendance statistics and generate payroll
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Attendance Calculation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Attendance Calculation
            </CardTitle>
            <CardDescription>
              Calculate attendance statistics for employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...attendanceForm}>
              <form onSubmit={attendanceForm.handleSubmit(onAttendanceSubmit)} className="space-y-4">
                <FormField
                  control={attendanceForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee (Optional - leave empty for all)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee or leave empty for all" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Employees</SelectItem>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={attendanceForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={attendanceForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={attendanceCalculation.isPending}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  {attendanceCalculation.isPending ? "Calculating..." : "Calculate Attendance"}
                </Button>
              </form>
            </Form>

            {attendanceResult && (
              <div className="mt-6 space-y-4">
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Professional Attendance Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {/* Core Metrics */}
                    <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800">Core Attendance</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Working Days:</span>
                          <Badge variant="secondary">{attendanceResult.calculations.workingDays}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Present:</span>
                          <Badge variant="default">{attendanceResult.calculations.presentDays}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Absent:</span>
                          <Badge variant="destructive">{attendanceResult.calculations.absentDays}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Attendance Rate:</span>
                          <Badge variant="default">{attendanceResult.calculations.attendanceRate}%</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="space-y-3 p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800">Performance</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Late Days:</span>
                          <Badge variant="outline">{attendanceResult.calculations.lateDays}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Early Departures:</span>
                          <Badge variant="outline">{attendanceResult.calculations.earlyDepartures}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Punctuality Rate:</span>
                          <Badge variant="default">{attendanceResult.calculations.punctualityRate}%</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>On-Time Ratio:</span>
                          <Badge variant="default">{attendanceResult.calculations.productivity?.onTimeRatio?.toFixed(1)}%</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Hours Analysis */}
                    <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800">Hours Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Hours:</span>
                          <Badge variant="secondary">{attendanceResult.calculations.totalHours}h</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Overtime:</span>
                          <Badge variant="outline">{attendanceResult.calculations.totalOvertimeHours}h</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Daily:</span>
                          <Badge variant="secondary">{attendanceResult.calculations.avgHoursPerDay}h</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Break Time:</span>
                          <Badge variant="outline">{attendanceResult.calculations.totalBreakTime}h</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payroll Calculation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payroll Calculation
            </CardTitle>
            <CardDescription>
              Calculate and generate payroll for an employee
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...payrollForm}>
              <form onSubmit={payrollForm.handleSubmit(onPayrollSubmit)} className="space-y-4">
                <FormField
                  control={payrollForm.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={payrollForm.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {months.map((month) => (
                              <SelectItem key={month.value} value={month.value}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={payrollForm.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} placeholder="2025" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={payrollForm.control}
                    name="baseSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Salary</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} placeholder="5000.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={payrollForm.control}
                    name="overtimeRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overtime Rate</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} placeholder="1.5" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={payrollCalculation.isPending}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {payrollCalculation.isPending ? "Calculating..." : "Calculate & Save Payroll"}
                </Button>
              </form>
            </Form>

            {payrollResult && (
              <div className="mt-6 space-y-4">
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Professional Payroll Analysis
                  </h3>
                  
                  {/* Attendance Summary */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">Attendance Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">{payrollResult.attendance?.expectedWorkingDays || 0}</div>
                        <div className="text-gray-600">Expected Days</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{payrollResult.attendance?.presentDays || 0}</div>
                        <div className="text-gray-600">Present Days</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{payrollResult.attendance?.absentDays || 0}</div>
                        <div className="text-gray-600">Absent Days</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-orange-600">{payrollResult.attendance?.attendanceRate || 0}%</div>
                        <div className="text-gray-600">Attendance Rate</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {/* Hours Breakdown */}
                    <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800">Hours Analysis</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Expected:</span>
                          <Badge variant="secondary">{payrollResult.hours?.expectedHours || 0}h</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Worked:</span>
                          <Badge variant="default">{payrollResult.hours?.totalHours || 0}h</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Regular:</span>
                          <Badge variant="outline">{payrollResult.hours?.regularHours || 0}h</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Overtime:</span>
                          <Badge variant="outline">{payrollResult.hours?.overtimeHours || 0}h</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Bonus:</span>
                          <Badge variant="outline">{payrollResult.hours?.bonusHours || 0}h</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Salary Components */}
                    <div className="space-y-3 p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800">Earnings</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Base Salary:</span>
                          <Badge variant="secondary">${payrollResult.salary?.baseSalary || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Regular Pay:</span>
                          <Badge variant="default">${payrollResult.salary?.regularPay || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Overtime Pay:</span>
                          <Badge variant="outline">${payrollResult.salary?.overtimePay || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Bonus Pay:</span>
                          <Badge variant="outline">${payrollResult.salary?.bonusPay || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Attendance Bonus:</span>
                          <Badge variant="outline">${payrollResult.salary?.attendanceBonus || 0}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Penalties */}
                    <div className="space-y-3 p-3 bg-orange-50 rounded-lg">
                      <h4 className="font-medium text-orange-800">Penalties</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Late Penalty:</span>
                          <Badge variant="destructive">${payrollResult.salary?.latePenalty || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Absent Penalty:</span>
                          <Badge variant="destructive">${payrollResult.salary?.absentPenalty || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Gross Salary:</span>
                          <Badge variant="default">${payrollResult.salary?.grossSalary || 0}</Badge>
                        </div>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="space-y-3 p-3 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-800">Deductions</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Income Tax:</span>
                          <Badge variant="destructive">${payrollResult.deductions?.incomeTax || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Social Security:</span>
                          <Badge variant="outline">${payrollResult.deductions?.socialSecurity || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Medicare:</span>
                          <Badge variant="outline">${payrollResult.deductions?.medicare || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Health Insurance:</span>
                          <Badge variant="outline">${payrollResult.deductions?.healthInsurance || 0}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Provident Fund:</span>
                          <Badge variant="outline">${payrollResult.deductions?.providentFund || 0}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Final Net Salary */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-green-100 to-blue-100 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-gray-800">Final Net Salary</h4>
                        <p className="text-sm text-gray-600">After all deductions and bonuses</p>
                      </div>
                      <Badge variant="default" className="text-xl px-6 py-2 bg-green-600 hover:bg-green-700">
                        ${payrollResult.netSalary || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}