import { pgTable, text, serial, integer, boolean, timestamp, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"), // employee or hr
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  department: text("department"),
  position: text("position"),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  location: text("location"),
  status: text("status").notNull().default("present"), // present, absent, late, on_leave
  hoursWorked: decimal("hours_worked", { precision: 4, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }).default("0"),
  notes: text("notes"), // Additional notes for attendance records
});

export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // leave, overtime, attendance_adjustment
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewerId: integer("reviewer_id").references(() => users.id),
  reviewComment: text("review_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"), // Additional notes and system messages
});

export const payroll = pgTable("payroll", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  overtimePay: decimal("overtime_pay", { precision: 10, scale: 2 }).default("0"),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0"),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, processed
  createdAt: timestamp("created_at").defaultNow(),
});

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  isActive: boolean("is_active").default(true),
});

export const checkinZones = pgTable("checkin_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  radius: integer("radius").notNull(), // in meters
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workingHours = pgTable("working_hours", {
  id: serial("id").primaryKey(),
  startTime: text("start_time").notNull().default("09:30"), // HH:MM format
  endTime: text("end_time").notNull().default("17:00"),     // HH:MM format
  earliestCheckIn: text("earliest_check_in").notNull().default("08:00"), // Earliest allowed check-in time
  latestCheckOut: text("latest_check_out").notNull().default("20:00"), // Latest allowed check-out time
  workDays: text("work_days").notNull().default("2,3,4,5,6,0"), // Comma separated day numbers
  breakDuration: integer("break_duration").notNull().default(60), // minutes
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull().default("HRFlow"),
  appLogo: text("app_logo"), // URL or base64 encoded image
  primaryColor: text("primary_color").default("#3B82F6"),
  secondaryColor: text("secondary_color").default("#1E40AF"),
  companyName: text("company_name").default("Your Company"),
  companyAddress: text("company_address"),
  companyEmail: text("company_email"),
  companyPhone: text("company_phone"),
  timezone: text("timezone").default("UTC"),
  dateFormat: text("date_format").default("MM/DD/YYYY"),
  currency: text("currency").default("USD"),
  createdBy: integer("created_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
});

export const insertRequestSchema = createInsertSchema(requests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertPayrollSchema = createInsertSchema(payroll).omit({
  id: true,
  createdAt: true,
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({
  id: true,
});

export const insertCheckinZoneSchema = createInsertSchema(checkinZones).omit({
  id: true,
  createdAt: true,
});

export const insertWorkingHoursSchema = createInsertSchema(workingHours).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Request = typeof requests.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type Payroll = typeof payroll.$inferSelect;
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type CheckinZone = typeof checkinZones.$inferSelect;
export type InsertCheckinZone = z.infer<typeof insertCheckinZoneSchema>;
export type WorkingHours = typeof workingHours.$inferSelect;
export type InsertWorkingHours = z.infer<typeof insertWorkingHoursSchema>;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
