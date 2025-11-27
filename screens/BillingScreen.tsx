/**
 * ZaykaBill POS - Billing Screen
 * Order management, menu selection, cart, and order viewing
 * 
 * ⚙️ OFFLINE-FIRST DATA SOURCES:
 * 
 * All data is managed offline using SQLite and synced from Settings when available:
 * 
 * - Menu & Category: Settings → Menu Management → SQLite (menu_categories, menu_items tables)
 * - Taxes & Charges: Settings → Taxes & Charges → SQLite (taxes, additional_charges tables)
 * - Tables: Settings → Table Management → SQLite (tables table)
 * - Customers: Cart → Add New Customer → SQLite (customers table)
 * - Orders: Billing / View Orders → SQLite (orders table)
 * 
 * This ensures smooth offline operation without server dependency.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  scale,
  verticalScale,
  moderateScale,
  responsiveFontSize,
  responsivePadding,
  responsiveMargin,
  getWidthPercentage,
  getGridColumns,
  getCardWidth,
  getButtonHeight,
  getInputHeight,
  screenData,
} from '../utils/responsive';
import { authService } from '../services/auth';
import { apiService } from '../services/api';
import {
  menuCategoriesService,
  menuItemsService,
  tablesService,
  customersService,
  taxesService,
  additionalChargesService,
  paymentSettingsService,
  ordersService,
  orderItemsService,
  restaurantInfoService,
  creditTransactionsService,
  MenuCategory,
  MenuItem,
  Table,
  Customer,
  Tax,
  AdditionalCharge,
  OrderItem,
} from '../services/database-methods';
import { databaseService, getDatabase } from '../services/database';
import { printerService, BillData, KOTData } from '../services/printer';

type TabType = 'Menu' | 'Cart' | 'View Orders';
type OrderType = 'Counter' | 'Dine-In' | 'Takeaway' | 'Delivery';
type PaymentMode = 'Cash' | 'Credit';

interface CartItem {
  menuItemId: string;
  itemName: string;
  price: number;
  quantity: number;
  icon?: string;
}

interface BillingScreenProps {
  orderToLoad?: string | null;
  onOrderLoaded?: () => void;
}

const BillingScreen: React.FC<BillingScreenProps> = ({ orderToLoad, onOrderLoaded }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('Menu');
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Menu data
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Cart tab state
  const [orderType, setOrderType] = useState<OrderType>('Counter');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showOrderTypeDropdown, setShowOrderTypeDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);

  // Additional data for cart
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [charges, setCharges] = useState<AdditionalCharge[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<{ deliveryChargeAmount: number } | null>(null);

  // Add customer dialog state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Order creation state
  const [creatingOrder, setCreatingOrder] = useState(false);

  // View Orders tab state
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showViewOrderDialog, setShowViewOrderDialog] = useState(false);
  const [orderStatuses, setOrderStatuses] = useState<{ [key: string]: string }>({});
  const [editingOrderItems, setEditingOrderItems] = useState<CartItem[]>([]);
  const [customerNames, setCustomerNames] = useState<{ [key: string]: string }>({});
  const [tableNames, setTableNames] = useState<{ [key: string]: string }>({});
  
  // Continue Order state - track which order is being continued
  const [continuingOrderId, setContinuingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadDataSafely = async () => {
      if (isMounted) {
        await loadData();
      }
    };
    
    loadDataSafely();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadTabData = async () => {
      if (!isMounted) return;
      
      if (activeTab === 'Cart' && restaurantId) {
        // Reload cart data (tables, customers, taxes, charges) to pick up Settings changes
        await loadCartData();
      } else if (activeTab === 'View Orders' && restaurantId) {
        // Reload orders to show latest status changes
        await loadOrders();
      } else if (activeTab === 'Menu' && restaurantId) {
        // Reload menu items to pick up changes from Settings → Menu Management
        await loadData();
      }
    };
    
    loadTabData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [activeTab, restaurantId]);

  // Track last loaded order to prevent reloading
  const [lastLoadedOrderNumber, setLastLoadedOrderNumber] = useState<string | null>(null);

  // Load order from notification when orderToLoad is set
  useEffect(() => {
    let isMounted = true;
    
    const loadOrderSafely = async () => {
      if (orderToLoad && restaurantId && orderToLoad !== lastLoadedOrderNumber && isMounted) {
        setLastLoadedOrderNumber(orderToLoad);
        await loadOrderIntoCart(orderToLoad);
      }
    };
    
    loadOrderSafely();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [orderToLoad, restaurantId, lastLoadedOrderNumber]);

  /**
   * Load delivery order into cart from notification
   * This is called when a delivery order notification is clicked
   */
  const loadOrderIntoCart = async (orderNumber: string) => {
    try {
      if (!restaurantId) {
        console.error('Restaurant ID not found');
        return;
      }

      // First, try to load order from local database
      let order = await ordersService.getByOrderNumber(restaurantId, orderNumber);
      let serverOrderData: any = null;
      
      // If not found locally, try to fetch from server
      if (!order) {
        console.log(`[BillingScreen] Order ${orderNumber} not found locally, fetching from server...`);
        try {
          // Fetch orders from server
          const response = await apiService.syncGetData(restaurantId, 'orders');
          if (response.success && response.data) {
            // Find the order in the fetched data
            serverOrderData = response.data.find((o: any) => o.orderNumber === orderNumber);
            if (serverOrderData) {
              console.log(`[BillingScreen] Found order ${orderNumber} on server, saving to local database...`);
              // Save the order to local database
              await ordersService.save({
                id: serverOrderData.id,
                restaurantId: restaurantId,
                orderNumber: serverOrderData.orderNumber,
                customerId: serverOrderData.customerId || undefined,
                tableId: serverOrderData.tableId || undefined,
                orderType: serverOrderData.orderType === 'DELIVERY' ? 'Delivery' : 
                          serverOrderData.orderType === 'DINE_IN' ? 'Dine-In' :
                          serverOrderData.orderType === 'TAKEAWAY' ? 'Takeaway' : 'Counter',
                status: serverOrderData.status || 'PENDING',
                subtotal: serverOrderData.subtotal || 0,
                taxAmount: serverOrderData.taxAmount || 0,
                discountAmount: serverOrderData.discountAmount || 0,
                discountPercent: serverOrderData.discountPercent || 0,
                totalAmount: serverOrderData.totalAmount || 0,
                paymentStatus: serverOrderData.paymentStatus || 'PENDING',
                paymentMethod: serverOrderData.paymentMethod || undefined,
                kotSequence: serverOrderData.kotSequence || 1,
                isOpen: serverOrderData.isOpen !== false,
                createdAt: serverOrderData.createdAt || new Date().toISOString(),
                lastUpdated: serverOrderData.updatedAt || new Date().toISOString(),
              });
              
              // Save order items if they exist in the server response
              if (serverOrderData.orderItems && Array.isArray(serverOrderData.orderItems) && serverOrderData.orderItems.length > 0) {
                console.log(`[BillingScreen] Saving ${serverOrderData.orderItems.length} order items to local database...`);
                try {
                  // Map and validate order items - filter out items with invalid menuItemId
                  const orderItemsToSave = serverOrderData.orderItems
                    .map((item: any) => {
                      const menuItemId = item.menuItemId || item.menuItem?.id || '';
                      // Validate menuItemId is not empty
                      if (!menuItemId || menuItemId.trim() === '') {
                        console.warn('[BillingScreen] Skipping order item with invalid menuItemId:', item);
                        return null;
                      }
                      return {
                        orderId: serverOrderData.id,
                        menuItemId: menuItemId,
                        itemName: item.itemName || item.menuItem?.name || 'Unknown Item',
                        quantity: item.quantity || 1,
                        unitPrice: item.unitPrice || 0,
                        totalPrice: item.totalPrice || (item.unitPrice || 0) * (item.quantity || 1),
                        kotNumber: item.kotNumber || 1,
                        specialInstructions: item.specialInstructions || undefined,
                      };
                    })
                    .filter((item: any) => item !== null); // Remove null items
                  
                  if (orderItemsToSave.length === 0) {
                    throw new Error('No valid order items to save');
                  }
                  
                  await orderItemsService.save(orderItemsToSave);
                  console.log(`[BillingScreen] Successfully saved ${orderItemsToSave.length} order items`);
                } catch (error: any) {
                  console.error('[BillingScreen] Error saving order items:', error);
                  // Show user-friendly error message
                  Alert.alert(
                    'Warning',
                    `Some order items could not be saved: ${error.message || 'Unknown error'}. The order will still be loaded but some items may be missing.`
                  );
                }
              } else {
                console.log(`[BillingScreen] No order items found in server response for order ${orderNumber}`);
              }
              
              // Reload the order from local database after saving
              // CRITICAL: Filter by restaurantId to prevent cross-tenant data access
              const localOrder = await ordersService.getById(serverOrderData.id, restaurantId);
              if (localOrder) {
                order = localOrder;
              }
            }
          }
        } catch (error) {
          console.error('Error fetching order from server:', error);
        }
      }
      
      // If still not found, show error
      if (!order) {
        Alert.alert('Error', `Order ${orderNumber} not found. Please sync with server.`);
        if (onOrderLoaded) {
          onOrderLoaded();
        }
        return;
      }

      // Load order items
      const orderItems = await orderItemsService.getByOrderId(order.id);
      if (orderItems.length === 0) {
        Alert.alert('Error', 'No items found in this order');
        if (onOrderLoaded) {
          onOrderLoaded();
        }
        return;
      }

      // Convert order items to cart items
      const cartItems: CartItem[] = orderItems.map((item) => {
        // Try to find menu item to get icon
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId);
        return {
          menuItemId: item.menuItemId,
          itemName: item.itemName,
          price: item.unitPrice,
          quantity: item.quantity,
          icon: menuItem?.icon || '🍽️',
        };
      });

      // Conflict resolution: If cart already has items, ask user or merge
      // For now, we'll replace cart with order items (as per original behavior)
      // This ensures order loading works correctly without breaking functionality
      if (cart.length > 0) {
        // Cart has existing items - replace with order items to ensure sync works
        // This maintains the original functionality while ensuring data consistency
        console.log('[BillingScreen] Replacing existing cart with order items for consistency');
      }
      
      // Set cart items
      setCart(cartItems);

      // Set order type to Delivery
      setOrderType('Delivery');

      // Set customer information from order or server data
      if (serverOrderData) {
        // Use server data if available - check both direct fields and customer relation
        const customerName = serverOrderData.customerName || 
                            (serverOrderData.customer && serverOrderData.customer.name) || 
                            '';
        const customerMobile = serverOrderData.customerMobile || 
                              (serverOrderData.customer && serverOrderData.customer.mobile) || 
                              '';
        const deliveryAddr = serverOrderData.deliveryAddress || 
                            (serverOrderData.customer && serverOrderData.customer.address) || 
                            '';
        
        console.log('[BillingScreen] Setting customer details from server:', {
          customerName,
          customerMobile,
          deliveryAddr,
          hasCustomerName: !!serverOrderData.customerName,
          hasCustomer: !!serverOrderData.customer,
          customerNameFromCustomer: serverOrderData.customer?.name,
        });
        
        setCustomerName(customerName);
        setCustomerMobile(customerMobile);
        setDeliveryAddress(deliveryAddr);
        
        // Also set selected customer ID if available
        if (serverOrderData.customerId) {
          setSelectedCustomerId(serverOrderData.customerId);
        }
      } else if (order.customerId) {
        // Load from local database
        try {
          const customer = await customersService.getById(order.customerId);
          if (customer) {
            setCustomerName(customer.name);
            setCustomerMobile(customer.mobile || '');
            setDeliveryAddress(customer.address || '');
            setSelectedCustomerId(customer.id);
          }
        } catch (error) {
          console.error('Error loading customer:', error);
        }
      }

      // Set payment mode based on order
      if (order.paymentMethod) {
        const paymentMethod = order.paymentMethod.toLowerCase();
        if (paymentMethod === 'credit') {
          setPaymentMode('Credit');
        } else {
          setPaymentMode('Cash');
        }
      }

      // Switch to Cart tab
      setActiveTab('Cart');

      // Notify that order has been loaded
      if (onOrderLoaded) {
        onOrderLoaded();
      }
    } catch (error) {
      console.error('Error loading order into cart:', error);
      Alert.alert('Error', 'Failed to load order into cart');
      if (onOrderLoaded) {
        onOrderLoaded();
      }
    }
  };

  /**
   * Load menu data from SQLite
   * Data Source: Settings → Menu Management → SQLite (menu_categories, menu_items tables)
   * Offline: Yes - All operations are local SQLite queries
   */
  const loadData = async () => {
    try {
      setLoading(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const rid = auth.restaurant.id;
      setRestaurantId(rid);

      // Load categories and menu items from SQLite (offline)
      // These are synced from Settings → Menu Management
      const [catsList, itemsList] = await Promise.all([
        menuCategoriesService.getAll(rid),
        menuItemsService.getAll(rid),
      ]);

      setCategories(catsList);
      setMenuItems(itemsList);
    } catch (error) {
      console.error('Error loading menu data:', error);
      Alert.alert('Error', 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load cart-related data from SQLite
   * Data Sources:
   * - Tables: Settings → Table Management → SQLite (tables table)
   * - Customers: Cart → Add New Customer → SQLite (customers table)
   * - Taxes: Settings → Taxes & Charges → SQLite (taxes table)
   * - Charges: Settings → Taxes & Charges → SQLite (additional_charges table)
   * - Payment Settings: Settings → Taxes & Charges → SQLite (payment_settings table)
   * Offline: Yes - All operations are local SQLite queries
   */
  const loadCartData = async () => {
    if (!restaurantId) return;

    try {
      // Load all cart-related data from SQLite (offline)
      const [tablesList, customersList, taxesList, chargesList, paymentSettingsData] =
        await Promise.all([
          tablesService.getAll(restaurantId), // From Settings → Table Management
          customersService.getAll(restaurantId), // From Cart → Add New Customer
          taxesService.getAll(restaurantId), // From Settings → Taxes & Charges
          additionalChargesService.getAll(restaurantId), // From Settings → Taxes & Charges
          paymentSettingsService.get(restaurantId), // From Settings → Taxes & Charges
        ]);

      setTables(tablesList);
      setCustomers(customersList);
      setTaxes(taxesList);
      setCharges(chargesList);
      setPaymentSettings(paymentSettingsData);
    } catch (error) {
      console.error('Error loading cart data:', error);
    }
  };

  // Filter menu items based on search and category
  const filteredItems = useMemo(() => {
    let filtered = menuItems;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.categoryId === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [menuItems, selectedCategory, searchQuery]);

  // Add to cart
  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.menuItemId === item.id);
      if (existingItem) {
        // Increase quantity
        return prevCart.map((cartItem) =>
          cartItem.menuItemId === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      } else {
        // Add new item
        return [
          ...prevCart,
          {
            menuItemId: item.id,
            itemName: item.name,
            price: item.price,
            quantity: 1,
            icon: item.icon,
          },
        ];
      }
    });
  };

  // Update cart item quantity
  const updateCartQuantity = (menuItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.menuItemId === menuItemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Remove from cart
  const removeFromCart = (menuItemId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.menuItemId !== menuItemId));
  };

  /**
   * Calculate cart totals using offline data
   * Uses taxes and charges from SQLite (Settings → Taxes & Charges)
   * All calculations happen locally, no server calls
   */
  const calculateTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountPercentValue = parseFloat(discountPercent) || 0;
    const discountAmount = (subtotal * discountPercentValue) / 100;
    const discountedSubtotal = subtotal - discountAmount;

    // Calculate individual taxes from SQLite (Settings → Taxes & Charges → taxes table)
    const taxDetails = taxes.map((tax) => ({
      id: tax.id,
      name: tax.name,
      percentage: tax.percentage,
      amount: (discountedSubtotal * tax.percentage) / 100,
    }));
    const taxAmount = taxDetails.reduce((sum, tax) => sum + tax.amount, 0);

    // Calculate individual charges from SQLite (Settings → Taxes & Charges → additional_charges table)
    const chargeDetails = charges.map((charge) => ({
      id: charge.id,
      name: charge.name,
      percentage: charge.percentage,
      amount: (discountedSubtotal * charge.percentage) / 100,
    }));
    const additionalChargesAmount = chargeDetails.reduce((sum, charge) => sum + charge.amount, 0);

    // Calculate delivery charges from SQLite (Settings → Taxes & Charges → payment_settings table)
    // Only when order type is Delivery
    let deliveryChargesAmount = 0;
    if (orderType === 'Delivery' && paymentSettings?.deliveryChargeAmount) {
      deliveryChargesAmount = paymentSettings.deliveryChargeAmount;
    }

    const taxesAndCharges = taxAmount + additionalChargesAmount + deliveryChargesAmount;
    const grandTotal = discountedSubtotal + taxesAndCharges;

    return {
      subtotal,
      discountAmount,
      discountedSubtotal,
      taxAmount,
      taxDetails,
      additionalChargesAmount,
      chargeDetails,
      deliveryChargesAmount,
      taxesAndCharges,
      grandTotal,
    };
  }, [cart, discountPercent, taxes, charges, orderType, paymentSettings]);

  /**
   * Add new customer to SQLite
   * Data Source: Cart → Add New Customer → SQLite (customers table)
   * Offline: Yes - Saves directly to SQLite, no server call required
   */
  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setSavingCustomer(true);
      const customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // Save customer directly to SQLite (offline)
      const newCustomer = await customersService.save({
        id: customerId,
        restaurantId,
        name: newCustomerName.trim(),
        mobile: newCustomerMobile.trim() || '',
        address: newCustomerAddress.trim() || undefined,
        creditBalance: 0,
      });

      setCustomers((prev) => [...prev, newCustomer]);
      setSelectedCustomerId(customerId);
      setCustomerName(newCustomerName.trim());
      setCustomerMobile(newCustomerMobile.trim());
      setShowAddCustomerDialog(false);
      setNewCustomerName('');
      setNewCustomerMobile('');
      setNewCustomerAddress('');
      Alert.alert('Success', 'Customer added successfully');
    } catch (error) {
      console.error('Error adding customer:', error);
      Alert.alert('Error', 'Failed to add customer');
    } finally {
      setSavingCustomer(false);
    }
  };

  /**
   * Load orders from SQLite
   * Data Source: Billing / View Orders → SQLite (orders table)
   * Offline: Yes - All operations are local SQLite queries
   * Orders are created locally when "Place Order" is clicked in Cart tab
   */
  const loadOrders = async () => {
    if (!restaurantId) return;

    try {
      setLoadingOrders(true);
      // Load all orders from SQLite (offline)
      const ordersList = await ordersService.getAll(restaurantId);
      setOrders(ordersList);

      // Initialize statuses (use paymentStatus as status for now)
      const statusMap: { [key: string]: string } = {};
      ordersList.forEach((order) => {
        statusMap[order.id] = order.paymentStatus || 'PENDING';
      });
      setOrderStatuses(statusMap);

      // Load tables if not already loaded (needed for table names)
      let tablesList = tables;
      if (tables.length === 0) {
        tablesList = await tablesService.getAll(restaurantId);
        setTables(tablesList);
      }

      // Load customer names from SQLite (offline)
      const names: { [key: string]: string } = {};
      // Load table names from SQLite (offline)
      const tableNamesMap: { [key: string]: string } = {};
      for (const order of ordersList) {
        // Load customer name
        if (order.customerId) {
          try {
            const customer = await customersService.getById(order.customerId);
            names[order.id] = customer?.name || 'Unknown Customer';
          } catch {
            names[order.id] = 'Unknown Customer';
          }
        } else {
          names[order.id] = 'Walk-in Customer';
        }
        
        // Load table name if order has a table
        if (order.tableId) {
          try {
            const table = tablesList.find((t) => t.id === order.tableId);
            if (table) {
              tableNamesMap[order.id] = table.name;
            }
          } catch {
            // Table not found, leave empty
          }
        }
      }
      setCustomerNames(names);
      setTableNames(tableNamesMap);
    } catch (error) {
      console.error('Error loading orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  /**
   * Place Order - Save order to SQLite
   * Data Source: Billing / View Orders → SQLite (orders table)
   * Offline: Yes - Saves directly to SQLite, no server call required
   * Creates order with "PENDING" status in local database
   * If continuing an order, generates new KOT (KOT-002, KOT-003, etc.)
   */
  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty. Please add items to cart.');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setCreatingOrder(true);

      let orderId: string;
      let orderNumber: string;
      let kotNumber: number;
      let isNewOrder = true;

      // Check if continuing an existing order
      if (continuingOrderId) {
        const existingOrder = await ordersService.getById(continuingOrderId);
        if (existingOrder && existingOrder.isOpen) {
          // Continue existing order
          orderId = existingOrder.id;
          orderNumber = existingOrder.orderNumber;
          kotNumber = existingOrder.kotSequence + 1;
          isNewOrder = false;
          
          // Update KOT sequence
          await ordersService.updateKotSequence(orderId, kotNumber);
        } else {
          // Order doesn't exist or is closed, create new order
          continuingOrderId = null;
          setContinuingOrderId(null);
        }
      }

      // Create new order if not continuing
      if (isNewOrder) {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        orderNumber = `ORD-${timestamp}-${random}`;
        orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        kotNumber = 1;
      }

      const now = new Date().toISOString();

      // Save order directly to SQLite (offline - no server dependency)
      await databaseService.initialize();
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      // Ensure restaurant exists in restaurant_data table (required for foreign key constraint)
      try {
        const auth = await authService.getAuth();
        if (auth.isAuthenticated && auth.restaurant) {
          const checkRestaurantQuery = `SELECT id FROM restaurant_data WHERE id = ? LIMIT 1;`;
          const checkResult = db.execute(checkRestaurantQuery, [restaurantId]);
          
          if (!checkResult || !checkResult.rows || checkResult.rows.length === 0) {
            // Restaurant doesn't exist, save it first
            console.log('Restaurant not found in database, saving restaurant data...');
            const restaurantNow = new Date().toISOString();
            const insertRestaurantQuery = `
              INSERT OR REPLACE INTO restaurant_data (id, name, logoUrl, lastUpdated)
              VALUES (?, ?, ?, ?);
            `;
            db.execute(insertRestaurantQuery, [
              restaurantId,
              auth.restaurant.name || 'Restaurant',
              null, // logoUrl - can be updated later
              restaurantNow,
            ]);
            console.log('Restaurant data saved successfully');
          }
        }
      } catch (restaurantError: any) {
        console.warn('Error checking/saving restaurant data:', restaurantError);
        // Continue anyway - foreign key might not be enforced
      }

      // Ensure all values are properly formatted
      const customerIdValue = selectedCustomerId || null;
      const paymentMethodValue = paymentMode ? paymentMode.toLowerCase() : 'cash';
      const totalAmountValue = typeof calculateTotals.grandTotal === 'number' 
        ? calculateTotals.grandTotal 
        : 0;
      const subtotalValue = calculateTotals.subtotal;
      const taxAmountValue = calculateTotals.taxAmount;
      const discountAmountValue = calculateTotals.discountAmount;
      const discountPercentValue = parseFloat(discountPercent) || 0;

      // Validate critical values
      if (!orderId || !restaurantId || !orderNumber) {
        throw new Error('Missing required order fields');
      }

      if (isNaN(totalAmountValue) || totalAmountValue < 0) {
        throw new Error(`Invalid total amount: ${totalAmountValue}`);
      }

      // Validate table availability for Dine-In orders
      if (orderType === 'Dine-In' && selectedTableId) {
        const selectedTable = tables.find((t) => t.id === selectedTableId);
        if (selectedTable && selectedTable.status === 'busy') {
          // Check if this table is busy due to the current order being continued
          if (!continuingOrderId || (continuingOrderId && selectedTableId !== (await ordersService.getById(continuingOrderId))?.tableId)) {
            Alert.alert('Table Busy', `Table ${selectedTable.name} is currently busy. Please select another table.`);
            setCreatingOrder(false);
            return;
          }
        }
      }

      // Save or update order
      if (isNewOrder) {
        // Create new order
        const newOrder = {
          id: orderId,
          restaurantId,
          orderNumber,
          customerId: customerIdValue,
          tableId: selectedTableId || undefined,
          orderType,
          status: 'PENDING' as const,
          subtotal: subtotalValue,
          taxAmount: taxAmountValue,
          discountAmount: discountAmountValue,
          discountPercent: discountPercentValue,
          totalAmount: totalAmountValue,
          paymentStatus: 'PENDING',
          paymentMethod: paymentMethodValue,
          kotSequence: kotNumber,
          isOpen: true,
        };
        const savedOrder = await ordersService.save(newOrder);
        console.log(`[BILLING] Saved new order: ${savedOrder.orderNumber} (ID: ${savedOrder.id})`);
        
        // Mark table as busy for Dine-In orders
        if (orderType === 'Dine-In' && selectedTableId) {
          await tablesService.updateStatus(selectedTableId, 'busy');
          console.log(`[BILLING] Marked table ${selectedTableId} as busy`);
        }
      } else {
        // Update existing order totals
        const existingOrder = await ordersService.getById(orderId);
        if (existingOrder) {
          const updatedOrder = {
            ...existingOrder,
            subtotal: existingOrder.subtotal + subtotalValue,
            taxAmount: existingOrder.taxAmount + taxAmountValue,
            discountAmount: existingOrder.discountAmount + discountAmountValue,
            totalAmount: existingOrder.totalAmount + totalAmountValue,
            kotSequence: kotNumber,
          };
          const savedOrder = await ordersService.save(updatedOrder);
          console.log(`[BILLING] Updated existing order: ${savedOrder.orderNumber} (ID: ${savedOrder.id})`);
        }
      }

      // Save order items with KOT number
      const orderItems = cart.map((item) => ({
        orderId,
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        kotNumber,
      }));
      await orderItemsService.save(orderItems);

      // Handle credit order: Update customer credit balance and create credit transaction
      if (paymentMode === 'Credit' && selectedCustomerId) {
        try {
          // Calculate the amount to add to credit
          // For new orders: add full total
          // For continuing orders: add incremental amount (new items only)
          let creditAmount = totalAmountValue;
          
          if (!isNewOrder) {
            // For continuing orders, we need to add only the incremental amount
            // The incremental amount is the current cart total
            creditAmount = totalAmountValue;
            console.log(`[BILLING] Continuing order - adding incremental credit: ₹${creditAmount}`);
          } else {
            console.log(`[BILLING] New order - adding full credit: ₹${creditAmount}`);
          }
          
          // Update customer credit balance by adding the credit amount
          const updatedCustomer = await customersService.updateCredit(
            selectedCustomerId,
            creditAmount,
            'add'
          );

          // Create credit transaction record
          await creditTransactionsService.save({
            customerId: selectedCustomerId,
            amount: creditAmount, // Positive amount for credit
            type: 'CREDIT',
            description: isNewOrder 
              ? `Order ${orderNumber}` 
              : `Order ${orderNumber} - Additional items (KOT-${String(kotNumber).padStart(3, '0')})`,
            balanceAfter: updatedCustomer.creditBalance,
          });

          console.log(`[BILLING] Updated credit balance for customer ${selectedCustomerId}: Added ₹${creditAmount}, New balance: ₹${updatedCustomer.creditBalance}`);
          
          // Reload customers to update UI with new credit balance
          try {
            const updatedCustomers = await customersService.getAll(restaurantId);
            setCustomers(updatedCustomers);
          } catch (reloadError) {
            console.error('Error reloading customers:', reloadError);
            // Non-critical error, continue
          }
        } catch (error) {
          console.error('Error updating customer credit:', error);
          // Don't fail the order if credit update fails - order is already saved
          Alert.alert('Warning', 'Order placed successfully, but credit balance update failed. Please update manually.');
        }
      }

      // Generate KOT ID (KOT-001, KOT-002, etc.)
      const kotId = `KOT-${String(kotNumber).padStart(3, '0')}`;

      // Print KOT (Kitchen Order Ticket) using Bluetooth printer
      // Only print the newly added items for this KOT
      try {
        const restaurantInfo = await getRestaurantInfoForPrint();
        if (restaurantInfo && restaurantInfo.restaurantName) {
          const kotData: KOTData = {
            orderNumber,
            kotId,
            table: selectedTableId ? tables.find((t) => t.id === selectedTableId)?.name : undefined,
            orderType: orderType,
            customer: customerName || undefined,
            mobile: customerMobile || undefined,
            timestamp: new Date().toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            items: cart.map((item) => ({
              name: item.itemName,
              quantity: item.quantity,
            })),
            restaurantName: restaurantInfo.restaurantName,
            itemsTotal: subtotalValue,
          };

          await printerService.printKOT(kotData);
        }
      } catch (error) {
        console.error('Error printing KOT:', error);
        // Don't fail order creation if printing fails - order is already saved
      }

      // Show success message with option to continue or view orders
      Alert.alert(
        '✅ Order Placed Successfully',
        `Order Number: ${orderNumber}\n${kotId} printed\n\nReady for next customer!`,
        [
          {
            text: 'New Order',
            onPress: () => {
              // Clear cart and reset form for new customer
              setCart([]);
              setContinuingOrderId(null);
              setCustomerName('');
              setCustomerMobile('');
              setSelectedCustomerId(null);
              setDiscountPercent('');
              setSelectedTableId(null);
              setPaymentMode('Cash');
              setOrderType('Counter');
              // Stay on Menu tab so they can immediately add items for next customer
              setActiveTab('Menu');
            },
          },
          {
            text: 'View Orders',
            onPress: async () => {
              // Clear cart and reset form
              setCart([]);
              setContinuingOrderId(null);
              setCustomerName('');
              setCustomerMobile('');
              setSelectedCustomerId(null);
              setDiscountPercent('');
              setSelectedTableId(null);
              setPaymentMode('Cash');
              setOrderType('Counter');
              // Navigate to View Orders tab
              setActiveTab('View Orders');
              await loadOrders();
            },
          },
        ],
        { cancelable: true }
      );
      
      // Reload orders in background (don't wait for it)
      loadOrders().catch(console.error);
    } catch (error: any) {
      console.error('Error placing order:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      const errorMessage = error?.message || 'Unknown error occurred';
      Alert.alert('Error', `Failed to place order: ${errorMessage}`);
    } finally {
      setCreatingOrder(false);
    }
  };

  // Get restaurant info for printing
  const getRestaurantInfoForPrint = async () => {
    // Always return a fallback object - never return null to prevent crashes
    const fallback = {
      restaurantName: 'Restaurant',
      restaurantAddress: undefined,
      restaurantPhone: undefined,
      gstNumber: undefined,
      fssaiNumber: undefined,
    };

    if (!restaurantId) return fallback;

    try {
      const [restaurantInfo, auth] = await Promise.all([
        restaurantInfoService.get(restaurantId).catch((err) => {
          console.log('Error fetching restaurantInfo:', err);
          return null;
        }),
        authService.getAuth().catch((err) => {
          console.log('Error fetching auth:', err);
          return { isAuthenticated: false, restaurant: null };
        }),
      ]);

      // Get restaurant name from restaurantInfo if available, otherwise from auth
      const restaurantName = restaurantInfo?.name || auth?.restaurant?.name || 'Restaurant';

      return {
        restaurantName,
        restaurantAddress: auth?.restaurant?.address || undefined,
        restaurantPhone: auth?.restaurant?.phone || undefined,
        gstNumber: restaurantInfo?.gstNumber || undefined,
        fssaiNumber: restaurantInfo?.fssaiNumber || undefined,
      };
    } catch (error) {
      console.error('Error loading restaurant info for print:', error);
      // Return fallback object instead of null to prevent crashes
      try {
        const auth = await authService.getAuth().catch(() => null);
        return {
          restaurantName: auth?.restaurant?.name || 'Restaurant',
          restaurantAddress: auth?.restaurant?.address || undefined,
          restaurantPhone: auth?.restaurant?.phone || undefined,
          gstNumber: undefined,
          fssaiNumber: undefined,
        };
      } catch {
        return fallback;
      }
    }
  };

  /**
   * Quick Bill - Generate and print customer bill immediately
   * Creates order, marks as completed (no KOT), prints final bill
   * Matches Web POS format exactly
   */
  const handleQuickBill = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty. Please add items to cart.');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setCreatingOrder(true);

      // Generate order number
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderNumber = `ORD-${timestamp}-${random}`;
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Validate table availability for Dine-In orders
      if (orderType === 'Dine-In' && selectedTableId) {
        const selectedTable = tables.find((t) => t.id === selectedTableId);
        if (selectedTable && selectedTable.status === 'busy') {
          Alert.alert('Table Busy', `Table ${selectedTable.name} is currently busy. Please select another table.`);
          setCreatingOrder(false);
          return;
        }
      }

      // Save order as completed (no KOT needed)
      const newOrder = {
        id: orderId,
        restaurantId,
        orderNumber,
        customerId: selectedCustomerId || undefined,
        tableId: selectedTableId || undefined,
        orderType,
        status: 'SERVED' as const, // Mark as served immediately
        subtotal: calculateTotals.subtotal,
        taxAmount: calculateTotals.taxAmount,
        discountAmount: calculateTotals.discountAmount,
        discountPercent: parseFloat(discountPercent) || 0,
        totalAmount: calculateTotals.grandTotal,
        paymentStatus: 'PAID',
        paymentMethod: paymentMode.toLowerCase(),
        kotSequence: 0, // No KOT for quick bill
        isOpen: false, // Order is completed
      };
      const savedOrder = await ordersService.save(newOrder);
      console.log(`[BILLING] Saved quick bill order: ${savedOrder.orderNumber} (ID: ${savedOrder.id})`);
      
      // For Quick Bill with Dine-In, table is immediately freed since order is SERVED
      if (orderType === 'Dine-In' && selectedTableId) {
        await tablesService.updateStatus(selectedTableId, 'available');
        console.log(`[BILLING] Freed table ${selectedTableId} (Quick Bill - immediately SERVED)`);
      }

      // Save order items (no KOT number needed for quick bill)
      const orderItems = cart.map((item) => ({
        orderId,
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        kotNumber: 0, // No KOT for quick bill
      }));
      await orderItemsService.save(orderItems);

      // Handle credit order: Update customer credit balance and create credit transaction
      if (paymentMode === 'Credit' && selectedCustomerId) {
        try {
          const orderTotal = calculateTotals.grandTotal;
          
          // Update customer credit balance by adding the order total
          const updatedCustomer = await customersService.updateCredit(
            selectedCustomerId,
            orderTotal,
            'add'
          );

          // Create credit transaction record
          await creditTransactionsService.save({
            customerId: selectedCustomerId,
            amount: orderTotal, // Positive amount for credit
            type: 'CREDIT',
            description: `Order ${orderNumber}`,
            balanceAfter: updatedCustomer.creditBalance,
          });

          console.log(`[BILLING] Updated credit balance for customer ${selectedCustomerId}: Added ₹${orderTotal}, New balance: ₹${updatedCustomer.creditBalance}`);
          
          // Reload customers to update UI with new credit balance
          try {
            const updatedCustomers = await customersService.getAll(restaurantId);
            setCustomers(updatedCustomers);
          } catch (reloadError) {
            console.error('Error reloading customers:', reloadError);
            // Non-critical error, continue
          }
        } catch (error) {
          console.error('Error updating customer credit:', error);
          // Don't fail the order if credit update fails - order is already saved
          Alert.alert('Warning', 'Order placed successfully, but credit balance update failed. Please update manually.');
        }
      }

      // Get restaurant info (always returns an object, never null)
      const restaurantInfo = await getRestaurantInfoForPrint();

      // Get customer name for bill
      let customerNameForBill: string | undefined = undefined;
      if (selectedCustomerId) {
        // Try to get from selected customer
        const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
        customerNameForBill = selectedCustomer?.name;
        // If not found, use customerName from state
        if (!customerNameForBill && customerName) {
          customerNameForBill = customerName;
        }
      } else if (customerName) {
        // If no customer selected but customerName is filled, use it
        customerNameForBill = customerName;
      }

      // Get table name for bill
      let tableNameForBill: string | undefined = undefined;
      if (selectedTableId) {
        const selectedTable = tables.find((t) => t.id === selectedTableId);
        tableNameForBill = selectedTable?.name;
      }

      // Get UPI ID from payment settings for dynamic QR code
      const upiId = paymentSettings?.upiId;

      // Prepare bill data matching Web POS format
      const billData: BillData = {
        restaurantName: restaurantInfo.restaurantName,
        restaurantAddress: restaurantInfo.restaurantAddress,
        restaurantPhone: restaurantInfo.restaurantPhone,
        gstNumber: restaurantInfo.gstNumber,
        fssaiNumber: restaurantInfo.fssaiNumber,
        orderNumber,
        table: tableNameForBill,
        orderType: orderType,
        customer: customerNameForBill,
        timestamp: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        items: cart.map((item) => ({
          name: item.itemName,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
        subtotal: calculateTotals.subtotal,
        tax: calculateTotals.taxAmount,
        discount: calculateTotals.discountAmount,
        taxesAndCharges: calculateTotals.taxesAndCharges,
        total: calculateTotals.grandTotal,
        paymentMethod: paymentMode,
        upiId: upiId, // Add UPI ID for dynamic QR code generation
      };

      // Print bill using Bluetooth printer
      const success = await printerService.printBill(billData);
      
      // Show success message with option to continue or view orders
      Alert.alert(
        '✅ Bill Printed Successfully',
        success 
          ? `Order Number: ${orderNumber}\nBill printed successfully!\n\nReady for next customer!`
          : `Order Number: ${orderNumber}\nBill generated. Connect Bluetooth printer to print.\n\nReady for next customer!`,
        [
          {
            text: 'New Order',
            onPress: () => {
              // Clear cart and reset form for new customer
              setCart([]);
              setCustomerName('');
              setCustomerMobile('');
              setSelectedCustomerId(null);
              setDiscountPercent('');
              setSelectedTableId(null);
              setPaymentMode('Cash');
              setOrderType('Counter');
              setContinuingOrderId(null);
              // Stay on Menu tab so they can immediately add items for next customer
              setActiveTab('Menu');
            },
          },
          {
            text: 'View Orders',
            onPress: async () => {
              // Clear cart and reset form
              setCart([]);
              setCustomerName('');
              setCustomerMobile('');
              setSelectedCustomerId(null);
              setDiscountPercent('');
              setSelectedTableId(null);
              setPaymentMode('Cash');
              setOrderType('Counter');
              setContinuingOrderId(null);
              // Navigate to View Orders tab
              setActiveTab('View Orders');
              await loadOrders();
            },
          },
        ],
        { cancelable: true }
      );
      
      // Reload orders in background (don't wait for it)
      loadOrders().catch(console.error);
    } catch (error) {
      console.error('Error printing bill:', error);
      Alert.alert('Error', 'Failed to print bill. Please try again.');
    } finally {
      setCreatingOrder(false);
    }
  };

  // Get total cart items count
  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toFixed(2)}`;
  };

  const getSelectedCategoryName = (): string => {
    if (!selectedCategory) return 'All Categories';
    const category = categories.find((cat) => cat.id === selectedCategory);
    return category?.name || 'All Categories';
  };

  const renderMenuTab = () => {
    if (loading) {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      );
    }

    return (
      <View style={styles.menuContainer}>
        {/* Top Bar - Search and Category */}
        <View style={styles.topBar}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search menu items..."
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />
          </View>

          {/* Category Dropdown */}
          <TouchableOpacity
            style={styles.categoryDropdown}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryDropdownText}>{getSelectedCategoryName()}</Text>
            <Text style={styles.categoryDropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Category Dropdown List */}
        {showCategoryDropdown && (
          <View style={styles.categoryDropdownList}>
            <ScrollView style={styles.categoryDropdownScroll} nestedScrollEnabled={true}>
              <TouchableOpacity
                style={[
                  styles.categoryDropdownItem,
                  !selectedCategory && styles.categoryDropdownItemActive,
                ]}
                onPress={() => {
                  setSelectedCategory(null);
                  setShowCategoryDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.categoryDropdownItemText,
                    !selectedCategory && styles.categoryDropdownItemTextActive,
                  ]}
                >
                  All Categories
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryDropdownItem,
                    selectedCategory === category.id && styles.categoryDropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(category.id);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryDropdownItemText,
                      selectedCategory === category.id && styles.categoryDropdownItemTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Menu Items Grid */}
        <ScrollView
          style={styles.menuScrollView}
          contentContainerStyle={styles.menuScrollContent}
          showsVerticalScrollIndicator={true}
        >
          {filteredItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyText}>
                {searchQuery.trim() || selectedCategory
                  ? 'No items found'
                  : 'No menu items available'}
              </Text>
            </View>
          ) : (
            <View style={[styles.menuGrid, { gap: responsiveMargin(16) }]}>
              {filteredItems.map((item) => {
                const columns = getGridColumns();
                const cardWidth = getCardWidth(columns);
                return (
                  <View key={item.id} style={[styles.menuCard, { width: cardWidth }]}>
                  {/* Item Icon */}
                  <View style={styles.menuItemIcon}>
                    <Text style={styles.menuItemIconText}>
                      {item.icon || '🍽️'}
                    </Text>
                  </View>

                  {/* Item Info */}
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    {item.description && (
                      <Text style={styles.menuItemDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                    <Text style={styles.menuItemPrice}>{formatCurrency(item.price)}</Text>
                  </View>

                  {/* Add Button */}
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => addToCart(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Floating Cart Button */}
        {getCartItemCount() > 0 && (
          <TouchableOpacity
            style={[styles.floatingCartButton, { bottom: 24 + insets.bottom }]}
            onPress={() => setActiveTab('Cart')}
            activeOpacity={0.8}
          >
            <Text style={styles.cartIcon}>🛒</Text>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderCartTab = () => {
    const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
    const selectedTable = tables.find((t) => t.id === selectedTableId);

    return (
      <View style={styles.cartContainer}>
        <ScrollView style={styles.cartScrollView} contentContainerStyle={styles.cartScrollContent}>
          {/* Show continuing order info */}
          {continuingOrderId && (
            <View style={styles.continuingOrderBanner}>
              <Text style={styles.continuingOrderText}>
                📝 Continuing Order - Add new items to cart
              </Text>
            </View>
          )}
          {/* Order Type */}
          <View style={styles.cartSection}>
            <Text style={styles.sectionLabel}>Order Type</Text>
            <TouchableOpacity
              style={styles.orderTypeDropdown}
              onPress={() => setShowOrderTypeDropdown(!showOrderTypeDropdown)}
              activeOpacity={0.7}
            >
              <Text style={styles.orderTypeDropdownText}>{orderType}</Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
            {showOrderTypeDropdown && (
              <View style={styles.orderTypeDropdownList}>
                {(['Counter', 'Dine-In', 'Takeaway', 'Delivery'] as OrderType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.orderTypeDropdownItem,
                      orderType === type && styles.orderTypeDropdownItemActive,
                    ]}
                    onPress={() => {
                      setOrderType(type);
                      setShowOrderTypeDropdown(false);
                      if (type !== 'Dine-In') {
                        setSelectedTableId(null);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.orderTypeDropdownItemText,
                        orderType === type && styles.orderTypeDropdownItemTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Table Dropdown (if Dine-In) */}
            {orderType === 'Dine-In' && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Select Table</Text>
                <TouchableOpacity
                  style={styles.tableDropdown}
                  onPress={() => {
                    // Reload tables to get latest status
                    loadCartData();
                    setShowTableDropdown(!showTableDropdown);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.tableDropdownText}>
                    {selectedTable ? `${selectedTable.name}${selectedTable.status === 'busy' ? ' (Busy)' : ''}` : 'Select Table'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                {showTableDropdown && (
                  <View style={styles.tableDropdownList}>
                    <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                      <TouchableOpacity
                        style={[
                          styles.tableDropdownItem,
                          !selectedTableId && styles.tableDropdownItemActive,
                        ]}
                        onPress={() => {
                          setSelectedTableId(null);
                          setShowTableDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.tableDropdownItemText,
                            !selectedTableId && styles.tableDropdownItemTextActive,
                          ]}
                        >
                          Select Table
                        </Text>
                      </TouchableOpacity>
                      {tables.map((table) => {
                        const isBusy = table.status === 'busy';
                        const isSelected = selectedTableId === table.id;
                        // Allow selecting busy table if it's the current order's table (when continuing order)
                        const canSelect = !isBusy || isSelected;
                        
                        return (
                          <TouchableOpacity
                            key={table.id}
                            style={[
                              styles.tableDropdownItem,
                              isSelected && styles.tableDropdownItemActive,
                              isBusy && !isSelected && styles.tableDropdownItemBusy,
                            ]}
                            onPress={() => {
                              if (canSelect) {
                                setSelectedTableId(table.id);
                                setShowTableDropdown(false);
                              } else {
                                Alert.alert('Table Busy', `Table ${table.name} is currently busy. Please select another table.`);
                              }
                            }}
                            disabled={!canSelect}
                          >
                            <Text
                              style={[
                                styles.tableDropdownItemText,
                                isSelected && styles.tableDropdownItemTextActive,
                                isBusy && !isSelected && styles.tableDropdownItemTextBusy,
                              ]}
                            >
                              {table.name} (Capacity: {table.capacity}) {isBusy ? '🔴 Busy' : '🟢 Available'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Customer Inputs */}
          <View style={styles.cartSection}>
            <Text style={styles.sectionLabel}>Customer Information (Optional)</Text>
            <TextInput
              style={styles.cartInput}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Customer Name"
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={styles.cartInput}
              value={customerMobile}
              onChangeText={setCustomerMobile}
              placeholder="Customer Mobile Number"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
            />
            {orderType === 'Delivery' && (
              <TextInput
                style={[styles.cartInput, styles.cartTextArea]}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Delivery Address"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            )}
          </View>

          {/* Payment Mode */}
          <View style={styles.cartSection}>
            <Text style={styles.sectionLabel}>Payment Mode</Text>
            <View style={styles.paymentModeContainer}>
              <TouchableOpacity
                style={[
                  styles.paymentModeButton,
                  paymentMode === 'Cash' && styles.paymentModeButtonActive,
                ]}
                onPress={() => {
                  setPaymentMode('Cash');
                  setSelectedCustomerId(null);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.paymentModeButtonText,
                    paymentMode === 'Cash' && styles.paymentModeButtonTextActive,
                  ]}
                >
                  Cash
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentModeButton,
                  paymentMode === 'Credit' && styles.paymentModeButtonActive,
                ]}
                onPress={() => setPaymentMode('Credit')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.paymentModeButtonText,
                    paymentMode === 'Credit' && styles.paymentModeButtonTextActive,
                  ]}
                >
                  Credit
                </Text>
              </TouchableOpacity>
            </View>

            {/* Customer Dropdown (if Credit selected) */}
            {paymentMode === 'Credit' && (
              <View style={styles.creditSection}>
                <TouchableOpacity
                  style={styles.customerDropdown}
                  onPress={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.customerDropdownText}>
                    {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
                {showCustomerDropdown && (
                  <View style={styles.customerDropdownList}>
                    <ScrollView nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                      <TouchableOpacity
                        style={[
                          styles.customerDropdownItem,
                          !selectedCustomerId && styles.customerDropdownItemActive,
                        ]}
                        onPress={() => {
                          setSelectedCustomerId(null);
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.customerDropdownItemText,
                            !selectedCustomerId && styles.customerDropdownItemTextActive,
                          ]}
                        >
                          Select Customer
                        </Text>
                      </TouchableOpacity>
                      {customers.map((customer) => (
                        <TouchableOpacity
                          key={customer.id}
                          style={[
                            styles.customerDropdownItem,
                            selectedCustomerId === customer.id &&
                              styles.customerDropdownItemActive,
                          ]}
                          onPress={() => {
                            setSelectedCustomerId(customer.id);
                            setCustomerName(customer.name);
                            setCustomerMobile(customer.mobile);
                            setShowCustomerDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.customerDropdownItemText,
                              selectedCustomerId === customer.id &&
                                styles.customerDropdownItemTextActive,
                            ]}
                          >
                            {customer.name} ({customer.mobile})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.addCustomerButton}
                  onPress={() => setShowAddCustomerDialog(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addCustomerButtonText}>+ Add New Customer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Cart Details */}
          <View style={styles.cartSection}>
            <Text style={styles.sectionLabel}>Cart Items</Text>
            {cart.length === 0 ? (
              <View style={styles.emptyCartContainer}>
                <Text style={styles.emptyCartIcon}>🛒</Text>
                <Text style={styles.emptyCartText}>Cart is empty</Text>
                <Text style={styles.emptyCartSubtext}>Add items from Menu tab</Text>
              </View>
            ) : (
              cart.map((item) => (
                <View key={item.menuItemId} style={styles.cartItemCard}>
                  <View style={styles.cartItemLeft}>
                    <Text style={styles.cartItemIcon}>{item.icon || '🍽️'}</Text>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.itemName}</Text>
                      <Text style={styles.cartItemPrice}>
                        {formatCurrency(item.price)} × {item.quantity} ={' '}
                        {formatCurrency(item.price * item.quantity)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cartItemRight}>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateCartQuantity(item.menuItemId, item.quantity - 1)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quantityButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateCartQuantity(item.menuItemId, item.quantity + 1)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteItemButton}
                      onPress={() => removeFromCart(item.menuItemId)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.deleteItemButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Discount */}
          <View style={styles.cartSection}>
            <Text style={styles.sectionLabel}>Discount (%)</Text>
            <TextInput
              style={styles.cartInput}
              value={discountPercent}
              onChangeText={setDiscountPercent}
              placeholder="Enter discount percentage"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
          </View>

          {/* Summary */}
          <View style={styles.cartSection}>
            <Text style={styles.sectionLabel}>Order Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatCurrency(calculateTotals.subtotal)}</Text>
              </View>
              {parseFloat(discountPercent) > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Discount ({discountPercent}%)
                  </Text>
                  <Text style={styles.summaryDiscount}>
                    -{formatCurrency(calculateTotals.discountAmount)}
                  </Text>
                </View>
              )}
              {/* Individual Taxes */}
              {calculateTotals.taxDetails.map((tax) => (
                <View key={tax.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {tax.name} ({tax.percentage}%)
                  </Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(tax.amount)}
                  </Text>
                </View>
              ))}
              {/* Individual Charges */}
              {calculateTotals.chargeDetails.map((charge) => (
                <View key={charge.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {charge.name} ({charge.percentage}%)
                  </Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(charge.amount)}
                  </Text>
                </View>
              ))}
              {/* Delivery Charges - Only show when order type is Delivery */}
              {orderType === 'Delivery' && calculateTotals.deliveryChargesAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Charges</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(calculateTotals.deliveryChargesAmount)}
                  </Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                <Text style={styles.summaryTotalLabel}>Grand Total</Text>
                <Text style={styles.summaryTotalValue}>
                  {formatCurrency(calculateTotals.grandTotal)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.cartActions, { paddingBottom: 16 + insets.bottom }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.quickBillButton]}
            onPress={handleQuickBill}
            activeOpacity={0.8}
            disabled={cart.length === 0 || creatingOrder}
          >
            <Text style={styles.actionButtonText}>Quick Bill</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.placeOrderButton,
              (cart.length === 0 || creatingOrder) && styles.actionButtonDisabled,
            ]}
            onPress={handlePlaceOrder}
            activeOpacity={0.8}
            disabled={cart.length === 0 || creatingOrder}
          >
            <Text style={styles.actionButtonText}>
              {creatingOrder ? 'Placing...' : 'Place Order'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Customer Dialog */}
        <Modal
          visible={showAddCustomerDialog}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowAddCustomerDialog(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Customer</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowAddCustomerDialog(false);
                    setNewCustomerName('');
                    setNewCustomerMobile('');
                    setNewCustomerAddress('');
                  }}
                >
                  <Text style={styles.modalCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>
                    Customer Name <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newCustomerName}
                    onChangeText={setNewCustomerName}
                    placeholder="Enter customer name"
                    placeholderTextColor="#94a3b8"
                    editable={!savingCustomer}
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>Mobile (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={newCustomerMobile}
                    onChangeText={setNewCustomerMobile}
                    placeholder="Enter mobile number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    editable={!savingCustomer}
                  />
                </View>

                <View style={styles.modalInputContainer}>
                  <Text style={styles.modalLabel}>Address (Optional)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    value={newCustomerAddress}
                    onChangeText={setNewCustomerAddress}
                    placeholder="Enter address"
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={3}
                    editable={!savingCustomer}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowAddCustomerDialog(false);
                    setNewCustomerName('');
                    setNewCustomerMobile('');
                    setNewCustomerAddress('');
                  }}
                  disabled={savingCustomer}
                >
                  <Text style={styles.modalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalButtonPrimary,
                    (!newCustomerName.trim() || savingCustomer) && styles.modalButtonDisabled,
                  ]}
                  onPress={handleAddCustomer}
                  disabled={!newCustomerName.trim() || savingCustomer}
                >
                  <Text style={styles.modalButtonPrimaryText}>
                    {savingCustomer ? 'Adding...' : 'Add Customer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // Get order status color
  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return '#f59e0b';
      case 'CONFIRMED':
        return '#3b82f6';
      case 'PREPARING':
        return '#8b5cf6';
      case 'READY':
        return '#10b981';
      case 'SERVED':
        return '#06b6d4';
      case 'CANCELLED':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  // Get customer name
  const getCustomerName = async (customerId?: string): Promise<string> => {
    if (!customerId) return 'Walk-in Customer';
    try {
      const customer = await customersService.getById(customerId);
      return customer?.name || 'Unknown Customer';
    } catch {
      return 'Unknown Customer';
    }
  };

  // Format time
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format date and time
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle view order
  const handleViewOrder = async (order: any) => {
    try {
      // Load actual order items from database
      const orderItems = await orderItemsService.getByOrderId(order.id);
      
      // Convert OrderItem[] to CartItem[] for display
      const cartItems: CartItem[] = orderItems.map((item) => ({
        menuItemId: item.menuItemId,
        itemName: item.itemName,
        price: item.unitPrice,
        quantity: item.quantity,
        icon: '🍽️', // Default icon
      }));
      
      setEditingOrderItems(cartItems);
      setSelectedOrder(order);
      setShowViewOrderDialog(true);
    } catch (error) {
      console.error('Error loading order items:', error);
      Alert.alert('Error', 'Failed to load order items');
    }
  };

  // Handle continue order
  // Matches Web POS behavior: Switch to Menu, clear cart, set customer info, allow adding new items
  // Sets continuingOrderId so handlePlaceOrder knows to add to existing order
  const handleContinueOrder = async (order: any) => {
    try {
      // Check if order is open
      const orderData = await ordersService.getById(order.id);
      if (!orderData) {
        Alert.alert('Error', 'Order not found');
        return;
      }

      if (!orderData.isOpen) {
        Alert.alert('Error', 'This order is already closed. Cannot add more items.');
        return;
      }

      // 1. Set continuing order ID
      setContinuingOrderId(order.id);

      // 2. Switch to Menu tab (POS view in web)
      setActiveTab('Menu');

      // 3. Clear existing cart - start fresh to add new items (matches web POS line 913)
      setCart([]);

      // 4. Set customer details if available (matches web POS lines 897-901)
      if (orderData.customerId) {
        try {
          const customer = await customersService.getById(orderData.customerId);
          if (customer) {
            setCustomerName(customer.name);
            setCustomerMobile(customer.mobile || '');
            setSelectedCustomerId(customer.id);
          } else {
            // Reset if customer not found
            setCustomerName('');
            setCustomerMobile('');
            setSelectedCustomerId(null);
          }
        } catch (error) {
          console.error('Error loading customer:', error);
          setCustomerName('');
          setCustomerMobile('');
          setSelectedCustomerId(null);
        }
      } else {
        // No customer - reset fields
        setCustomerName('');
        setCustomerMobile('');
        setSelectedCustomerId(null);
      }

      // 5. Set payment mode based on order
      if (orderData.paymentMethod) {
        const paymentMethod = orderData.paymentMethod.toLowerCase();
        if (paymentMethod === 'credit') {
          setPaymentMode('Credit');
        } else {
          setPaymentMode('Cash');
        }
      } else {
        setPaymentMode('Cash');
      }

      // 6. Set order type and table from order
      if (orderData.orderType) {
        setOrderType(orderData.orderType);
      }
      if (orderData.tableId) {
        setSelectedTableId(orderData.tableId);
      }

      // 7. Reset discount
      setDiscountPercent('');

      // Success - user can now add items to cart
      Alert.alert(
        'Continue Order',
        `You can now add new items to cart for ${orderData.orderNumber || 'this order'}. The next KOT will be KOT-${String(orderData.kotSequence + 1).padStart(3, '0')}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error continuing order:', error);
      Alert.alert('Error', 'Failed to continue order. Please try again.');
    }
  };

  /**
   * Print Bill - Generate and print customer bill for existing order
   * Aggregates all items from all KOTs and calculates totals
   * Matches Web POS format exactly
   */
  const handlePrintBill = async (order: any) => {
    try {
      // Load order data with all fields
      const orderData = await ordersService.getById(order.id);
      if (!orderData) {
        Alert.alert('Error', 'Order not found');
        return;
      }

      // Load all order items from all KOTs
      const orderItems = await orderItemsService.getByOrderId(order.id);
      
      if (orderItems.length === 0) {
        Alert.alert('Error', 'No items found in this order');
        return;
      }

      // Get restaurant info (always returns an object, never null)
      const restaurantInfo = await getRestaurantInfoForPrint();

      // Get customer name - load from database if not in state
      let customerNameForBill: string | undefined = undefined;
      if (orderData.customerId) {
        // Try to get from state first
        customerNameForBill = customerNames[order.id];
        // If not in state, load from database
        if (!customerNameForBill || customerNameForBill === 'Walk-in Customer') {
          try {
            const customer = await customersService.getById(orderData.customerId);
            customerNameForBill = customer?.name;
          } catch {
            // Customer not found, leave undefined
          }
        }
      }

      // Get table name if available - load from state or tables array
      let tableName: string | undefined = undefined;
      if (orderData.tableId) {
        // Try to get from state first
        tableName = tableNames[order.id];
        // If not in state, find from tables array
        if (!tableName) {
          const table = tables.find((t) => t.id === orderData.tableId);
          tableName = table?.name;
        }
      }

      // Calculate totals from order data (already aggregated)
      const subtotal = orderData.subtotal || 0;
      const taxAmount = orderData.taxAmount || 0;
      const discountAmount = orderData.discountAmount || 0;
      const totalAmount = orderData.totalAmount || 0;

      // Get UPI ID from payment settings for dynamic QR code
      const upiId = paymentSettings?.upiId;

      // Prepare bill data with all items from all KOTs
      const billData: BillData = {
        restaurantName: restaurantInfo.restaurantName,
        restaurantAddress: restaurantInfo.restaurantAddress,
        restaurantPhone: restaurantInfo.restaurantPhone,
        gstNumber: restaurantInfo.gstNumber,
        fssaiNumber: restaurantInfo.fssaiNumber,
        orderNumber: orderData.orderNumber,
        orderType: orderData.orderType,
        table: tableName,
        customer: customerNameForBill,
        timestamp: formatDateTime(orderData.createdAt),
        items: orderItems.map((item) => ({
          name: item.itemName,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.totalPrice,
        })),
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        taxesAndCharges: taxAmount + (totalAmount - subtotal - taxAmount + discountAmount), // Calculate additional charges
        total: totalAmount,
        paymentMethod: orderData.paymentMethod || 'Cash',
        upiId: upiId, // Add UPI ID for dynamic QR code generation
      };

      // Print bill using Bluetooth printer
      try {
        const success = await printerService.printBill(billData);
        if (success) {
          Alert.alert('Success', `Bill printed for Order ${orderData.orderNumber}`);
        } else {
          Alert.alert('Info', 'Bill generated. Connect Bluetooth printer to print.');
        }
      } catch (error: any) {
        console.error('Error printing bill:', error);
        Alert.alert(
          'Print Error',
          error.message || 'Failed to print bill. Please check your printer connection in Settings > Printer Settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error printing bill:', error);
      Alert.alert('Error', 'Failed to print bill. Please try again.');
    }
  };

  // Handle cancel order
  // Matches Web POS behavior: Cannot cancel SERVED or CANCELLED orders
  const handleCancelOrder = async (order: any) => {
    const currentStatus = orderStatuses[order.id] || order.paymentStatus || 'PENDING';
    
    // Prevent cancelling SERVED or already CANCELLED orders
    if (currentStatus === 'SERVED') {
      Alert.alert('Cannot Cancel', 'Served orders cannot be cancelled.');
      return;
    }
    
    if (currentStatus === 'CANCELLED') {
      Alert.alert('Already Cancelled', 'This order is already cancelled.');
      return;
    }

    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel Order ${order.orderNumber}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              // Get order to check tableId
              const orderData = await ordersService.getById(order.id);
              
              // Update order status to CANCELLED
              await databaseService.initialize();
              const db = getDatabase();
              if (!db) throw new Error('Database not initialized');

              const updateQuery = `
                UPDATE orders SET paymentStatus = 'CANCELLED', status = 'CANCELLED', lastUpdated = ? WHERE id = ?;
              `;
              db.execute(updateQuery, [new Date().toISOString(), order.id]);

              // Free the table if it's a Dine-In order
              if (orderData && orderData.tableId && orderData.orderType === 'Dine-In') {
                await tablesService.updateStatus(orderData.tableId, 'available');
                console.log(`[BILLING] Freed table ${orderData.tableId} (order CANCELLED)`);
                // Reload tables to update UI
                await loadCartData();
              }

              setOrderStatuses((prev) => ({ ...prev, [order.id]: 'CANCELLED' }));
              await loadOrders();
              Alert.alert('Success', 'Order cancelled successfully');
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  /**
   * Update order status in SQLite
   * Offline: Yes - Updates order directly in SQLite, no server call required
   */
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      // Get order to check tableId
      const order = await ordersService.getById(orderId);
      if (!order) {
        Alert.alert('Error', 'Order not found');
        return;
      }

      // Use ordersService to update status
      await ordersService.updateStatus(orderId, newStatus);

      // Update table status based on order status
      if (order.tableId && order.orderType === 'Dine-In') {
        if (newStatus === 'SERVED' || newStatus === 'CANCELLED') {
          // Free the table when order is SERVED or CANCELLED
          await tablesService.updateStatus(order.tableId, 'available');
          console.log(`[BILLING] Freed table ${order.tableId} (order ${newStatus})`);
          // Reload tables to update UI
          await loadCartData();
        } else if (newStatus !== 'SERVED' && newStatus !== 'CANCELLED') {
          // Mark table as busy for other statuses (if not already busy)
          const table = tables.find((t) => t.id === order.tableId);
          if (table && table.status !== 'busy') {
            await tablesService.updateStatus(order.tableId, 'busy');
            console.log(`[BILLING] Marked table ${order.tableId} as busy (order ${newStatus})`);
            // Reload tables to update UI
            await loadCartData();
          }
        }
      }

      setOrderStatuses((prev) => ({ ...prev, [orderId]: newStatus }));
      await loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const renderViewOrdersTab = () => {
    if (loadingOrders) {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      );
    }

    return (
      <View style={styles.ordersContainer}>
        <ScrollView
          style={styles.ordersScrollView}
          contentContainerStyle={styles.ordersScrollContent}
        >
          {orders.length === 0 ? (
            <View style={styles.emptyOrdersContainer}>
              <Text style={styles.emptyOrdersIcon}>📦</Text>
              <Text style={styles.emptyOrdersText}>No orders yet</Text>
              <Text style={styles.emptyOrdersSubtext}>
                Orders placed will appear here
              </Text>
            </View>
          ) : (
            orders.map((order) => {
              // Use order.status if available, otherwise fall back to paymentStatus or orderStatuses
              const status = order.status || orderStatuses[order.id] || order.paymentStatus || 'PENDING';
              const statusColor = getStatusColor(status);

              return (
                <View key={order.id} style={styles.orderCard}>
                  {/* Order Header */}
                  <View style={styles.orderCardHeader}>
                    <View style={styles.orderCardHeaderLeft}>
                      <Text style={styles.orderCardId}>Order {order.orderNumber}</Text>
                      <Text style={styles.orderCardTime}>{formatDateTime(order.createdAt)}</Text>
                    </View>
                    <View
                      style={[
                        styles.orderStatusBadge,
                        { backgroundColor: statusColor + '20', borderColor: statusColor },
                      ]}
                    >
                      <Text style={[styles.orderStatusText, { color: statusColor }]}>
                        {status}
                      </Text>
                    </View>
                  </View>

                  {/* Order Details */}
                  <View style={styles.orderCardBody}>
                    {tableNames[order.id] && (
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Table:</Text>
                        <Text style={styles.orderDetailValue}>
                          {tableNames[order.id]}
                        </Text>
                      </View>
                    )}
                    {customerNames[order.id] && customerNames[order.id] !== 'Walk-in Customer' && (
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Customer:</Text>
                        <Text style={styles.orderDetailValue}>
                          {customerNames[order.id]}
                        </Text>
                      </View>
                    )}
                    <View style={styles.orderDetailRow}>
                      <Text style={styles.orderDetailLabel}>Payment:</Text>
                      <Text style={styles.orderDetailValue}>
                        {order.paymentMethod?.toUpperCase() || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.orderDetailRow}>
                      <Text style={styles.orderDetailLabel}>Total:</Text>
                      <Text style={styles.orderDetailTotal}>{formatCurrency(order.totalAmount)}</Text>
                    </View>
                  </View>

                  {/* Status Selector */}
                  <View style={styles.orderStatusSelector}>
                    <Text style={styles.statusSelectorLabel}>Status:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.statusButtonsContainer}
                    >
                      {['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'].map(
                        (s) => (
                          <TouchableOpacity
                            key={s}
                            style={[
                              styles.statusButton,
                              status === s && styles.statusButtonActive,
                              status === s && { backgroundColor: statusColor },
                            ]}
                            onPress={() => handleUpdateStatus(order.id, s)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.statusButtonText,
                                status === s && styles.statusButtonTextActive,
                              ]}
                            >
                              {s}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </ScrollView>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.orderActions}>
                    <TouchableOpacity
                      style={[styles.orderActionButton, styles.viewOrderButton]}
                      onPress={() => handleViewOrder(order)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.orderActionButtonText}>View</Text>
                    </TouchableOpacity>
                    {/* Only show Continue button if order is not SERVED */}
                    {status !== 'SERVED' && (
                      <TouchableOpacity
                        style={[styles.orderActionButton, styles.continueOrderButton]}
                        onPress={() => handleContinueOrder(order)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.orderActionButtonText}>Continue</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.orderActionButton, styles.printBillButton]}
                      onPress={() => handlePrintBill(order)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.orderActionButtonText}>Print</Text>
                    </TouchableOpacity>
                    {status !== 'CANCELLED' && status !== 'SERVED' && (
                      <TouchableOpacity
                        style={[styles.orderActionButton, styles.cancelOrderButton]}
                        onPress={() => handleCancelOrder(order)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.orderActionButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* View Order Dialog */}
        <Modal
          visible={showViewOrderDialog}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setShowViewOrderDialog(false);
            setSelectedOrder(null);
            setEditingOrderItems([]);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.viewOrderModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Order {selectedOrder?.orderNumber || ''}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowViewOrderDialog(false);
                    setSelectedOrder(null);
                    setEditingOrderItems([]);
                  }}
                >
                  <Text style={styles.modalCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollView}>
                {/* Order Details */}
                <View style={styles.viewOrderSection}>
                  <Text style={styles.viewOrderSectionTitle}>Order Details</Text>
                  {selectedOrder?.tableId && tableNames[selectedOrder.id] && (
                    <View style={styles.viewOrderDetailRow}>
                      <Text style={styles.viewOrderDetailLabel}>Table:</Text>
                      <Text style={styles.viewOrderDetailValue}>
                        {tableNames[selectedOrder.id]}
                      </Text>
                    </View>
                  )}
                  <View style={styles.viewOrderDetailRow}>
                    <Text style={styles.viewOrderDetailLabel}>Customer:</Text>
                    <Text style={styles.viewOrderDetailValue}>
                      {selectedOrder?.customerId 
                        ? (customerNames[selectedOrder.id] || 'Customer')
                        : 'Walk-in Customer'}
                    </Text>
                  </View>
                  <View style={styles.viewOrderDetailRow}>
                    <Text style={styles.viewOrderDetailLabel}>Payment Method:</Text>
                    <Text style={styles.viewOrderDetailValue}>
                      {selectedOrder?.paymentMethod?.toUpperCase() || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.viewOrderDetailRow}>
                    <Text style={styles.viewOrderDetailLabel}>Status:</Text>
                    <Text style={[styles.viewOrderDetailValue, {
                      color: getStatusColor(orderStatuses[selectedOrder?.id] || 'PENDING')
                    }]}>
                      {orderStatuses[selectedOrder?.id] || selectedOrder?.paymentStatus || 'PENDING'}
                    </Text>
                  </View>
                </View>

                {/* Order Items */}
                <View style={styles.viewOrderSection}>
                  <Text style={styles.viewOrderSectionTitle}>Order Items</Text>
                  {editingOrderItems.length === 0 ? (
                    <Text style={styles.emptyItemsText}>No items in this order</Text>
                  ) : (
                    editingOrderItems.map((item, index) => (
                      <View key={index} style={styles.viewOrderItemCard}>
                        <View style={styles.viewOrderItemLeft}>
                          <Text style={styles.viewOrderItemIcon}>{item.icon || '🍽️'}</Text>
                          <View style={styles.viewOrderItemInfo}>
                            <Text style={styles.viewOrderItemName}>{item.itemName}</Text>
                            <Text style={styles.viewOrderItemPrice}>
                              {formatCurrency(item.price)} × {item.quantity}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.viewOrderItemTotal}>
                          {formatCurrency(item.price * item.quantity)}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                {/* Total */}
                <View style={styles.viewOrderTotal}>
                  <Text style={styles.viewOrderTotalLabel}>Total Amount:</Text>
                  <Text style={styles.viewOrderTotalValue}>
                    {formatCurrency(selectedOrder?.totalAmount || 0)}
                  </Text>
                </View>
              </ScrollView>

              {/* Done Button */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={() => {
                    setShowViewOrderDialog(false);
                    setSelectedOrder(null);
                    setEditingOrderItems([]);
                  }}
                >
                  <Text style={styles.modalButtonPrimaryText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Menu':
        return renderMenuTab();
      case 'Cart':
        return renderCartTab();
      case 'View Orders':
        return renderViewOrdersTab();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Order Management Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Management</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Menu' && styles.tabActive]}
          onPress={() => setActiveTab('Menu')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Menu' && styles.tabTextActive,
            ]}
          >
            Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'Cart' && styles.tabActive]}
          onPress={() => setActiveTab('Cart')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'Cart' && styles.tabTextActive,
            ]}
          >
            Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'View Orders' && styles.tabActive]}
          onPress={() => setActiveTab('View Orders')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'View Orders' && styles.tabTextActive,
            ]}
          >
            View Orders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>
    </View>
  );
};

// Calculate responsive values before StyleSheet.create()
const menuIconSize = scale(64);

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
  },
  headerTitle: {
    fontSize: responsiveFontSize(24),
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: responsivePadding(16),
  },
  tab: {
    flex: 1,
    paddingVertical: responsivePadding(16),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#667eea',
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tabPlaceholder: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  menuContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    backgroundColor: '#ffffff',
    padding: responsivePadding(16),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: responsiveMargin(12),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: responsivePadding(16),
    height: getInputHeight(),
  },
  searchIcon: {
    fontSize: responsiveFontSize(20),
    marginRight: responsiveMargin(12),
  },
  searchInput: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    color: '#1e293b',
  },
  categoryDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: responsivePadding(16),
    height: getInputHeight(),
  },
  categoryDropdownText: {
    fontSize: responsiveFontSize(16),
    color: '#1e293b',
    fontWeight: '500',
  },
  categoryDropdownArrow: {
    fontSize: 12,
    color: '#64748b',
  },
  categoryDropdownList: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryDropdownScroll: {
    maxHeight: 200,
  },
  categoryDropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  categoryDropdownItemActive: {
    backgroundColor: '#f0f4ff',
  },
  categoryDropdownItemText: {
    fontSize: 16,
    color: '#1e293b',
  },
  categoryDropdownItemTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  menuScrollView: {
    flex: 1,
  },
  menuScrollContent: {
    padding: responsivePadding(16),
    paddingBottom: responsivePadding(100),
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: responsivePadding(16),
    marginBottom: responsiveMargin(16),
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
    position: 'relative',
  },
  menuItemIcon: {
    width: menuIconSize,
    height: menuIconSize,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: responsiveMargin(12),
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuItemIconText: {
    fontSize: responsiveFontSize(32),
  },
  menuItemInfo: {
    flex: 1,
    marginBottom: responsiveMargin(12),
  },
  menuItemName: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: responsiveMargin(4),
  },
  menuItemDescription: {
    fontSize: responsiveFontSize(12),
    color: '#64748b',
    marginBottom: responsiveMargin(8),
    lineHeight: responsiveFontSize(16),
  },
  menuItemPrice: {
    fontSize: responsiveFontSize(18),
    fontWeight: '700',
    color: '#667eea',
  },
  addButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#ffffff',
    lineHeight: 28,
  },
  floatingCartButton: {
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cartIcon: {
    fontSize: 28,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  cartBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  cartContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  cartScrollView: {
    flex: 1,
  },
  cartScrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  cartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: responsivePadding(16),
    marginBottom: responsiveMargin(16),
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
  sectionLabel: {
    fontSize: responsiveFontSize(14),
    fontWeight: '600',
    color: '#334155',
    marginBottom: responsiveMargin(12),
  },
  orderTypeDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: responsivePadding(16),
    height: getInputHeight(),
  },
  orderTypeDropdownText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#64748b',
  },
  orderTypeDropdownList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderTypeDropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderTypeDropdownItemActive: {
    backgroundColor: '#f0f4ff',
  },
  orderTypeDropdownItemText: {
    fontSize: 16,
    color: '#1e293b',
  },
  orderTypeDropdownItemTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  cartInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: getInputHeight(),
    paddingHorizontal: responsivePadding(16),
    fontSize: responsiveFontSize(16),
    color: '#1e293b',
    marginBottom: responsiveMargin(12),
  },
  cartTextArea: {
    height: 80,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  paymentModeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentModeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  paymentModeButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  paymentModeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  paymentModeButtonTextActive: {
    color: '#ffffff',
  },
  creditSection: {
    marginTop: 12,
  },
  customerDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
  },
  customerDropdownText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  customerDropdownList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerDropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  customerDropdownItemActive: {
    backgroundColor: '#f0f4ff',
  },
  customerDropdownItemText: {
    fontSize: 16,
    color: '#1e293b',
  },
  customerDropdownItemTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  addCustomerButton: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#667eea',
    alignItems: 'center',
  },
  addCustomerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  emptyCartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyCartIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  cartItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cartItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cartItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#64748b',
  },
  cartItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#667eea',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    paddingHorizontal: 12,
    minWidth: 40,
    textAlign: 'center',
  },
  deleteItemButton: {
    padding: 8,
  },
  deleteItemButtonText: {
    fontSize: 20,
  },
  tableDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 48,
    marginTop: 8,
  },
  tableDropdownText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  tableDropdownList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableDropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableDropdownItemActive: {
    backgroundColor: '#f0f4ff',
  },
  tableDropdownItemText: {
    fontSize: 16,
    color: '#1e293b',
  },
  tableDropdownItemTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  tableDropdownItemBusy: {
    backgroundColor: '#fee2e2',
    opacity: 0.7,
  },
  tableDropdownItemTextBusy: {
    color: '#991b1b',
  },
  summaryCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryDiscount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  summaryTotalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#667eea',
  },
  cartActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: responsivePadding(16),
    borderRadius: 12,
    alignItems: 'center',
    minHeight: getButtonHeight(),
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quickBillButton: {
    backgroundColor: '#f59e0b',
  },
  placeOrderButton: {
    backgroundColor: '#667eea',
  },
  actionButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  actionButtonText: {
    fontSize: responsiveFontSize(16),
    fontWeight: '600',
    color: '#ffffff',
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
  modalScrollView: {
    maxHeight: 400,
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
  ordersContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  ordersScrollView: {
    flex: 1,
  },
  ordersScrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyOrdersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyOrdersIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyOrdersText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptyOrdersSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
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
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCardHeaderLeft: {
    flex: 1,
  },
  orderCardId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  orderCardTime: {
    fontSize: 12,
    color: '#64748b',
  },
  orderStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderCardBody: {
    marginBottom: 12,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDetailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  orderDetailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  orderDetailTotal: {
    fontSize: 18,
    color: '#667eea',
    fontWeight: '700',
  },
  orderStatusSelector: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statusSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  statusButtonActive: {
    borderColor: 'transparent',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statusButtonTextActive: {
    color: '#ffffff',
  },
  orderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  orderActionButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  viewOrderButton: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  continueOrderButton: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  printBillButton: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  cancelOrderButton: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  orderActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  viewOrderModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  viewOrderSection: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  viewOrderSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  viewOrderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  viewOrderDetailLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  viewOrderDetailValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  viewOrderItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  viewOrderItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  viewOrderItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  viewOrderItemInfo: {
    flex: 1,
  },
  viewOrderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  viewOrderItemPrice: {
    fontSize: 14,
    color: '#64748b',
  },
  viewOrderItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  emptyItemsText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    padding: 20,
  },
  viewOrderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  viewOrderTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  viewOrderTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
  },
  continuingOrderBanner: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  continuingOrderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    textAlign: 'center',
  },
});

export default BillingScreen;
