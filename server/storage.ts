import { 
  users, 
  attendance, 
  requests, 
  payroll, 
  holidays,
  type User, 
  type InsertUser,
  type Attendance,
  type InsertAttendance,
  type Request,
  type InsertRequest,
  type Payroll,
  type InsertPayroll,
  type Holiday,
  type InsertHoliday
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getEmployees(): Promise<User[]>;

  // Attendance
  getAttendance(id: number): Promise<Attendance | undefined>;
  getAttendanceByUser(userId: number): Promise<Attendance[]>;
  getAttendanceByDate(date: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  deleteAttendance(id: number): Promise<boolean>;
  getTodayAttendance(): Promise<Attendance[]>;

  // Requests
  getRequest(id: number): Promise<Request | undefined>;
  getRequestsByUser(userId: number): Promise<Request[]>;
  getAllRequests(): Promise<Request[]>;
  getPendingRequests(): Promise<Request[]>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequest(id: number, request: Partial<Request>): Promise<Request | undefined>;

  // Payroll
  getPayroll(id: number): Promise<Payroll | undefined>;
  getPayrollByUser(userId: number): Promise<Payroll[]>;
  getPayrollByMonth(month: number, year: number): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(id: number, payroll: Partial<InsertPayroll>): Promise<Payroll | undefined>;

  // Holidays
  getHoliday(id: number): Promise<Holiday | undefined>;
  getAllHolidays(): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: number, holiday: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private attendance: Map<number, Attendance> = new Map();
  private requests: Map<number, Request> = new Map();
  private payroll: Map<number, Payroll> = new Map();
  private holidays: Map<number, Holiday> = new Map();
  
  private currentUserId = 1;
  private currentAttendanceId = 1;
  private currentRequestId = 1;
  private currentPayrollId = 1;
  private currentHolidayId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Create HR admin user
    const hrUser: User = {
      id: this.currentUserId++,
      username: "admin",
      password: "admin123",
      role: "hr",
      name: "Admin User",
      email: "admin@hrflow.com",
      department: "Human Resources",
      position: "HR Manager",
      baseSalary: "8000.00",
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(hrUser.id, hrUser);

    // Create sample employees
    const employees = [
      {
        username: "john.smith",
        password: "password123",
        name: "John Smith",
        email: "john.smith@company.com",
        department: "Engineering",
        position: "Software Engineer",
        baseSalary: "5500.00",
      },
      {
        username: "sarah.johnson",
        password: "password123",
        name: "Sarah Johnson",
        email: "sarah.johnson@company.com",
        department: "Design",
        position: "UI/UX Designer",
        baseSalary: "4800.00",
      },
      {
        username: "mike.brown",
        password: "password123",
        name: "Mike Brown",
        email: "mike.brown@company.com",
        department: "Management",
        position: "Project Manager",
        baseSalary: "6200.00",
      },
    ];

    employees.forEach(emp => {
      const user: User = {
        id: this.currentUserId++,
        username: emp.username,
        password: emp.password,
        role: "employee",
        name: emp.name,
        email: emp.email,
        department: emp.department,
        position: emp.position,
        baseSalary: emp.baseSalary,
        isActive: true,
        createdAt: new Date(),
      };
      this.users.set(user.id, user);
    });

    // Create sample attendance records for today
    const today = new Date().toISOString().split('T')[0];
    const attendanceRecords = [
      {
        userId: 2,
        date: today,
        checkIn: new Date(new Date().setHours(9, 15, 0, 0)),
        checkOut: new Date(new Date().setHours(18, 30, 0, 0)),
        location: "Office",
        status: "present",
        hoursWorked: "9.25",
        overtimeHours: "1.25",
      },
      {
        userId: 3,
        date: today,
        checkIn: new Date(new Date().setHours(8, 45, 0, 0)),
        checkOut: new Date(new Date().setHours(17, 15, 0, 0)),
        location: "Office",
        status: "present",
        hoursWorked: "8.50",
        overtimeHours: "0.50",
      },
      {
        userId: 4,
        date: today,
        checkIn: null,
        checkOut: null,
        location: null,
        status: "absent",
        hoursWorked: "0.00",
        overtimeHours: "0.00",
      },
    ];

    attendanceRecords.forEach(att => {
      const attendance: Attendance = {
        id: this.currentAttendanceId++,
        ...att,
      };
      this.attendance.set(attendance.id, attendance);
    });

    // Create sample requests
    const sampleRequests = [
      {
        userId: 3,
        type: "leave",
        startDate: "2024-04-15",
        endDate: "2024-04-19",
        reason: "Family vacation",
        status: "pending",
        reviewerId: null,
        reviewComment: null,
        createdAt: new Date(),
        reviewedAt: null,
      },
      {
        userId: 4,
        type: "overtime",
        startDate: "2024-03-28",
        endDate: "2024-03-28",
        reason: "Project deadline",
        status: "approved",
        reviewerId: 1,
        reviewComment: "Approved for project completion",
        createdAt: new Date(Date.now() - 86400000),
        reviewedAt: new Date(),
      },
      {
        userId: 2,
        type: "attendance_adjustment",
        startDate: "2024-03-25",
        endDate: "2024-03-25",
        reason: "Forgot to check-in",
        status: "pending",
        reviewerId: null,
        reviewComment: null,
        createdAt: new Date(Date.now() - 3600000),
        reviewedAt: null,
      },
    ];

    sampleRequests.forEach(req => {
      const request: Request = {
        id: this.currentRequestId++,
        ...req,
      };
      this.requests.set(request.id, request);
    });

    // Create sample payroll records
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    [2, 3, 4].forEach(userId => {
      const user = this.users.get(userId);
      if (user) {
        const baseSalary = parseFloat(user.baseSalary || "0");
        const overtimePay = userId === 2 ? 280 : userId === 3 ? 120 : 0;
        const deductions = baseSalary * 0.12; // 12% deductions
        const netPay = baseSalary + overtimePay - deductions;

        const payrollRecord: Payroll = {
          id: this.currentPayrollId++,
          userId,
          month: currentMonth,
          year: currentYear,
          baseSalary: baseSalary.toFixed(2),
          overtimePay: overtimePay.toFixed(2),
          deductions: deductions.toFixed(2),
          netPay: netPay.toFixed(2),
          status: userId === 2 ? "processed" : "pending",
          createdAt: new Date(),
        };
        this.payroll.set(payrollRecord.id, payrollRecord);
      }
    });

    // Create sample holidays
    const holidays = [
      { name: "New Year's Day", date: "2024-01-01", isActive: true },
      { name: "Independence Day", date: "2024-07-04", isActive: true },
      { name: "Christmas Day", date: "2024-12-25", isActive: true },
    ];

    holidays.forEach(holiday => {
      const holidayRecord: Holiday = {
        id: this.currentHolidayId++,
        ...holiday,
      };
      this.holidays.set(holidayRecord.id, holidayRecord);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.currentUserId++,
      ...insertUser,
      role: insertUser.role || "employee",
      department: insertUser.department || null,
      position: insertUser.position || null,
      baseSalary: insertUser.baseSalary || null,
      isActive: insertUser.isActive ?? true,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...updateUser };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getEmployees(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === "employee");
  }

  // Attendance methods
  async getAttendance(id: number): Promise<Attendance | undefined> {
    return this.attendance.get(id);
  }

  async getAttendanceByUser(userId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(att => att.userId === userId);
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(att => att.date === date);
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const attendance: Attendance = {
      id: this.currentAttendanceId++,
      ...insertAttendance,
      status: insertAttendance.status || "present",
      checkIn: insertAttendance.checkIn || null,
      checkOut: insertAttendance.checkOut || null,
      location: insertAttendance.location || null,
      hoursWorked: insertAttendance.hoursWorked || null,
      overtimeHours: insertAttendance.overtimeHours || null,
    };
    this.attendance.set(attendance.id, attendance);
    return attendance;
  }

  async updateAttendance(id: number, updateAttendance: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const attendance = this.attendance.get(id);
    if (!attendance) return undefined;

    const updatedAttendance = { ...attendance, ...updateAttendance };
    this.attendance.set(id, updatedAttendance);
    return updatedAttendance;
  }

  async deleteAttendance(id: number): Promise<boolean> {
    return this.attendance.delete(id);
  }

  async getTodayAttendance(): Promise<Attendance[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getAttendanceByDate(today);
  }

  // Request methods
  async getRequest(id: number): Promise<Request | undefined> {
    return this.requests.get(id);
  }

  async getRequestsByUser(userId: number): Promise<Request[]> {
    return Array.from(this.requests.values()).filter(req => req.userId === userId);
  }

  async getAllRequests(): Promise<Request[]> {
    return Array.from(this.requests.values());
  }

  async getPendingRequests(): Promise<Request[]> {
    return Array.from(this.requests.values()).filter(req => req.status === "pending");
  }

  async createRequest(insertRequest: InsertRequest): Promise<Request> {
    const request: Request = {
      id: this.currentRequestId++,
      ...insertRequest,
      status: insertRequest.status || "pending",
      endDate: insertRequest.endDate || null,
      reviewerId: insertRequest.reviewerId || null,
      reviewComment: insertRequest.reviewComment || null,
      createdAt: new Date(),
      reviewedAt: null,
    };
    this.requests.set(request.id, request);
    return request;
  }

  async updateRequest(id: number, updateRequest: Partial<Request>): Promise<Request | undefined> {
    const request = this.requests.get(id);
    if (!request) return undefined;

    const updatedRequest = { ...request, ...updateRequest };
    if (updateRequest.status && updateRequest.status !== "pending") {
      updatedRequest.reviewedAt = new Date();
    }
    this.requests.set(id, updatedRequest);
    return updatedRequest;
  }

  // Payroll methods
  async getPayroll(id: number): Promise<Payroll | undefined> {
    return this.payroll.get(id);
  }

  async getPayrollByUser(userId: number): Promise<Payroll[]> {
    return Array.from(this.payroll.values()).filter(pay => pay.userId === userId);
  }

  async getPayrollByMonth(month: number, year: number): Promise<Payroll[]> {
    return Array.from(this.payroll.values()).filter(pay => pay.month === month && pay.year === year);
  }

  async createPayroll(insertPayroll: InsertPayroll): Promise<Payroll> {
    const payroll: Payroll = {
      id: this.currentPayrollId++,
      ...insertPayroll,
      status: insertPayroll.status || "pending",
      overtimePay: insertPayroll.overtimePay || null,
      deductions: insertPayroll.deductions || null,
      createdAt: new Date(),
    };
    this.payroll.set(payroll.id, payroll);
    return payroll;
  }

  async updatePayroll(id: number, updatePayroll: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    const payroll = this.payroll.get(id);
    if (!payroll) return undefined;

    const updatedPayroll = { ...payroll, ...updatePayroll };
    this.payroll.set(id, updatedPayroll);
    return updatedPayroll;
  }

  // Holiday methods
  async getHoliday(id: number): Promise<Holiday | undefined> {
    return this.holidays.get(id);
  }

  async getAllHolidays(): Promise<Holiday[]> {
    return Array.from(this.holidays.values()).filter(holiday => holiday.isActive);
  }

  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const holiday: Holiday = {
      id: this.currentHolidayId++,
      ...insertHoliday,
      isActive: insertHoliday.isActive ?? true,
    };
    this.holidays.set(holiday.id, holiday);
    return holiday;
  }

  async updateHoliday(id: number, updateHoliday: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const holiday = this.holidays.get(id);
    if (!holiday) return undefined;

    const updatedHoliday = { ...holiday, ...updateHoliday };
    this.holidays.set(id, updatedHoliday);
    return updatedHoliday;
  }

  async deleteHoliday(id: number): Promise<boolean> {
    const holiday = this.holidays.get(id);
    if (!holiday) return false;

    const updatedHoliday = { ...holiday, isActive: false };
    this.holidays.set(id, updatedHoliday);
    return true;
  }
}

export const storage = new MemStorage();
