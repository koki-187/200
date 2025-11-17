import { create } from 'zustand'

export interface Notification {
  id: number
  user_id: number
  deal_id: number | null
  message: string
  type: string
  is_read: boolean
  created_at: string
  deal_title?: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markAsRead: (id: number) => void
  markAllAsRead: () => void
  deleteNotification: (id: number) => void
  updateUnreadCount: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  setNotifications: (notifications) => {
    set({ notifications })
    get().updateUnreadCount()
  },
  
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications]
    }))
    get().updateUnreadCount()
  },
  
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((notif) =>
        notif.id === id ? { ...notif, is_read: true } : notif
      )
    }))
    get().updateUnreadCount()
  },
  
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notif) => ({
        ...notif,
        is_read: true
      }))
    }))
    get().updateUnreadCount()
  },
  
  deleteNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((notif) => notif.id !== id)
    }))
    get().updateUnreadCount()
  },
  
  updateUnreadCount: () => {
    const unreadCount = get().notifications.filter((n) => !n.is_read).length
    set({ unreadCount })
  }
}))
