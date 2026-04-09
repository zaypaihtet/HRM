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
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Users, Edit, Plus, Save, X, Calendar } from 'lucide-react';
import Header from '@/components/layout/header';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

interface Employee {
  id: number;
  name: string;
  username: string;
  department?: string;
  position?: string;
}

interface WorkingHours {
  id: number;
  userId: number;
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

// Predefined shift templates
const SHIFT_TEMPLATES = [
  {
    name: "Standard Day",
    startTime: "09:30",
    endTime: "17:00",
    earliestCheckIn: "08:00",
    latestCheckOut: "20:00",
    workDays: "2,3,4,5,6,0", // Tue-Sun
    breakDuration: 60
  },
  {
    name: "Morning Shift",
    startTime: "06:00",
    endTime: "14:00",
    earliestCheckIn: "05:00",
    latestCheckOut: "16:00",
    workDays: "1,2,3,4,5,6,0", // Mon-Sun
    breakDuration: 45
  },
  {
    name: "Evening Shift",
    startTime: "14:00",
    endTime: "22:00",
    earliestCheckIn: "13:00",
    latestCheckOut: "23:00",
    workDays: "1,2,3,4,5,6,0", // Mon-Sun
    breakDuration: 45
  },
  {
    name: "Night Shift",
    startTime: "22:00",
    endTime: "06:00",
    earliestCheckIn: "21:00",
    latestCheckOut: "08:00",
    workDays: "1,2,3,4,5,6,0", // Mon-Sun
    breakDuration: 60
  }
];

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" }
];

