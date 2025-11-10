# Banner Notifications - Implementation Guide

## Overview
The app now supports banner notifications that appear even when the app is closed or not in use. These notifications are displayed as system notifications in the Android notification tray.

## Features

✅ **Banner Notifications** - System notifications appear in the notification tray
✅ **Works When App is Closed** - Notifications appear even when the app is not running
✅ **Click to Open** - Tapping a notification opens the app
✅ **Action Buttons** - Notifications can have action buttons (e.g., "View", "Review")
✅ **Auto-Sync** - New notifications from server automatically show as banners

## How It Works

### 1. Native Android Module
- `NotificationModule.kt` - Native Android module that handles notification display
- `NotificationPackage.kt` - React Native package that registers the module
- Created automatically when app starts via `MainApplication.kt`

### 2. Notification Service
- `services/notifications.ts` - React Native service that calls the native module
- Provides methods to show, cancel notifications
- Automatically shows banner for new unread notifications from server

### 3. Automatic Banner Display
When syncing notifications from the server:
- New unread notifications automatically show as banner notifications
- Works even when app is closed (if there's a background sync service)
- Notifications appear in the system notification tray

## Usage

### Show a Banner Notification Manually

```typescript
import { notificationService } from './services/notifications';

// Simple notification
await notificationService.showNotification(
  'New Order',
  'Order #1234 has been placed',
);

// Notification with action
await notificationService.showNotification(
  'Order Ready',
  'Order #1234 is ready for pickup',
  {
    action: 'view_order',
    actionLabel: 'View Order',
    notificationId: 'order_1234',
  }
);
```

### Show Notification from Server Data

```typescript
await notificationService.showNotificationFromServer({
  id: 'notification_id',
  title: 'New Order',
  message: 'Order #1234 has been placed',
  type: 'info',
  isRead: false,
});
```

### Cancel Notifications

```typescript
// Cancel specific notification
await notificationService.cancelNotification(notificationId);

// Cancel all notifications
await notificationService.cancelAllNotifications();
```

## Notification Channel

The app creates a notification channel called "ZaykaBill POS Notifications" with:
- **Channel ID**: `zaykabill_pos_channel`
- **Importance**: HIGH (shows as banner/heads-up notification)
- **Vibration**: Enabled
- **Lights**: Enabled

Users can customize notification settings in Android Settings > Apps > ZaykaBillPOS > Notifications.

## Permissions

The app automatically requests notification permission on Android 13+ (API 33+):
- `POST_NOTIFICATIONS` permission is requested on app startup
- Users can grant/deny in the permission dialog

## Testing

To test banner notifications:

1. **When app is open**: Notifications appear in the notification tray
2. **When app is in background**: Notifications appear as banners
3. **When app is closed**: Notifications still appear (if background sync is running)

## Notes

- Notifications work even when the app is closed (if background sync is enabled)
- Banner notifications appear in the system notification tray
- Tapping a notification opens the app
- Notifications are automatically shown for new unread notifications from the server

