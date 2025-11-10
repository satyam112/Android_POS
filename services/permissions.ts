/**
 * ZaykaBill POS - Permissions Service
 * Handles runtime permission requests for Bluetooth and File Storage
 * 
 * Copyright (c) 2024 ZaykaBill
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

interface PermissionStatus {
  granted: boolean;
  message?: string;
}

class PermissionsService {
  /**
   * Request all required permissions for the app
   * Returns true if all permissions are granted
   */
  async requestAllPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      // iOS permissions are handled differently
      return true;
    }

    const bluetoothGranted = await this.requestBluetoothPermissions();
    const storageGranted = await this.requestStoragePermissions();
    const notificationGranted = await this.requestNotificationPermissions();

    return bluetoothGranted && storageGranted && notificationGranted;
  }

  /**
   * Request Bluetooth permissions
   * Required for printer connectivity
   */
  async requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version as number;
      const permissions: string[] = [];

      if (apiLevel >= 31) {
        // Android 12+ (API 31+)
        permissions.push(
          'android.permission.BLUETOOTH_CONNECT',
          'android.permission.BLUETOOTH_SCAN',
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
      } else {
        // Android 11 and below
        permissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
      }

      const results = await PermissionsAndroid.requestMultiple(permissions);

      // Check if all permissions are granted
      const allGranted = Object.values(results).every(
        (result) => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        const deniedPermissions = Object.entries(results)
          .filter(([_, result]) => result !== PermissionsAndroid.RESULTS.GRANTED)
          .map(([permission]) => permission);

        Alert.alert(
          'Bluetooth Permission Required',
          'Bluetooth permission is required to connect to printers. Please grant the permission in app settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: async () => {
                try {
                  await Linking.openSettings();
                } catch (error) {
                  console.error('Error opening settings:', error);
                }
              }
            },
          ]
        );

        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting Bluetooth permissions:', error);
      return false;
    }
  }

  /**
   * Request storage permissions
   * Required for saving files (reports, receipts, etc.)
   */
  async requestStoragePermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version as number;
      const permissions: string[] = [];

      if (apiLevel >= 33) {
        // Android 13+ (API 33+) - Use scoped storage
        permissions.push(
          'android.permission.READ_MEDIA_IMAGES',
          'android.permission.READ_MEDIA_VIDEO',
          'android.permission.READ_MEDIA_AUDIO'
        );
      } else {
        // Android 12 and below
        permissions.push(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
      }

      const results = await PermissionsAndroid.requestMultiple(permissions);

      // Check if all permissions are granted
      const allGranted = Object.values(results).every(
        (result) => result === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        Alert.alert(
          'Storage Permission Required',
          'Storage permission is required to save files (reports, receipts, etc.). Please grant the permission in app settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: async () => {
                try {
                  await Linking.openSettings();
                } catch (error) {
                  console.error('Error opening settings:', error);
                }
              }
            },
          ]
        );

        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting storage permissions:', error);
      return false;
    }
  }

  /**
   * Check if Bluetooth permissions are granted
   */
  async checkBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version as number;

      if (apiLevel >= 31) {
        // Android 12+
        const connect = await PermissionsAndroid.check(
          'android.permission.BLUETOOTH_CONNECT'
        );
        const scan = await PermissionsAndroid.check(
          'android.permission.BLUETOOTH_SCAN'
        );
        return connect && scan;
      } else {
        // Android 11 and below
        const bluetooth = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH
        );
        const bluetoothAdmin = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN
        );
        return bluetooth && bluetoothAdmin;
      }
    } catch (error) {
      console.error('Error checking Bluetooth permissions:', error);
      return false;
    }
  }

  /**
   * Check if storage permissions are granted
   */
  async checkStoragePermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version as number;

      if (apiLevel >= 33) {
        // Android 13+ - Check media permissions
        const images = await PermissionsAndroid.check(
          'android.permission.READ_MEDIA_IMAGES'
        );
        return images; // At least one media permission should be granted
      } else {
        // Android 12 and below
        const read = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        const write = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
        );
        return read && write;
      }
    } catch (error) {
      console.error('Error checking storage permissions:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   * Required for sending in-app notifications (Android 13+)
   */
  async requestNotificationPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version as number;

      // Android 13+ (API 33+) requires POST_NOTIFICATIONS permission
      if (apiLevel >= 33) {
        const result = await PermissionsAndroid.request(
          'android.permission.POST_NOTIFICATIONS'
        );

        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Notification Permission Required',
            'Notification permission is required to receive in-app notifications. Please grant the permission in app settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: async () => {
                  try {
                    await Linking.openSettings();
                  } catch (error) {
                    console.error('Error opening settings:', error);
                  }
                }
              },
            ]
          );

          return false;
        }
      }

      // For Android 12 and below, notifications work without runtime permission
      // But we still need to create notification channels (handled in notification service)
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Check if notification permissions are granted
   */
  async checkNotificationPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const apiLevel = Platform.Version as number;

      if (apiLevel >= 33) {
        // Android 13+ requires POST_NOTIFICATIONS permission
        const granted = await PermissionsAndroid.check(
          'android.permission.POST_NOTIFICATIONS'
        );
        return granted;
      } else {
        // Android 12 and below - notifications work without runtime permission
        return true;
      }
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Check all permissions status
   */
  async checkAllPermissions(): Promise<{
    bluetooth: boolean;
    storage: boolean;
    notifications: boolean;
    allGranted: boolean;
  }> {
    const bluetooth = await this.checkBluetoothPermissions();
    const storage = await this.checkStoragePermissions();
    const notifications = await this.checkNotificationPermissions();

    return {
      bluetooth,
      storage,
      notifications,
      allGranted: bluetooth && storage && notifications,
    };
  }
}

// Export singleton instance
export const permissionsService = new PermissionsService();

