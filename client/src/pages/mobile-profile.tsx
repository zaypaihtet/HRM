import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, User, Mail, Phone, MapPin, Building, Edit3, Save, Camera, Settings, Shield, LogOut } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function MobileProfile() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "555-0123",
    position: user?.position || "",
    department: user?.department || "",
    emergencyContact: "555-0456"
  });
  const { toast } = useToast();

  const handleSave = () => {
    setIsEditing(false);
    toast({ title: "Profile updated successfully!" });
  };

  const handleLogout = () => {
    logout();
    toast({ title: "Logged out successfully" });
  };

  const profileSections = [
    {
      title: "Personal Information",
      items: [
        { icon: User, label: "Full Name", value: formData.name, field: "name" },
        { icon: Mail, label: "Email", value: formData.email, field: "email" },
        { icon: Phone, label: "Phone", value: formData.phone, field: "phone" },
      ]
    },
    {
      title: "Work Information",
      items: [
        { icon: Building, label: "Department", value: formData.department, field: "department" },
        { icon: MapPin, label: "Position", value: formData.position, field: "position" },
        { icon: Phone, label: "Emergency Contact", value: formData.emergencyContact, field: "emergencyContact" },
      ]
    }
  ];

  const settingsOptions = [
    { icon: Settings, title: "App Settings", subtitle: "Notifications, theme", action: () => {} },
    { icon: Shield, title: "Privacy Policy", subtitle: "Terms & conditions", action: () => {} },
    { icon: LogOut, title: "Log Out", subtitle: "Sign out of account", action: handleLogout, danger: true },
  ];

  return (
    <div className="max-w-sm mx-auto bg-black min-h-screen relative overflow-hidden">
      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 py-2 bg-black text-white text-xs">
        <div className="flex items-center space-x-1">
          <span className="font-medium">9:41</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white rounded-full"></div>
            <div className="w-1 h-2 bg-white rounded-full"></div>
            <div className="w-1 h-3 bg-white rounded-full"></div>
            <div className="w-1 h-4 bg-white rounded-full"></div>
          </div>
          <div className="w-6 h-3 border border-white rounded-sm">
            <div className="w-4 h-1.5 bg-white rounded-sm m-0.5"></div>
          </div>
        </div>
      </div>

      {/* App Content */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-t-3xl min-h-screen">
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-t-3xl text-white p-4"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Link href="/mobile-app">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Profile</h1>
                <p className="text-sm opacity-90">Personal information</p>
              </div>
            </div>
            <Button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-2"
            >
              {isEditing ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </Button>
          </div>

          {/* Profile Picture & Basic Info */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <User className="w-10 h-10" />
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Camera className="w-3 h-3 text-indigo-600" />
              </button>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user?.name || "David Miller"}</h2>
              <p className="text-sm opacity-90">{user?.role?.toUpperCase()} USER</p>
              <p className="text-xs opacity-75 mt-1">{user?.department || "IT Department"}</p>
            </div>
          </div>
        </motion.div>

        {/* Profile Sections */}
        <motion.div 
          className="p-4 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {profileSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: sectionIndex * 0.1 }}
            >
              <h3 className="font-semibold text-gray-800 mb-3">{section.title}</h3>
              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <div key={item.label} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                      {isEditing ? (
                        <Input
                          value={formData[item.field as keyof typeof formData]}
                          onChange={(e) => setFormData(prev => ({ ...prev, [item.field]: e.target.value }))}
                          className="text-sm"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-800">{item.value}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Settings Section */}
          <motion.div
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h3 className="font-semibold text-gray-800 mb-3">Settings</h3>
            <div className="space-y-1">
              {settingsOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={option.action}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                    option.danger ? 'hover:bg-red-50' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    option.danger 
                      ? 'bg-red-100' 
                      : 'bg-gray-100'
                  }`}>
                    <option.icon className={`w-4 h-4 ${
                      option.danger ? 'text-red-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`text-sm font-medium ${
                      option.danger ? 'text-red-600' : 'text-gray-800'
                    }`}>
                      {option.title}
                    </div>
                    <div className="text-xs text-gray-500">{option.subtitle}</div>
                  </div>
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* App Version */}
          <div className="text-center py-4">
            <p className="text-xs text-gray-500">HRFlow Mobile v1.0.0</p>
            <p className="text-xs text-gray-400 mt-1">Built with ❤️ for employees</p>
          </div>
        </motion.div>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}