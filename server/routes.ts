import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertAttendanceSchema, insertRequestSchema, insertPayrollSchema, insertHolidaySchema, insertCheckinZoneSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({ 
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
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
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
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
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
  app.get("/api/attendance", async (req, res) => {
    try {
      const { date, userId } = req.query;
      let attendance;
      
      if (date) {
        attendance = await storage.getAttendanceByDate(date as string);
      } else if (userId) {
        attendance = await storage.getAttendanceByUser(parseInt(userId as string));
      } else {
        attendance = await storage.getTodayAttendance();
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
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      res.status(400).json({ message: "Invalid attendance data" });
    }
  });

  app.put("/api/attendance/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const attendance = await storage.updateAttendance(id, updateData);
      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to update attendance" });
    }
  });

  app.delete("/api/attendance/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAttendance(id);
      if (!deleted) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      res.json({ message: "Attendance record deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete attendance" });
    }
  });

  // Check-in/Check-out routes
  app.post("/api/attendance/checkin", async (req, res) => {
    try {
      const { userId, location } = req.body;
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
      res.status(500).json({ message: "Check-in failed" });
    }
  });

  app.post("/api/attendance/checkout", async (req, res) => {
    try {
      const { userId } = req.body;
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

  app.put("/api/requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const request = await storage.updateRequest(id, updateData);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      res.json(request);
    } catch (error) {
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
      const zoneData = insertCheckinZoneSchema.parse(req.body);
      const zone = await storage.createCheckinZone(zoneData);
      res.status(201).json(zone);
    } catch (error) {
      res.status(400).json({ message: "Invalid check-in zone data" });
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

  const httpServer = createServer(app);
  return httpServer;
}
