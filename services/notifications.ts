/**
 * ZaykaBill POS - Notification Service
 * Handles in-app notifications and banner notifications (works even when app is closed)
 * 
 * Copyright (c) 2024 ZaykaBill
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Platform, NativeModules } from 'react-native';

// Notification channel ID for the app
const NOTIFICATION_CHANNEL_ID = 'zaykabill_pos_channel';
const NOTIFICATION_CHANNEL_NAME = 'ZaykaBill POS Notifications';
const NOTIFICATION_CHANNEL_DESCRIPTION = 'Notifications for orders, updates, and important information';

// Get native notification module
const { NotificationModule } = NativeModules;

interface NotificationData {
  action?: string;
  actionLabel?: string;
  notificationId?: string;
  [key: string]: any;
}

class NotificationService {
  /**
   * Initialize notification channels (required for Android 8.0+)
   * This should be called once when the app starts
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // For Android 8.0+ (API 26+), we need to create notification channels
      // This is done via native Android code (MainApplication.kt and NotificationModule.kt)
      const apiLevel = Platform.Version as number;
      
      if (apiLevel >= 26) {
        // Notification channels are required for Android 8.0+
        // The channel will be created in the native Android code
        console.log('Notification channels initialized for Android 8.0+');
      }
    } catch (error) {
      console.error('Error initializing notification channels:', error);
    }
  }

  /**
   * Show a banner notification (works even when app is closed)
   * @param title - Notification title
   * @param message - Notification message
   * @param data - Optional data to attach to notification
   * @returns Promise<number> - Notification ID
   */
  async showNotification(
    title: string,
    message: string,
    data?: NotificationData
  ): Promise<number | null> {
    if (Platform.OS !== 'android') {
      console.log('Notification (iOS not supported yet):', { title, message, data });
      return null;
    }

    try {
      if (!NotificationModule) {
        console.error('NotificationModule not available. Make sure native module is properly linked.');
        return null;
      }

      // Convert data object to React Native readable format
      const notificationData = data ? {
        action: data.action || undefined,
        actionLabel: data.actionLabel || 'View',
        notificationId: data.notificationId || undefined,
      } : null;

      // Show notification using native module
      const notificationId = await NotificationModule.showNotification(
        title,
        message,
        notificationData
      );

      console.log('Notification shown with ID:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Cancel a specific notification by ID
   * @param notificationId - ID of the notification to cancel
   */
  async cancelNotification(notificationId: number): Promise<void> {
    if (Platform.OS !== 'android' || !NotificationModule) {
      return;
    }

    try {
      await NotificationModule.cancelNotification(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    if (Platform.OS !== 'android' || !NotificationModule) {
      return;
    }

    try {
      await NotificationModule.cancelAllNotifications();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  /**
   * Show notification from server notification data
   * This is called when syncing notifications from the server
   */
  async showNotificationFromServer(notification: {
    id: string;
    title: string;
    message: string;
    type: string;
    [key: string]: any;
  }): Promise<number | null> {
    const actionLabel = notification.type === 'error' ? 'View Details' :
                        notification.type === 'warning' ? 'Review' :
                        notification.type === 'success' ? 'View' : 'Open';

    return this.showNotification(
      notification.title,
      notification.message,
      {
        action: 'open_notification',
        actionLabel,
        notificationId: notification.id,
        type: notification.type,
      }
    );
  }

  /**
   * Get notification channel ID
   */
  getChannelId(): string {
    return NOTIFICATION_CHANNEL_ID;
  }

  /**
   * Get notification channel name
   */
  getChannelName(): string {
    return NOTIFICATION_CHANNEL_NAME;
  }

  /**
   * Get notification channel description
   */
  getChannelDescription(): string {
    return NOTIFICATION_CHANNEL_DESCRIPTION;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

