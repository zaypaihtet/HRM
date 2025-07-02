import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";

export default function MobileHolidays() {
  const { data: holidays = [] } = useQuery({
    queryKey: ["/api/holidays"],
  });

  const today = new Date();
  const upcomingHolidays = holidays.filter((holiday: any) => 
    isAfter(parseISO(holiday.date), today) || 
    format(parseISO(holiday.date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
  );

  const getHolidayStatus = (date: string) => {
    const holidayDate = parseISO(date);
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    if (format(holidayDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return { status: 'today', color: 'bg-green-100 text-green-800 border-green-200' };
    } else if (format(holidayDate, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
      return { status: 'tomorrow', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    } else if (isAfter(holidayDate, today)) {
      return { status: 'upcoming', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    } else {
      return { status: 'past', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const getDaysUntil = (date: string) => {
    const holidayDate = parseISO(date);
    const today = new Date();
    const diffTime = holidayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getHolidayIcon = (name: string) => {
    const lowercaseName = name.toLowerCase();
    if (lowercaseName.includes('christmas')) return '🎄';
    if (lowercaseName.includes('new year')) return '🎆';
    if (lowercaseName.includes('valentine')) return '💝';
    if (lowercaseName.includes('easter')) return '🐰';
    if (lowercaseName.includes('independence')) return '🇺🇸';
    if (lowercaseName.includes('thanksgiving')) return '🦃';
    if (lowercaseName.includes('halloween')) return '🎃';
    if (lowercaseName.includes('friday')) return '✨';
    return '🎉';
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
          className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-t-3xl text-white p-4"
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
                <h1 className="text-xl font-bold">Holiday List</h1>
                <p className="text-sm opacity-90">Company holidays & events</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="text-lg font-bold">{upcomingHolidays.length}</div>
              <div className="text-xs opacity-80">Upcoming</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
              <div className="text-lg font-bold">{holidays.length}</div>
              <div className="text-xs opacity-80">Total This Year</div>
            </div>
          </div>
        </motion.div>

        {/* Holiday List */}
        <motion.div 
          className="p-4 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {holidays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No holidays scheduled</p>
            </div>
          ) : (
            holidays.map((holiday: any, index: number) => {
              const holidayStatus = getHolidayStatus(holiday.date);
              const daysUntil = getDaysUntil(holiday.date);
              
              return (
                <motion.div
                  key={holiday.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center text-2xl">
                        {getHolidayIcon(holiday.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-800 truncate">
                            {holiday.name}
                          </h3>
                          <Badge className={holidayStatus.color}>
                            {holidayStatus.status === 'today' && 'Today'}
                            {holidayStatus.status === 'tomorrow' && 'Tomorrow'}
                            {holidayStatus.status === 'upcoming' && 'Upcoming'}
                            {holidayStatus.status === 'past' && 'Past'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(parseISO(holiday.date), 'EEE, MMM dd')}</span>
                          </div>
                          {daysUntil > 0 && daysUntil <= 30 && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{daysUntil} days</span>
                            </div>
                          )}
                        </div>

                        {holiday.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {holiday.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Holiday Details */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {format(parseISO(holiday.date), 'EEEE, MMMM dd, yyyy')}
                      </span>
                      {daysUntil === 0 && (
                        <span className="text-green-600 font-medium">Today!</span>
                      )}
                      {daysUntil === 1 && (
                        <span className="text-blue-600 font-medium">Tomorrow</span>
                      )}
                      {daysUntil > 1 && daysUntil <= 7 && (
                        <span className="text-purple-600 font-medium">This week</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}