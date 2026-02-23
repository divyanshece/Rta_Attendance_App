/**
 * Push Notifications service using Capacitor PushNotifications plugin.
 * Handles FCM token registration, foreground notifications, and tap actions.
 * Only active on native platforms (Android/iOS) — no-ops on web.
 */

import { authAPI } from './api'
import toast from 'react-hot-toast'

let initialized = false

export async function initPushNotifications(): Promise<void> {
  if (initialized) return

  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) return

    const { PushNotifications } = await import('@capacitor/push-notifications')

    // Request permission
    const permResult = await PushNotifications.requestPermissions()
    if (permResult.receive !== 'granted') {
      console.warn('Push notification permission not granted')
      return
    }

    // Listen for registration success — send token to backend
    PushNotifications.addListener('registration', async (token) => {
      console.log('FCM token received:', token.value?.substring(0, 20) + '...')
      try {
        await authAPI.registerFCMToken(token.value)
      } catch (e) {
        console.error('Failed to register FCM token:', e)
      }
    })

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error)
    })

    // Handle notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // Show as toast since OS won't show a banner when app is in foreground
      const title = notification.title || 'New Announcement'
      const body = notification.body || ''
      toast(
        `${title}\n${body}`,
        {
          duration: 4000,
          icon: '📢',
          style: { maxWidth: '90vw', fontSize: '14px' },
        }
      )
    })

    // Handle notification tap (app opened from notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data
      if (data?.type === 'announcement') {
        // Navigate to announcements page
        const userType = localStorage.getItem('user')
        try {
          const user = userType ? JSON.parse(userType) : null
          if (user?.user_type === 'student') {
            window.location.href = '/student/announcements'
          }
        } catch {
          // Ignore parse errors
        }
      }
    })

    // Register with FCM
    await PushNotifications.register()
    initialized = true
  } catch (e) {
    console.error('Failed to initialize push notifications:', e)
  }
}
