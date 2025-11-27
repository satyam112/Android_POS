/**
 * ZaykaBill POS - Expense Management Screen
 * Manage restaurant expenses with local SQLite storage
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authService } from '../services/auth';
import { expensesService, Expense } from '../services/database-methods';

const EXPENSE_CATEGORIES = [
  'Ingredient',
  'Utilities',
  'Rent',
  'Staff',
  'Equipment',
  'Marketing',
  'Maintenance',
  'Other',
];

const ExpensesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Dialog states
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);

  // Form states
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD format
  const [vendorName, setVendorName] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
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
      const expenseList = await expensesService.getAll(auth.restaurant.id);
      setExpenses(expenseList);
    } catch (error) {
      console.error('Error loading expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = () => {
    setCategory('');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setVendorName('');
    setShowCategoryDropdown(false);
    setShowAddExpenseDialog(true);
  };

  const handleSaveExpense = async () => {
    if (!category.trim()) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!date.trim()) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setSaving(true);

      // Generate ID for new expense
      const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newExpense: Omit<Expense, 'createdAt' | 'lastUpdated'> = {
        id: expenseId,
        restaurantId,
        category: category.trim(),
        amount: amountValue,
        description: description.trim() || undefined,
        date: date.trim(),
        vendorName: vendorName.trim() || undefined,
      };

      await expensesService.save(newExpense);
      Alert.alert('Success', 'Expense added successfully');
      setShowAddExpenseDialog(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert('Error', 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await expensesService.delete(expenseId);
              Alert.alert('Success', 'Expense deleted successfully');
              await loadData();
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setCategory('');
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setVendorName('');
    setShowCategoryDropdown(false);
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

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toFixed(2)}`;
  };

  const getCategoryIcon = (cat: string): string => {
    const icons: { [key: string]: string } = {
      Ingredient: '🥬',
      Utilities: '💡',
      Rent: '🏠',
      Staff: '👥',
      Equipment: '⚙️',
      Marketing: '📢',
      Maintenance: '🔧',
      Other: '📝',
    };
    return icons[cat] || '💰';
  };

  const getTotalExpenses = (): number => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#667eea" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Expense Management</Text>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Expenses</Text>
        <Text style={styles.summaryAmount}>{formatCurrency(getTotalExpenses())}</Text>
        <Text style={styles.summaryCount}>{expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}</Text>
      </View>

      {/* Expenses List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}>
        {expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyText}>No expenses recorded yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add Expense" to get started</Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseHeader}>
                <View style={styles.expenseCategoryRow}>
                  <Text style={styles.expenseCategoryIcon}>
                    {getCategoryIcon(expense.category)}
                  </Text>
                  <View style={styles.expenseCategoryInfo}>
                    <Text style={styles.expenseCategory}>{expense.category}</Text>
                    <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
                  </View>
                </View>
                <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
              </View>

              {expense.description && (
                <Text style={styles.expenseDescription}>{expense.description}</Text>
              )}

              {expense.vendorName && (
                <View style={styles.expenseVendor}>
                  <Text style={styles.expenseVendorLabel}>Vendor:</Text>
                  <Text style={styles.expenseVendorValue}>{expense.vendorName}</Text>
                </View>
              )}

              <View style={styles.expenseActions}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteExpense(expense.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Expense Dialog */}
      <Modal
        visible={showAddExpenseDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddExpenseDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Expense</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowAddExpenseDialog(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Category */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Category <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  disabled={saving}
                >
                  <Text style={[styles.dropdownText, !category && styles.dropdownPlaceholder]}>
                    {category || 'Select category'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                {showCategoryDropdown && (
                  <ScrollView 
                    style={styles.dropdownList}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setCategory(cat);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>
                          {getCategoryIcon(cat)} {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Description */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputMultiline]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g., AC repair, Vegetable purchase"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  editable={!saving}
                />
              </View>

              {/* Amount */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Amount <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Enter amount"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  editable={!saving}
                />
              </View>

              {/* Date */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Date <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  editable={!saving}
                />
                <Text style={styles.inputHint}>
                  Format: YYYY-MM-DD (e.g., {new Date().toISOString().split('T')[0]})
                </Text>
              </View>

              {/* Vendor/Supplier */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Vendor/Supplier</Text>
                <TextInput
                  style={styles.textInput}
                  value={vendorName}
                  onChangeText={setVendorName}
                  placeholder="Name of supplier or vendor (optional)"
                  placeholderTextColor="#94a3b8"
                  editable={!saving}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={[styles.modalActions, { paddingBottom: 16 + insets.bottom }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowAddExpenseDialog(false);
                  resetForm();
                }}
                disabled={saving}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  (!category || !amount || !date || saving) && styles.modalButtonDisabled,
                ]}
                onPress={handleSaveExpense}
                disabled={!category || !amount || !date || saving}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {saving ? 'Adding...' : 'Add Expense'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Add Expense Button */}
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={handleAddExpense}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#667eea',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    fontWeight: '300',
    color: '#ffffff',
    lineHeight: 36,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  expenseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  expenseCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseCategoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  expenseCategoryInfo: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#64748b',
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667eea',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 12,
    lineHeight: 20,
  },
  expenseVendor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  expenseVendorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
  },
  expenseVendorValue: {
    fontSize: 12,
    color: '#475569',
  },
  expenseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  deleteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
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
  },
  modalCloseButton: {
    padding: 8,
  },
  modalCloseButtonText: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '300',
  },
  modalScrollView: {
    maxHeight: 500,
    paddingHorizontal: 20,
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
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 52,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: '#1e293b',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#94a3b8',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexGrow: 0,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1e293b',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  textInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  inputHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
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
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default ExpensesScreen;