// Form validation schema
const shiftSchema = z.object({
  userId: z.number().min(1, 'Employee is required'),
  shiftName: z.string().min(1, 'Shift name is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  earliestCheckIn: z.string().min(1, 'Earliest check-in is required'),
  latestCheckOut: z.string().min(1, 'Latest check-out is required'),
  workDays: z.array(z.string()).min(1, 'At least one work day is required'),
  breakDuration: z.number().min(0).max(480),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

export default function EmployeeShifts() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<WorkingHours | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/users'],
  });

  // Fetch working hours
  const { data: workingHours = [], isLoading } = useQuery<WorkingHours[]>({
    queryKey: ['/api/working-hours'],
  });

  // Create form
  const createForm = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      userId: 0,
      shiftName: '',
      startTime: '09:30',
      endTime: '17:00',
      earliestCheckIn: '08:00',
      latestCheckOut: '20:00',
      workDays: ['2', '3', '4', '5', '6', '0'],
      breakDuration: 60,
    },
  });

  // Edit form
  const editForm = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      userId: 0,
      shiftName: '',
      startTime: '09:30',
      endTime: '17:00',
      earliestCheckIn: '08:00',
      latestCheckOut: '20:00',
      workDays: ['2', '3', '4', '5', '6', '0'],
      breakDuration: 60,
    },
  });

  // Create shift mutation
  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      const payload = {
        ...data,
        workDays: data.workDays.join(','),
        isActive: true,
      };
      return apiRequest('POST', '/api/working-hours', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/working-hours'] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: 'Success',
        description: 'Employee shift created successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create shift.',
        variant: 'destructive',
      });
    },
  });

  // Update shift mutation
  const updateShiftMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<ShiftFormData> }) => {
      const payload = {
        ...data.updates,
        workDays: data.updates.workDays?.join(','),
      };
      return apiRequest('PATCH', `/api/working-hours/${data.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/working-hours'] });
      setIsEditDialogOpen(false);
      setEditingShift(null);
      editForm.reset();
      toast({
        title: 'Success',
        description: 'Employee shift updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update shift.',
        variant: 'destructive',
      });
    },
  });

  // Delete shift mutation
  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/working-hours/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/working-hours'] });
      toast({
        title: 'Success',
        description: 'Employee shift deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete shift.',
        variant: 'destructive',
      });
    },
  });

  // Handle template selection
  const handleTemplateChange = (templateName: string, form: any) => {
    setSelectedTemplate(templateName);
    const template = SHIFT_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      form.setValue('shiftName', template.name);
      form.setValue('startTime', template.startTime);
      form.setValue('endTime', template.endTime);
      form.setValue('earliestCheckIn', template.earliestCheckIn);
      form.setValue('latestCheckOut', template.latestCheckOut);
      form.setValue('workDays', template.workDays.split(','));
      form.setValue('breakDuration', template.breakDuration);
    }
  };

  // Handle editing a shift
  const handleEditShift = (shift: WorkingHours) => {
    setEditingShift(shift);
    editForm.reset({
      userId: shift.userId,
      shiftName: shift.shiftName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      earliestCheckIn: shift.earliestCheckIn,
      latestCheckOut: shift.latestCheckOut,
      workDays: shift.workDays.split(','),
      breakDuration: shift.breakDuration,
    });
    setIsEditDialogOpen(true);
  };

  // Get employees without shifts
  const employeesWithoutShifts = employees.filter(emp => 
    emp.id !== 1 && // Exclude admin
    !workingHours.some(wh => wh.userId === emp.id)
  );

  // Format work days for display
  const formatWorkDays = (workDays: string) => {
    const days = workDays.split(',').map(d => {
      const day = DAYS_OF_WEEK.find(dow => dow.value === d);
      return day ? day.label.slice(0, 3) : '';
    });
    return days.join(', ');
  };

  // Create form submission
  const onCreateSubmit = (data: ShiftFormData) => {
    createShiftMutation.mutate(data);
  };

  // Edit form submission
  const onEditSubmit = (data: ShiftFormData) => {
    if (!editingShift) return;
    updateShiftMutation.mutate({
      id: editingShift.id,
      updates: data,
    });
  };

  return (
    <>
      <Header 
        title="Employee Shifts" 
        subtitle="Manage individual employee working hours and shift schedules" 
      />
      
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{workingHours.length}</p>
                  <p className="text-sm text-gray-600">Configured Shifts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{employeesWithoutShifts.length}</p>
                  <p className="text-sm text-gray-600">Needs Configuration</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{SHIFT_TEMPLATES.length}</p>
                  <p className="text-sm text-gray-600">Shift Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Shifts Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Employee Shift Configuration</CardTitle>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Employee Shift
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading shifts...</div>
            ) : workingHours.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No employee shifts configured yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Shift Name</TableHead>
                    <TableHead>Working Hours</TableHead>
                    <TableHead>Check-in Window</TableHead>
                    <TableHead>Work Days</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workingHours.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">
                        {shift.user?.name || `User ID: ${shift.userId}`}
                        <div className="text-sm text-gray-500">
                          {shift.user?.department}
                        </div>
                      </TableCell>
                      <TableCell>{shift.shiftName}</TableCell>
                      <TableCell>
                        {shift.startTime} - {shift.endTime}
                      </TableCell>
                      <TableCell>
                        {shift.earliestCheckIn} - {shift.latestCheckOut}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatWorkDays(shift.workDays)}
                      </TableCell>
                      <TableCell>{shift.breakDuration}min</TableCell>
                      <TableCell>
                        <Badge variant={shift.isActive ? "default" : "secondary"}>
                          {shift.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditShift(shift)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteShiftMutation.mutate(shift.id)}
                          >
                            <X className="w-4 h-4" />
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

        {/* Employees Without Shifts */}
        {employeesWithoutShifts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Employees Needing Shift Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employeesWithoutShifts.map((employee) => (
                  <div key={employee.id} className="border rounded-lg p-4">
                    <h4 className="font-medium">{employee.name}</h4>
                    <p className="text-sm text-gray-600">{employee.department}</p>
                    <p className="text-sm text-gray-600">{employee.position}</p>
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        createForm.setValue('userId', employee.id);
                        setIsCreateDialogOpen(true);
                      }}
                    >
                      Configure Shift
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Shift Dialog */}
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create Employee Shift</DialogTitle>
        </DialogHeader>
        
        <Form {...createForm}>
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Template Selection */}
              <div className="col-span-2">
                <Label>Quick Templates</Label>
                <Select onValueChange={(value) => handleTemplateChange(value, createForm)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFT_TEMPLATES.map((template) => (
                      <SelectItem key={template.name} value={template.name}>
                        {template.name} ({template.startTime} - {template.endTime})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Selection */}
              <FormField
                control={createForm.control}
                name="userId"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.filter(emp => emp.id !== 1).map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name} ({emp.department})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Shift Name */}
              <FormField
                control={createForm.control}
                name="shiftName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Morning Shift" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Break Duration */}
              <FormField
                control={createForm.control}
                name="breakDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Break Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Working Hours */}
              <FormField
                control={createForm.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Check-in Window */}
              <FormField
                control={createForm.control}
                name="earliestCheckIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Earliest Check-in</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="latestCheckOut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latest Check-out</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Work Days */}
              <FormField
                control={createForm.control}
                name="workDays"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Work Days</FormLabel>
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day.value} className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value.includes(day.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                field.onChange([...field.value, day.value]);
                              } else {
                                field.onChange(field.value.filter(d => d !== day.value));
                              }
                            }}
                          />
                          <Label className="text-sm">{day.label.slice(0, 3)}</Label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createShiftMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {createShiftMutation.isPending ? 'Creating...' : 'Create Shift'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      {/* Edit Shift Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Edit Employee Shift</DialogTitle>
          </DialogHeader>
          
          {editingShift && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Employee Info (read-only) */}
                  <div className="col-span-2 bg-gray-50 p-3 rounded-lg">
                    <h4 className="font-medium text-sm text-gray-700">Employee</h4>
                    <p className="text-sm">{editingShift.user?.name || `User ID: ${editingShift.userId}`}</p>
                    <p className="text-xs text-gray-500">{editingShift.user?.department}</p>
                  </div>

                  {/* Same form fields as create, but with edit form */}
                  <FormField
                    control={editForm.control}
                    name="shiftName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shift Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Morning Shift" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="breakDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Break Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="earliestCheckIn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Earliest Check-in</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="latestCheckOut"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latest Check-out</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="workDays"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Work Days</FormLabel>
                        <div className="grid grid-cols-7 gap-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <div key={day.value} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value.includes(day.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    field.onChange([...field.value, day.value]);
                                  } else {
                                    field.onChange(field.value.filter(d => d !== day.value));
                                  }
                                }}
                              />
                              <Label className="text-sm">{day.label.slice(0, 3)}</Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateShiftMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {updateShiftMutation.isPending ? 'Saving...' : 'Save Changes'}
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