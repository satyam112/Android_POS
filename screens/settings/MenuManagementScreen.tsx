/**
 * ZaykaBill POS - Menu Management Screen
 * Manage menu categories and menu items
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
  menuCategoriesService,
  menuItemsService,
  MenuCategory,
  MenuItem,
} from '../../services/database-methods';
import CustomDialog from '../../components/CustomDialog';

interface MenuManagementScreenProps {
  onBack?: () => void;
}

// Food icons available for selection
const FOOD_ICONS = [
  '🍽️', '🍕', '🍔', '🍟', '🌮', '🌯', '🥗', '🍜', '🍱', '🥘',
  '🍛', '🍲', '🥙', '🍳', '🥞', '🧇', '🥓', '🥩', '🍖', '🍗',
  '🍤', '🦞', '🦐', '🦑', '🦀', '🍣', '🍙', '🍚', '🍘', '🍥',
  '🥟', '🥠', '🥡', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🍰',
  '🎂', '🧁', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🧃', '🥤',
  '🧊', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉',
];

const MenuManagementScreen: React.FC<MenuManagementScreenProps> = ({ onBack }) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Dialog states
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [showAddMenuItemDialog, setShowAddMenuItemDialog] = useState(false);
  const [showEditMenuItemDialog, setShowEditMenuItemDialog] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  const [itemName, setItemName] = useState('');
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemIcon, setItemIcon] = useState('🍽️');
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);

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
      const [categoriesList, itemsList] = await Promise.all([
        menuCategoriesService.getAll(auth.restaurant.id),
        menuItemsService.getAll(auth.restaurant.id),
      ]);

      setCategories(categoriesList);
      setMenuItems(itemsList);
    } catch (error) {
      console.error('Error loading menu data:', error);
      Alert.alert('Error', 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  // Category Management
  const handleAddCategory = () => {
    setCategoryName('');
    setCategoryDescription('');
    setEditingCategory(null);
    setShowAddCategoryDialog(true);
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setShowEditCategoryDialog(true);
  };

  const handleDeleteCategory = (category: MenuCategory) => {
    // Check if category has menu items
    const itemsInCategory = menuItems.filter((item) => item.categoryId === category.id);
    if (itemsInCategory.length > 0) {
      Alert.alert(
        'Cannot Delete',
        `This category contains ${itemsInCategory.length} menu item(s). Please delete or move the items first.`
      );
      return;
    }

    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await menuCategoriesService.delete(category.id);
              await loadData();
              Alert.alert('Success', 'Category deleted successfully');
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setSaving(true);

      if (editingCategory) {
        await menuCategoriesService.update(
          editingCategory.id,
          categoryName.trim(),
          categoryDescription.trim() || undefined
        );
        Alert.alert('Success', 'Category updated successfully');
      } else {
        await menuCategoriesService.add(
          restaurantId,
          categoryName.trim(),
          categoryDescription.trim() || undefined
        );
        Alert.alert('Success', 'Category added successfully');
      }

      setShowAddCategoryDialog(false);
      setShowEditCategoryDialog(false);
      setEditingCategory(null);
      setCategoryName('');
      setCategoryDescription('');
      await loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Error', 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  // Menu Item Management
  const handleAddMenuItem = () => {
    if (categories.length === 0) {
      Alert.alert('Error', 'Please add at least one category before adding menu items');
      return;
    }

    setItemName('');
    setItemCategoryId(categories[0].id);
    setItemPrice('');
    setItemDescription('');
    setItemIcon('🍽️');
    setEditingMenuItem(null);
    setShowAddMenuItemDialog(true);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setEditingMenuItem(item);
    setItemName(item.name);
    setItemCategoryId(item.categoryId);
    setItemPrice(item.price.toString());
    setItemDescription(item.description || '');
    setItemIcon(item.icon || '🍽️');
    setShowEditMenuItemDialog(true);
  };

  const handleDeleteMenuItem = (item: MenuItem) => {
    Alert.alert(
      'Delete Menu Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await menuItemsService.delete(item.id);
              await loadData();
              Alert.alert('Success', 'Menu item deleted successfully');
            } catch (error) {
              console.error('Error deleting menu item:', error);
              Alert.alert('Error', 'Failed to delete menu item');
            }
          },
        },
      ]
    );
  };

  const handleSaveMenuItem = async () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    if (!itemCategoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    const price = parseFloat(itemPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setSaving(true);

      if (editingMenuItem) {
        await menuItemsService.update(
          editingMenuItem.id,
          itemName.trim(),
          price,
          itemCategoryId,
          itemDescription.trim() || undefined,
          itemIcon
        );
        Alert.alert('Success', 'Menu item updated successfully');
      } else {
        await menuItemsService.add(
          restaurantId,
          itemCategoryId,
          itemName.trim(),
          price,
          itemDescription.trim() || undefined,
          itemIcon
        );
        Alert.alert('Success', 'Menu item added successfully');
      }

      setShowAddMenuItemDialog(false);
      setShowEditMenuItemDialog(false);
      setEditingMenuItem(null);
      setItemName('');
      setItemCategoryId('');
      setItemPrice('');
      setItemDescription('');
      setItemIcon('🍽️');
      await loadData();
    } catch (error) {
      console.error('Error saving menu item:', error);
      Alert.alert('Error', 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelCategory = () => {
    setShowAddCategoryDialog(false);
    setShowEditCategoryDialog(false);
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
  };

  const handleCancelMenuItem = () => {
    setShowAddMenuItemDialog(false);
    setShowEditMenuItemDialog(false);
    setEditingMenuItem(null);
    setItemName('');
    setItemCategoryId('');
    setItemPrice('');
    setItemDescription('');
    setItemIcon('🍽️');
    setShowIconPicker(false);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getCategoryItems = (categoryId: string) => {
    return menuItems.filter((item) => item.categoryId === categoryId);
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
          <Text style={styles.headerTitle}>Menu Management</Text>
          <Text style={styles.headerIcon}>📋</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.addCategoryButton]}
          onPress={handleAddCategory}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>+ Add Category</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.addItemButton]}
          onPress={handleAddMenuItem}
          activeOpacity={0.7}
          disabled={categories.length === 0}
        >
          <Text style={styles.actionButtonText}>+ Add Menu Item</Text>
        </TouchableOpacity>
      </View>

      {/* Content - Categories and Items */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {categories.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No categories added yet</Text>
            <Text style={styles.emptySubtext}>Tap "Add Category" to create your first category</Text>
          </View>
        ) : (
          categories.map((category) => {
            const categoryItems = getCategoryItems(category.id);
            return (
              <View key={category.id} style={styles.categorySection}>
                {/* Category Header */}
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryHeaderInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {category.description && (
                      <Text style={styles.categoryDescription}>{category.description}</Text>
                    )}
                    <Text style={styles.categoryItemCount}>
                      {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={styles.categoryEditButton}
                      onPress={() => handleEditCategory(category)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryEditButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.categoryDeleteButton}
                      onPress={() => handleDeleteCategory(category)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.categoryDeleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Menu Items in this Category */}
                {categoryItems.length === 0 ? (
                  <View style={styles.emptyItemsContainer}>
                    <Text style={styles.emptyItemsText}>No items in this category</Text>
                  </View>
                ) : (
                  categoryItems.map((item) => (
                    <View key={item.id} style={styles.menuItemCard}>
                      <View style={styles.menuItemIcon}>
                        <Text style={styles.menuItemIconText}>{item.icon || '🍽️'}</Text>
                      </View>
                      <View style={styles.menuItemInfo}>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        {item.description && (
                          <Text style={styles.menuItemDescription} numberOfLines={2}>
                            {item.description}
                          </Text>
                        )}
                        <Text style={styles.menuItemPrice}>₹{item.price.toFixed(2)}</Text>
                      </View>
                      <View style={styles.menuItemActions}>
                        <TouchableOpacity
                          style={styles.menuItemEditButton}
                          onPress={() => handleEditMenuItem(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.menuItemEditButtonText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.menuItemDeleteButton}
                          onPress={() => handleDeleteMenuItem(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.menuItemDeleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add Category Dialog */}
      <CustomDialog
        visible={showAddCategoryDialog}
        title="Add New Category"
        onClose={handleCancelCategory}
        primaryButtonText="Add Category"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveCategory}
        onSecondaryPress={handleCancelCategory}
        primaryButtonDisabled={saving || !categoryName.trim()}
      >
        <View style={styles.dialogContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Category Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Enter category name"
              placeholderTextColor="#94a3b8"
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={categoryDescription}
              onChangeText={setCategoryDescription}
              placeholder="Enter category description"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!saving}
            />
          </View>
        </View>
      </CustomDialog>

      {/* Edit Category Dialog */}
      <CustomDialog
        visible={showEditCategoryDialog}
        title="Edit Category"
        onClose={handleCancelCategory}
        primaryButtonText="Update Category"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveCategory}
        onSecondaryPress={handleCancelCategory}
        primaryButtonDisabled={saving || !categoryName.trim()}
      >
        <View style={styles.dialogContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Category Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="Enter category name"
              placeholderTextColor="#94a3b8"
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={categoryDescription}
              onChangeText={setCategoryDescription}
              placeholder="Enter category description"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!saving}
            />
          </View>
        </View>
      </CustomDialog>

      {/* Add Menu Item Dialog */}
      <CustomDialog
        visible={showAddMenuItemDialog}
        title="Add Menu Item"
        onClose={handleCancelMenuItem}
        primaryButtonText="Add Item"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveMenuItem}
        onSecondaryPress={handleCancelMenuItem}
        primaryButtonDisabled={saving || !itemName.trim() || !itemCategoryId || !itemPrice}
        maxHeight={700}
      >
        <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.dialogContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Item Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Enter item name"
                placeholderTextColor="#94a3b8"
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Category <Text style={styles.required}>*</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      itemCategoryId === cat.id && styles.categoryOptionSelected,
                    ]}
                    onPress={() => setItemCategoryId(cat.id)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        itemCategoryId === cat.id && styles.categoryOptionTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Price <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={itemPrice}
                onChangeText={setItemPrice}
                placeholder="Enter price (e.g., 199)"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={itemDescription}
                onChangeText={setItemDescription}
                placeholder="Enter item description"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Food Icon</Text>
              <TouchableOpacity
                style={styles.iconPickerButton}
                onPress={() => setShowIconPicker(!showIconPicker)}
                disabled={saving}
              >
                <Text style={styles.iconPickerButtonText}>{itemIcon}</Text>
                <Text style={styles.iconPickerButtonText}>Select Icon</Text>
              </TouchableOpacity>

              {showIconPicker && (
                <View style={styles.iconPickerGrid}>
                  {FOOD_ICONS.map((icon, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.iconOption,
                        itemIcon === icon && styles.iconOptionSelected,
                      ]}
                      onPress={() => {
                        setItemIcon(icon);
                        setShowIconPicker(false);
                      }}
                    >
                      <Text style={styles.iconOptionText}>{icon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </CustomDialog>

      {/* Edit Menu Item Dialog */}
      <CustomDialog
        visible={showEditMenuItemDialog}
        title="Edit Menu Item"
        onClose={handleCancelMenuItem}
        primaryButtonText="Update Item"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSaveMenuItem}
        onSecondaryPress={handleCancelMenuItem}
        primaryButtonDisabled={saving || !itemName.trim() || !itemCategoryId || !itemPrice}
        maxHeight={700}
      >
        <ScrollView style={styles.dialogScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.dialogContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Item Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={itemName}
                onChangeText={setItemName}
                placeholder="Enter item name"
                placeholderTextColor="#94a3b8"
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Category <Text style={styles.required}>*</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      itemCategoryId === cat.id && styles.categoryOptionSelected,
                    ]}
                    onPress={() => setItemCategoryId(cat.id)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        itemCategoryId === cat.id && styles.categoryOptionTextSelected,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Price <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={itemPrice}
                onChangeText={setItemPrice}
                placeholder="Enter price"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={itemDescription}
                onChangeText={setItemDescription}
                placeholder="Enter item description"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Food Icon</Text>
              <TouchableOpacity
                style={styles.iconPickerButton}
                onPress={() => setShowIconPicker(!showIconPicker)}
                disabled={saving}
              >
                <Text style={styles.iconPickerButtonText}>{itemIcon}</Text>
                <Text style={styles.iconPickerButtonText}>Select Icon</Text>
              </TouchableOpacity>

              {showIconPicker && (
                <View style={styles.iconPickerGrid}>
                  {FOOD_ICONS.map((icon, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.iconOption,
                        itemIcon === icon && styles.iconOptionSelected,
                      ]}
                      onPress={() => {
                        setItemIcon(icon);
                        setShowIconPicker(false);
                      }}
                    >
                      <Text style={styles.iconOptionText}>{icon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  addCategoryButton: {
    backgroundColor: '#667eea',
  },
  addItemButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
  categorySection: {
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
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
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryHeaderInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
  },
  categoryItemCount: {
    fontSize: 12,
    color: '#94a3b8',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryEditButton: {
    backgroundColor: '#10b981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  categoryEditButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryDeleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  categoryDeleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyItemsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  emptyItemsText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  menuItemCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuItemIconText: {
    fontSize: 24,
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  menuItemActions: {
    flexDirection: 'row',
    gap: 6,
  },
  menuItemEditButton: {
    backgroundColor: '#10b981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  menuItemEditButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  menuItemDeleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  menuItemDeleteButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  dialogContent: {
    paddingVertical: 8,
  },
  dialogScroll: {
    maxHeight: 400,
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
  textArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
  },
  categoryPicker: {
    marginTop: 8,
  },
  categoryOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  categoryOptionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#e0e7ff',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  categoryOptionTextSelected: {
    color: '#667eea',
    fontWeight: '600',
  },
  iconPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 52,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
  },
  iconPickerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  iconPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 200,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  iconOptionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#e0e7ff',
  },
  iconOptionText: {
    fontSize: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default MenuManagementScreen;


