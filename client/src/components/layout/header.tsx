import { Bell, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export default function Header({ title = "Dashboard", subtitle = "Welcome back, manage your HR operations" }: HeaderProps) {
  const { user } = useAuth();

  const toggleSidebar = () => {
    const sidebar = document.getElementById("sidebar");
    const backdrop = document.getElementById("mobile-backdrop");
    
    if (sidebar && backdrop) {
      sidebar.classList.toggle("-translate-x-full");
      backdrop.classList.toggle("hidden");
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            <p className="text-gray-500">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              3
            </Badge>
          </Button>
          
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="text-white text-sm" />
          </div>
        </div>
      </div>
    </header>
  );
}
