/**
 * ZaykaBill POS - Dashboard Screen
 * Overview of key business metrics and quick access to customer credits
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
  getButtonHeight,
} from '../utils/responsive';
import { authService } from '../services/auth';
import { ordersService } from '../services/database-methods';
import { customersService } from '../services/database-methods';
import { syncService } from '../services/sync';
import { apiService } from '../services/api';
import CustomerCreditsScreen from './CustomerCreditsScreen';

const DashboardScreen: React.FC = () => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [isOpenForBusiness, setIsOpenForBusiness] = useState(true);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Dashboard metrics
  const [todayOrders, setTodayOrders] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [monthOrders, setMonthOrders] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);

  useEffect(() => {
    loadDashboardData();
    loadBusinessStatus();
  }, []);

  const loadBusinessStatus = async () => {
    try {
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        return;
      }

      const response = await fetch(
        `${apiService.getBaseUrl()}/api/restaurant-business-status?restaurantId=${auth.restaurant.id}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setIsOpenForBusiness(data.isOpenForBusiness);
      }
    } catch (error) {
      console.error('Error loading business status:', error);
    }
  };

  const toggleBusinessStatus = async () => {
    if (isTogglingStatus || !restaurantId) return;

    setIsTogglingStatus(true);
    try {
      const response = await fetch(
        `${apiService.getBaseUrl()}/api/restaurant-business-status?restaurantId=${restaurantId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isOpenForBusiness: !isOpenForBusiness,
            restaurantId: restaurantId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setIsOpenForBusiness(data.isOpenForBusiness);
        Alert.alert(
          'Success',
          `Restaurant is now ${data.isOpenForBusiness ? 'OPEN' : 'CLOSED'} for online orders`,
          [{ text: 'OK' }]
        );
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to update business status', [{ text: 'OK' }]);
      }
    } catch (error: any) {
      console.error('Error toggling business status:', error);
      Alert.alert('Error', 'Failed to update business status. Please try again.', [{ text: 'OK' }]);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        return;
      }

      const rid = auth.restaurant.id;
      setRestaurantId(rid);

      // Load today's orders
      const todayOrdersList = await ordersService.getTodayOrders(rid);
      setTodayOrders(todayOrdersList.length);
      const todayTotal = todayOrdersList.reduce((sum, order) => sum + order.totalAmount, 0);
      setTodaySales(todayTotal);

      // Load month's orders
      const monthOrdersList = await ordersService.getMonthOrders(rid);
      setMonthOrders(monthOrdersList.length);
      const monthTotal = monthOrdersList.reduce((sum, order) => sum + order.totalAmount, 0);
      setMonthRevenue(monthTotal);

      // Load total credit
      const customers = await customersService.getAll(rid);
      const totalCreditAmount = customers.reduce((sum, customer) => sum + customer.creditBalance, 0);
      setTotalCredit(totalCreditAmount);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toFixed(2)}`;
  };

  /**
   * Handle Sync Online button click
   * Performs two-way synchronization between local SQLite and online database
   */
  const handleSyncOnline = async () => {
    try {
      setSyncing(true);

      // Perform two-way sync
      const result = await syncService.syncAll();

      if (result.success) {
        // Reload dashboard data after sync
        await loadDashboardData();

        // Calculate totals
        const uploadedCount =
          result.uploaded.orders +
          result.uploaded.expenses +
          result.uploaded.tables +
          result.uploaded.menuCategories +
          result.uploaded.menuItems +
          result.uploaded.customers +
          result.uploaded.taxes +
          result.uploaded.additionalCharges +
          result.uploaded.paymentSettings +
          result.uploaded.restaurantInfo;

        const downloadedCount =
          result.downloaded.orders +
          result.downloaded.expenses +
          result.downloaded.tables +
          result.downloaded.menuCategories +
          result.downloaded.menuItems +
          result.downloaded.customers +
          result.downloaded.taxes +
          result.downloaded.additionalCharges +
          result.downloaded.paymentSettings +
          result.downloaded.restaurantInfo;

        // Build detailed message
        const details = [
          `📊 Orders: ${result.uploaded.orders} ↑ / ${result.downloaded.orders} ↓`,
          `💰 Expenses: ${result.uploaded.expenses} ↑ / ${result.downloaded.expenses} ↓`,
          `🪑 Tables: ${result.uploaded.tables} ↑ / ${result.downloaded.tables} ↓`,
          `📋 Menu Categories: ${result.uploaded.menuCategories} ↑ / ${result.downloaded.menuCategories} ↓`,
          `🍽️ Menu Items: ${result.uploaded.menuItems} ↑ / ${result.downloaded.menuItems} ↓`,
          `👥 Customers: ${result.uploaded.customers} ↑ / ${result.downloaded.customers} ↓`,
          `📊 Taxes: ${result.uploaded.taxes} ↑ / ${result.downloaded.taxes} ↓`,
          `💵 Additional Charges: ${result.uploaded.additionalCharges} ↑ / ${result.downloaded.additionalCharges} ↓`,
          `⚙️ Payment Settings: ${result.uploaded.paymentSettings} ↑ / ${result.downloaded.paymentSettings} ↓`,
          `🏢 Restaurant Info: ${result.uploaded.restaurantInfo} ↑ / ${result.downloaded.restaurantInfo} ↓`,
        ].join('\n');

        Alert.alert(
          '✅ Sync Completed Successfully',
          `📤 Uploaded: ${uploadedCount} records\n📥 Downloaded: ${downloadedCount} records\n\n${details}`,
          [{ text: 'OK' }]
        );

        // Also log to console for debugging with detailed order information
        console.log('=== SYNC RESULTS ===');
        console.log('📤 UPLOADED:');
        console.log('  Orders:', result.uploaded.orders);
        console.log('  Expenses:', result.uploaded.expenses);
        console.log('  Tables:', result.uploaded.tables);
        console.log('  Menu Categories:', result.uploaded.menuCategories);
        console.log('  Menu Items:', result.uploaded.menuItems);
        console.log('  Customers:', result.uploaded.customers);
        console.log('  Taxes:', result.uploaded.taxes);
        console.log('  Additional Charges:', result.uploaded.additionalCharges);
        console.log('  Payment Settings:', result.uploaded.paymentSettings);
        console.log('  Restaurant Info:', result.uploaded.restaurantInfo);
        console.log('📥 DOWNLOADED:');
        console.log('  Orders:', result.downloaded.orders);
        console.log('  Expenses:', result.downloaded.expenses);
        console.log('  Tables:', result.downloaded.tables);
        console.log('  Menu Categories:', result.downloaded.menuCategories);
        console.log('  Menu Items:', result.downloaded.menuItems);
        console.log('  Customers:', result.downloaded.customers);
        console.log('  Taxes:', result.downloaded.taxes);
        console.log('  Additional Charges:', result.downloaded.additionalCharges);
        console.log('  Payment Settings:', result.downloaded.paymentSettings);
        console.log('  Restaurant Info:', result.downloaded.restaurantInfo);
        console.log('===================');
      } else {
        // Show error message
        Alert.alert('⚠️ Sync Failed', result.message || 'Please try again later', [{ text: 'OK' }]);
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      const errorMessage =
        error.message === 'Please connect to internet'
          ? 'No connection — unable to sync now'
          : error.message || 'Sync failed — Please try again later';
      Alert.alert('⚠️ Sync Failed', errorMessage, [{ text: 'OK' }]);
    } finally {
      setSyncing(false);
    }
  };

  if (showCredits) {
    return (
      <CustomerCreditsScreen
        onBack={() => {
          setShowCredits(false);
          loadDashboardData();
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View>

      {/* Summary Cards */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Today's Orders */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today's Orders</Text>
          <Text style={styles.cardValue}>{todayOrders}</Text>
        </View>

        {/* Today's Sales */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today's Sales</Text>
          <Text style={styles.cardValue}>{formatCurrency(todaySales)}</Text>
        </View>

        {/* This Month's Orders */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>This Month's Orders</Text>
          <Text style={styles.cardValue}>{monthOrders}</Text>
        </View>

        {/* This Month's Revenue */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>This Month's Revenue</Text>
          <Text style={styles.cardValue}>{formatCurrency(monthRevenue)}</Text>
        </View>

        {/* Total Credit */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Credit</Text>
          <Text style={styles.cardValue}>{formatCurrency(totalCredit)}</Text>
        </View>

        {/* Customer Credits Button */}
        <TouchableOpacity
          style={styles.creditsButton}
          onPress={() => setShowCredits(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.creditsButtonText}>Customer Credits</Text>
        </TouchableOpacity>

        {/* Business Status Toggle Button */}
        <TouchableOpacity
          style={[
            styles.businessStatusButton,
            isOpenForBusiness ? styles.businessStatusButtonOpen : styles.businessStatusButtonClosed,
            isTogglingStatus && styles.businessStatusButtonDisabled,
          ]}
          onPress={toggleBusinessStatus}
          activeOpacity={0.8}
          disabled={isTogglingStatus}
        >
          {isTogglingStatus ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" style={styles.syncLoader} />
              <Text style={styles.businessStatusButtonText}>Updating...</Text>
            </>
          ) : (
            <>
              <Text style={styles.businessStatusButtonIcon}>{isOpenForBusiness ? '🟢' : '🔴'}</Text>
              <Text style={styles.businessStatusButtonText}>
                {isOpenForBusiness ? 'OPEN' : 'CLOSED'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Sync Online Button */}
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleSyncOnline}
          activeOpacity={0.8}
          disabled={syncing}
        >
          {syncing ? (
            <>
              <ActivityIndicator size="small" color="#ffffff" style={styles.syncLoader} />
              <Text style={styles.syncButtonText}>Syncing...</Text>
            </>
          ) : (
            <>
              <Text style={styles.syncButtonIcon}>🔄</Text>
              <Text style={styles.syncButtonText}>Sync Online</Text>
            </>
          )}
        </TouchableOpacity>
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
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: responsivePadding(16),
    paddingBottom: responsivePadding(40),
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: responsivePadding(20),
    marginBottom: responsiveMargin(16),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardLabel: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#64748b',
    marginBottom: responsiveMargin(8),
  },
  cardValue: {
    fontSize: responsiveFontSize(32),
    fontWeight: '700',
    color: '#667eea',
  },
  creditsButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: responsivePadding(16),
    marginTop: responsiveMargin(8),
    minHeight: getButtonHeight(),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  creditsButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#ffffff',
  },
  syncButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: responsivePadding(16),
    marginTop: responsiveMargin(8),
    marginBottom: responsiveMargin(16),
    minHeight: getButtonHeight(),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  syncButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  syncButtonIcon: {
    fontSize: responsiveFontSize(18),
    marginRight: responsiveMargin(8),
  },
  syncButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#ffffff',
  },
  syncLoader: {
    marginRight: 8,
  },
  businessStatusButton: {
    borderRadius: 12,
    padding: responsivePadding(16),
    marginTop: responsiveMargin(8),
    minHeight: getButtonHeight(),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  businessStatusButtonOpen: {
    backgroundColor: '#10b981',
  },
  businessStatusButtonClosed: {
    backgroundColor: '#ef4444',
  },
  businessStatusButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  businessStatusButtonIcon: {
    fontSize: responsiveFontSize(18),
    marginRight: responsiveMargin(8),
  },
  businessStatusButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default DashboardScreen;
