/**
 * ZaykaBill POS - Notifications Screen
 * Full notification history page with filters and management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { authService } from '../services/auth';
import { apiService } from '../services/api';
import { notificationsService, Notification } from '../services/database-methods';

interface NotificationsScreenProps {
  onBack: () => void;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        return;
      }

      const restaurantId = auth.restaurant.id;

      // Load from local database first
      let localNotifications = await notificationsService.getAll(restaurantId);

      // Apply filter
      if (filter === 'unread') {
        localNotifications = localNotifications.filter((n) => !n.isRead);
      } else if (filter === 'read') {
        localNotifications = localNotifications.filter((n) => n.isRead);
      }

      setNotifications(localNotifications);

      // Sync with server (if online)
      try {
        const response = await apiService.getNotifications(restaurantId);
        if (response.success && response.notifications) {
          // Save notifications to local database
          for (const notification of response.notifications) {
            await notificationsService.save({
              id: notification.id,
              restaurantId: notification.restaurantId || restaurantId,
              title: notification.title,
              message: notification.message,
              type: notification.type as 'info' | 'warning' | 'success' | 'error',
              isRead: notification.isRead,
              createdAt: notification.createdAt,
              updatedAt: notification.updatedAt,
            });
          }

          // Reload from local database
          let updatedNotifications = await notificationsService.getAll(restaurantId);

          // Apply filter
          if (filter === 'unread') {
            updatedNotifications = updatedNotifications.filter((n) => !n.isRead);
          } else if (filter === 'read') {
            updatedNotifications = updatedNotifications.filter((n) => n.isRead);
          }

          setNotifications(updatedNotifications);
        }
      } catch (error) {
        // Silently fail if offline - use local data
        console.log('Failed to sync notifications (offline mode):', error);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead) return;

    try {
      await notificationsService.markAsRead(notification.id);
      // Try to mark as read on server (if online)
      try {
        await apiService.markNotificationAsRead(notification.id);
      } catch (error) {
        // Silently fail if offline
        console.log('Failed to mark notification as read on server (offline mode):', error);
      }
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        return;
      }

      Alert.alert(
        'Mark All as Read',
        'Are you sure you want to mark all notifications as read?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark All as Read',
            onPress: async () => {
              try {
                await notificationsService.markAllAsRead(auth.restaurant!.id);
                await loadNotifications();
              } catch (error) {
                console.error('Error marking all as read:', error);
                Alert.alert('Error', 'Failed to mark all notifications as read');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  };

  const handleDelete = async (notification: Notification) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationsService.delete(notification.id);
              await loadNotifications();
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) {
      return `Today, ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#3b82f6';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>All recent updates from Zayka Admin</Text>
        </View>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
          onPress={() => setFilter('unread')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Unread
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'read' && styles.filterButtonActive]}
          onPress={() => setFilter('read')}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, filter === 'read' && styles.filterTextActive]}>
            Read
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={handleMarkAllAsRead}
          activeOpacity={0.7}
        >
          <Text style={styles.markAllText}>Mark All as Read</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.notificationsList}
        contentContainerStyle={styles.notificationsContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#667eea" />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'unread'
                ? 'All notifications are read!'
                : filter === 'read'
                ? 'No read notifications'
                : 'All caught up!'}
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <View
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.isRead && styles.unreadCard,
              ]}
            >
              <View style={styles.notificationHeader}>
                <View style={[styles.typeIcon, { backgroundColor: getTypeColor(notification.type) + '20' }]}>
                  <Text style={styles.typeEmoji}>{getTypeIcon(notification.type)}</Text>
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationTitleRow}>
                    <Text
                      style={[
                        styles.notificationTitle,
                        !notification.isRead && styles.unreadTitle,
                      ]}
                      numberOfLines={1}
                    >
                      {notification.title}
                    </Text>
                    {!notification.isRead && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notificationMessage} numberOfLines={3}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatTimestamp(notification.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.notificationActions}>
                {!notification.isRead && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleMarkAsRead(notification)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionText}>Mark as Read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(notification)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#667eea',
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#10b981',
    marginLeft: 'auto',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  notificationHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeEmoji: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteText: {
    color: '#ef4444',
  },
});

export default NotificationsScreen;


