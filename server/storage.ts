import { 
  users, 
  attendance, 
  requests, 
  payroll, 
  holidays,
  checkinZones,
  workingHours,
  systemSettings,
  type User, 
  type InsertUser,
  type Attendance,
  type InsertAttendance,
  type Request,
  type InsertRequest,
  type Payroll,
  type InsertPayroll,
  type Holiday,
  type InsertHoliday,
  type CheckinZone,
  type InsertCheckinZone,
  type WorkingHours,
  type InsertWorkingHours,
  type SystemSettings,
  type InsertSystemSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "./utils/password";

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

  // Check-in Zones
  getCheckinZone(id: number): Promise<CheckinZone | undefined>;
  getAllCheckinZones(): Promise<CheckinZone[]>;
  getActiveCheckinZones(): Promise<CheckinZone[]>;
  createCheckinZone(zone: InsertCheckinZone): Promise<CheckinZone>;
  updateCheckinZone(id: number, zone: Partial<InsertCheckinZone>): Promise<CheckinZone | undefined>;
  deleteCheckinZone(id: number): Promise<boolean>;

  // Working Hours
  getWorkingHours(): Promise<WorkingHours[]>;
  getWorkingHoursByUser(userId: number): Promise<WorkingHours | undefined>;
  createWorkingHours(workingHours: InsertWorkingHours): Promise<WorkingHours>;
  updateWorkingHours(id: number, workingHours: Partial<InsertWorkingHours>): Promise<WorkingHours | undefined>;
  deleteWorkingHours(id: number): Promise<boolean>;

  // System Settings
  getSystemSettings(): Promise<SystemSettings | undefined>;
  updateSystemSettings(settings: Partial<InsertSystemSettings>): Promise<SystemSettings | undefined>;
  createSystemSettings(settings: InsertSystemSettings): Promise<SystemSettings>;
}

export class DatabaseStorage implements IStorage {
  private initialized = false;

