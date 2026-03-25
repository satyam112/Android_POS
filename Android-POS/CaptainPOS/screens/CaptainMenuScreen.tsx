/**
 * Captain POS - Menu screen (same layout/behavior as QR Menu)
 * Browse categories and items, add to cart. Floating cart button.
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
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { responsiveFontSize, scale } from '../utils/responsive';
import type { MenuCategory, MenuItem } from '../services/captain-api';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface CaptainMenuScreenProps {
  token: string;
  cart: CartItem[];
  addToCart: (item: { id: string; name: string; price: number }, qty?: number) => void;
  onOpenCart: () => void;
}

const CaptainMenuScreen: React.FC<CaptainMenuScreenProps> = ({
  token,
  cart,
  addToCart: addToCartProp,
  onOpenCart,
}) => {
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const loadMenu = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { captainApiService } = await import('../services/captain-api');
      const res = await captainApiService.getMenu(token);
      setMenu(res.menu || []);
      if (res.menu?.length) {
        setSelectedCategoryId((prev) => prev || res.menu![0].id);
      }
    } catch (e) {
      const msg = (e as { message?: string }).message || 'Failed to load menu';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const currentCategory = menu.find((c) => c.id === selectedCategoryId);
  const items = currentCategory?.menuItems || [];

  const addToCart = (item: MenuItem, qty: number = 1) => {
    addToCartProp({ id: item.id, name: item.name, price: item.price }, qty);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  if (error && menu.length === 0) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadMenu()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {menu.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              selectedCategoryId === cat.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategoryId(cat.id)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategoryId === cat.id && styles.categoryChipTextActive,
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Menu items */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadMenu(true)} colors={['#667eea']} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
              ) : null}
              <Text style={styles.itemPrice}>₹{item.price}</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => addToCart(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Floating cart button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
        onPress={onOpenCart}
        activeOpacity={0.9}
      >
        <Text style={styles.fabIcon}>🛒</Text>
        <Text style={styles.fabText}>Cart</Text>
        {cart.length > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.fabBadgeText}>{cart.length > 99 ? '99+' : cart.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748b' },
  errorText: { fontSize: 16, color: '#dc2626', textAlign: 'center', paddingHorizontal: 24 },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#667eea',
    borderRadius: 12,
  },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  categoryScroll: { maxHeight: 52, marginBottom: 8 },
  categoryContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: { backgroundColor: '#667eea', borderColor: '#667eea' },
  categoryChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  categoryChipTextActive: { color: '#fff' },
  listContent: { padding: 16, paddingBottom: 100 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  itemDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },
  itemPrice: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 4 },
  addButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: { fontSize: 20, marginRight: 8 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  fabBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  fabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

export default CaptainMenuScreen;
