/**
 * ZaykaBill POS - Aggregator Orders Screen
 * Displays and manages orders from Zomato and Swiggy
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
  scale,
} from '../utils/responsive';
import { apiService } from '../services/api';
import { authService } from '../services/auth';

interface AggregatorOrder {
  id: string;
  provider: 'zomato' | 'swiggy';
  providerOrderId: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  deliveryPartnerName: string | null;
  deliveryPartnerContact: string | null;
  trackingLink: string | null;
  createdAt: string;
}

const AggregatorsScreen: React.FC = () => {
  const [orders, setOrders] = useState<AggregatorOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAggregatorOrders();
      if (response.success && response.orders) {
        setOrders(response.orders);
      }
    } catch (error) {
      console.error('Error loading aggregator orders:', error);
      Alert.alert('Error', 'Failed to load aggregator orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptReject = async (orderId: string, action: 'accept' | 'reject') => {
    try {
      setProcessingOrder(orderId);
      const response = await fetch(`${apiService.getBaseUrl()}/api/aggregators/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aggregatorOrderId: orderId, action }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', action === 'accept' ? 'Order accepted' : 'Order rejected');
        await loadOrders();
      } else {
        Alert.alert('Error', data.error || `Failed to ${action} order`);
      }
    } catch (error) {
      console.error(`Error ${action}ing order:`, error);
      Alert.alert('Error', `Failed to ${action} order`);
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      setProcessingOrder(orderId);
      const response = await fetch(`${apiService.getBaseUrl()}/api/aggregators/orders`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aggregatorOrderId: orderId, status }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Status updated successfully');
        await loadOrders();
      } else {
        Alert.alert('Error', data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setProcessingOrder(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#fbbf24';
      case 'ACCEPTED':
      case 'CONFIRMED':
        return '#3b82f6';
      case 'PREPARING':
        return '#a855f7';
      case 'READY':
      case 'FOOD_READY':
        return '#10b981';
      case 'DISPATCHED':
      case 'OUT_FOR_DELIVERY':
        return '#6366f1';
      case 'DELIVERED':
        return '#6b7280';
      case 'REJECTED':
      case 'CANCELLED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Aggregator Orders</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Aggregator Orders</Text>
        <Text style={styles.headerSubtitle}>Manage Zomato & Swiggy orders</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadOrders} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No aggregator orders yet</Text>
            <Text style={styles.emptySubtext}>Orders from Zomato and Swiggy will appear here</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                  <Text style={styles.orderId}>
                    {order.provider.toUpperCase()} #{order.providerOrderId}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer:</Text>
                  <Text style={styles.detailValue}>
                    {order.customerName || 'N/A'} ({order.customerPhone || 'N/A'})
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={styles.detailValue}>₹{order.totalAmount.toFixed(2)}</Text>
                </View>
                {order.deliveryPartnerName && (
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.deliveryLabel}>Delivery Partner:</Text>
                    <Text style={styles.deliveryValue}>{order.deliveryPartnerName}</Text>
                    {order.deliveryPartnerContact && (
                      <Text style={styles.deliveryContact}>{order.deliveryPartnerContact}</Text>
                    )}
                    {order.trackingLink && (
                      <TouchableOpacity
                        onPress={() => {
                          // Open tracking link
                          Alert.alert('Tracking', `Tracking link: ${order.trackingLink}`);
                        }}
                      >
                        <Text style={styles.trackingLink}>Track Order</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.orderActions}>
                {order.status === 'PENDING' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAcceptReject(order.id, 'accept')}
                      disabled={processingOrder === order.id}
                    >
                      {processingOrder === order.id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.actionButtonText}>Accept</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleAcceptReject(order.id, 'reject')}
                      disabled={processingOrder === order.id}
                    >
                      {processingOrder === order.id ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.actionButtonText}>Reject</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
                {order.status === 'ACCEPTED' || order.status === 'CONFIRMED' ? (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.statusButton]}
                      onPress={() => handleStatusUpdate(order.id, 'PREPARING')}
                      disabled={processingOrder === order.id}
                    >
                      <Text style={styles.actionButtonText}>Mark Preparing</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.readyButton]}
                      onPress={() => handleStatusUpdate(order.id, 'READY')}
                      disabled={processingOrder === order.id}
                    >
                      <Text style={styles.actionButtonText}>Food Ready</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
                {order.status === 'READY' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.dispatchButton]}
                    onPress={() => handleStatusUpdate(order.id, 'DISPATCHED')}
                    disabled={processingOrder === order.id}
                  >
                    <Text style={styles.actionButtonText}>Mark Dispatched</Text>
                  </TouchableOpacity>
                )}
                {order.status === 'DISPATCHED' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deliveredButton]}
                    onPress={() => handleStatusUpdate(order.id, 'DELIVERED')}
                    disabled={processingOrder === order.id}
                  >
                    <Text style={styles.actionButtonText}>Mark Delivered</Text>
                  </TouchableOpacity>
                )}
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
    backgroundColor: '#ffffff',
    paddingTop: responsivePadding(20),
    paddingBottom: responsivePadding(16),
    paddingHorizontal: responsivePadding(24),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: responsiveFontSize(24),
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: responsiveMargin(4),
  },
  headerSubtitle: {
    fontSize: responsiveFontSize(14),
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: responsivePadding(16),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: responsivePadding(60),
  },
  emptyText: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: '#64748b',
    marginBottom: responsiveMargin(8),
  },
  emptySubtext: {
    fontSize: responsiveFontSize(14),
    color: '#94a3b8',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: responsivePadding(16),
    marginBottom: responsiveMargin(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderHeader: {
    marginBottom: responsiveMargin(12),
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveMargin(8),
  },
  statusBadge: {
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsivePadding(4),
    borderRadius: 6,
  },
  statusText: {
    fontSize: responsiveFontSize(12),
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  orderId: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#1e293b',
  },
  orderDetails: {
    marginBottom: responsiveMargin(12),
    paddingTop: responsivePadding(12),
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: responsiveMargin(8),
  },
  detailLabel: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#64748b',
    width: 80,
  },
  detailValue: {
    fontSize: responsiveFontSize(14),
    color: '#1e293b',
    flex: 1,
  },
  deliveryInfo: {
    marginTop: responsiveMargin(8),
    paddingTop: responsivePadding(8),
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  deliveryLabel: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#64748b',
    marginBottom: responsiveMargin(4),
  },
  deliveryValue: {
    fontSize: responsiveFontSize(14),
    color: '#1e293b',
    marginBottom: responsiveMargin(4),
  },
  deliveryContact: {
    fontSize: responsiveFontSize(14),
    color: '#64748b',
    marginBottom: responsiveMargin(4),
  },
  trackingLink: {
    fontSize: responsiveFontSize(14),
    color: '#3b82f6',
    textDecorationLine: 'underline',
  },
  orderActions: {
    flexDirection: 'row',
    gap: responsiveMargin(8),
    paddingTop: responsivePadding(12),
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(16),
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  statusButton: {
    backgroundColor: '#a855f7',
  },
  readyButton: {
    backgroundColor: '#10b981',
  },
  dispatchButton: {
    backgroundColor: '#6366f1',
  },
  deliveredButton: {
    backgroundColor: '#6b7280',
  },
  actionButtonText: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default AggregatorsScreen;