  constructor() {
    // Don't run async operations in constructor
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log("Initializing database storage...");
      // Check if admin user exists, if not seed data
      const adminUser = await this.getUserByUsername("admin");
      if (!adminUser) {
        console.log("Admin user not found, seeding data...");
        await this.seedData();
      } else {
        console.log("Database already initialized");
      }
      this.initialized = true;
      console.log("Database storage initialized successfully");
    } catch (error) {
      console.error("Error initializing data:", error);
      throw error;
    }
  }

  private async seedData() {
    try {
      // Hash passwords for seed data
      const adminHashedPassword = await hashPassword("admin123");
      const employeeHashedPassword = await hashPassword("password123");
      
      // Create HR admin user
      const hrUser = await db.insert(users).values({
        username: "admin",
        password: adminHashedPassword,
        role: "hr",
        name: "Admin User",
        email: "admin@hrflow.com",
        department: "Human Resources",
        position: "HR Manager",
        baseSalary: "8000.00",
      }).returning();

      // Create sample employees
      const employeeData = [
        {
          username: "john.smith",
          password: employeeHashedPassword,
          name: "John Smith",
          email: "john.smith@company.com",
          department: "Engineering",
          position: "Software Engineer",
          baseSalary: "5500.00",
        },
        {
          username: "sarah.johnson",
          password: employeeHashedPassword,
          name: "Sarah Johnson",
          email: "sarah.johnson@company.com",
          department: "Design",
          position: "UI/UX Designer",
          baseSalary: "4800.00",
        },
        {
          username: "mike.brown",
          password: employeeHashedPassword,
          name: "Mike Brown",
          email: "mike.brown@company.com",
          department: "Management",
          position: "Project Manager",
          baseSalary: "6200.00",
        },
      ];

      const employees = await db.insert(users).values(employeeData).returning();

      // Create default check-in zone (office)
      await db.insert(checkinZones).values({
        name: "Main Office",
        latitude: "37.7749",
        longitude: "-122.4194",
        radius: 100,
      });

      // Create sample attendance records for today
      const today = new Date().toISOString().split('T')[0];
      await db.insert(attendance).values([
        {
          userId: employees[0].id,
          date: today,
          checkIn: new Date(new Date().setHours(9, 15, 0, 0)),
          checkOut: new Date(new Date().setHours(18, 30, 0, 0)),
          location: "Office",
          status: "present",
          hoursWorked: "9.25",
          overtimeHours: "1.25",
        },
        {
          userId: employees[1].id,
          date: today,
          checkIn: new Date(new Date().setHours(8, 45, 0, 0)),
          checkOut: new Date(new Date().setHours(17, 15, 0, 0)),
          location: "Office",
          status: "present",
          hoursWorked: "8.50",
          overtimeHours: "0.50",
        },
        {
          userId: employees[2].id,
          date: today,
          location: null,
          status: "absent",
          hoursWorked: "0.00",
          overtimeHours: "0.00",
        },
      ]);

      // Create sample holiday
      await db.insert(holidays).values({
        name: "New Year's Day",
        date: "2025-01-01",
      });

      console.log("Database seeded successfully");
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0] || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(updateUser).where(eq(users.id, id)).returning();
    return result[0] || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getEmployees(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "employee"));
  }

  // Attendance methods
  async getAttendance(id: number): Promise<Attendance | undefined> {
    const result = await db.select().from(attendance).where(eq(attendance.id, id));
    return result[0] || undefined;
  }

  async getAttendanceByUser(userId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.userId, userId));
  }

  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.date, date));
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const result = await db.insert(attendance).values(insertAttendance).returning();
    return result[0];
  }

  async updateAttendance(id: number, updateAttendance: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const result = await db.update(attendance).set(updateAttendance).where(eq(attendance.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteAttendance(id: number): Promise<boolean> {
    const result = await db.delete(attendance).where(eq(attendance.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getTodayAttendance(): Promise<Attendance[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db.select().from(attendance).where(eq(attendance.date, today));
  }

  // Request methods
  async getRequest(id: number): Promise<Request | undefined> {
    const result = await db.select().from(requests).where(eq(requests.id, id));
    return result[0] || undefined;
  }

  async getRequestsByUser(userId: number): Promise<Request[]> {
    return await db.select().from(requests).where(eq(requests.userId, userId));
  }

  async getAllRequests(): Promise<Request[]> {
    return await db.select().from(requests);
  }

  async getPendingRequests(): Promise<Request[]> {
    return await db.select().from(requests).where(eq(requests.status, "pending"));
  }

  async createRequest(insertRequest: InsertRequest): Promise<Request> {
    const result = await db.insert(requests).values(insertRequest).returning();
    return result[0];
  }

  async updateRequest(id: number, updateRequest: Partial<Request>): Promise<Request | undefined> {
    const result = await db.update(requests).set(updateRequest).where(eq(requests.id, id)).returning();
    return result[0] || undefined;
  }

  // Payroll methods
  async getPayroll(id: number): Promise<Payroll | undefined> {
    const result = await db.select().from(payroll).where(eq(payroll.id, id));
    return result[0] || undefined;
  }

  async getPayrollByUser(userId: number): Promise<Payroll[]> {
    return await db.select().from(payroll).where(eq(payroll.userId, userId));
  }

  async getPayrollByMonth(month: number, year: number): Promise<Payroll[]> {
    return await db.select().from(payroll).where(and(eq(payroll.month, month), eq(payroll.year, year)));
  }

  async createPayroll(insertPayroll: InsertPayroll): Promise<Payroll> {
    const result = await db.insert(payroll).values(insertPayroll).returning();
    return result[0];
  }

  async updatePayroll(id: number, updatePayroll: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    const result = await db.update(payroll).set(updatePayroll).where(eq(payroll.id, id)).returning();
    return result[0] || undefined;
  }

  // Holiday methods
  async getHoliday(id: number): Promise<Holiday | undefined> {
    const result = await db.select().from(holidays).where(eq(holidays.id, id));
    return result[0] || undefined;
  }

  async getAllHolidays(): Promise<Holiday[]> {
    return await db.select().from(holidays);
  }

  async createHoliday(insertHoliday: InsertHoliday): Promise<Holiday> {
    const result = await db.insert(holidays).values(insertHoliday).returning();
    return result[0];
  }

  async updateHoliday(id: number, updateHoliday: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const result = await db.update(holidays).set(updateHoliday).where(eq(holidays.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteHoliday(id: number): Promise<boolean> {
    const result = await db.delete(holidays).where(eq(holidays.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Check-in Zone methods
  async getCheckinZone(id: number): Promise<CheckinZone | undefined> {
    const result = await db.select().from(checkinZones).where(eq(checkinZones.id, id));
    return result[0] || undefined;
  }

  async getAllCheckinZones(): Promise<CheckinZone[]> {
    return await db.select().from(checkinZones);
  }

  async getActiveCheckinZones(): Promise<CheckinZone[]> {
    return await db.select().from(checkinZones).where(eq(checkinZones.isActive, true));
  }

  async createCheckinZone(insertZone: InsertCheckinZone): Promise<CheckinZone> {
    const result = await db.insert(checkinZones).values(insertZone).returning();
    return result[0];
  }

  async updateCheckinZone(id: number, updateZone: Partial<InsertCheckinZone>): Promise<CheckinZone | undefined> {
    const result = await db.update(checkinZones).set(updateZone).where(eq(checkinZones.id, id)).returning();
    return result[0] || undefined;
  }

  async deleteCheckinZone(id: number): Promise<boolean> {
    const result = await db.update(checkinZones).set({ isActive: false }).where(eq(checkinZones.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getWorkingHours(): Promise<WorkingHours[]> {
    const result = await db.select().from(workingHours).where(eq(workingHours.isActive, true));
    return result;
  }

  async getWorkingHoursByUser(userId: number): Promise<WorkingHours | undefined> {
    const result = await db.select().from(workingHours)
      .where(and(eq(workingHours.userId, userId), eq(workingHours.isActive, true)))
      .limit(1);
    return result[0] || undefined;
  }

  async createWorkingHours(insertWorkingHours: InsertWorkingHours): Promise<WorkingHours> {
    // If this is a global shift (no userId), deactivate all other global shifts
    if (!insertWorkingHours.userId) {
      await db.update(workingHours).set({ isActive: false }).where(eq(workingHours.userId, null));
    }
    
    // Insert new working hours
    const [newWorkingHours] = await db.insert(workingHours).values(insertWorkingHours).returning();
    return newWorkingHours;
  }

  async updateWorkingHours(id: number, updateWorkingHours: Partial<InsertWorkingHours>): Promise<WorkingHours | undefined> {
    const [updated] = await db.update(workingHours)
      .set({ ...updateWorkingHours, updatedAt: new Date() })
      .where(eq(workingHours.id, id))
      .returning();
    return updated;
  }

  async deleteWorkingHours(id: number): Promise<boolean> {
    const result = await db.delete(workingHours).where(eq(workingHours.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getSystemSettings(): Promise<SystemSettings | undefined> {
    const result = await db.select().from(systemSettings).limit(1);
    return result[0] || undefined;
  }

  async updateSystemSettings(updateSettings: Partial<InsertSystemSettings>): Promise<SystemSettings | undefined> {
    const existing = await this.getSystemSettings();
    if (existing) {
      const [updated] = await db.update(systemSettings).set({
        ...updateSettings,
        updatedAt: new Date()
      }).where(eq(systemSettings.id, existing.id)).returning();
      return updated;
    } else {
      // Create new settings if none exist
      return await this.createSystemSettings(updateSettings as InsertSystemSettings);
    }
  }

  async createSystemSettings(insertSettings: InsertSystemSettings): Promise<SystemSettings> {
    const [newSettings] = await db.insert(systemSettings).values(insertSettings).returning();
    return newSettings;
  }
}

export const storage = new DatabaseStorage();