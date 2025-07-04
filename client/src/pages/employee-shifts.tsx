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
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Users, Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import Header from '@/components/layout/header';

interface Employee {
  id: number;
  name: string;
  username: string;
  department?: string;
  position?: string;
}

interface WorkingHours {
  id: number;
  userId?: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  earliestCheckIn: string;
  latestCheckOut: string;
  workDays: string;
  breakDuration: number;
  isActive: boolean;
  user?: Employee;
}

interface ShiftFormData {
  userId?: number;
  shiftName: string;
  startTime: string;
  endTime: string;
  earliestCheckIn: string;
  latestCheckOut: string;
  workDays: number[];
  breakDuration: number;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const SHIFT_TEMPLATES = [
  {
    name: 'Standard Day Shift',
    startTime: '09:30',
    endTime: '17:00',
    earliestCheckIn: '08:00',
    latestCheckOut: '20:00',
    workDays: [2, 3, 4, 5, 6, 0], // Tue-Sun
    breakDuration: 60,
  },
  {
    name: 'Morning Shift',
    startTime: '06:00',
    endTime: '14:00',
    earliestCheckIn: '05:00',
    latestCheckOut: '15:00',
    workDays: [1, 2, 3, 4, 5], // Mon-Fri
    breakDuration: 30,
  },
  {
    name: 'Evening Shift',
    startTime: '14:00',
    endTime: '22:00',
    earliestCheckIn: '13:00',
    latestCheckOut: '23:00',
    workDays: [1, 2, 3, 4, 5], // Mon-Fri
    breakDuration: 60,
  },
  {
    name: 'Night Shift',
    startTime: '22:00',
    endTime: '06:00',
    earliestCheckIn: '21:00',
    latestCheckOut: '07:00',
    workDays: [0, 1, 2, 3, 4], // Sun-Thu
    breakDuration: 60,
  },
];

export default function EmployeeShifts() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkingHours | null>(null);
  const [formData, setFormData] = useState<ShiftFormData>({
    shiftName: '',
    startTime: '09:30',
    endTime: '17:00',
    earliestCheckIn: '08:00',
    latestCheckOut: '20:00',
    workDays: [2, 3, 4, 5, 6, 0],
    breakDuration: 60,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
  });

  // Fetch working hours/shifts
  const { data: shifts = [], isLoading } = useQuery<WorkingHours[]>({
    queryKey: ['/api/working-hours'],
  });

  // Create/update shift mutation
  const saveShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      const payload = {
        ...data,
        workDays: data.workDays.join(','),
      };

