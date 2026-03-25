/**
 * ZaykaBill POS - Settings Screen
 * Main settings dashboard with PIN verification
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import {
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
  scale,
} from '../utils/responsive';
import PinVerificationScreen from '../components/PinVerificationScreen';
import { authService } from '../services/auth';
import { databaseService } from '../services/database';
import RestaurantInfoScreen from './settings/RestaurantInfoScreen';
import TableManagementScreen from './settings/TableManagementScreen';
import MenuManagementScreen from './settings/MenuManagementScreen';
import TaxesAndChargesScreen from './settings/TaxesAndChargesScreen';
import AccountScreen from './settings/AccountScreen';
import GoOnlineScreen from './settings/GoOnlineScreen';
import PrinterSettingsScreen from './settings/PrinterSettingsScreen';
import AggregatorSettingsScreen from './settings/AggregatorSettingsScreen';

const { width: screenWidth } = Dimensions.get('window');

interface SettingsCard {
  id: string;
  title: string;
  icon: string;
  description: string;
}

const settingsCards: SettingsCard[] = [
  {
    id: 'restaurant-info',
    title: 'Restaurant Info',
    icon: '🏢',
    description: 'Manage basic restaurant information like Name, GSTIN, and FSSAI license details',
  },
  {
    id: 'table-management',
    title: 'Table Management',
    icon: '🪑',
    description: 'Add, edit, or delete tables to organize your restaurant layout',
  },
  {
    id: 'menu-management',
    title: 'Menu Management',
    icon: '📋',
    description: 'Manage categories and menu items offered in your restaurant',
  },
  {
    id: 'financials',
    title: 'Taxes & Charges',
    icon: '💰',
    description: 'Configure taxes, payment modes, and additional charges',
  },
  {
    id: 'go-online',
    title: 'Go Online',
    icon: '🌐',
    description: 'Configure subdomain, branding, and social media for online ordering',
  },
  {
    id: 'printer',
    title: 'Printer Settings',
    icon: '🖨️',
    description: 'Connect and configure Bluetooth printer for KOT and Bill printing',
  },
  {
    id: 'aggregator',
    title: 'Aggregator Settings',
    icon: '🍕',
    description: 'Configure Zomato and Swiggy API keys, webhooks, and auto-accept settings',
  },
  {
    id: 'security',
    title: 'Account',
    icon: '👤',
    description: 'Update passwords and manage PIN access/change options',
  },
];

const SettingsScreen: React.FC = () => {
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Always clear PIN verification when Settings screen is opened
    // This ensures PIN is always required
    const clearPinAndCheck = async () => {
      try {
        const auth = await authService.getAuth();
        if (auth.isAuthenticated && auth.restaurant?.id) {
          setRestaurantId(auth.restaurant.id);
          // Clear any previous PIN verification to always require PIN
          await databaseService.clearPinVerification(auth.restaurant.id);
        }
      } catch (error) {
        console.error('Error clearing PIN verification:', error);
      } finally {
        setIsChecking(false);
      }
    };
    
    clearPinAndCheck();
  }, []);

  const checkPinVerification = async () => {
    try {
      // Get restaurant ID from auth
      const auth = await authService.getAuth();
      if (auth.isAuthenticated && auth.restaurant?.id) {
        setRestaurantId(auth.restaurant.id);

        // Always check PIN verification (should be false after clearing)
        const isVerified = await databaseService.getPinVerification(
          auth.restaurant.id
        );

        if (isVerified) {
          setIsPinVerified(true);
          // Animate fade in
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      }
    } catch (error) {
      console.error('Error checking PIN verification:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handlePinVerified = () => {
    setIsPinVerified(true);
    // Animate fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const [currentSection, setCurrentSection] = useState<string | null>(null);

  const handleCardPress = (cardId: string) => {
    setCurrentSection(cardId);
  };

  const handleBackToDashboard = () => {
    setCurrentSection(null);
  };

  // Show PIN verification screen if not verified
  if (isChecking) {
    return null; // Show loading or blank while checking
  }

  if (!isPinVerified) {
    return <PinVerificationScreen onVerified={handlePinVerified} />;
  }

  // Show individual section or main dashboard
  if (currentSection === 'restaurant-info') {
    return <RestaurantInfoScreen onBack={handleBackToDashboard} />;
  }

  if (currentSection === 'table-management') {
    return <TableManagementScreen onBack={handleBackToDashboard} />;
  }

  if (currentSection === 'menu-management') {
    return <MenuManagementScreen onBack={handleBackToDashboard} />;
  }

  if (currentSection === 'financials') {
    return <TaxesAndChargesScreen onBack={handleBackToDashboard} />;
  }

  if (currentSection === 'security') {
    return <AccountScreen onBack={handleBackToDashboard} />;
  }

  if (currentSection === 'go-online') {
    return <GoOnlineScreen onBack={handleBackToDashboard} />;
  }

  if (currentSection === 'printer') {
    return <PrinterSettingsScreen onBack={handleBackToDashboard} />;
  }

  if (currentSection === 'aggregator') {
    return <AggregatorSettingsScreen onBack={handleBackToDashboard} />;
  }

  // Show main settings dashboard
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerIcon}>⚙️</Text>
          </View>
          <Text style={styles.subtitle}>Manage your restaurant settings</Text>
        </View>

        {/* Settings Cards */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {settingsCards.map((card, index) => (
            <TouchableOpacity
              key={card.id}
              style={styles.card}
              onPress={() => handleCardPress(card.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardIconContainer}>
                  <Text style={styles.cardIcon}>{card.icon}</Text>
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDescription}>{card.description}</Text>
                </View>
                <Text style={styles.cardArrow}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// Calculate responsive values before StyleSheet.create()
const iconSize = scale(56);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: responsivePadding(20),
    paddingBottom: responsivePadding(24),
    paddingHorizontal: responsivePadding(24),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: responsiveMargin(8),
  },
  headerTitle: {
    fontSize: responsiveFontSize(32),
    fontWeight: '700',
    color: '#1e293b',
  },
  headerIcon: {
    fontSize: responsiveFontSize(32),
  },
  subtitle: {
    fontSize: responsiveFontSize(16),
    color: '#64748b',
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: responsivePadding(20),
    paddingBottom: responsivePadding(40),
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: responsiveMargin(16),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: responsivePadding(20),
  },
  cardIconContainer: {
    width: iconSize,
    height: iconSize,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: responsiveMargin(16),
  },
  cardIcon: {
    fontSize: responsiveFontSize(28),
  },
  cardTextContainer: {
    flex: 1,
    marginRight: responsiveMargin(12),
  },
  cardTitle: {
    fontSize: responsiveFontSize(18),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: responsiveMargin(4),
  },
  cardDescription: {
    fontSize: responsiveFontSize(14),
    color: '#64748b',
    lineHeight: responsiveFontSize(20),
  },
  cardArrow: {
    fontSize: responsiveFontSize(24),
    color: '#94a3b8',
    fontWeight: '300',
  },
});

export default SettingsScreen;
