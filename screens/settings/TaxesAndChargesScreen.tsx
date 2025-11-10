/**
 * ZaykaBill POS - Taxes & Charges Screen
 * Configure taxes, additional charges, delivery charges, and payment settings
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
  TextInput,
} from 'react-native';
import { authService } from '../../services/auth';
import {
  taxesService,
  additionalChargesService,
  paymentSettingsService,
  Tax,
  AdditionalCharge,
  PaymentSettings,
} from '../../services/database-methods';
import CustomDialog from '../../components/CustomDialog';

interface TaxesAndChargesScreenProps {
  onBack?: () => void;
}

const TaxesAndChargesScreen: React.FC<TaxesAndChargesScreenProps> = ({ onBack }) => {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [charges, setCharges] = useState<AdditionalCharge[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Dialog states
  const [showAddTaxDialog, setShowAddTaxDialog] = useState(false);
  const [showEditTaxDialog, setShowEditTaxDialog] = useState(false);
  const [showAddChargeDialog, setShowAddChargeDialog] = useState(false);
  const [showEditChargeDialog, setShowEditChargeDialog] = useState(false);

  // Form states for taxes
  const [taxName, setTaxName] = useState('');
  const [taxPercentage, setTaxPercentage] = useState('');
  const [editingTax, setEditingTax] = useState<Tax | null>(null);

  // Form states for charges
  const [chargeName, setChargeName] = useState('');
  const [chargePercentage, setChargePercentage] = useState('');
  const [editingCharge, setEditingCharge] = useState<AdditionalCharge | null>(null);

  // Form states for payment settings
  const [deliveryChargeAmount, setDeliveryChargeAmount] = useState('');
  const [upiId, setUpiId] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      setRestaurantId(auth.restaurant.id);
      const [taxesList, chargesList, paymentData] = await Promise.all([
        taxesService.getAll(auth.restaurant.id),
        additionalChargesService.getAll(auth.restaurant.id),
        paymentSettingsService.get(auth.restaurant.id),
      ]);

      setTaxes(taxesList);
      setCharges(chargesList);
      setPaymentSettings(paymentData);
      
      if (paymentData) {
        setDeliveryChargeAmount(paymentData.deliveryChargeAmount.toString());
        setUpiId(paymentData.upiId || '');
      } else {
        setDeliveryChargeAmount('0');
        setUpiId('');
      }
    } catch (error) {
      console.error('Error loading taxes and charges:', error);
      Alert.alert('Error', 'Failed to load taxes and charges');
    } finally {
      setLoading(false);
    }
  };

  // Tax Management
  const handleAddTax = () => {
    setTaxName('');
    setTaxPercentage('');
    setEditingTax(null);
    setShowAddTaxDialog(true);
  };

  const handleEditTax = (tax: Tax) => {
    setEditingTax(tax);
    setTaxName(tax.name);
    setTaxPercentage(tax.percentage.toString());
    setShowEditTaxDialog(true);
  };

  const handleDeleteTax = (tax: Tax) => {
    Alert.alert(
      'Delete Tax',
      `Are you sure you want to delete "${tax.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await taxesService.delete(tax.id);
              await loadData();
              Alert.alert('Success', 'Tax deleted successfully');
            } catch (error) {
              console.error('Error deleting tax:', error);
              Alert.alert('Error', 'Failed to delete tax');
            }
          },
        },
      ]
    );
  };

  const handleSaveTax = async () => {
    if (!taxName.trim()) {
      Alert.alert('Error', 'Please enter a tax name');
      return;
    }

    const percentage = parseFloat(taxPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      Alert.alert('Error', 'Please enter a valid percentage (0-100)');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setSaving(true);

      if (editingTax) {
        await taxesService.update(editingTax.id, taxName.trim(), percentage);
        Alert.alert('Success', 'Tax updated successfully');
      } else {
        await taxesService.add(restaurantId, taxName.trim(), percentage);
        Alert.alert('Success', 'Tax added successfully');
      }

      setShowAddTaxDialog(false);
      setShowEditTaxDialog(false);
      setEditingTax(null);
      setTaxName('');
      setTaxPercentage('');
      await loadData();
    } catch (error) {
      console.error('Error saving tax:', error);
      Alert.alert('Error', 'Failed to save tax');
    } finally {
      setSaving(false);
    }
  };

  // Additional Charges Management
  const handleAddCharge = () => {
    setChargeName('');
    setChargePercentage('');
    setEditingCharge(null);
    setShowAddChargeDialog(true);
  };

  const handleEditCharge = (charge: AdditionalCharge) => {
    setEditingCharge(charge);
    setChargeName(charge.name);
    setChargePercentage(charge.percentage.toString());
    setShowEditChargeDialog(true);
  };

  const handleDeleteCharge = (charge: AdditionalCharge) => {
    Alert.alert(
      'Delete Charge',
      `Are you sure you want to delete "${charge.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await additionalChargesService.delete(charge.id);
              await loadData();
              Alert.alert('Success', 'Charge deleted successfully');
            } catch (error) {
              console.error('Error deleting charge:', error);
              Alert.alert('Error', 'Failed to delete charge');
            }
          },
        },
      ]
    );
  };

  const handleSaveCharge = async () => {
    if (!chargeName.trim()) {
      Alert.alert('Error', 'Please enter a charge name');
      return;
    }

    const percentage = parseFloat(chargePercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      Alert.alert('Error', 'Please enter a valid percentage (0-100)');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setSaving(true);

      if (editingCharge) {
        await additionalChargesService.update(editingCharge.id, chargeName.trim(), percentage);
        Alert.alert('Success', 'Charge updated successfully');
      } else {
        await additionalChargesService.add(restaurantId, chargeName.trim(), percentage);
        Alert.alert('Success', 'Charge added successfully');
      }

      setShowAddChargeDialog(false);
      setShowEditChargeDialog(false);
      setEditingCharge(null);
      setChargeName('');
      setChargePercentage('');
      await loadData();
    } catch (error) {
      console.error('Error saving charge:', error);
      Alert.alert('Error', 'Failed to save charge');
    } finally {
      setSaving(false);
    }
  };

  // Payment Settings Management
  const handleSavePaymentSettings = async () => {
    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    const deliveryAmount = parseFloat(deliveryChargeAmount);
    if (isNaN(deliveryAmount) || deliveryAmount < 0) {
      Alert.alert('Error', 'Please enter a valid delivery charge amount');
      return;
    }

    try {
      setSaving(true);

      await paymentSettingsService.save(
        restaurantId,
        deliveryAmount,
        upiId.trim() || undefined
      );

      Alert.alert('Success', 'Payment settings saved successfully');
      await loadData();
    } catch (error) {
      console.error('Error saving payment settings:', error);
      Alert.alert('Error', 'Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelTax = () => {
    setShowAddTaxDialog(false);
    setShowEditTaxDialog(false);
    setEditingTax(null);
    setTaxName('');
    setTaxPercentage('');
  };

  const handleCancelCharge = () => {
    setShowAddChargeDialog(false);
    setShowEditChargeDialog(false);
    setEditingCharge(null);
    setChargeName('');
    setChargePercentage('');
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
          <Text style={styles.headerTitle}>Taxes & Charges</Text>
          <Text style={styles.headerIcon}>💰</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Configure taxes, payment modes, and additional charges</Text>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 1. Tax Configuration Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tax Configuration</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddTax}
              activeOpacity={0.7}
            >
              <Text style={styles.addButtonText}>+ Add Tax</Text>
            </TouchableOpacity>
          </View>

          {taxes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No taxes added yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Tax" to create your first tax</Text>
            </View>
          ) : (
            taxes.map((tax) => (
              <View key={tax.id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{tax.name}</Text>
                  <Text style={styles.itemPercentage}>{tax.percentage}%</Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditTax(tax)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTax(tax)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 2. Additional Charges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Additional Charges</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddCharge}
              activeOpacity={0.7}
            >
              <Text style={styles.addButtonText}>+ Add Charges</Text>
            </TouchableOpacity>
          </View>

          {charges.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No charges added yet</Text>
              <Text style={styles.emptySubtext}>Tap "Add Charges" to create your first charge</Text>
            </View>
          ) : (
            charges.map((charge) => (
              <View key={charge.id} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{charge.name}</Text>
                  <Text style={styles.itemPercentage}>{charge.percentage}%</Text>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditCharge(charge)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteCharge(charge)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* 3. Delivery Charges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Charges</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Delivery Charge Amount</Text>
            <TextInput
              style={styles.input}
              value={deliveryChargeAmount}
              onChangeText={setDeliveryChargeAmount}
              placeholder="Enter delivery charge amount (e.g., 50)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              editable={!saving}
            />
          </View>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSavePaymentSettings}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Payment QR Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment QR Code</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              UPI ID for Dynamic Payment QR (Recommended)
            </Text>
            <TextInput
              style={styles.input}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="Enter UPI ID (e.g., yourname@paytm)"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
            />
          </View>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSavePaymentSettings}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Payment Settings'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Tax Dialog */}
      <CustomDialog
        visible={showAddTaxDialog}
        title="Add Tax"
        onClose={handleCancelTax}
        primaryButtonText="Add Tax"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveTax}
        onSecondaryPress={handleCancelTax}
        primaryButtonDisabled={saving || !taxName.trim() || !taxPercentage.trim()}
      >
        <View style={styles.dialogContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Tax Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={taxName}
              onChangeText={setTaxName}
              placeholder="Enter tax name (e.g., GST, VAT)"
              placeholderTextColor="#94a3b8"
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Tax Percentage (%) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={taxPercentage}
              onChangeText={setTaxPercentage}
              placeholder="Enter percentage (e.g., 18.0)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              editable={!saving}
            />
          </View>
        </View>
      </CustomDialog>

      {/* Edit Tax Dialog */}
      <CustomDialog
        visible={showEditTaxDialog}
        title="Edit Tax"
        onClose={handleCancelTax}
        primaryButtonText="Update Tax"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveTax}
        onSecondaryPress={handleCancelTax}
        primaryButtonDisabled={saving || !taxName.trim() || !taxPercentage.trim()}
      >
        <View style={styles.dialogContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Tax Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={taxName}
              onChangeText={setTaxName}
              placeholder="Enter tax name"
              placeholderTextColor="#94a3b8"
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Tax Percentage (%) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={taxPercentage}
              onChangeText={setTaxPercentage}
              placeholder="Enter percentage"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              editable={!saving}
            />
          </View>
        </View>
      </CustomDialog>

      {/* Add Charge Dialog */}
      <CustomDialog
        visible={showAddChargeDialog}
        title="Add Additional Charges"
        onClose={handleCancelCharge}
        primaryButtonText="Add Charges"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveCharge}
        onSecondaryPress={handleCancelCharge}
        primaryButtonDisabled={saving || !chargeName.trim() || !chargePercentage.trim()}
      >
        <View style={styles.dialogContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Charge Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={chargeName}
              onChangeText={setChargeName}
              placeholder="Enter charge name (e.g., Service Charge)"
              placeholderTextColor="#94a3b8"
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Charge Percentage (%) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={chargePercentage}
              onChangeText={setChargePercentage}
              placeholder="Enter percentage (e.g., 10.0)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              editable={!saving}
            />
          </View>
        </View>
      </CustomDialog>

      {/* Edit Charge Dialog */}
      <CustomDialog
        visible={showEditChargeDialog}
        title="Edit Additional Charges"
        onClose={handleCancelCharge}
        primaryButtonText="Update Charges"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveCharge}
        onSecondaryPress={handleCancelCharge}
        primaryButtonDisabled={saving || !chargeName.trim() || !chargePercentage.trim()}
      >
        <View style={styles.dialogContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Charge Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={chargeName}
              onChangeText={setChargeName}
              placeholder="Enter charge name"
              placeholderTextColor="#94a3b8"
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Charge Percentage (%) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={chargePercentage}
              onChangeText={setChargePercentage}
              placeholder="Enter percentage"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              editable={!saving}
            />
          </View>
        </View>
      </CustomDialog>
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
    flex: 1,
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
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  addButton: {
    backgroundColor: '#667eea',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  itemPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667eea',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  saveButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#667eea',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  dialogContent: {
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default TaxesAndChargesScreen;


