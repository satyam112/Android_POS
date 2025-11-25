/**
 * ZaykaBill POS - Custom Drawer Menu Component
 * Custom drawer implementation using React Native Animated API
 * Works without react-native-reanimated for React Native 0.82 compatibility
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import {
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
  scale,
  getWidthPercentage,
  screenData,
} from '../utils/responsive';
import { databaseService } from '../services/database';
import { authService } from '../services/auth';
import { apiService } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

interface RestaurantData {
  id: string;
  name: string;
  logoUrl: string | null;
}

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  onLogout: () => void;
  currentScreen: string;
}

const DrawerMenu: React.FC<DrawerMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onLogout,
  currentScreen,
}) => {
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-screenWidth)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  useEffect(() => {
    loadRestaurantData();
  }, []);

  // Reload restaurant data when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadRestaurantData();
    }
  }, [isOpen]);

  const loadRestaurantData = async () => {
    try {
      setLoading(true);

      // Get auth first to get restaurant ID and basic info
      const auth = await authService.getAuth();
      
      // If we have restaurant data from auth, use it immediately
      if (auth.restaurant) {
        // Check both logoUrl and logo fields (API might use different field names)
        const logoUrl = auth.restaurant.logoUrl || (auth.restaurant as any).logo || null;
        console.log('[DrawerMenu] Loading restaurant data from auth:', {
          id: auth.restaurant.id,
          name: auth.restaurant.name,
          logoUrl: logoUrl ? (logoUrl.substring(0, 50) + '...') : null,
          logoUrlType: logoUrl ? typeof logoUrl : 'null',
          logoUrlLength: logoUrl ? logoUrl.length : 0,
          hasLogoUrl: !!auth.restaurant.logoUrl,
          hasLogo: !!(auth.restaurant as any).logo,
        });
        setRestaurantData({
          id: auth.restaurant.id,
          name: auth.restaurant.name || 'Restaurant',
          logoUrl: logoUrl,
        });
        setLoading(false);
        setLogoError(false);
      }

      // Initialize database
      await databaseService.initialize();

      // Try to get from SQLite cache
      // CRITICAL: Filter by restaurantId to prevent cross-tenant data access
      try {
        if (auth.restaurant?.id) {
          const cachedData = await databaseService.getRestaurantData(auth.restaurant.id);
          if (cachedData && cachedData.name) {
            // Use cached data if available
            setRestaurantData({
              id: cachedData.id,
              name: cachedData.name,
              logoUrl: cachedData.logoUrl || null,
            });
          }
        }
      } catch (error) {
        console.log('Error loading cached restaurant data:', error);
      }

      // Always fetch fresh data from API to ensure we have the latest
      if (auth.restaurant?.id) {
        try {
          const response = await apiService.getRestaurantDetails(auth.restaurant.id);

          if (response.success && response.restaurant) {
            // API might return logoUrl or logo field
            const logoUrl = response.restaurant.logoUrl || response.restaurant.logo || auth.restaurant.logoUrl || null;
            
            const freshData = {
              id: response.restaurant.id,
              name: response.restaurant.name || auth.restaurant.name || 'Restaurant',
              logoUrl: logoUrl,
            };

            console.log('[DrawerMenu] Fresh restaurant data from API:', {
              id: freshData.id,
              name: freshData.name,
              logoUrl: freshData.logoUrl ? (freshData.logoUrl.substring(0, 50) + '...') : null,
              logoUrlType: freshData.logoUrl ? typeof freshData.logoUrl : 'null',
              logoUrlLength: freshData.logoUrl ? freshData.logoUrl.length : 0,
            });

            setRestaurantData(freshData);
            setLogoError(false);

            // Save to SQLite for future use
            try {
              await databaseService.saveRestaurantData(freshData);
            } catch (error) {
              console.log('Error saving restaurant data to cache:', error);
            }
          }
        } catch (error) {
          console.log('Error fetching restaurant details from API:', error);
          // Keep using auth data or cached data if API fails
        }
      }
    } catch (error) {
      console.error('Error loading restaurant data:', error);
      // Fallback: try to get from auth
      try {
        const auth = await authService.getAuth();
        if (auth.restaurant) {
          setRestaurantData({
            id: auth.restaurant.id,
            name: auth.restaurant.name || 'Restaurant',
            logoUrl: auth.restaurant.logoUrl || null,
          });
        }
      } catch (authError) {
        console.error('Error getting auth data:', authError);
      }
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'Billing', label: 'Billing', icon: '💳' },
    { id: 'Expenses', label: 'Expenses', icon: '💰' },
    { id: 'CustomerCredits', label: 'Customer Credits', icon: '💵' },
    { id: 'Reports', label: 'Reports', icon: '📈' },
    { id: 'Aggregator', label: 'Aggregator', icon: '🌐' },
    { id: 'Settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleMenuItemPress = (screen: string) => {
    onNavigate(screen);
    onClose();
  };

  if (!isOpen && slideAnim._value === -screenWidth) {
    return null;
  }

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Overlay */}
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
            {/* Restaurant Header - Blue Container */}
            <View style={styles.headerContainer}>
              {loading ? (
                <View style={styles.headerLoading}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              ) : restaurantData ? (
                <>
                  {restaurantData.logoUrl && restaurantData.logoUrl.trim() !== '' ? (
                    // Check if it's a valid image URL
                    (restaurantData.logoUrl.startsWith('http') || 
                     restaurantData.logoUrl.startsWith('data:image') || 
                     restaurantData.logoUrl.startsWith('file://')) && !logoError ? (
                      <Image
                        source={{ uri: restaurantData.logoUrl }}
                        style={styles.logo}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('[DrawerMenu] Logo image error:', error.nativeEvent.error);
                          console.log('[DrawerMenu] Logo URL:', restaurantData.logoUrl?.substring(0, 100));
                          setLogoError(true);
                        }}
                        onLoad={() => {
                          console.log('[DrawerMenu] Logo loaded successfully');
                          setLogoError(false);
                        }}
                      />
                    ) : (
                      // If logoUrl is an emoji or text, or image failed to load, display it as text
                      <View style={styles.logoPlaceholder}>
                        <Text style={styles.logoPlaceholderText}>
                          {restaurantData.logoUrl}
                        </Text>
                      </View>
                    )
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Text style={styles.logoPlaceholderText}>🍽️</Text>
                    </View>
                  )}
                  <Text style={styles.restaurantName} numberOfLines={2}>
                    {restaurantData.name || 'Restaurant'}
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoPlaceholderText}>🍽️</Text>
                  </View>
                  <Text style={styles.restaurantName} numberOfLines={2}>
                    Restaurant
                  </Text>
                </>
              )}
            </View>

            {/* Menu Items */}
            <View style={styles.menuItemsContainer}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    currentScreen === item.id && styles.menuItemActive,
                  ]}
                  onPress={() => handleMenuItemPress(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuItemIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.menuItemLabel,
                      currentScreen === item.id && styles.menuItemLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {currentScreen === item.id && (
                    <View style={styles.activeIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Logout Button */}
            <View style={styles.logoutContainer}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  onLogout();
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: getWidthPercentage(75),
    maxWidth: 300,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  drawerContent: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#3b82f6', // Blue color container
    padding: 24,
    paddingTop: 50,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLoading: {
    padding: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    overflow: 'hidden',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoPlaceholderText: {
    fontSize: 40,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 4,
  },
  menuItemsContainer: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: '#f1f5f9',
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    flex: 1,
  },
  menuItemLabelActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#667eea',
  },
  logoutContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 'auto',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DrawerMenu;

