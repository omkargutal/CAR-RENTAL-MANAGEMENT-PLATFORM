import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Check, Clock, ExternalLink, BellOff, Loader2 } from "lucide-react";
import { notificationsApi, NotificationItem } from "@/core/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface NotificationDropdownProps {
  className?: string;
  buttonClassName?: string;
}

export function NotificationDropdown({ className, buttonClassName }: NotificationDropdownProps) {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    if (!isAuthenticated || !user) return;
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.unread_count || 0);
    } catch {
      // Non-blocking
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated || !user) return;
    setLoading(true);
    try {
      const items = await notificationsApi.listNotifications();
      setNotifications(items);
      const unread = items.filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      // Optional polling every 60s
      const timer = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(timer);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Non-blocking
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Non-blocking
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClickNotification = async (item: NotificationItem) => {
    if (!item.is_read) {
      try {
        await notificationsApi.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Non-blocking
      }
    }
    setIsOpen(false);
    if (item.link_url) {
      navigate(item.link_url);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="View notifications"
        className={cn(
          "relative h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30",
          buttonClassName
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-orange-600 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="text-xs text-slate-400 hover:text-orange-400 font-medium flex items-center gap-1 transition"
              >
                {markingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="h-12 w-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <BellOff className="h-6 w-6" />
                </div>
                <p className="font-bold text-slate-900 text-sm">No notifications yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  You're all caught up! New trip confirmations and driver assignment alerts will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleClickNotification(item)}
                  className={cn(
                    "p-3.5 transition-colors cursor-pointer flex gap-3 text-left group",
                    item.is_read
                      ? "bg-white hover:bg-slate-50"
                      : "bg-orange-50/50 hover:bg-orange-50/80"
                  )}
                >
                  {/* Indicator Dot */}
                  <div className="pt-1 shrink-0">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full block",
                        item.is_read ? "bg-slate-300" : "bg-orange-500 ring-4 ring-orange-200"
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={cn(
                          "text-xs font-bold truncate",
                          item.is_read ? "text-slate-800" : "text-slate-900 font-extrabold"
                        )}
                      >
                        {item.subject}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    {item.link_url && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 mt-1">
                        View Details <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  {!item.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(e, item)}
                      title="Mark as read"
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition self-center shrink-0"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 text-center border-t border-slate-100">
            <span className="text-[11px] text-slate-400 font-medium">
              Swaraj Tours & Travel Notifications
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
