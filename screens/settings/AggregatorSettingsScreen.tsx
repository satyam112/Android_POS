/**
 * ZaykaBill POS - Aggregator Settings Screen
 * Configure Zomato and Swiggy integrations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
  scale,
} from '../../utils/responsive';
import { apiService } from '../../services/api';
import { authService } from '../../services/auth';

interface AggregatorSettingsScreenProps {
  onBack: () => void;
}

const AggregatorSettingsScreen: React.FC<AggregatorSettingsScreenProps> = ({ onBack }) => {
  const [zomatoApiKey, setZomatoApiKey] = useState('');
  const [zomatoSecretKey, setZomatoSecretKey] = useState('');
  const [zomatoWebhookUrl, setZomatoWebhookUrl] = useState('');
  const [zomatoAutoAccept, setZomatoAutoAccept] = useState(false);
  const [zomatoEnabled, setZomatoEnabled] = useState(false);

  const [swiggyApiKey, setSwiggyApiKey] = useState('');
  const [swiggySecretKey, setSwiggySecretKey] = useState('');
  const [swiggyWebhookUrl, setSwiggyWebhookUrl] = useState('');
  const [swiggyAutoAccept, setSwiggyAutoAccept] = useState(false);
  const [swiggyEnabled, setSwiggyEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const [zomatoRes, swiggyRes] = await Promise.all([
        apiService.getAggregatorConfig('zomato'),
        apiService.getAggregatorConfig('swiggy'),
      ]);

      if (zomatoRes.success && zomatoRes.config) {
        setZomatoApiKey(zomatoRes.config.apiKey || '');
        setZomatoSecretKey(zomatoRes.config.secretKey || '');
        setZomatoWebhookUrl(zomatoRes.config.webhookUrl || '');
        setZomatoAutoAccept(zomatoRes.config.autoAccept || false);
        setZomatoEnabled(zomatoRes.config.enabled || false);
      }

      if (swiggyRes.success && swiggyRes.config) {
        setSwiggyApiKey(swiggyRes.config.apiKey || '');
        setSwiggySecretKey(swiggyRes.config.secretKey || '');
        setSwiggyWebhookUrl(swiggyRes.config.webhookUrl || '');
        setSwiggyAutoAccept(swiggyRes.config.autoAccept || false);
        setSwiggyEnabled(swiggyRes.config.enabled || false);
      }
    } catch (error) {
      console.error('Error loading aggregator configs:', error);
      Alert.alert('Error', 'Failed to load aggregator settings');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (provider: 'zomato' | 'swiggy') => {
    try {
      setSaving(provider);
      const config = {
        provider,
        apiKey: provider === 'zomato' ? zomatoApiKey : swiggyApiKey,
        secretKey: provider === 'zomato' ? zomatoSecretKey : swiggySecretKey,
        webhookUrl: provider === 'zomato' ? zomatoWebhookUrl : swiggyWebhookUrl,
        autoAccept: provider === 'zomato' ? zomatoAutoAccept : swiggyAutoAccept,
        enabled: provider === 'zomato' ? zomatoEnabled : swiggyEnabled,
      };

      const response = await apiService.saveAggregatorConfig(config);
      if (response.success) {
        Alert.alert('Success', response.message || 'Settings saved successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aggregator Settings</Text>
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
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aggregator Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Zomato Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🍕</Text>
            <Text style={styles.sectionTitle}>Zomato Configuration</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              value={zomatoApiKey}
              onChangeText={setZomatoApiKey}
              placeholder="Enter Zomato API Key"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Secret Key</Text>
            <TextInput
              style={styles.input}
              value={zomatoSecretKey}
              onChangeText={setZomatoSecretKey}
              placeholder="Enter Zomato Secret Key"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Webhook URL</Text>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={zomatoWebhookUrl}
              editable={false}
              placeholder="Auto-generated webhook URL"
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.switchLabel}>Auto Accept Orders</Text>
            <Switch
              value={zomatoAutoAccept}
              onValueChange={setZomatoAutoAccept}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor={zomatoAutoAccept ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.switchLabel}>Enable Integration</Text>
            <Switch
              value={zomatoEnabled}
              onValueChange={setZomatoEnabled}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor={zomatoEnabled ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving === 'zomato' && styles.saveButtonDisabled]}
            onPress={() => saveConfig('zomato')}
            disabled={saving === 'zomato'}
          >
            {saving === 'zomato' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Zomato Settings</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Swiggy Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🍔</Text>
            <Text style={styles.sectionTitle}>Swiggy Configuration</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              value={swiggyApiKey}
              onChangeText={setSwiggyApiKey}
              placeholder="Enter Swiggy API Key"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Secret Key</Text>
            <TextInput
              style={styles.input}
              value={swiggySecretKey}
              onChangeText={setSwiggySecretKey}
              placeholder="Enter Swiggy Secret Key"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Webhook URL</Text>
            <TextInput
              style={[styles.input, styles.readOnlyInput]}
              value={swiggyWebhookUrl}
              editable={false}
              placeholder="Auto-generated webhook URL"
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.switchLabel}>Auto Accept Orders</Text>
            <Switch
              value={swiggyAutoAccept}
              onValueChange={setSwiggyAutoAccept}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor={swiggyAutoAccept ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.switchLabel}>Enable Integration</Text>
            <Switch
              value={swiggyEnabled}
              onValueChange={setSwiggyEnabled}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor={swiggyEnabled ? '#ffffff' : '#f3f4f6'}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving === 'swiggy' && styles.saveButtonDisabled]}
            onPress={() => saveConfig('swiggy')}
            disabled={saving === 'swiggy'}
          >
            {saving === 'swiggy' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Swiggy Settings</Text>
            )}
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: responsiveMargin(16),
  },
  backButtonText: {
    fontSize: responsiveFontSize(16),
    color: '#3b82f6',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: responsiveFontSize(24),
    fontWeight: '700',
    color: '#1e293b',
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
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: responsivePadding(20),
    marginBottom: responsiveMargin(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsiveMargin(20),
  },
  sectionIcon: {
    fontSize: responsiveFontSize(24),
    marginRight: responsiveMargin(12),
  },
  sectionTitle: {
    fontSize: responsiveFontSize(20),
    fontWeight: '600',
    color: '#1e293b',
  },
  inputGroup: {
    marginBottom: responsiveMargin(16),
  },
  label: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#374151',
    marginBottom: responsiveMargin(8),
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: responsivePadding(12),
    fontSize: responsiveFontSize(14),
    backgroundColor: '#ffffff',
  },
  readOnlyInput: {
    backgroundColor: '#f8fafc',
    color: '#64748b',
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveMargin(16),
  },
  switchLabel: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
    color: '#374151',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: responsivePadding(12),
    paddingHorizontal: responsivePadding(24),
    borderRadius: 8,
    alignItems: 'center',
    marginTop: responsiveMargin(8),
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default AggregatorSettingsScreen;



