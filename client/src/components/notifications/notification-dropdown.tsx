import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Check, CheckCheck, Clock, Calendar, MapPin } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  type: 'request_approved' | 'request_rejected' | 'system';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  requestId?: number;
  redirectUrl?: string;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotification: (notificationId: string) => void;
}

export default function NotificationDropdown({
  notifications,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotification,
}: NotificationDropdownProps) {
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'request_approved':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'request_rejected':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBgColor = (type: string, read: boolean) => {
    const baseClasses = read ? "bg-gray-50" : "bg-white";
    const borderColor = read ? "border-gray-200" : "border-blue-200";
    
    switch (type) {
      case 'request_approved':
        return `${baseClasses} ${borderColor} ${!read ? 'border-l-4 border-l-green-500' : ''}`;
      case 'request_rejected':
        return `${baseClasses} ${borderColor} ${!read ? 'border-l-4 border-l-red-500' : ''}`;
      default:
        return `${baseClasses} ${borderColor} ${!read ? 'border-l-4 border-l-blue-500' : ''}`;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-20 z-40"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="absolute top-12 right-0 w-80 bg-white rounded-xl shadow-2xl border z-50 max-h-96 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Notifications</h3>
              <p className="text-sm opacity-90">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onMarkAllAsRead}
                  className="text-white hover:bg-white hover:bg-opacity-20 text-xs px-2 py-1"
                >
                  <CheckCheck className="w-4 h-4 mr-1" />
                  Read All
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="text-white hover:bg-white hover:bg-opacity-20 p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">
                We'll notify you when there are updates to your requests
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${getNotificationBgColor(notification.type, notification.read)}`}
                  onClick={() => {
                    if (!notification.read) {
                      onMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm mt-1 ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                            {notification.message}
                          </p>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-2 mt-3">
                            {notification.redirectUrl && (
                              <Link href={notification.redirectUrl}>
                                <Button
                                  size="sm"
                                  className="text-xs px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                  }}
                                >
                                  View Details
                                </Button>
                              </Link>
                            )}
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                onClearNotification(notification.id);
                              }}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                        
                        {!notification.read && (
                          <div className="flex-shrink-0 ml-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 bg-gray-50 border-t">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{notifications.length} total notification{notifications.length !== 1 ? 's' : ''}</span>
              <span>Real-time updates</span>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}