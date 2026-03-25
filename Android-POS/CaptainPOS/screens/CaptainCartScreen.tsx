/**
 * Captain POS - Cart screen
 * Select vacant table, place order. Store must be open.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { TableInfo } from '../services/captain-api';
import type { CartItem } from './CaptainMenuScreen';

interface CaptainCartScreenProps {
  token: string;
  cart: CartItem[];
  onBack: () => void;
  onOrderPlaced: () => void;
}

const CaptainCartScreen: React.FC<CaptainCartScreenProps> = ({
  token,
  cart,
  onBack,
  onOrderPlaced,
}) => {
  const insets = useSafeAreaInsets();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [storeOpen, setStoreOpen] = useState(true);

  const loadTablesAndStatus = useCallback(async () => {
    setLoadingTables(true);
    try {
      const { captainApiService } = await import('../services/captain-api');
      const [tablesRes, statusRes] = await Promise.all([
        captainApiService.getTables(token),
        captainApiService.getStatus(token),
      ]);
      setTables(tablesRes.tables || []);
      setStoreOpen(statusRes.isOpenForBusiness !== false);
      if ((tablesRes.tables?.length ?? 0) > 0 && !selectedTableId) {
        setSelectedTableId(tablesRes.tables![0].id);
      }
    } catch (e) {
      console.warn('Load tables/status:', e);
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, [token]);

  useEffect(() => {
    loadTablesAndStatus();
  }, [loadTablesAndStatus]);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const taxRate = 0.05;
  const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart empty', 'Add items from the menu first.');
      return;
    }
    if (!selectedTableId) {
      Alert.alert('Select table', 'Please select a table.');
      return;
    }
    if (!storeOpen) {
      Alert.alert('Store closed', 'Ordering is closed. Store must be open for captain orders.');
      return;
    }

    setPlacing(true);
    try {
      const { captainApiService } = await import('../services/captain-api');
      const items = cart.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        notes: i.notes,
      }));
      const res = await captainApiService.placeOrder(token, {
        tableId: selectedTableId,
        items,
        subtotal,
        taxAmount,
        totalAmount,
      });
      if (res.success) {
        Alert.alert('Order placed', res.message || 'Order sent to kitchen.', [
          { text: 'OK', onPress: onOrderPlaced },
        ]);
      } else {
        Alert.alert('Error', (res as { error?: string }).error || 'Failed to place order.');
      }
    } catch (e) {
      const msg = (e as { message?: string }).message || 'Failed to place order. Check connection.';
      Alert.alert('Error', msg);
    } finally {
      setPlacing(false);
    }
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart</Text>
        <View style={styles.headerRight} />
      </View>

      {!storeOpen && (
        <View style={styles.bannerClosed}>
          <Text style={styles.bannerClosedText}>Ordering is closed. Store must be open.</Text>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Table selection */}
        <Text style={styles.sectionTitle}>Select table</Text>
        {loadingTables ? (
          <ActivityIndicator size="small" color="#667eea" style={styles.loader} />
        ) : tables.length === 0 ? (
          <Text style={styles.noTables}>No vacant tables</Text>
        ) : (
          <View style={styles.tableGrid}>
            {tables.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.tableChip,
                  selectedTableId === t.id && styles.tableChipActive,
                ]}
                onPress={() => setSelectedTableId(t.id)}
              >
                <Text
                  style={[
                    styles.tableChipText,
                    selectedTableId === t.id && styles.tableChipTextActive,
                  ]}
                >
                  {t.name || `Table ${t.number}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Cart items */}
        <Text style={styles.sectionTitle}>Items</Text>
        {cart.map((item) => (
          <View key={`${item.id}-${item.notes || ''}`} style={styles.row}>
            <Text style={styles.rowName}>{item.name} × {item.quantity}</Text>
            <Text style={styles.rowPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax (5%)</Text>
            <Text style={styles.totalsValue}>₹{taxAmount.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalsRow, styles.totalsRowTotal]}>
            <Text style={styles.totalsLabelTotal}>Total</Text>
            <Text style={styles.totalsValueTotal}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[
            styles.placeButton,
            (placing || !storeOpen || cart.length === 0) && styles.placeButtonDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={placing || !storeOpen || cart.length === 0}
        >
          <Text style={styles.placeButtonText}>
            {placing ? 'Placing...' : 'Place order'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 16, color: '#667eea', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  headerRight: { width: 60 },
  bannerClosed: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  bannerClosedText: { color: '#dc2626', fontWeight: '600', textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginBottom: 12 },
  loader: { marginVertical: 16 },
  noTables: { color: '#64748b', marginBottom: 16 },
  tableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  tableChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  tableChipActive: { borderColor: '#667eea', backgroundColor: '#eef2ff' },
  tableChipText: { fontSize: 15, fontWeight: '600', color: '#475569' },
  tableChipTextActive: { color: '#667eea' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowName: { fontSize: 15, color: '#334155' },
  rowPrice: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  totals: { marginTop: 16, paddingTop: 16, borderTopWidth: 2, borderTopColor: '#e2e8f0' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalsRowTotal: { marginTop: 8, marginBottom: 0 },
  totalsLabel: { fontSize: 15, color: '#64748b' },
  totalsValue: { fontSize: 15, color: '#1e293b' },
  totalsLabelTotal: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  totalsValueTotal: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  footer: { paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  placeButton: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  placeButtonDisabled: { opacity: 0.5 },
  placeButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

export default CaptainCartScreen;
