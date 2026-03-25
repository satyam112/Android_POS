/**
 * ZaykaBill POS - App Navigator
 * Main navigation component with custom drawer menu
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import {
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
  scale,
} from '../utils/responsive';
import DrawerMenu from '../components/DrawerMenu';
import NotificationDropdown from '../components/NotificationDropdown';
import DashboardScreen from '../screens/DashboardScreen';
import BillingScreen from '../screens/BillingScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CustomerCreditsScreen from '../screens/CustomerCreditsScreen';
import AggregatorsScreen from '../screens/AggregatorsScreen';
import { authService } from '../services/auth';
import { apiService } from '../services/api';
import { notificationsService, ordersService, orderItemsService, Notification } from '../services/database-methods';

interface AppNavigatorProps {
  onLogout: () => void;
}

function AppNavigator({ onLogout }: AppNavigatorProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('Dashboard');
  const [notificationDropdownVisible, setNotificationDropdownVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [orderToLoad, setOrderToLoad] = useState<string | null>(null);

  // Load notifications from local database and sync with server
  useEffect(() => {
    loadNotifications();
    // Set up periodic sync (every 2 minutes)
    const syncInterval = setInterval(() => {
      loadNotifications();
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(syncInterval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        return;
      }

      const restaurantId = auth.restaurant.id;

      // Load from local database first
      const localNotifications = await notificationsService.getAll(restaurantId);
      const localUnreadCount = await notificationsService.getUnreadCount(restaurantId);
      setNotifications(localNotifications);
      setUnreadCount(localUnreadCount);

      // Sync with server (if online)
      try {
        const response = await apiService.getNotifications(restaurantId);
        if (response.success && response.notifications) {
          // Get existing notification IDs to check for new ones
          const existingNotificationIds = new Set(
            localNotifications.map(n => n.id)
          );

          // Save notifications to local database and show banner for new ones
          for (const notification of response.notifications) {
            const isNew = !existingNotificationIds.has(notification.id);
            
            await notificationsService.save({
              id: notification.id,
              restaurantId: restaurantId,
              title: notification.title,
              message: notification.message,
              type: notification.type as 'info' | 'warning' | 'success' | 'error',
              isRead: notification.isRead,
            });

            // Show banner notification for new unread notifications (even when app is closed)
            if (isNew && !notification.isRead) {
              try {
                const { notificationService } = await import('../services/notifications');
                await notificationService.showNotificationFromServer(notification);
              } catch (error) {
                console.error('Error showing banner notification:', error);
              }
            }
          }

          // Reload from local database
          const updatedNotifications = await notificationsService.getAll(restaurantId);
          const updatedUnreadCount = await notificationsService.getUnreadCount(restaurantId);
          setNotifications(updatedNotifications);
          setUnreadCount(updatedUnreadCount);
        }
      } catch (error) {
        // Silently fail if offline - use local data
        console.log('Failed to sync notifications (offline mode):', error);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Prevent clicking on already-read notifications
    if (notification.isRead) {
      console.log('[AppNavigator] Notification already read, ignoring click');
      setNotificationDropdownVisible(false);
      return;
    }

    // Mark as read immediately to prevent multiple clicks
    const auth = await authService.getAuth();

    try {
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        console.error('[AppNavigator] Cannot mark notification as read - missing restaurant ID');
      } else {
        await notificationsService.markAsRead(notification.id, auth.restaurant.id);
      }
      // Try to mark as read on server (if online)
      try {
        await apiService.markNotificationAsRead(notification.id);
      } catch (error) {
        // Silently fail if offline
        console.log('Failed to mark notification as read on server (offline mode):', error);
      }
      // Reload notifications
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }

    // Check if this is a delivery order notification
    const isDeliveryOrder = notification.message.includes('Delivery Order') || 
                            notification.title.includes('Delivery Order');
    
    if (isDeliveryOrder) {
      // Extract order number from notification message
      let orderMatch = notification.message.match(/Delivery Order ([A-Z0-9-]+) from/);
      if (!orderMatch) {
        orderMatch = notification.message.match(/Order ([A-Z0-9-]+) from/);
      }
      // Also try to match order number pattern like DEL-123456
      if (!orderMatch) {
        orderMatch = notification.message.match(/(DEL-[A-Z0-9-]+)/);
      }

      if (orderMatch) {
        const orderNumber = orderMatch[1];
        console.log(`[AppNavigator] Delivery order notification clicked, order number: ${orderNumber}`);
          if (auth.isAuthenticated && auth.restaurant?.id) {
            // Always set order to load and switch to Billing screen
            // BillingScreen will handle fetching from server if not found locally
            setOrderToLoad(orderNumber);
            setCurrentScreen('Billing');
            // Close dropdown
            setNotificationDropdownVisible(false);
            return;
          } else {
            console.error('[AppNavigator] Not authenticated or no restaurant ID');
        }
      } else {
        console.log(`[AppNavigator] Could not extract order number from notification: ${notification.message}`);
      }
    }

    // Close dropdown
    setNotificationDropdownVisible(false);
  };

  const handleViewAllNotifications = () => {
    setNotificationDropdownVisible(false);
    setCurrentScreen('Notifications');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Dashboard':
        return <DashboardScreen />;
      case 'Billing':
        return <BillingScreen orderToLoad={orderToLoad} onOrderLoaded={() => setOrderToLoad(null)} />;
      case 'Expenses':
        return <ExpensesScreen />;
      case 'CustomerCredits':
        return <CustomerCreditsScreen onBack={() => setCurrentScreen('Dashboard')} />;
      case 'Reports':
        return <ReportsScreen />;
      case 'Aggregator':
        return <AggregatorsScreen />;
      case 'Settings':
        return <SettingsScreen />;
      case 'Notifications':
        return <NotificationsScreen onBack={() => setCurrentScreen('Dashboard')} />;
      default:
        return <DashboardScreen />;
    }
  };

  const getScreenTitle = () => {
    if (currentScreen === 'Notifications') {
      return 'Notifications';
    }
    if (currentScreen === 'CustomerCredits') {
      return 'Customer Credits';
    }
    if (currentScreen === 'Aggregator') {
      return 'Aggregator';
    }
    return currentScreen;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getScreenTitle()}</Text>
        {currentScreen !== 'Notifications' && (
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setNotificationDropdownVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.notificationIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        {currentScreen === 'Notifications' && <View style={styles.headerRight} />}
      </View>

      {/* Content */}
      <View style={styles.content}>{renderScreen()}</View>

      {/* Notification Dropdown */}
      <NotificationDropdown
        isVisible={notificationDropdownVisible}
        notifications={notifications.slice(0, 5)} // Show only top 5 in dropdown
        unreadCount={unreadCount}
        onNotificationPress={handleNotificationPress}
        onViewAll={handleViewAllNotifications}
        onClose={() => setNotificationDropdownVisible(false)}
      />

      {/* Drawer Menu */}
      <DrawerMenu
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={(screen) => setCurrentScreen(screen)}
        onLogout={onLogout}
        currentScreen={currentScreen}
      />
    </View>
  );
}

// Calculate responsive values before StyleSheet.create()
const headerButtonSize = scale(40);
const badgeSize = scale(20);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#667eea',
    paddingTop: StatusBar.currentHeight || 0,
    paddingHorizontal: responsivePadding(16),
    paddingVertical: responsivePadding(12),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuButton: {
    padding: responsivePadding(8),
  },
  menuIcon: {
    fontSize: responsiveFontSize(24),
    color: '#ffffff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: headerButtonSize,
  },
  notificationButton: {
    width: headerButtonSize,
    height: headerButtonSize,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationIcon: {
    fontSize: responsiveFontSize(24),
    color: '#ffffff',
  },
  notificationBadge: {
    position: 'absolute',
    top: responsiveMargin(4),
    right: responsiveMargin(4),
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: badgeSize,
    height: badgeSize,
    paddingHorizontal: responsivePadding(6),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: responsiveFontSize(10),
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
});

export default AppNavigator;


