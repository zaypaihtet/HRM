import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

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

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lastRequestUpdate, setLastRequestUpdate] = useState<string>("");
  const { user } = useAuth();

  // Fetch user requests to generate notifications
  const { data: requests = [] } = useQuery<any[]>({
    queryKey: ["/api/requests", { userId: user?.id }],
    enabled: !!user?.id,
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });

  // Generate notifications from request status changes
  useEffect(() => {
    if (!requests.length) return;

    const currentUpdate = JSON.stringify(requests.map((r: any) => ({ id: r.id, status: r.status, reviewedAt: r.reviewedAt })));
    
    // Only process if there's been a change
    if (currentUpdate === lastRequestUpdate) return;
    
    setLastRequestUpdate(currentUpdate);

    const newNotifications: Notification[] = [];
    
    requests.forEach((request: any) => {
      if (request.status === 'approved' && request.reviewedAt) {
        newNotifications.push({
          id: `request-${request.id}-approved`,
          type: 'request_approved',
          title: 'Request Approved ✅',
          message: `Your ${getRequestTypeLabel(request.type)} has been approved`,
          timestamp: request.reviewedAt,
          read: false,
          requestId: request.id,
          redirectUrl: getRedirectUrl(request.type)
        });
      } else if (request.status === 'rejected' && request.reviewedAt) {
        newNotifications.push({
          id: `request-${request.id}-rejected`,
          type: 'request_rejected',
          title: 'Request Rejected ❌',
          message: `Your ${getRequestTypeLabel(request.type)} was not approved`,
          timestamp: request.reviewedAt,
          read: false,
          requestId: request.id,
          redirectUrl: getRedirectUrl(request.type)
        });
      }
    });

    // Only add notifications that aren't already present
    const existingIds = notifications.map(n => n.id);
    const freshNotifications = newNotifications.filter(n => !existingIds.includes(n.id));
    
    if (freshNotifications.length > 0) {
      setNotifications(prev => [...freshNotifications, ...prev].slice(0, 20)); // Keep only latest 20
    }
  }, [requests, lastRequestUpdate, notifications]);

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "leave": return "Leave Request";
      case "overtime": return "Overtime Request";
      case "attendance_adjustment": return "Attendance Adjustment";
      default: return "Request";
    }
  };

  const getRedirectUrl = (type: string) => {
    switch (type) {
      case "leave": return "/mobile-leave";
      case "overtime": return "/mobile-app";
      case "attendance_adjustment": return "/mobile-attendance";
      default: return "/mobile-app";
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
  };
}