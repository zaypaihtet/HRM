import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Navigation, Target } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import OpenStreetMap from "@/components/location/openstreetmap";

export default function MobileLocation() {
  return (
    <div className="w-full sm:max-w-sm mx-auto bg-black min-h-screen relative overflow-hidden">
      {/* Status Bar - Hidden */}
      <div className="hidden"></div>

      {/* App Content */}
      <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-t-3xl min-h-screen">
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 rounded-t-3xl text-white p-4"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Link href="/mobile-app">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">Live Location</h1>
                <p className="text-sm opacity-90">Real-time tracking & zones</p>
              </div>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Navigation className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">GPS tracking active</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span className="text-sm">Check-in zones visible</span>
            </div>
          </div>
        </motion.div>

        {/* OpenStreetMap Section */}
        <motion.div 
          className="p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <OpenStreetMap className="w-full" />
        </motion.div>

        {/* Instructions */}
        <motion.div 
          className="p-4 mx-4 bg-white rounded-2xl shadow-sm border border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="font-bold text-gray-800 mb-3">How it works</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium text-gray-800">Green zones are check-in areas</p>
                <p>You must be inside a green zone to check in to work</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">Blue dot is your location</p>
                <p>Your position updates automatically every 15 seconds</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Target className="w-3 h-3 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-800">Tap controls to navigate</p>
                <p>Use target button to center map on your location</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Spacing */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}