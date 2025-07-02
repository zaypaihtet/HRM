import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import Dashboard from "@/pages/dashboard";
import Attendance from "@/pages/attendance";
import Payroll from "@/pages/payroll";
import Requests from "@/pages/requests";
import Holidays from "@/pages/holidays";
import CheckinZones from "@/pages/checkin-zones";
import EmployeeReports from "@/pages/employee-reports";
import Employees from "@/pages/employees";
import Mobile from "@/pages/mobile";
import MobileReal from "@/pages/mobile-real";
import MobileRequests from "@/pages/mobile-requests";
import MobileApp from "@/pages/mobile-app";
import MobileLocation from "@/pages/mobile-location";
import EmployeePortal from "@/pages/employee-portal";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", credentials);
      return response.json();
    },
    onSuccess: (data) => {
      login(data.user, data.token);
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.name}!`,
      });
    },
    onError: () => {
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mr-3">
              <Users className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">HRFlow</h1>
              <p className="text-sm text-gray-500">HR Management System</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Demo Credentials:</p>
            <p>HR: admin / admin123</p>
            <p>Employee: john.smith / password123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AppLayout() {
  const { user } = useAuth();
  
  if (user?.role === "employee") {
    return (
      <Switch>
        <Route path="/mobile-real" component={MobileReal} />
        <Route path="/mobile-requests" component={MobileRequests} />
        <Route path="/mobile-location" component={MobileLocation} />
        <Route path="/mobile-app" component={MobileApp} />
        <Route path="/mobile" component={Mobile} />
        <Route component={EmployeePortal} />
      </Switch>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <main className="p-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/employees" component={Employees} />
            <Route path="/attendance" component={Attendance} />
            <Route path="/payroll" component={Payroll} />
            <Route path="/requests" component={Requests} />
            <Route path="/holidays" component={Holidays} />
            <Route path="/checkin-zones" component={CheckinZones} />
            <Route path="/employee-reports" component={EmployeeReports} />
            <Route path="/mobile" component={Mobile} />
            <Route component={Dashboard} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AppContent() {
  const { user } = useAuth();
  
  if (!user) {
    return <LoginForm />;
  }

  return <AppLayout />;
}

export default App;
