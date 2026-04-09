export interface WorkingHours {
  id?: number;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  workDays: number[] | string; // 0=Sunday, 1=Monday, ..., 6=Saturday (array or PostgreSQL string format)
  breakDuration: number; // minutes
  isActive: boolean;
  createdBy?: number;
  updatedAt?: string;
}

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  startTime: "09:30",
  endTime: "17:00", // 5:00 PM
  workDays: [2, 3, 4, 5, 6, 0], // Tuesday to Sunday
  breakDuration: 60, // 1 hour lunch break
  isActive: true
};

export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

// Helper function to normalize workDays from PostgreSQL array string to JavaScript array
const normalizeWorkDays = (workDays: number[] | string): number[] => {
  if (Array.isArray(workDays)) {
    return workDays;
  } else if (typeof workDays === 'string') {
    // Parse PostgreSQL array string format like "{1,2,3,4,5,6}"
    return workDays
      .replace(/[{}]/g, '') // Remove braces
      .split(',')
      .map(day => parseInt(day.trim()));
  } else {
    // Fallback to default working days
    return [1, 2, 3, 4, 5, 6];
  }
};

export const isWorkingDay = (date: Date, workingHours: WorkingHours = DEFAULT_WORKING_HOURS): boolean => {
  const dayOfWeek = date.getDay();
  const workDaysArray = normalizeWorkDays(workingHours.workDays);
  return workDaysArray.includes(dayOfWeek);
};

export const isWorkingHours = (date: Date, workingHours: WorkingHours = DEFAULT_WORKING_HOURS): boolean => {
  const currentTime = date.getHours() * 60 + date.getMinutes(); // minutes since midnight
  const [startHour, startMin] = workingHours.startTime.split(':').map(Number);
  const [endHour, endMin] = workingHours.endTime.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  return currentTime >= startTime && currentTime <= endTime;
};

export const getWorkingStatus = (date: Date = new Date(), workingHours: WorkingHours = DEFAULT_WORKING_HOURS) => {
  const isToday = isWorkingDay(date, workingHours);
  const isNowWorkingHours = isWorkingHours(date, workingHours);
  
  if (!isToday) {
    return {
      status: 'off-day',
      message: 'Today is an off day',
      canCheckIn: false
    };
  }
  
  if (isNowWorkingHours) {
    return {
      status: 'working-hours',
      message: 'Currently in working hours',
      canCheckIn: true
    };
  }
  
  const currentTime = date.getHours() * 60 + date.getMinutes();
  const [startHour, startMin] = workingHours.startTime.split(':').map(Number);
  const startTime = startHour * 60 + startMin;
  
  if (currentTime < startTime) {
    return {
      status: 'before-hours',
      message: `Work starts at ${workingHours.startTime}`,
      canCheckIn: false
    };
  } else {
    return {
      status: 'after-hours',
      message: `Work ended at ${workingHours.endTime}`,
      canCheckIn: false
    };
  }
};

export const formatWorkingHours = (workingHours: WorkingHours): string => {
  const workDaysArray = normalizeWorkDays(workingHours.workDays);
  const workDaysNames = workDaysArray.map(day => DAYS_OF_WEEK[day]);
  return `${workingHours.startTime} - ${workingHours.endTime}, ${workDaysNames.join(', ')}`;
};