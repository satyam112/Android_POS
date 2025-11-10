/**
 * ZaykaBill POS - Table Management Screen
 * Add, edit, and delete restaurant tables
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
import { tablesService, Table } from '../../services/database-methods';
import CustomDialog from '../../components/CustomDialog';

interface TableManagementScreenProps {
  onBack?: () => void;
}

const TableManagementScreen: React.FC<TableManagementScreenProps> = ({ onBack }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Form state
  const [tableName, setTableName] = useState('');
  const [tableCapacity, setTableCapacity] = useState<number>(2);
  const [saving, setSaving] = useState(false);

  const capacityOptions = [2, 4, 6, 8, 10];

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      setRestaurantId(auth.restaurant.id);
      const tablesList = await tablesService.getAll(auth.restaurant.id);
      setTables(tablesList);
    } catch (error) {
      console.error('Error loading tables:', error);
      Alert.alert('Error', 'Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = () => {
    setTableName('');
    setTableCapacity(2);
    setEditingTable(null);
    setShowAddDialog(true);
  };

  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setTableName(table.name);
    setTableCapacity(table.capacity);
    setShowEditDialog(true);
  };

  const handleDeleteTable = (table: Table) => {
    Alert.alert(
      'Delete Table',
      `Are you sure you want to delete "${table.name}"?`,
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
              await tablesService.delete(table.id);
              await loadTables();
              Alert.alert('Success', 'Table deleted successfully');
            } catch (error) {
              console.error('Error deleting table:', error);
              Alert.alert('Error', 'Failed to delete table');
            }
          },
        },
      ]
    );
  };

  const handleSaveTable = async () => {
    if (!tableName.trim()) {
      Alert.alert('Error', 'Please enter a table name');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setSaving(true);

      if (editingTable) {
        // Update existing table
        await tablesService.update(editingTable.id, tableName.trim(), tableCapacity);
        Alert.alert('Success', 'Table updated successfully');
      } else {
        // Add new table
        await tablesService.add(restaurantId, tableName.trim(), tableCapacity);
        Alert.alert('Success', 'Table added successfully');
      }

      // Close dialog and reload tables
      setShowAddDialog(false);
      setShowEditDialog(false);
      setEditingTable(null);
      setTableName('');
      setTableCapacity(2);
      await loadTables();
    } catch (error) {
      console.error('Error saving table:', error);
      Alert.alert('Error', 'Failed to save table');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowAddDialog(false);
    setShowEditDialog(false);
    setEditingTable(null);
    setTableName('');
    setTableCapacity(2);
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
          <Text style={styles.headerTitle}>Table Management</Text>
          <Text style={styles.headerIcon}>🪑</Text>
        </View>
      </View>
      <View style={styles.subtitleContainer}>
        <Text style={styles.subtitle}>Manage your restaurant tables</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddTable}
          activeOpacity={0.7}
        >
          <Text style={styles.addButtonText}>+ Add Table</Text>
        </TouchableOpacity>
      </View>

      {/* Tables List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {tables.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🪑</Text>
            <Text style={styles.emptyText}>No tables added yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add Table" to create your first table</Text>
          </View>
        ) : (
          tables.map((table) => (
            <View key={table.id} style={styles.tableCard}>
              <View style={styles.tableInfo}>
                <Text style={styles.tableName}>{table.name}</Text>
                <Text style={styles.tableCapacity}>Capacity: {table.capacity} people</Text>
              </View>
              <View style={styles.tableActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditTable(table)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTable(table)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Table Dialog */}
      <CustomDialog
        visible={showAddDialog}
        title="Add New Table"
        onClose={handleCancel}
        primaryButtonText="Add Table"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveTable}
        onSecondaryPress={handleCancel}
        primaryButtonDisabled={saving || !tableName.trim()}
      >
        <View style={styles.dialogContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Table Name</Text>
            <TextInput
              style={styles.input}
              value={tableName}
              onChangeText={setTableName}
              placeholder="Enter table name (e.g., Table 1)"
              placeholderTextColor="#94a3b8"
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Table Capacity</Text>
            <View style={styles.capacityContainer}>
              {capacityOptions.map((capacity) => (
                <TouchableOpacity
                  key={capacity}
                  style={[
                    styles.capacityButton,
                    tableCapacity === capacity && styles.capacityButtonSelected,
                  ]}
                  onPress={() => setTableCapacity(capacity)}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.capacityButtonText,
                      tableCapacity === capacity && styles.capacityButtonTextSelected,
                    ]}
                  >
                    {capacity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </CustomDialog>

      {/* Edit Table Dialog */}
      <CustomDialog
        visible={showEditDialog}
        title="Edit Table"
        onClose={handleCancel}
        primaryButtonText="Update Table"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveTable}
        onSecondaryPress={handleCancel}
        primaryButtonDisabled={saving || !tableName.trim()}
      >
        <View style={styles.dialogContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Table Name</Text>
            <TextInput
              style={styles.input}
              value={tableName}
              onChangeText={setTableName}
              placeholder="Enter table name"
              placeholderTextColor="#94a3b8"
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Table Capacity</Text>
            <View style={styles.capacityContainer}>
              {capacityOptions.map((capacity) => (
                <TouchableOpacity
                  key={capacity}
                  style={[
                    styles.capacityButton,
                    tableCapacity === capacity && styles.capacityButtonSelected,
                  ]}
                  onPress={() => setTableCapacity(capacity)}
                  disabled={saving}
                >
                  <Text
                    style={[
                      styles.capacityButtonText,
                      tableCapacity === capacity && styles.capacityButtonTextSelected,
                    ]}
                  >
                    {capacity}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  subtitleContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  addButton: {
    backgroundColor: '#667eea',
    paddingVertical: 10,
    paddingHorizontal: 20,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableInfo: {
    flex: 1,
    marginRight: 12,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  tableCapacity: {
    fontSize: 14,
    color: '#64748b',
  },
  tableActions: {
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
  dialogContent: {
    paddingVertical: 8,
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
  capacityContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  capacityButton: {
    minWidth: 60,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  capacityButtonSelected: {
    borderColor: '#667eea',
    backgroundColor: '#e0e7ff',
  },
  capacityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  capacityButtonTextSelected: {
    color: '#667eea',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default TableManagementScreen;


