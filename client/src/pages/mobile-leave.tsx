import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Clock, Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function MobileLeave() {
  const [activeTab, setActiveTab] = useState<"apply" | "history">("apply");
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isMultipleDay, setIsMultipleDay] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ["/api/requests"],
  });

  const leaveRequests = requests.filter((req: any) => req.type === 'leave');

  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/requests", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({ title: "Leave request submitted successfully!" });
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setActiveTab("history");
    },
    onError: () => {
      toast({ title: "Failed to submit leave request", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!leaveType || !startDate || !reason) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const requestData = {
      type: "leave",
      startDate,
      endDate: isMultipleDay ? endDate : startDate,
      reason,
      status: "pending"
    };

    createRequestMutation.mutate(requestData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-black min-h-screen relative overflow-hidden">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-black text-white text-xs">
        <div className="flex items-center space-x-1">
          <span className="font-medium">9:41</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-2 bg-white rounded-full"></div>
            <div className="w-1 h-3 bg-white rounded-full"></div>
            <div className="w-1 h-4 bg-white rounded-full"></div>
          </div>
          <div className="w-6 h-3 border border-white rounded-sm">
            <div className="w-4 h-1.5 bg-white rounded-sm m-0.5"></div>
          </div>
        </div>
      </div>

      {/* App Content */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-t-3xl min-h-screen">
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-br from-red-500 via-red-600 to-pink-700 rounded-t-3xl text-white p-4"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Link href="/mobile-app">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Leave</h1>
                <p className="text-sm opacity-90">Apply for time off</p>
              </div>
            </div>
            <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-xs font-bold">
              {leaveRequests.filter((req: any) => req.status === 'pending').length}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1">
            <button
              onClick={() => setActiveTab("apply")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === "apply" 
                  ? "bg-white text-red-600 shadow-sm" 
                  : "text-white/80 hover:text-white"
              }`}
            >
              Apply Leave
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === "history" 
                  ? "bg-white text-red-600 shadow-sm" 
                  : "text-white/80 hover:text-white"
              }`}
            >
              My Requests
            </button>
          </div>
        </motion.div>

        {/* Content */}
        {activeTab === "apply" ? (
          <motion.div 
            className="p-4 space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Leave Type */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Types of Leave <span className="text-red-500">*</span>
              </label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="emergency">Emergency Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-3">Duration</label>
              <div className="flex space-x-2 mb-3">
                <button
                  onClick={() => setIsMultipleDay(false)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    !isMultipleDay 
                      ? "bg-red-100 text-red-600 border border-red-200" 
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Single Day
                </button>
                <button
                  onClick={() => setIsMultipleDay(true)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    isMultipleDay 
                      ? "bg-red-100 text-red-600 border border-red-200" 
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  Multiple Days
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {isMultipleDay ? "Start Date" : "Date"}
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>

                {isMultipleDay && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Write reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit}
              disabled={createRequestMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold"
            >
              {createRequestMutation.isPending ? (
                "Applying..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Apply
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            className="p-4 space-y-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {leaveRequests.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No leave requests found</p>
              </div>
            ) : (
              leaveRequests.map((request: any, index: number) => (
                <motion.div
                  key={request.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-800 capitalize">
                          {request.reason?.split(' ').slice(0, 3).join(' ') || 'Leave Request'}
                        </h3>
                        <Badge className={getStatusColor(request.status)}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1 capitalize">{request.status}</span>
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(parseISO(request.startDate), 'MMM dd')} - {format(parseISO(request.endDate), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3" />
                          <span>1 Day</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">{request.reason}</p>
                    </div>
                  )}

                  {request.reviewedBy && (
                    <div className="mt-3 text-xs text-gray-500">
                      Reviewed by: {request.reviewedBy}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}