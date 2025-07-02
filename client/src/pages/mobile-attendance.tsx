import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, TrendingUp, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";

export default function MobileAttendance() {
  const [selectedMonth, setSelectedMonth] = useState("July 2024");

  const { data: attendance = [] } = useQuery({
    queryKey: ["/api/attendance"],
  });

  // Calculate stats
  const totalWorkingTime = attendance.reduce((total: number, record: any) => {
    if (record.checkOut) {
      const checkIn = new Date(`${record.date}T${record.checkIn}`);
      const checkOut = new Date(`${record.date}T${record.checkOut}`);
      return total + (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    }
    return total;
  }, 0);

  const totalOvertime = attendance.reduce((total: number, record: any) => {
    return total + (record.overtimeHours || 0);
  }, 0);

  const workingDays = attendance.filter((record: any) => record.status === 'present').length;
  const totalAttendance = 19; // Mock total for demo

  return (
    <div className="w-full sm:max-w-sm mx-auto bg-black min-h-screen relative overflow-hidden">
      {/* Status Bar - Hidden */}
      <div className="hidden"></div>

      {/* App Content */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-t-3xl min-h-screen">
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-t-3xl text-white p-4"
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
                <h1 className="text-xl font-bold">Attendance History</h1>
                <p className="text-sm opacity-90">{selectedMonth}</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="text-lg font-bold">{totalWorkingTime.toFixed(1)} hrs</div>
              <div className="text-xs opacity-80">Total Working Time</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="text-lg font-bold">{totalOvertime.toFixed(1)} hrs</div>
              <div className="text-xs opacity-80">Total Overtime</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="text-lg font-bold">{workingDays}</div>
              <div className="text-xs opacity-80">Working Days</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="text-lg font-bold">{totalAttendance}</div>
              <div className="text-xs opacity-80">Total Attendance</div>
            </div>
          </div>
        </motion.div>

        {/* Attendance List */}
        <motion.div 
          className="p-4 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {attendance.map((record: any, index: number) => (
            <motion.div
              key={record.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {format(parseISO(record.date), 'EEE')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(parseISO(record.date), 'MMM dd')}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant={record.status === 'present' ? 'default' : 'destructive'}
                  className={
                    record.status === 'present' 
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-red-100 text-red-800 border-red-200'
                  }
                >
                  {record.status === 'present' ? 'Present' : 'Absent'}
                </Badge>
              </div>

              {record.status === 'present' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Check In</span>
                    </div>
                    <span className="font-medium">{record.checkIn}</span>
                  </div>

                  {record.checkOut && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Check Out</span>
                      </div>
                      <span className="font-medium">{record.checkOut}</span>
                    </div>
                  )}

                  {record.location && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">Location</span>
                      </div>
                      <span className="font-medium text-xs">{record.location}</span>
                    </div>
                  )}

                  {record.overtimeHours > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        <span className="text-gray-600">Overtime</span>
                      </div>
                      <span className="font-medium text-orange-600">{record.overtimeHours}h</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}