      if (editingShift) {
        return apiRequest(`/api/working-hours/${editingShift.id}`, 'PUT', payload);
      } else {
        return apiRequest('/api/working-hours', 'POST', payload);
      }
    },
    onSuccess: () => {
      toast({
        title: editingShift ? "Shift Updated" : "Shift Created",
        description: `Employee shift configuration has been ${editingShift ? 'updated' : 'created'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/working-hours'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save shift configuration.",
        variant: "destructive",
      });
    },
  });

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/working-hours/${id}`, 'DELETE', {});
    },
    onSuccess: () => {
      toast({
        title: "Shift Deleted",
        description: "Employee shift has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/working-hours'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete shift.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      shiftName: '',
      startTime: '09:30',
      endTime: '17:00',
      earliestCheckIn: '08:00',
      latestCheckOut: '20:00',
      workDays: [2, 3, 4, 5, 6, 0],
      breakDuration: 60,
    });
    setEditingShift(null);
  };

  const openModal = (shift?: WorkingHours) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        userId: shift.userId || undefined,
        shiftName: shift.shiftName,
        startTime: shift.startTime,
        endTime: shift.endTime,
        earliestCheckIn: shift.earliestCheckIn,
        latestCheckOut: shift.latestCheckOut,
        workDays: shift.workDays.split(',').map(d => parseInt(d.trim())),
        breakDuration: shift.breakDuration,
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveShiftMutation.mutate(formData);
  };

  const applyTemplate = (template: typeof SHIFT_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      shiftName: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      earliestCheckIn: template.earliestCheckIn,
      latestCheckOut: template.latestCheckOut,
      workDays: template.workDays,
      breakDuration: template.breakDuration,
    }));
  };

  const formatWorkDays = (workDaysStr: string) => {
    const days = workDaysStr.split(',').map(d => parseInt(d.trim()));
    return days.map(day => DAYS_OF_WEEK[day]?.label).join(', ');
  };

  const calculateHours = (startTime: string, endTime: string, breakDuration: number) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    
    // Handle overnight shifts
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    
    totalMinutes -= breakDuration;
    return (totalMinutes / 60).toFixed(1);
  };

  // Separate global and employee-specific shifts
  const globalShifts = shifts.filter(shift => !shift.userId);
  const employeeShifts = shifts.filter(shift => shift.userId);

  return (
    <>
      <Header 
        title="Employee Shift Configuration" 
        subtitle="Manage working hours and schedules for employees" 
      />
      
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            <Button onClick={() => openModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Shift
            </Button>
          </div>
        </div>

        {/* Global/Default Shifts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Default Shift Templates</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {globalShifts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No default shifts configured. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shift Name</TableHead>
                    <TableHead>Working Hours</TableHead>
                    <TableHead>Check-in Window</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Daily Hours</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {globalShifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.shiftName}</TableCell>
                      <TableCell>{shift.startTime} - {shift.endTime}</TableCell>
                      <TableCell>{shift.earliestCheckIn} - {shift.latestCheckOut}</TableCell>
                      <TableCell className="text-sm">{formatWorkDays(shift.workDays)}</TableCell>
                      <TableCell>{calculateHours(shift.startTime, shift.endTime, shift.breakDuration)}h</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openModal(shift)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => deleteShiftMutation.mutate(shift.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Employee-Specific Shifts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Employee-Specific Shifts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employeeShifts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No employee-specific shifts configured. Employees will use default shifts.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Shift Name</TableHead>
                    <TableHead>Working Hours</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Daily Hours</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeShifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">
                        {shift.user?.name || 'Unknown Employee'}
                      </TableCell>
                      <TableCell>{shift.user?.department || '-'}</TableCell>
                      <TableCell>{shift.shiftName}</TableCell>
                      <TableCell>{shift.startTime} - {shift.endTime}</TableCell>
                      <TableCell className="text-sm">{formatWorkDays(shift.workDays)}</TableCell>
                      <TableCell>{calculateHours(shift.startTime, shift.endTime, shift.breakDuration)}h</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openModal(shift)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => deleteShiftMutation.mutate(shift.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Shift Configuration Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingShift ? 'Edit Shift Configuration' : 'Create New Shift'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Shift Templates */}
              <div>
                <Label>Quick Templates</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SHIFT_TEMPLATES.map((template) => (
                    <Button
                      key={template.name}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyTemplate(template)}
                    >
                      {template.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Selection */}
                <div>
                  <Label>Employee (Optional)</Label>
                  <Select 
                    value={formData.userId?.toString() || ''} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      userId: value ? parseInt(value) : undefined 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee or leave blank for default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Default/Global Shift</SelectItem>
                      {employees.filter(emp => emp.id !== 1).map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name} ({emp.department})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Shift Name */}
                <div>
                  <Label>Shift Name</Label>
                  <Input
                    value={formData.shiftName}
                    onChange={(e) => setFormData(prev => ({ ...prev, shiftName: e.target.value }))}
                    placeholder="e.g., Morning Shift"
                    required
                  />
                </div>

                {/* Start Time */}
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>

                {/* End Time */}
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    required
                  />
                </div>

                {/* Earliest Check-in */}
                <div>
                  <Label>Earliest Check-in</Label>
                  <Input
                    type="time"
                    value={formData.earliestCheckIn}
                    onChange={(e) => setFormData(prev => ({ ...prev, earliestCheckIn: e.target.value }))}
                    required
                  />
                </div>

                {/* Latest Check-out */}
                <div>
                  <Label>Latest Check-out</Label>
                  <Input
                    type="time"
                    value={formData.latestCheckOut}
                    onChange={(e) => setFormData(prev => ({ ...prev, latestCheckOut: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Working Days */}
              <div>
                <Label>Working Days</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={formData.workDays.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              workDays: [...prev.workDays, day.value].sort()
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              workDays: prev.workDays.filter(d => d !== day.value)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`day-${day.value}`} className="text-sm">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Break Duration */}
              <div>
                <Label>Break Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.breakDuration}
                  onChange={(e) => setFormData(prev => ({ ...prev, breakDuration: parseInt(e.target.value) }))}
                  min="0"
                  max="480"
                  required
                />
              </div>

              {/* Calculated Hours */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <strong>Calculated Daily Hours:</strong> {calculateHours(formData.startTime, formData.endTime, formData.breakDuration)}h
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveShiftMutation.isPending}>
                  {saveShiftMutation.isPending ? 'Saving...' : (editingShift ? 'Update' : 'Create')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}