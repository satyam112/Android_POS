/**
 * ZaykaBill POS - Customer Credits Screen
 * Manage customer credit accounts and transactions
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
  Modal,
} from 'react-native';
import { authService } from '../services/auth';
import {
  customersService,
  creditTransactionsService,
  Customer,
  CreditTransaction,
} from '../services/database-methods';

interface CustomerCreditsScreenProps {
  onBack?: () => void;
}

const CustomerCreditsScreen: React.FC<CustomerCreditsScreenProps> = ({ onBack }) => {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Selected customer for actions
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Dialog states
  const [showAddCreditDialog, setShowAddCreditDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [creditHistory, setCreditHistory] = useState<CreditTransaction[]>([]);

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const rid = auth.restaurant.id;
      setRestaurantId(rid);
      const customersList = await customersService.getAll(rid);
      setCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary statistics
  const totalOutstandingCredits = customers.reduce(
    (sum, customer) => (customer.creditBalance > 0 ? sum + customer.creditBalance : sum),
    0
  );

  const totalCreditAmount = customers.reduce(
    (sum, customer) => sum + customer.creditBalance,
    0
  );

  const customersWithCredits = customers.filter((customer) => customer.creditBalance !== 0).length;

  // Handle Add Credit
  const handleAddCredit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setAmount('');
    setDescription('');
    setShowAddCreditDialog(true);
  };

  const handleSaveAddCredit = async () => {
    if (!selectedCustomer || !amount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setSaving(true);
      const updatedCustomer = await customersService.updateCredit(
        selectedCustomer.id,
        amountValue,
        'add'
      );

      // Create credit transaction
      await creditTransactionsService.save({
        customerId: selectedCustomer.id,
        amount: amountValue,
        type: 'CREDIT',
        description: description.trim() || undefined,
        balanceAfter: updatedCustomer.creditBalance,
      });

      Alert.alert('Success', 'Credit added successfully');
      setShowAddCreditDialog(false);
      setAmount('');
      setDescription('');
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (error) {
      console.error('Error adding credit:', error);
      Alert.alert('Error', 'Failed to add credit');
    } finally {
      setSaving(false);
    }
  };

  // Handle Record Payment
  const handlePay = (customer: Customer) => {
    setSelectedCustomer(customer);
    setAmount('');
    setDescription('');
    setShowPayDialog(true);
  };

  const handleSavePayment = async () => {
    if (!selectedCustomer || !amount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amountValue > selectedCustomer.creditBalance) {
      Alert.alert('Error', 'Payment amount cannot exceed credit balance');
      return;
    }

    try {
      setSaving(true);
      const updatedCustomer = await customersService.updateCredit(
        selectedCustomer.id,
        amountValue,
        'subtract'
      );

      // Create payment transaction
      await creditTransactionsService.save({
        customerId: selectedCustomer.id,
        amount: -amountValue,
        type: 'PAYMENT',
        description: description.trim() || undefined,
        balanceAfter: updatedCustomer.creditBalance,
      });

      Alert.alert('Success', 'Payment recorded successfully');
      setShowPayDialog(false);
      setAmount('');
      setDescription('');
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  // Handle View Credit History
  const handleView = async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const history = await creditTransactionsService.getAll(customer.id);
      setCreditHistory(history);
      setShowViewDialog(true);
    } catch (error) {
      console.error('Error loading credit history:', error);
      Alert.alert('Error', 'Failed to load credit history');
    }
  };

  // Handle Delete Customer
  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;

    try {
      setSaving(true);
      await customersService.delete(selectedCustomer.id);
      Alert.alert('Success', 'Customer deleted successfully');
      setShowDeleteDialog(false);
      setSelectedCustomer(null);
      await loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      Alert.alert('Error', 'Failed to delete customer');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Text style={styles.loadingText}>Loading customer credits...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Customer Credits</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Credit Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit Summary</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Outstanding Credits</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalOutstandingCredits)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Credit Amount</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalCreditAmount)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Number of Customers with Credits</Text>
            <Text style={styles.summaryValue}>{customersWithCredits}</Text>
          </View>
        </View>

        {/* Customer Credit Accounts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Credit Accounts</Text>

          {customers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          ) : (
            customers.map((customer) => (
              <View key={customer.id} style={styles.customerCard}>
                <View style={styles.customerInfo}>
                  <View style={styles.customerLeft}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerContact}>{customer.mobile}</Text>
                  </View>

                  <View style={styles.customerMiddle}>
                    <Text style={styles.customerCredit}>{formatCurrency(customer.creditBalance)}</Text>
                  </View>
                </View>

                <View style={styles.customerActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.addButton]}
                    onPress={() => handleAddCredit(customer)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionButtonText}>+ Add Credit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.payButton]}
                    onPress={() => handlePay(customer)}
                    activeOpacity={0.7}
                    disabled={customer.creditBalance <= 0}
                  >
                    <Text style={styles.actionButtonText}>Pay</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => handleView(customer)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionButtonText}>View</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(customer)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Credit Dialog */}
      <Modal
        visible={showAddCreditDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCreditDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Credit</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowAddCreditDialog(false);
                  setAmount('');
                  setDescription('');
                  setSelectedCustomer(null);
                }}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <>
                <View style={styles.modalCustomerInfo}>
                  <Text style={styles.modalCustomerName}>{selectedCustomer.name}</Text>
                  <Text style={styles.modalCustomerBalance}>
                    Current Credit: {formatCurrency(selectedCustomer.creditBalance)}
                  </Text>
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>
                    Amount <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter amount"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter description"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    editable={!saving}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setShowAddCreditDialog(false);
                      setAmount('');
                      setDescription('');
                      setSelectedCustomer(null);
                    }}
                    disabled={saving}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalButtonPrimary,
                      (!amount || saving) && styles.modalButtonDisabled,
                    ]}
                    onPress={handleSaveAddCredit}
                    disabled={!amount || saving}
                  >
                    <Text style={styles.modalButtonPrimaryText}>
                      {saving ? 'Adding...' : 'Add Credit'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Record Payment Dialog */}
      <Modal
        visible={showPayDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPayDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowPayDialog(false);
                  setAmount('');
                  setDescription('');
                  setSelectedCustomer(null);
                }}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <>
                <View style={styles.modalCustomerInfo}>
                  <Text style={styles.modalCustomerName}>{selectedCustomer.name}</Text>
                  <Text style={styles.modalCustomerBalance}>
                    Current Balance: {formatCurrency(selectedCustomer.creditBalance)}
                  </Text>
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>
                    Amount <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter payment amount"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    editable={!saving}
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Enter description"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    editable={!saving}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setShowPayDialog(false);
                      setAmount('');
                      setDescription('');
                      setSelectedCustomer(null);
                    }}
                    disabled={saving}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      styles.modalButtonPrimary,
                      (!amount || saving) && styles.modalButtonDisabled,
                    ]}
                    onPress={handleSavePayment}
                    disabled={!amount || saving}
                  >
                    <Text style={styles.modalButtonPrimaryText}>
                      {saving ? 'Recording...' : 'Record'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* View Credit History Dialog */}
      <Modal
        visible={showViewDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowViewDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.historyModalContent]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Credit History – {selectedCustomer?.name || ''}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowViewDialog(false);
                  setSelectedCustomer(null);
                  setCreditHistory([]);
                }}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <ScrollView style={styles.historyScrollView}>
                <View style={styles.modalCustomerInfo}>
                  <Text style={styles.modalCustomerBalance}>
                    Current Balance: {formatCurrency(selectedCustomer.creditBalance)}
                  </Text>
                  <Text style={styles.modalCustomerContact}>Mobile: {selectedCustomer.mobile}</Text>
                </View>

                {creditHistory.length === 0 ? (
                  <View style={styles.emptyHistoryContainer}>
                    <Text style={styles.emptyHistoryText}>No credit history found</Text>
                  </View>
                ) : (
                  <View style={styles.historyTable}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyHeaderText}>Date</Text>
                      <Text style={styles.historyHeaderText}>Type</Text>
                      <Text style={styles.historyHeaderText}>Amount</Text>
                      <Text style={styles.historyHeaderText}>Balance After</Text>
                      <Text style={styles.historyHeaderText}>Description</Text>
                    </View>
                    {creditHistory.map((transaction) => (
                      <View key={transaction.id} style={styles.historyRow}>
                        <Text style={styles.historyCell}>{formatDateTime(transaction.createdAt)}</Text>
                        <Text
                          style={[
                            styles.historyCell,
                            transaction.type === 'CREDIT' ? styles.creditType : styles.paymentType,
                          ]}
                        >
                          {transaction.type}
                        </Text>
                        <Text
                          style={[
                            styles.historyCell,
                            transaction.amount > 0 ? styles.positiveAmount : styles.negativeAmount,
                          ]}
                        >
                          {transaction.amount > 0 ? '+' : ''}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </Text>
                        <Text style={styles.historyCell}>
                          {formatCurrency(transaction.balanceAfter)}
                        </Text>
                        <Text style={styles.historyCell}>
                          {transaction.description || '-'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Customer Dialog */}
      <Modal
        visible={showDeleteDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Customer</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowDeleteDialog(false);
                  setSelectedCustomer(null);
                }}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <>
                <Text style={styles.deleteMessage}>
                  Are you sure you want to delete <Text style={styles.deleteCustomerName}>{selectedCustomer.name}</Text>?
                  This action cannot be undone and will remove all credit history.
                </Text>

                {selectedCustomer.creditBalance > 0 && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      ⚠️ This customer has an outstanding credit balance of{' '}
                      {formatCurrency(selectedCustomer.creditBalance)}
                    </Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setShowDeleteDialog(false);
                      setSelectedCustomer(null);
                    }}
                    disabled={saving}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonDanger]}
                    onPress={handleConfirmDelete}
                    disabled={saving}
                  >
                    <Text style={styles.modalButtonDangerText}>
                      {saving ? 'Deleting...' : 'Delete Customer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
  },
  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  customerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerLeft: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  customerContact: {
    fontSize: 14,
    color: '#64748b',
  },
  customerMiddle: {
    alignItems: 'flex-end',
  },
  customerCredit: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667eea',
  },
  customerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#10b981',
  },
  payButton: {
    backgroundColor: '#ef4444',
  },
  viewButton: {
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  historyModalContent: {
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '300',
  },
  modalCustomerInfo: {
    padding: 16,
    backgroundColor: '#f8fafc',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
  },
  modalCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  modalCustomerBalance: {
    fontSize: 14,
    color: '#64748b',
  },
  modalCustomerContact: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  modalInputContainer: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f1f5f9',
    marginRight: 12,
  },
  modalButtonPrimary: {
    backgroundColor: '#667eea',
  },
  modalButtonDanger: {
    backgroundColor: '#dc2626',
  },
  modalButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalButtonDangerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteMessage: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 20,
    marginTop: 16,
    lineHeight: 20,
  },
  deleteCustomerName: {
    fontWeight: '600',
    color: '#1e293b',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
  },
  historyScrollView: {
    maxHeight: 500,
  },
  emptyHistoryContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#64748b',
  },
  historyTable: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
  },
  historyHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  historyRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyCell: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  creditType: {
    color: '#10b981',
    fontWeight: '600',
  },
  paymentType: {
    color: '#ef4444',
    fontWeight: '600',
  },
  positiveAmount: {
    color: '#10b981',
    fontWeight: '600',
  },
  negativeAmount: {
    color: '#ef4444',
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default CustomerCreditsScreen;

