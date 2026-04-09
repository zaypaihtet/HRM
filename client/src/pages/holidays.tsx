import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Plus, Edit, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";

const holidaySchema = z.object({
  name: z.string().min(1, "Holiday name is required"),
  date: z.string().min(1, "Date is required"),
});

type HolidayFormData = z.infer<typeof holidaySchema>;

export default function Holidays() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: holidays, isLoading } = useQuery({
    queryKey: ["/api/holidays"],
  });

  const form = useForm<HolidayFormData>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: "",
      date: "",
    },
  });

  const createHolidayMutation = useMutation({
    mutationFn: async (data: HolidayFormData) => {
      const response = await apiRequest("POST", "/api/holidays", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Holiday created",
        description: "Holiday has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "Failed to create holiday. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateHolidayMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: HolidayFormData }) => {
      const response = await apiRequest("PUT", `/api/holidays/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Holiday updated",
        description: "Holiday has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
      form.reset();
      setIsDialogOpen(false);
      setEditingHoliday(null);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update holiday. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/holidays/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Holiday deleted",
        description: "Holiday has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Failed to delete holiday. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HolidayFormData) => {
    if (editingHoliday) {
      updateHolidayMutation.mutate({ id: editingHoliday.id, data });
    } else {
      createHolidayMutation.mutate(data);
    }
  };

  const handleEdit = (holiday: any) => {
    setEditingHoliday(holiday);
    form.reset({
      name: holiday.name,
      date: holiday.date,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingHoliday(null);
    form.reset();
  };

  return (
    <>
      <Header 
        title="Holiday Management" 
        subtitle="Create and manage company holidays" 
      />
      
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Company Holidays</h3>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingHoliday(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Holiday
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingHoliday ? "Edit Holiday" : "Add New Holiday"}
                  </DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Holiday Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter holiday name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex space-x-3">
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={createHolidayMutation.isPending || updateHolidayMutation.isPending}
                      >
                        {createHolidayMutation.isPending || updateHolidayMutation.isPending 
                          ? "Saving..." 
                          : editingHoliday ? "Update Holiday" : "Add Holiday"
                        }
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="flex-1"
                        onClick={handleCloseDialog}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Day of Week</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : holidays?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No holidays found. Add your first holiday to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  holidays?.map((holiday: any) => {
                    const holidayDate = new Date(holiday.date);
                    const dayOfWeek = holidayDate.toLocaleDateString('en-US', { weekday: 'long' });
                    
                    return (
                      <TableRow key={holiday.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium text-gray-800">{holiday.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {holidayDate.toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {dayOfWeek}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(holiday)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                              disabled={deleteHolidayMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
