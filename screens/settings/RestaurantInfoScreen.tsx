/**
 * ZaykaBill POS - Restaurant Info Screen
 * Manage basic restaurant information
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { authService } from '../../services/auth';
import { restaurantInfoService } from '../../services/database-methods';
import { apiService } from '../../services/api';

interface RestaurantInfoScreenProps {
  onBack?: () => void;
}

const RestaurantInfoScreen: React.FC<RestaurantInfoScreenProps> = ({ onBack }) => {
  const [restaurantName, setRestaurantName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    loadRestaurantInfo();
  }, []);

  const loadRestaurantInfo = async () => {
    try {
      setLoading(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      setRestaurantId(auth.restaurant.id);
      setRestaurantName(auth.restaurant.name || '');

      // Try to get from local database first
      const localData = await restaurantInfoService.get(auth.restaurant.id);

      if (localData) {
        setGstNumber(localData.gstNumber || '');
        setFssaiNumber(localData.fssaiNumber || '');
      } else {
        // Try to fetch from server (future implementation)
        // For now, just use empty values
      }
    } catch (error) {
      console.error('Error loading restaurant info:', error);
      Alert.alert('Error', 'Failed to load restaurant information');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    if (!gstNumber.trim() && !fssaiNumber.trim()) {
      Alert.alert('Error', 'Please enter at least GST Number or FSSAI Number');
      return;
    }

    try {
      setSaving(true);

      // Save to local database
      await restaurantInfoService.save(
        restaurantId,
        restaurantName,
        gstNumber.trim() || undefined,
        fssaiNumber.trim() || undefined
      );

      // TODO: Sync with server when online
      // await apiService.updateRestaurantInfo(...);

      Alert.alert('Success', 'FSSAI & GST Numbers updated successfully');
    } catch (error) {
      console.error('Error saving restaurant info:', error);
      Alert.alert('Error', 'Failed to save restaurant information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Restaurant Info</Text>
          <Text style={styles.headerIcon}>🏢</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Manage your basic restaurant details.</Text>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Restaurant Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Restaurant Name</Text>
          <TextInput
            style={[styles.input, styles.inputReadOnly]}
            value={restaurantName}
            editable={false}
            placeholder="Restaurant Name"
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.helpText}>Fetched from server (read-only)</Text>
        </View>

        {/* Cuisine Type */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Cuisine Type</Text>
          <TextInput
            style={[styles.input, styles.inputReadOnly]}
            value="A great dining experience."
            editable={false}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* GST Number */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>GST Number</Text>
          <TextInput
            style={styles.input}
            value={gstNumber}
            onChangeText={setGstNumber}
            placeholder="Enter GST Number"
            placeholderTextColor="#94a3b8"
            editable={!saving}
          />
        </View>

        {/* FSSAI Number */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>FSSAI Number</Text>
          <TextInput
            style={styles.input}
            value={fssaiNumber}
            onChangeText={setFssaiNumber}
            placeholder="Enter FSSAI Number"
            placeholderTextColor="#94a3b8"
            editable={!saving}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Change FSSAI & GST Number'}
          </Text>
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
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#667eea',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerIcon: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputReadOnly: {
    backgroundColor: '#f8fafc',
    color: '#64748b',
  },
  helpText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },
  saveButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#667eea',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default RestaurantInfoScreen;

