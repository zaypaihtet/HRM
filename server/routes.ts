import type { Express } from "express";
import http from "http";
type Server = http.Server;import { storage } from "./storage";
import { insertUserSchema, insertAttendanceSchema, insertRequestSchema, insertPayrollSchema, insertHolidaySchema, insertCheckinZoneSchema, insertWorkingHoursSchema } from "@shared/schema";
import { authenticateToken, requireHR, requireEmployee, generateToken } from "./middleware/auth";
import { hashPassword, verifyPassword, validatePasswordStrength } from "./utils/password";
import { z } from "zod";

// Calculation helper functions
async function calculateAttendanceStats(attendanceRecords: any[], startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculate total working days (excluding weekends and holidays)
  let totalWorkingDays = 0;
  let currentDate = new Date(start);
  const holidays = await storage.getAllHolidays();
  const holidayDates = holidays.map(h => h.date);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Monday is off (day 1), working days are Tue-Sun (2-0)
    if (dayOfWeek !== 1 && !holidayDates.includes(dateStr)) {
      totalWorkingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let earlyDepartures = 0;
  let totalHours = 0;
  let totalOvertimeHours = 0;
  let totalBreakTime = 0;
  
  // Get working hours configuration
  const workingHours = await storage.getWorkingHours();
  const workStart = workingHours[0]?.startTime || '09:30';
  const workEnd = workingHours[0]?.endTime || '17:00';
  const breakDuration = workingHours[0]?.breakDuration || 60; // minutes
  
  const attendanceMap = new Map();
  attendanceRecords.forEach(record => {
    attendanceMap.set(record.date, record);
  });
  
  // Check each working day
  currentDate = new Date(start);
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Skip non-working days
    if (dayOfWeek === 1 || holidayDates.includes(dateStr)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    
    const record = attendanceMap.get(dateStr);
    
    if (record && record.status === 'present') {
      presentDays++;
      const hoursWorked = parseFloat(record.hoursWorked || '0');
      const overtimeHours = parseFloat(record.overtimeHours || '0');
      
      totalHours += hoursWorked;
      totalOvertimeHours += overtimeHours;
      
      // Check for late arrival
      if (record.checkIn) {
        const checkInTime = new Date(record.checkIn);
        const [startHour, startMin] = workStart.split(':').map(Number);
        const workStartTime = new Date(checkInTime);
        workStartTime.setHours(startHour, startMin, 0, 0);
        
        if (checkInTime > workStartTime) {
          lateDays++;
        }
      }
      
      // Check for early departure
      if (record.checkOut) {
        const checkOutTime = new Date(record.checkOut);
        const [endHour, endMin] = workEnd.split(':').map(Number);
        const workEndTime = new Date(checkOutTime);
        workEndTime.setHours(endHour, endMin, 0, 0);
        
        if (checkOutTime < workEndTime) {
          earlyDepartures++;
        }
      }
      
      // Calculate break time
      totalBreakTime += breakDuration;
      
    } else {
      absentDays++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const attendanceRate = totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0;
  const punctualityRate = presentDays > 0 ? ((presentDays - lateDays) / presentDays) * 100 : 0;
  const avgHoursPerDay = presentDays > 0 ? totalHours / presentDays : 0;
  
  return {
    period: { startDate, endDate },
    workingDays: totalWorkingDays,
    presentDays,
    absentDays,
    lateDays,
    earlyDepartures,
    totalHours: parseFloat(totalHours.toFixed(2)),
    totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
    avgHoursPerDay: parseFloat(avgHoursPerDay.toFixed(2)),
    totalBreakTime: Math.round(totalBreakTime / 60), // Convert to hours
    attendanceRate: parseFloat(attendanceRate.toFixed(2)),
    punctualityRate: parseFloat(punctualityRate.toFixed(2)),
    productivity: {
      onTimeRatio: presentDays > 0 ? ((presentDays - lateDays - earlyDepartures) / presentDays) * 100 : 0,
      overtimeRatio: totalHours > 0 ? (totalOvertimeHours / totalHours) * 100 : 0
    }
  };
}

async function calculatePayroll(attendanceRecords: any[], baseSalary: number, overtimeRate: number = 1.5, month: number, year: number) {
  // Get working hours configuration
  const workingHours = await storage.getWorkingHours();
  const standardDailyHours = 7.5; // 9:30-17:00 with 1hr break = 7.5 hours
  const workDays = [2, 3, 4, 5, 6, 0]; // Tue-Sun (Monday off)
  
  // Calculate expected working days for the month
  let expectedWorkingDays = 0;
  const daysInMonth = new Date(year, month, 0).getDate();
  const holidays = await storage.getAllHolidays();
  const holidayDates = holidays
    .filter(h => {
      const hDate = new Date(h.date);
      return hDate.getMonth() + 1 === month && hDate.getFullYear() === year;
    })
    .map(h => h.date);
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];
    
    if (workDays.includes(dayOfWeek) && !holidayDates.includes(dateStr)) {
      expectedWorkingDays++;
    }
  }
  
  const expectedMonthlyHours = expectedWorkingDays * standardDailyHours;
  
  // Process attendance records
  let totalHours = 0;
  let regularHours = 0;
  let overtimeHours = 0;
  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let bonusHours = 0;
  
  attendanceRecords.forEach(record => {
    if (record.status === 'present') {
      presentDays++;
      const dailyHours = parseFloat(record.hoursWorked || '0');
      const dailyOvertime = parseFloat(record.overtimeHours || '0');
      
      totalHours += dailyHours;
      regularHours += Math.min(dailyHours, standardDailyHours);
      overtimeHours += dailyOvertime;
      
      // Bonus for perfect attendance days (full hours + no late)
      if (dailyHours >= standardDailyHours && record.checkIn) {
        const checkInTime = new Date(record.checkIn);
        const workStart = workingHours[0]?.startTime || '09:30';
        const [startHour, startMin] = workStart.split(':').map(Number);
        const workStartTime = new Date(checkInTime);
        workStartTime.setHours(startHour, startMin, 0, 0);
        
        if (checkInTime <= workStartTime) {
          bonusHours += 0.5; // 30 min bonus for punctuality
        } else {
          lateDays++;
        }
      }
    } else {
      absentDays++;
    }
  });
  
  // Salary calculations
  const hourlyRate = baseSalary / expectedMonthlyHours;
  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * overtimeRate;
  const bonusPay = bonusHours * hourlyRate * 1.2; // 20% bonus for punctuality
  
  // Attendance bonus (if attendance rate > 95%)
  const attendanceRate = (presentDays / expectedWorkingDays) * 100;
  const attendanceBonus = attendanceRate >= 95 ? baseSalary * 0.05 : 0; // 5% bonus
  
  // Late penalty
  const latePenalty = lateDays * hourlyRate * 0.5; // 30 min penalty per late day
  
  // Absent penalty
  const absentPenalty = absentDays * hourlyRate * standardDailyHours;
  
  const grossSalary = regularPay + overtimePay + bonusPay + attendanceBonus - latePenalty - absentPenalty;
  
  // Comprehensive deductions
  const taxRate = grossSalary > 50000 ? 0.15 : 0.10; // Progressive tax
  const incomeTax = grossSalary * taxRate;
  const socialSecurity = grossSalary * 0.062; // 6.2%
  const medicare = grossSalary * 0.0145; // 1.45%
  const healthInsurance = 150; // Fixed amount
  const providentFund = grossSalary * 0.12; // 12% EPF
  
  const totalDeductions = incomeTax + socialSecurity + medicare + healthInsurance + providentFund;
  const netSalary = grossSalary - totalDeductions;
  
  return {
    period: { month, year },
    attendance: {
      expectedWorkingDays,
      presentDays,
      absentDays,
      lateDays,
      attendanceRate: parseFloat(attendanceRate.toFixed(2))
    },
    hours: {
      expectedHours: parseFloat(expectedMonthlyHours.toFixed(2)),
      totalHours: parseFloat(totalHours.toFixed(2)),
      regularHours: parseFloat(regularHours.toFixed(2)),
      overtimeHours: parseFloat(overtimeHours.toFixed(2)),
      bonusHours: parseFloat(bonusHours.toFixed(2))
    },
    salary: {
      baseSalary: parseFloat(baseSalary.toFixed(2)),
      hourlyRate: parseFloat(hourlyRate.toFixed(2)),
      regularPay: parseFloat(regularPay.toFixed(2)),
      overtimePay: parseFloat(overtimePay.toFixed(2)),
      bonusPay: parseFloat(bonusPay.toFixed(2)),
      attendanceBonus: parseFloat(attendanceBonus.toFixed(2)),
      latePenalty: parseFloat(latePenalty.toFixed(2)),
      absentPenalty: parseFloat(absentPenalty.toFixed(2)),
      grossSalary: parseFloat(grossSalary.toFixed(2))
    },
    deductions: {
      incomeTax: parseFloat(incomeTax.toFixed(2)),
      socialSecurity: parseFloat(socialSecurity.toFixed(2)),
      medicare: parseFloat(medicare.toFixed(2)),
      healthInsurance: parseFloat(healthInsurance.toFixed(2)),
      providentFund: parseFloat(providentFund.toFixed(2)),
      totalDeductions: parseFloat(totalDeductions.toFixed(2))
    },
    netSalary: parseFloat(netSalary.toFixed(2))
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Input validation
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        // Generic error message to prevent user enumeration
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password using bcrypt
      const isPasswordValid = await verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = generateToken({
        id: user.id,
        username: user.username,
        role: user.role
      });

      res.json({ 
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role, 
          name: user.name,
          email: user.email,
          department: user.department,
          position: user.position
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Password change route
  app.post("/api/auth/change-password", authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: "Password does not meet requirements",
          errors: passwordValidation.errors
        });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update password
      await storage.updateUser(userId, { password: hashedNewPassword });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ message: "Password change failed" });
    }
  });

  // User/Employee management routes (HR only)
  app.get("/api/users", authenticateToken, requireHR, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Never return passwords in response
      const safeUsers = users.map(u => ({ ...u, password: undefined }));
      res.json(safeUsers);
    } catch (error) {
      console.error('Fetch users error:', error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authenticateToken, requireHR, async (req, res) => {
    try {
      // Convert numeric fields to strings as expected by schema
      const requestData = { ...req.body };
      if (requestData.baseSalary && typeof requestData.baseSalary === 'number') {
        requestData.baseSalary = requestData.baseSalary.toString();
      }
      
      const userData = insertUserSchema.parse(requestData);
      
      // Validate password strength if password is provided
      if (userData.password) {
        const passwordValidation = validatePasswordStrength(userData.password);
        if (!passwordValidation.isValid) {
          return res.status(400).json({ 
            message: "Password does not meet requirements",
            errors: passwordValidation.errors
          });
        }
        
        // Hash the password before storing
        userData.password = await hashPassword(userData.password);
      }
      
      const user = await storage.createUser(userData);
      // Never return password in response
      res.status(201).json({ ...user, password: undefined });
    } catch (error: any) {
      console.error('Create user error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors,
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put("/api/users/:id", authenticateToken, requireHR, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = { ...req.body };
      
      // Validate ID parameter
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Convert numeric fields to strings as expected by schema
      if (updateData.baseSalary && typeof updateData.baseSalary === 'number') {
        updateData.baseSalary = updateData.baseSalary.toString();
      }
      
      // If password is being updated, hash it
      if (updateData.password) {
        const passwordValidation = validatePasswordStrength(updateData.password);
        if (!passwordValidation.isValid) {
          return res.status(400).json({ 
            message: "Password does not meet requirements",
            errors: passwordValidation.errors
          });
        }
        updateData.password = await hashPassword(updateData.password);
      }
      
      const user = await storage.updateUser(id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Dashboard stats (HR only)
  app.get("/api/dashboard/stats", authenticateToken, requireHR, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const employees = users.filter(u => u.role === "employee");
      const todayAttendance = await storage.getTodayAttendance();
      const pendingRequests = await storage.getPendingRequests();
      
      const presentToday = todayAttendance.filter(a => a.status === "present").length;
      const onLeave = todayAttendance.filter(a => a.status === "leave").length;

      res.json({
        totalEmployees: employees.length,
        presentToday,
        pendingRequests: pendingRequests.length,
        onLeave,
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get user profile (self or HR accessing others)
  app.get("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      
      // Validate ID parameter
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Users can only access their own profile unless they're HR
      if (currentUserRole !== 'hr' && currentUserId !== id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error('Fetch user error:', error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", authenticateToken, async (req, res) => {
    try {
      const { date, userId, startDate, endDate } = req.query;
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      let attendance;
      
      // Employees can only view their own attendance unless they're HR
      if (userId && currentUserRole !== 'hr' && parseInt(userId as string) !== currentUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (startDate && endDate) {
        // Date range filtering
        const allRecords = [];
        const currentDate = new Date(startDate as string);
        const endDateObj = new Date(endDate as string);
        
        while (currentDate <= endDateObj) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dailyRecords = await storage.getAttendanceByDate(dateStr);
          allRecords.push(...dailyRecords);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        attendance = allRecords;
        
        // Filter by user if specified
        if (userId) {
          attendance = attendance.filter(att => att.userId === parseInt(userId as string));
        }
        
        // Filter for non-HR users to only see their own records
        if (currentUserRole !== 'hr') {
          attendance = attendance.filter(att => att.userId === currentUserId);
        }
      } else if (date) {
        attendance = await storage.getAttendanceByDate(date as string);
        // Filter for non-HR users to only see their own records
        if (currentUserRole !== 'hr') {
          attendance = attendance.filter(att => att.userId === currentUserId);
        }
      } else if (userId) {
        attendance = await storage.getAttendanceByUser(parseInt(userId as string));
      } else {
        attendance = await storage.getTodayAttendance();
        // Filter for non-HR users to only see their own records
        if (currentUserRole !== 'hr') {
          attendance = attendance.filter(att => att.userId === currentUserId);
        }
      }

      // Join with user data
      const attendanceWithUsers = await Promise.all(
        attendance.map(async (att) => {
          const user = await storage.getUser(att.userId);
          return { ...att, user: user ? { ...user, password: undefined } : null };
        })
      );

      res.json(attendanceWithUsers);
    } catch (error) {
      console.error('Fetch attendance error:', error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance", authenticateToken, requireHR, async (req, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      console.error('Create attendance error:', error);
      res.status(400).json({ message: "Invalid attendance data" });
    }
  });

  app.put("/api/attendance/:id", authenticateToken, requireHR, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid attendance ID" });
      }
      
      const attendance = await storage.updateAttendance(id, updateData);
      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      res.json(attendance);
    } catch (error) {
      console.error('Update attendance error:', error);
      res.status(500).json({ message: "Failed to update attendance" });
    }
  });

  app.delete("/api/attendance/:id", authenticateToken, requireHR, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid attendance ID" });
      }
      
      const deleted = await storage.deleteAttendance(id);
      if (!deleted) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      res.json({ message: "Attendance record deleted" });
    } catch (error) {
      console.error('Delete attendance error:', error);
      res.status(500).json({ message: "Failed to delete attendance" });
    }
  });

  // Check-in/Check-out routes
  app.post("/api/attendance/checkin", authenticateToken, async (req, res) => {
    try {
      const { userId, location } = req.body;
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      
      // Users can only check themselves in unless they're HR
      if (currentUserRole !== 'hr' && userId !== currentUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      // Check if already checked in today
      const existing = await storage.getAttendanceByDate(today);
      const userAttendance = existing.find(a => a.userId === userId);
      
      if (userAttendance && userAttendance.checkIn) {
        return res.status(400).json({ message: "Already checked in today" });
      }

      const attendanceData = {
        userId,
        date: today,
        checkIn: new Date(),
        checkOut: null,
        location: location || "Office",
        status: "present",
        hoursWorked: "0.00",
        overtimeHours: "0.00",
      };

      let attendance;
      if (userAttendance) {
        attendance = await storage.updateAttendance(userAttendance.id, attendanceData);
      } else {
        attendance = await storage.createAttendance(attendanceData);
      }

      res.json(attendance);
    } catch (error) {
      console.error('Check-in error:', error);
      res.status(500).json({ message: "Check-in failed" });
    }
  });

  app.post("/api/attendance/checkout", authenticateToken, async (req, res) => {
    try {
      const { userId } = req.body;
      const currentUserId = req.user?.id;
      const currentUserRole = req.user?.role;
      
      // Users can only check themselves out unless they're HR
      if (currentUserRole !== 'hr' && userId !== currentUserId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const existing = await storage.getAttendanceByDate(today);
      const userAttendance = existing.find(a => a.userId === userId);
      
      if (!userAttendance || !userAttendance.checkIn) {
        return res.status(400).json({ message: "Must check in first" });
      }

      if (userAttendance.checkOut) {
        return res.status(400).json({ message: "Already checked out today" });
      }

      const checkOut = new Date();
      const checkIn = new Date(userAttendance.checkIn);
      const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      const overtimeHours = Math.max(0, hoursWorked - 8);

      const attendance = await storage.updateAttendance(userAttendance.id, {
        checkOut,
        hoursWorked: hoursWorked.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
      });

      res.json(attendance);
    } catch (error) {
      console.error('Check-out error:', error);
      res.status(500).json({ message: "Check-out failed" });
    }
  });

  // Request routes
  app.get("/api/requests", async (req, res) => {
    try {
      const { userId, status } = req.query;
      let requests;
      
      if (userId) {
        requests = await storage.getRequestsByUser(parseInt(userId as string));
      } else if (status === "pending") {
        requests = await storage.getPendingRequests();
      } else {
        requests = await storage.getAllRequests();
      }

      // Join with user data
      const requestsWithUsers = await Promise.all(
        requests.map(async (req) => {
          const user = await storage.getUser(req.userId);
          return { ...req, user: user ? { ...user, password: undefined } : null };
        })
      );

      res.json(requestsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch requests" });
    }
  });

  app.post("/api/requests", async (req, res) => {
    try {
      const requestData = insertRequestSchema.parse(req.body);
      const request = await storage.createRequest(requestData);
      res.status(201).json(request);
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.put("/api/requests/:id", requireHR, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // Get the original request before updating
      const originalRequest = await storage.getRequest(id);
      if (!originalRequest) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Update the request
      const request = await storage.updateRequest(id, updateData);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // If this is an attendance adjustment request being approved, create/update attendance record
      if (request.type === 'attendance_adjustment' && 
          updateData.status === 'approved' && 
          originalRequest.status !== 'approved') {
        
        try {
          // Get working hours configuration
          const workingHours = await storage.getWorkingHours();
          const standardHours = 7.5; // 9:30-17:00 with 1hr break
          const startTime = workingHours[0]?.startTime || '09:30';
          const endTime = workingHours[0]?.endTime || '17:00';
          
          // Parse the request date
          const requestDate = request.startDate;
          
          // Check if attendance record already exists for this date
          const existingAttendance = await storage.getAttendanceByDate(requestDate);
          const userAttendance = existingAttendance.find(att => att.userId === request.userId);
          
          if (userAttendance) {
            // Update existing attendance record to mark as present
            await storage.updateAttendance(userAttendance.id, {
              status: 'present',
              hoursWorked: standardHours.toString(),
              overtimeHours: '0',
              notes: `Approved via attendance adjustment request #${request.id}`
            });
          } else {
            // Create new attendance record
            const checkInDateTime = new Date(`${requestDate}T${startTime}:00`);
            const checkOutDateTime = new Date(`${requestDate}T${endTime}:00`);
            
            await storage.createAttendance({
              userId: request.userId,
              date: requestDate,
              checkIn: checkInDateTime,
              checkOut: checkOutDateTime,
              status: 'present',
              hoursWorked: standardHours.toString(),
              overtimeHours: '0',
              location: 'Office (Attendance Adjustment)',
              notes: `Approved via attendance adjustment request #${request.id}`
            });
          }
          
          // Log the attendance creation for auditing
          console.log(`[AUTO] Attendance record created/updated for user ${request.userId} on ${requestDate} via request #${request.id}`);
          
        } catch (attendanceError) {
          console.error('Failed to create attendance record:', attendanceError);
          // Don't fail the entire request if attendance creation fails
          // Just log the error and continue
        }
      }
      
      // If this is a leave request being approved, mark days as absent with approved leave
      if (request.type === 'leave' && 
          updateData.status === 'approved' && 
          originalRequest.status !== 'approved') {
        
        try {
          const startDate = new Date(request.startDate);
          const endDate = new Date(request.endDate || request.startDate);
          
          // Create attendance records for each day in the leave period
          let currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay();
            
            // Only process working days (Tue-Sun, skip Monday)
            if (dayOfWeek !== 1) {
              const existingAttendance = await storage.getAttendanceByDate(dateStr);
              const userAttendance = existingAttendance.find(att => att.userId === request.userId);
              
              if (userAttendance) {
                // Update existing record
                await storage.updateAttendance(userAttendance.id, {
                  status: 'on_leave',
                  hoursWorked: '0',
                  overtimeHours: '0',
                  notes: `Approved leave: ${request.reason} (Request #${request.id})`
                });
              } else {
                // Create new attendance record for leave
                await storage.createAttendance({
                  userId: request.userId,
                  date: dateStr,
                  checkIn: null,
                  checkOut: null,
                  status: 'on_leave',
                  hoursWorked: '0',
                  overtimeHours: '0',
                  location: 'N/A (On Leave)',
                  notes: `Approved leave: ${request.reason} (Request #${request.id})`
                });
              }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
        } catch (leaveError) {
          console.error('Failed to create leave attendance records:', leaveError);
        }
      }
      
      // Get the final updated request
      const finalRequest = await storage.getRequest(id);
      res.json(finalRequest);
      
    } catch (error) {
      console.error('Request update error:', error);
      res.status(500).json({ message: "Failed to update request" });
    }
  });

  // Payroll routes
  app.get("/api/payroll", async (req, res) => {
    try {
      const { month, year, userId } = req.query;
      let payroll;
      
      if (month && year) {
        payroll = await storage.getPayrollByMonth(parseInt(month as string), parseInt(year as string));
      } else if (userId) {
        payroll = await storage.getPayrollByUser(parseInt(userId as string));
      } else {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        payroll = await storage.getPayrollByMonth(currentMonth, currentYear);
      }

      // Join with user data
      const payrollWithUsers = await Promise.all(
        payroll.map(async (pay) => {
          const user = await storage.getUser(pay.userId);
          return { ...pay, user: user ? { ...user, password: undefined } : null };
        })
      );

      res.json(payrollWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll" });
    }
  });

  app.post("/api/payroll", async (req, res) => {
    try {
      const payrollData = insertPayrollSchema.parse(req.body);
      const payroll = await storage.createPayroll(payrollData);
      res.status(201).json(payroll);
    } catch (error) {
      res.status(400).json({ message: "Invalid payroll data" });
    }
  });

  app.post("/api/payroll/run", async (req, res) => {
    try {
      const { month, year } = req.body;
      const employees = await storage.getEmployees();
      const payrollRecords = [];

      for (const employee of employees) {
        // Calculate overtime from attendance
        const attendance = await storage.getAttendanceByUser(employee.id);
        const monthAttendance = attendance.filter(a => {
          const date = new Date(a.date);
          return date.getMonth() + 1 === month && date.getFullYear() === year;
        });

        const totalOvertimeHours = monthAttendance.reduce((sum, a) => {
          return sum + parseFloat(a.overtimeHours || "0");
        }, 0);

        const baseSalary = parseFloat(employee.baseSalary || "0");
        const overtimePay = totalOvertimeHours * (baseSalary / 160); // Assuming 160 hours/month
        const deductions = baseSalary * 0.12; // 12% deductions
        const netPay = baseSalary + overtimePay - deductions;

        const payrollData = {
          userId: employee.id,
          month,
          year,
          baseSalary: baseSalary.toFixed(2),
          overtimePay: overtimePay.toFixed(2),
          deductions: deductions.toFixed(2),
          netPay: netPay.toFixed(2),
          status: "processed",
        };

        const payroll = await storage.createPayroll(payrollData);
        payrollRecords.push(payroll);
      }

      res.json({ message: "Payroll processed successfully", records: payrollRecords.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to run payroll" });
    }
  });

  // Holiday routes
  app.get("/api/holidays", async (req, res) => {
    try {
      const holidays = await storage.getAllHolidays();
      res.json(holidays);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.post("/api/holidays", async (req, res) => {
    try {
      const holidayData = insertHolidaySchema.parse(req.body);
      const holiday = await storage.createHoliday(holidayData);
      res.status(201).json(holiday);
    } catch (error) {
      res.status(400).json({ message: "Invalid holiday data" });
    }
  });

  app.put("/api/holidays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const holiday = await storage.updateHoliday(id, updateData);
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      res.json(holiday);
    } catch (error) {
      res.status(500).json({ message: "Failed to update holiday" });
    }
  });

  app.delete("/api/holidays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteHoliday(id);
      if (!deleted) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      res.json({ message: "Holiday deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  // Check-in Zone routes
  app.get("/api/checkin-zones", async (req, res) => {
    try {
      const zones = await storage.getAllCheckinZones();
      res.json(zones);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch check-in zones" });
    }
  });

  app.get("/api/checkin-zones/active", async (req, res) => {
    try {
      const zones = await storage.getActiveCheckinZones();
      res.json(zones);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active check-in zones" });
    }
  });

  app.post("/api/checkin-zones", async (req, res) => {
    try {
      console.log('Creating check-in zone with data:', req.body);
      const zoneData = insertCheckinZoneSchema.parse(req.body);
      const zone = await storage.createCheckinZone(zoneData);
      res.status(201).json(zone);
    } catch (error: any) {
      console.error('Check-in zone creation error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid check-in zone data", 
          errors: error.errors,
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ message: "Failed to create check-in zone" });
    }
  });

  app.put("/api/checkin-zones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const zone = await storage.updateCheckinZone(id, updateData);
      if (!zone) {
        return res.status(404).json({ message: "Check-in zone not found" });
      }
      res.json(zone);
    } catch (error) {
      res.status(500).json({ message: "Failed to update check-in zone" });
    }
  });

  app.delete("/api/checkin-zones/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCheckinZone(id);
      if (!deleted) {
        return res.status(404).json({ message: "Check-in zone not found" });
      }
      res.json({ message: "Check-in zone deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete check-in zone" });
    }
  });

  // Working hours management routes
  app.get("/api/working-hours", async (req, res) => {
    try {
      const workingHours = await storage.getWorkingHours();
      res.json(workingHours);
    } catch (error) {
      console.error('Get working hours error:', error);
      res.status(500).json({ message: "Failed to fetch working hours" });
    }
  });

  app.post("/api/working-hours", authenticateToken, requireHR, async (req, res) => {
    try {
      // Transform the data before validation
      const transformedData = {
        userId: req.body.userId || null,
        shiftName: req.body.shiftName || 'Standard Shift',
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        earliestCheckIn: req.body.earliestCheckIn || '08:00',
        latestCheckOut: req.body.latestCheckOut || '20:00',
        workDays: Array.isArray(req.body.workDays) ? req.body.workDays.join(',') : req.body.workDays,
        breakDuration: typeof req.body.breakDuration === 'string' ? parseInt(req.body.breakDuration) : req.body.breakDuration,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        createdBy: req.user!.id
      };
      
      const workingHours = await storage.createWorkingHours(transformedData);
      res.status(201).json(workingHours);
    } catch (error: any) {
      console.error('Create working hours error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid working hours data", 
          errors: error.errors,
          details: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        });
      }
      res.status(500).json({ message: "Failed to create working hours" });
    }
  });

  app.put("/api/working-hours/:id", authenticateToken, requireHR, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const transformedData = {
        userId: req.body.userId || null,
        shiftName: req.body.shiftName,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        earliestCheckIn: req.body.earliestCheckIn,
        latestCheckOut: req.body.latestCheckOut,
        workDays: Array.isArray(req.body.workDays) ? req.body.workDays.join(',') : req.body.workDays,
        breakDuration: typeof req.body.breakDuration === 'string' ? parseInt(req.body.breakDuration) : req.body.breakDuration,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      };
      
      const workingHours = await storage.updateWorkingHours(id, transformedData);
      if (!workingHours) {
        return res.status(404).json({ message: "Working hours not found" });
      }
      res.json(workingHours);
    } catch (error: any) {
      console.error('Update working hours error:', error);
      res.status(500).json({ message: "Failed to update working hours" });
    }
  });

  app.delete("/api/working-hours/:id", authenticateToken, requireHR, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteWorkingHours(id);
      if (!deleted) {
        return res.status(404).json({ message: "Working hours not found" });
      }
      res.json({ message: "Working hours deleted" });
    } catch (error: any) {
      console.error('Delete working hours error:', error);
      res.status(500).json({ message: "Failed to delete working hours" });
    }
  });

  // Attendance calculation routes
  app.post("/api/attendance/calculate", requireHR, async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.body;
      
      // Input validation
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      // Get attendance records for the period
      let attendanceRecords;
      if (userId) {
        attendanceRecords = await storage.getAttendanceByUser(userId);
        // Filter by date range
        attendanceRecords = attendanceRecords.filter(record => 
          record.date >= startDate && record.date <= endDate
        );
      } else {
        // Get all attendance records for the date range
        const allRecords = [];
        const currentDate = new Date(startDate);
        const endDateObj = new Date(endDate);
        
        while (currentDate <= endDateObj) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dailyRecords = await storage.getAttendanceByDate(dateStr);
          allRecords.push(...dailyRecords);
          currentDate.setDate(currentDate.getDate() + 1);
        }
        attendanceRecords = allRecords;
      }
      
      // Calculate attendance statistics
      const calculations = await calculateAttendanceStats(attendanceRecords, startDate, endDate);
      
      res.json({
        period: { startDate, endDate },
        userId: userId || 'all',
        calculations,
        attendanceRecords
      });
    } catch (error) {
      console.error('Attendance calculation error:', error);
      res.status(500).json({ message: "Failed to calculate attendance" });
    }
  });

  // Payroll calculation routes
  app.post("/api/payroll/calculate", requireHR, async (req, res) => {
    try {
      const { userId, month, year, baseSalary, overtimeRate } = req.body;
      
      // Input validation
      if (!userId || !month || !year || !baseSalary) {
        return res.status(400).json({ message: "User ID, month, year, and base salary are required" });
      }
      
      // Get user information
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get attendance records for the month
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
      
      const attendanceRecords = await storage.getAttendanceByUser(userId);
      const monthlyRecords = attendanceRecords.filter(record => 
        record.date >= startDate && record.date <= endDate
      );
      
      // Calculate payroll
      const payrollCalculation = await calculatePayroll(monthlyRecords, baseSalary, overtimeRate || 1.5, month, year);
      
      // Create payroll record
      const payrollData = {
        userId,
        month,
        year,
        baseSalary: baseSalary.toString(),
        overtimePay: payrollCalculation.salary.overtimePay.toString(),
        deductions: payrollCalculation.deductions.totalDeductions.toString(),
        netPay: payrollCalculation.netSalary.toString(),
        status: "processed"
      };
      
      const payroll = await storage.createPayroll(payrollData);
      
      res.json({
        payroll,
        calculation: payrollCalculation,
        attendanceRecords: monthlyRecords,
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (error) {
      console.error('Payroll calculation error:', error);
      res.status(500).json({ message: "Failed to calculate payroll" });
    }
  });

  // Employee report generation routes
  app.get("/api/reports/employees", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const employees = await storage.getEmployees();
      const report = [];

      for (const employee of employees) {
        const attendance = await storage.getAttendanceByUser(employee.id);
        const requests = await storage.getRequestsByUser(employee.id);
        const payroll = await storage.getPayrollByUser(employee.id);

        // Filter attendance by date range if provided
        let filteredAttendance = attendance;
        if (startDate && endDate) {
          filteredAttendance = attendance.filter(att => 
            att.date >= startDate && att.date <= endDate
          );
        }

        const totalHours = filteredAttendance.reduce((sum, att) => 
          sum + parseFloat(att.hoursWorked || '0'), 0
        );
        const totalOvertimeHours = filteredAttendance.reduce((sum, att) => 
          sum + parseFloat(att.overtimeHours || '0'), 0
        );

        report.push({
          employee: {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            department: employee.department,
            position: employee.position,
          },
          attendance: {
            totalDays: filteredAttendance.length,
            totalHours,
            totalOvertimeHours,
            presentDays: filteredAttendance.filter(att => att.status === 'present').length,
            absentDays: filteredAttendance.filter(att => att.status === 'absent').length,
            lateDays: filteredAttendance.filter(att => att.status === 'late').length,
          },
          requests: {
            total: requests.length,
            pending: requests.filter(req => req.status === 'pending').length,
            approved: requests.filter(req => req.status === 'approved').length,
            rejected: requests.filter(req => req.status === 'rejected').length,
          },
          payroll: {
            records: payroll.length,
            totalEarnings: payroll.reduce((sum, pay) => sum + parseFloat(pay.netPay), 0),
          }
        });
      }

      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate employee report" });
    }
  });

  // System Settings routes
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      if (!settings) {
        // Return default settings if none exist
        return res.json({
          appName: 'HRFlow',
          appLogo: null,
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          companyName: 'Your Company',
          companyAddress: null,
          companyEmail: null,
          companyPhone: null,
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          currency: 'USD'
        });
      }
      res.json(settings);
    } catch (error) {
      console.error('Get system settings error:', error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.put("/api/settings", authenticateToken, requireHR, async (req, res) => {
    try {
      const updateData = {
        ...req.body,
        createdBy: req.user!.id
      };
      
      const settings = await storage.updateSystemSettings(updateData);
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      res.json(settings);
    } catch (error) {
      console.error('Update system settings error:', error);
      res.status(500).json({ message: "Failed to update system settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
