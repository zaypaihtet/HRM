import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, User as UserIcon, Mail, Building, Briefcase, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertUserSchema, type User as UserType } from "@shared/schema";
import Header from "@/components/layout/header";
import { Clock, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const employeeFormSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Please confirm password"),
  baseSalary: z.string().min(1, "Base salary is required"),
  // Working hours fields
  shiftName: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  earliestCheckIn: z.string().optional(),
  latestCheckOut: z.string().optional(),
  workDays: z.array(z.number()).optional(),
  breakDuration: z.string().optional(),
  assignShift: z.boolean().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

// Predefined shift templates
const SHIFT_TEMPLATES = [
  {
    name: "Standard Day",
    startTime: "09:30",
    endTime: "17:00",
    earliestCheckIn: "08:00",
    latestCheckOut: "20:00",
    workDays: [2, 3, 4, 5, 6, 0], // Tue-Sun
    breakDuration: 60
  },
  {
    name: "Morning Shift",
    startTime: "06:00",
    endTime: "14:00",
    earliestCheckIn: "05:00",
    latestCheckOut: "16:00",
    workDays: [1, 2, 3, 4, 5, 6, 0], // Mon-Sun
    breakDuration: 45
  },
  {
    name: "Evening Shift",
    startTime: "14:00",
    endTime: "22:00",
    earliestCheckIn: "13:00",
    latestCheckOut: "23:00",
    workDays: [1, 2, 3, 4, 5, 6, 0], // Mon-Sun
    breakDuration: 45
  },
  {
    name: "Night Shift",
    startTime: "22:00",
    endTime: "06:00",
    earliestCheckIn: "21:00",
    latestCheckOut: "08:00",
    workDays: [1, 2, 3, 4, 5, 6, 0], // Mon-Sun
    breakDuration: 60
  }
];

const DAYS_OF_WEEK = [
  { id: 0, name: "Sunday", short: "Sun" },
  { id: 1, name: "Monday", short: "Mon" },
  { id: 2, name: "Tuesday", short: "Tue" },
  { id: 3, name: "Wednesday", short: "Wed" },
  { id: 4, name: "Thursday", short: "Thu" },
  { id: 5, name: "Friday", short: "Fri" },
  { id: 6, name: "Saturday", short: "Sat" },
];

export default function Employees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserType | null>(null);
  const { toast } = useToast();

  const { data: employees = [], isLoading } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      role: "employee",
      name: "",
      email: "",
      department: "",
      position: "",
      baseSalary: "",
      // Working hours defaults
      assignShift: false,
      shiftName: "Standard Day",
      startTime: "09:30",
      endTime: "17:00",
      earliestCheckIn: "08:00",
      latestCheckOut: "20:00",
      workDays: [2, 3, 4, 5, 6, 0], // Tue-Sun
      breakDuration: "60",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const { confirmPassword, baseSalary, assignShift, shiftName, startTime, endTime, earliestCheckIn, latestCheckOut, workDays, breakDuration, ...employeeData } = data;
      
      // Create employee first
      const response = await apiRequest("POST", "/api/users", {
        ...employeeData,
        baseSalary: parseFloat(baseSalary),
      });
      const newEmployee = await response.json();
      
      // Create working hours if shift is assigned
      if (assignShift && newEmployee.id) {
        try {
          await apiRequest("POST", "/api/working-hours", {
            userId: newEmployee.id,
            shiftName: shiftName || "Standard Day",
            startTime: startTime || "09:30",
            endTime: endTime || "17:00",
            earliestCheckIn: earliestCheckIn || "08:00",
            latestCheckOut: latestCheckOut || "20:00",
            workDays: workDays || [2, 3, 4, 5, 6, 0],
            breakDuration: parseInt(breakDuration || "60"),
            isActive: true
          });
        } catch (error) {
          console.error("Failed to create working hours:", error);
          // Don't fail the entire operation if working hours creation fails
        }
      }
      
      return newEmployee;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EmployeeFormData> }) => {
      const { confirmPassword, baseSalary, ...employeeData } = data;
      const response = await apiRequest("PUT", `/api/users/${id}`, {
        ...employeeData,
        ...(baseSalary && { baseSalary: parseFloat(baseSalary) }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsDialogOpen(false);
      setEditingEmployee(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, {
        isActive: false,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee deactivated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate employee",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmployeeFormData) => {
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (employee: UserType) => {
    setEditingEmployee(employee);
    form.reset({
      username: employee.username,
      password: "",
      confirmPassword: "",
      role: employee.role,
      name: employee.name,
      email: employee.email,
      department: employee.department ?? "",
      position: employee.position ?? "",
      baseSalary: employee.baseSalary?.toString() || "",
      isActive: employee.isActive ?? true,
      // Reset shift assignment values when editing
      assignShift: false,
      shiftName: "Standard Day",
      startTime: "09:30",
      endTime: "17:00",
      earliestCheckIn: "08:00",
      latestCheckOut: "20:00",
      workDays: [2, 3, 4, 5, 6, 0],
      breakDuration: "60",
    });
    setIsDialogOpen(true);
  };

  // Handle shift template selection
  const handleShiftTemplateSelect = (templateName: string) => {
    const template = SHIFT_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      form.setValue("shiftName", template.name);
      form.setValue("startTime", template.startTime);
      form.setValue("endTime", template.endTime);
      form.setValue("earliestCheckIn", template.earliestCheckIn);
      form.setValue("latestCheckOut", template.latestCheckOut);
      form.setValue("workDays", template.workDays);
      form.setValue("breakDuration", template.breakDuration.toString());
    }
  };

  // Handle working day toggle
  const handleWorkDayToggle = (dayId: number) => {
    const currentDays = form.getValues("workDays") || [];
    const newDays = currentDays.includes(dayId)
      ? currentDays.filter(id => id !== dayId)
      : [...currentDays, dayId].sort();
    form.setValue("workDays", newDays);
  };

  const handleDeactivate = (id: number) => {
    if (confirm("Are you sure you want to deactivate this employee?")) {
      deactivateMutation.mutate(id);
    }
  };

  const activeEmployees = employees.filter(emp => emp.isActive);
  const inactiveEmployees = employees.filter(emp => !emp.isActive);

  return (
    <>
      <Header title="Employee Management" subtitle="Manage employee accounts and information" />
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
            <p className="text-muted-foreground">Manage employee accounts, roles, and information</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingEmployee(null);
                form.reset();
              }}>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? "Edit Employee" : "Create Employee"}
                </DialogTitle>
                <DialogDescription>
                  {editingEmployee ? "Update employee information" : "Add a new employee to the system"}
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="john.smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl>
                            <Input placeholder="Engineering" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position</FormLabel>
                          <FormControl>
                            <Input placeholder="Software Engineer" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="hr">HR</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="baseSalary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Salary</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="5000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {!editingEmployee && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="********" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="********" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Shift Assignment Section */}
                  {!editingEmployee && (
                    <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-medium text-gray-900">Assign Work Shift (Optional)</h3>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="assignShift"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Assign working hours to this employee
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Set custom working schedule and shift times
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.watch("assignShift") && (
                        <div className="space-y-4 pl-6">
                          {/* Shift Template Selection */}
                          <div>
                            <Label className="text-sm font-medium">Quick Templates</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {SHIFT_TEMPLATES.map((template) => (
                                <Button
                                  key={template.name}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShiftTemplateSelect(template.name)}
                                  className="text-xs"
                                >
                                  {template.name}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Shift Name */}
                          <FormField
                            control={form.control}
                            name="shiftName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Shift Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Standard Day" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Time Settings */}
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
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
                              control={form.control}
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
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
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
                              control={form.control}
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
                          </div>

                          <FormField
                            control={form.control}
                            name="breakDuration"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Break Duration (minutes)</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="60" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Working Days */}
                          <div>
                            <Label className="text-sm font-medium">Working Days</Label>
                            <div className="grid grid-cols-4 gap-2 mt-2">
                              {DAYS_OF_WEEK.map((day) => (
                                <div key={day.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`day-${day.id}`}
                                    checked={(form.watch("workDays") || []).includes(day.id)}
                                    onCheckedChange={() => handleWorkDayToggle(day.id)}
                                  />
                                  <Label htmlFor={`day-${day.id}`} className="text-xs">
                                    {day.short}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingEmployee ? "Update" : "Create"} Employee
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <UserIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEmployees.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <UserIcon className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inactiveEmployees.length}</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Employees Table */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>
                Complete list of all employees in the organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <UserIcon className="text-white text-sm" />
                          </div>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">@{employee.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="mr-2 h-3 w-3" />
                            {employee.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Building className="mr-2 h-3 w-3" />
                            {employee.department || "N/A"}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Briefcase className="mr-2 h-3 w-3" />
                            {employee.position || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.role === "hr" ? "default" : "secondary"}>
                          {employee.role.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <DollarSign className="mr-1 h-3 w-3" />
                          {employee.baseSalary ? `$${parseFloat(employee.baseSalary).toLocaleString()}` : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? "default" : "destructive"}>
                          {employee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          {employee.isActive && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeactivate(employee.id)}
                              disabled={deactivateMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {employees.length === 0 && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No employees found</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by adding your first employee to the system.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}