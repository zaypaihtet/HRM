import jsPDF from "jspdf";

export interface PayslipData {
  employee: {
    name: string;
    id: string;
    position: string;
    department: string;
  };
  period: {
    month: string;
    year: number;
  };
  salary: {
    base: number;
    overtime: number;
    deductions: number;
    net: number;
  };
  attendance: {
    daysWorked: number;
    overtimeHours: number;
  };
}

export function generatePayslipPDF(data: PayslipData): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("HRFlow - Payslip", 20, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
  
  // Employee Information
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Employee Information", 20, 50);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${data.employee.name}`, 20, 60);
  doc.text(`Employee ID: ${data.employee.id}`, 20, 70);
  doc.text(`Position: ${data.employee.position}`, 20, 80);
  doc.text(`Department: ${data.employee.department}`, 20, 90);
  
  // Pay Period
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Pay Period", 120, 50);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Month: ${data.period.month}`, 120, 60);
  doc.text(`Year: ${data.period.year}`, 120, 70);
  
  // Salary Details
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Salary Details", 20, 120);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Base Salary: $${data.salary.base.toFixed(2)}`, 20, 130);
  doc.text(`Overtime Pay: $${data.salary.overtime.toFixed(2)}`, 20, 140);
  doc.text(`Deductions: $${data.salary.deductions.toFixed(2)}`, 20, 150);
  
  // Net Pay (highlighted)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Net Pay: $${data.salary.net.toFixed(2)}`, 20, 170);
  
  // Attendance Summary
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Attendance Summary", 120, 120);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Days Worked: ${data.attendance.daysWorked}`, 120, 130);
  doc.text(`Overtime Hours: ${data.attendance.overtimeHours}`, 120, 140);
  
  // Footer
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text("This is a computer-generated payslip. No signature required.", 20, 200);
  
  // Save the PDF
  doc.save(`payslip-${data.employee.name.replace(/\s+/g, '-')}-${data.period.month}-${data.period.year}.pdf`);
}

export function generateAttendanceReportPDF(attendanceData: any[]): void {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("HRFlow - Attendance Report", 20, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
  
  // Table headers
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Employee", 20, 50);
  doc.text("Date", 70, 50);
  doc.text("Check In", 100, 50);
  doc.text("Check Out", 130, 50);
  doc.text("Hours", 160, 50);
  doc.text("Status", 180, 50);
  
  // Table data
  doc.setFont("helvetica", "normal");
  let yPos = 60;
  
  attendanceData.forEach((record, index) => {
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.text(record.user?.name || "N/A", 20, yPos);
    doc.text(record.date, 70, yPos);
    doc.text(record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "-", 100, yPos);
    doc.text(record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "-", 130, yPos);
    doc.text(record.hoursWorked || "0", 160, yPos);
    doc.text(record.status, 180, yPos);
    
    yPos += 10;
  });
  
  doc.save(`attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
}
