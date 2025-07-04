import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Download, FileText, Clock, Users, TrendingUp, Edit, Save, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import Header from '@/components/layout/header';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceRecord {
  id: number;
  userId: number;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  location: string;
  notes?: string;
  hoursWorked?: number | null;
  user?: {
    id: number;
    name: string;
    username: string;
    department?: string;
    position?: string;
  };
}

interface Employee {
  id: number;
  name: string;
  username: string;
  department?: string;
  position?: string;
}

// Form validation schema
const editAttendanceSchema = z.object({
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  hoursWorked: z.number().min(0).max(24).optional(),
  notes: z.string().optional(),
});

type EditAttendanceFormData = z.infer<typeof editAttendanceSchema>;

export default function AttendanceReports() {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'custom'>('monthly');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
  });

  // Fetch attendance records with date range
  const { data: attendanceRecords = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['/api/attendance', startDate, endDate, selectedEmployee],
  });

  // Edit form
  const form = useForm<EditAttendanceFormData>({
    resolver: zodResolver(editAttendanceSchema),
    defaultValues: {
      checkInTime: '',
      checkOutTime: '',
      status: '',
      hoursWorked: 0,
      notes: '',
    },
  });

  // Update attendance mutation
  const updateAttendanceMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<AttendanceRecord> }) => {
      return apiRequest('PATCH', `/api/attendance/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      form.reset();
      toast({
        title: 'Success',
        description: 'Attendance record updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update attendance record.',
        variant: 'destructive',
      });
    },
  });

  const handleReportTypeChange = (type: 'daily' | 'monthly' | 'custom') => {
    setReportType(type);
    const now = new Date();
    
    switch (type) {
      case 'daily':
        setStartDate(format(now, 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'monthly':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'custom':
        // Keep current dates
        break;
    }
  };

  const generatePreviousMonth = () => {
    const prevMonth = subMonths(new Date(), 1);
    setStartDate(format(startOfMonth(prevMonth), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(prevMonth), 'yyyy-MM-dd'));
  };

  const generateCurrentMonth = () => {
    const now = new Date();
    setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
  };

  // Helper function to safely parse hours worked
  const parseHoursWorked = (hoursWorked: number | string | null | undefined): number => {
    if (hoursWorked === null || hoursWorked === undefined) return 0;
    const parsed = parseFloat(hoursWorked.toString());
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper function to format hours
  const formatHours = (hours: number | null | undefined): string => {
    const parsed = parseHoursWorked(hours);
    return parsed > 0 ? `${parsed.toFixed(1)}h` : '-';
  };

  // Handle editing a record
  const handleEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record);
    form.reset({
      checkInTime: record.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : '',
      checkOutTime: record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : '',
      status: record.status,
      hoursWorked: parseHoursWorked(record.hoursWorked),
      notes: record.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  // Handle form submission
  const onSubmit = (data: EditAttendanceFormData) => {
    if (!editingRecord) return;

    const updates: Partial<AttendanceRecord> = {
      status: data.status,
      hoursWorked: data.hoursWorked || 0,
      notes: data.notes,
    };

    // Add time updates if provided
    if (data.checkInTime) {
      const checkInDate = new Date(editingRecord.date);
      const [hours, minutes] = data.checkInTime.split(':');
      checkInDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      updates.checkInTime = checkInDate.toISOString();
    }

    if (data.checkOutTime) {
      const checkOutDate = new Date(editingRecord.date);
      const [hours, minutes] = data.checkOutTime.split(':');
      checkOutDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      updates.checkOutTime = checkOutDate.toISOString();
    }

    updateAttendanceMutation.mutate({
      id: editingRecord.id,
      updates,
    });
  };

  // Calculate statistics
  const totalRecords = attendanceRecords?.length || 0;
  const presentDays = attendanceRecords?.filter(r => r.status === 'present').length || 0;
  const absentDays = attendanceRecords?.filter(r => r.status === 'absent').length || 0;
  const lateDays = attendanceRecords?.filter(r => r.status === 'late').length || 0;
  const totalHours = attendanceRecords?.reduce((sum, r) => sum + parseHoursWorked(r.hoursWorked), 0) || 0;
  const avgHoursPerDay = presentDays > 0 ? (totalHours / presentDays) : 0;

  // Group by employee for summary
  const employeeSummary = employees?.map(emp => {
    const empRecords = attendanceRecords?.filter(r => r.userId === emp.id) || [];
    const empPresent = empRecords.filter(r => r.status === 'present').length;
    const empAbsent = empRecords.filter(r => r.status === 'absent').length;
    const empLate = empRecords.filter(r => r.status === 'late').length;
    const empHours = empRecords.reduce((sum, r) => sum + parseHoursWorked(r.hoursWorked), 0);
    
    return {
      employee: emp,
      totalDays: empRecords.length,
      presentDays: empPresent,
      absentDays: empAbsent,
      lateDays: empLate,
      totalHours: empHours,
      attendanceRate: empRecords.length > 0 ? (empPresent / empRecords.length * 100) : 0,
    };
  }).filter(summary => summary.totalDays > 0) || [];

  const downloadReport = () => {
    if (!attendanceRecords || attendanceRecords.length === 0) {
      toast({
        title: 'No Data',
        description: 'No attendance records to export.',
        variant: 'destructive',
      });
      return;
    }

    // Generate CSV data
    const csvData = [
      ['Date', 'Employee', 'Department', 'Check In', 'Check Out', 'Status', 'Hours Worked', 'Location', 'Notes'],
      ...attendanceRecords.map(record => [
        record.date,
        record.user?.name || 'Unknown',
        record.user?.department || '',
        record.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : '',
        record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : '',
        record.status,
        parseHoursWorked(record.hoursWorked).toFixed(2),
        record.location || '',
        record.notes || ''
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header 
        title="Attendance Reports" 
        subtitle="Generate and analyze attendance reports with date range filtering" 
      />
      
      <div className="space-y-6">
        {/* Report Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Report Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Report Type */}
              <div>
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={handleReportTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Today</SelectItem>
                    <SelectItem value="monthly">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Filter */}
              <div>
                <Label htmlFor="employee">Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.filter(emp => emp.id !== 1).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name} ({emp.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* End Date */}
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex space-x-2 mt-4">
              <Button variant="outline" onClick={generateCurrentMonth}>
                Current Month
              </Button>
              <Button variant="outline" onClick={generatePreviousMonth}>
                Previous Month
              </Button>
              <Button onClick={downloadReport} className="ml-auto">
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{totalRecords}</p>
                  <p className="text-sm text-gray-600">Total Records</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{presentDays}</p>
                  <p className="text-sm text-gray-600">Present Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{absentDays}</p>
                  <p className="text-sm text-gray-600">Absent Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{lateDays}</p>
                  <p className="text-sm text-gray-600">Late Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
                  <p className="text-sm text-gray-600">Total Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Summary */}
        {selectedEmployee === 'all' && (
          <Card>
            <CardHeader>
              <CardTitle>Employee Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Present Days</TableHead>
                    <TableHead>Absent Days</TableHead>
                    <TableHead>Late Days</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Attendance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeSummary.map((summary) => (
                    <TableRow key={summary.employee.id}>
                      <TableCell className="font-medium">{summary.employee.name}</TableCell>
                      <TableCell>{summary.employee.department}</TableCell>
                      <TableCell>{summary.presentDays}</TableCell>
                      <TableCell>{summary.absentDays}</TableCell>
                      <TableCell>{summary.lateDays}</TableCell>
                      <TableCell>{summary.totalHours.toFixed(1)}h</TableCell>
                      <TableCell>
                        <Badge 
                          variant={summary.attendanceRate >= 90 ? "default" : summary.attendanceRate >= 80 ? "secondary" : "destructive"}
                        >
                          {summary.attendanceRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Detailed Records */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading attendance records...</div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No attendance records found for the selected criteria.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="font-medium">
                        {record.user?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {record.checkInTime ? format(new Date(record.checkInTime), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {record.checkOutTime ? format(new Date(record.checkOutTime), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            record.status === 'present' ? 'default' :
                            record.status === 'late' ? 'secondary' :
                            record.status === 'absent' ? 'destructive' : 'outline'
                          }
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatHours(record.hoursWorked)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {record.location && record.location.length > 30 ? `${record.location.substring(0, 30)}...` : record.location || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRecord(record)}
                          className="h-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Attendance Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Attendance Record</DialogTitle>
          </DialogHeader>
          
          {editingRecord && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Employee Info */}
                  <div className="col-span-2 bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-700">Employee Details</h4>
                    <p className="text-sm">{editingRecord.user?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{format(new Date(editingRecord.date), 'EEEE, MMM dd, yyyy')}</p>
                  </div>

                  {/* Check In Time */}
                  <FormField
                    control={form.control}
                    name="checkInTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check In Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            placeholder="HH:mm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Check Out Time */}
                  <FormField
                    control={form.control}
                    name="checkOutTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check Out Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            placeholder="HH:mm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="late">Late</SelectItem>
                            <SelectItem value="on_leave">On Leave</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Hours Worked */}
                  <FormField
                    control={form.control}
                    name="hoursWorked"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours Worked</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="24"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add any notes about this attendance record..."
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingRecord(null);
                      form.reset();
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateAttendanceMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateAttendanceMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}