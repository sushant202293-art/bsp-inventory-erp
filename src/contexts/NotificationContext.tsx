import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Notification } from '@/types/database.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
}

interface NotificationContextValue extends NotificationState {
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  addNotification: (notification: Pick<Notification, 'title' | 'message' | 'type' | 'link'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const fetched = (data || []) as Notification[];
      setNotifications(fetched);
      setUnreadCount(fetched.filter((n) => !n.is_read).length);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    channelRef.current = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const eventType = payload.eventType;
          const newRecord = payload.new as Notification | undefined;
          const oldRecord = payload.old as Pick<Notification, 'id'> | undefined;

          if (eventType === 'INSERT' && newRecord) {
            setNotifications((prev) => [newRecord, ...prev]);
            setUnreadCount((prev) => prev + 1);
          } else if (eventType === 'UPDATE' && newRecord) {
            setNotifications((prev) =>
              prev.map((n) => (n.id === newRecord.id ? newRecord : n))
            );
            setNotifications((prev) => {
              const updated = prev.map((n) => (n.id === newRecord.id ? newRecord : n));
              setUnreadCount(updated.filter((n) => !n.is_read).length);
              return updated;
            });
          } else if (eventType === 'DELETE' && oldRecord) {
            setNotifications((prev) => {
              const filtered = prev.filter((n) => n.id !== oldRecord.id);
              setUnreadCount(filtered.filter((n) => !n.is_read).length);
              return filtered;
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) => {
        const updated = prev.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        );
        setUnreadCount(updated.filter((n) => !n.is_read).length);
        return updated;
      });
    } catch { /* ignore */ }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, is_read: true }));
        setUnreadCount(0);
        return updated;
      });
    } catch { /* ignore */ }
  }, [user]);

  const dismissNotification = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) => {
        const filtered = prev.filter((n) => n.id !== id);
        setUnreadCount(filtered.filter((n) => !n.is_read).length);
        return filtered;
      });
    } catch { /* ignore */ }
  }, []);

  const addNotification = useCallback(async (
    notification: Pick<Notification, 'title' | 'message' | 'type' | 'link'>
  ) => {
    if (!user || !profile) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          company_id: profile.company_id ?? user.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          link: notification.link,
          is_read: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setNotifications((prev) => [data as Notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      }
    } catch { /* ignore */ }
  }, [user, profile]);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    addNotification,
  }), [notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead, dismissNotification, addNotification]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export { NotificationContext };
