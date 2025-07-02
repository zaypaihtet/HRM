import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Users, BarChart3, Clock, DollarSign, FileCheck, Calendar, Smartphone, LogOut, MapPin, FileText, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Employees", href: "/employees", icon: UserPlus },
  { name: "Attendance", href: "/attendance", icon: Clock },
  { name: "Payroll", href: "/payroll", icon: DollarSign },
  { name: "Requests", href: "/requests", icon: FileCheck },
  { name: "Holidays", href: "/holidays", icon: Calendar },
  { name: "Check-in Zones", href: "/checkin-zones", icon: MapPin },
  { name: "Employee Reports", href: "/employee-reports", icon: FileText },
  { name: "Mobile App", href: "/mobile-app", icon: Smartphone },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 md:hidden" id="mobile-backdrop" />
      
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-in-out" id="sidebar">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Users className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">HRFlow</h1>
              <p className="text-sm text-gray-500">HR Management</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href === "/" && location === "/");
            
            return (
              <Link key={item.name} href={item.href} className={cn(
                "nav-item",
                isActive && "active bg-primary/10 text-primary"
              )}>
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Users className="text-white text-xs" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.position || "HR Manager"}</p>
              </div>
            </div>
            <Button 
              onClick={logout}
              variant="outline" 
              size="sm" 
              className="w-full text-xs"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
