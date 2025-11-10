/**
 * ZaykaBill POS - Sync Service
 * Handles two-way synchronization between local SQLite and online database
 * 
 * ⚙️ SYNC WORKFLOW:
 * 
 * 1. Upload (Offline → Online):
 *    - Orders, Expenses, Menu, Tables, Customers, Credit Transactions
 *    - Only syncs records that haven't been synced yet (based on lastSyncTimestamp)
 * 
 * 2. Download (Online → Offline):
 *    - Fetches latest data from server
 *    - Updates local database with conflict resolution (latest timestamp wins)
 * 
 * 3. Conflict Resolution:
 *    - If both local and server have updated same record, latest timestamp wins
 *    - Local changes take precedence if created/updated after last sync
 */

import { apiService, ApiError } from './api';
import { authService } from './auth';
import {
  ordersService,
  expensesService,
  tablesService,
  menuCategoriesService,
  menuItemsService,
  customersService,
  creditTransactionsService,
  taxesService,
  additionalChargesService,
  paymentSettingsService,
  restaurantInfoService,
  restaurantSettingsService,
  Order,
  Expense,
  Table,
  MenuCategory,
  MenuItem,
  Customer,
  CreditTransaction,
  Tax,
  AdditionalCharge,
  PaymentSettings,
  RestaurantInfo,
} from './database-methods';
import { databaseService, getDatabase } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SYNC_KEY = '@zaykabill_last_sync';
const SYNC_LOG_KEY = '@zaykabill_sync_log';

interface SyncResult {
  success: boolean;
  message: string;
  uploaded: {
    orders: number;
    expenses: number;
    tables: number;
    menuCategories: number;
    menuItems: number;
    customers: number;
    creditTransactions: number;
    taxes: number;
    additionalCharges: number;
    paymentSettings: number;
    restaurantInfo: number;
  };
  downloaded: {
    orders: number;
    expenses: number;
    tables: number;
    menuCategories: number;
    menuItems: number;
    customers: number;
    creditTransactions: number;
    taxes: number;
    additionalCharges: number;
    paymentSettings: number;
    restaurantInfo: number;
  };
  errors?: string[];
}

interface SyncLogEntry {
  timestamp: string;
  success: boolean;
  message: string;
  details?: any;
}

class SyncService {
  /**
   * Perform two-way synchronization
   * Uploads local changes, then downloads latest from server
   */
  async syncAll(): Promise<SyncResult> {
    try {
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        throw new Error('Please login again');
      }

      const restaurantId = auth.restaurant.id;

      // Get last sync timestamp
      const lastSync = await this.getLastSyncTimestamp();

      // Step 1: Upload local changes (Offline → Online)
      const uploadResult = await this.uploadLocalChanges(restaurantId, lastSync);

      // Step 2: Download latest from server (Online → Offline)
      const downloadResult = await this.downloadServerData(restaurantId);

      // Update last sync timestamp
      await this.setLastSyncTimestamp(new Date().toISOString());

      // Log sync success
      await this.logSync({
        timestamp: new Date().toISOString(),
        success: true,
        message: 'Sync completed successfully',
        details: {
          uploaded: uploadResult,
          downloaded: downloadResult,
        },
      });

      return {
        success: true,
        message: 'Sync completed successfully',
        uploaded: uploadResult,
        downloaded: downloadResult,
      };
    } catch (error: any) {
      const errorMessage =
        error.message === 'Please connect to internet'
          ? 'No connection — unable to sync now'
          : error.message || 'Sync failed — Please try again later';

      // Log sync error
      await this.logSync({
        timestamp: new Date().toISOString(),
        success: false,
        message: errorMessage,
        details: { error: error.message },
      });

      return {
        success: false,
        message: errorMessage,
        uploaded: {
          orders: 0,
          expenses: 0,
          tables: 0,
          menuCategories: 0,
          menuItems: 0,
          customers: 0,
          creditTransactions: 0,
          taxes: 0,
          additionalCharges: 0,
          paymentSettings: 0,
          restaurantInfo: 0,
        },
        downloaded: {
          orders: 0,
          expenses: 0,
          tables: 0,
          menuCategories: 0,
          menuItems: 0,
          customers: 0,
          creditTransactions: 0,
          taxes: 0,
          additionalCharges: 0,
          paymentSettings: 0,
          restaurantInfo: 0,
        },
        errors: [errorMessage],
      };
    }
  }

  /**
   * Upload local changes to server
   * Only uploads records that haven't been synced yet
   */
  private async uploadLocalChanges(
    restaurantId: string,
    lastSyncTimestamp: string | null
  ): Promise<{
    orders: number;
    expenses: number;
    tables: number;
    menuCategories: number;
    menuItems: number;
    customers: number;
    creditTransactions: number;
    taxes: number;
    additionalCharges: number;
    paymentSettings: number;
    restaurantInfo: number;
  }> {
    const result = {
      orders: 0,
      expenses: 0,
      tables: 0,
      menuCategories: 0,
      menuItems: 0,
      customers: 0,
      creditTransactions: 0,
      taxes: 0,
      additionalCharges: 0,
      paymentSettings: 0,
      restaurantInfo: 0,
    };

    try {
      // Get all local data
      const [
        localOrders,
        localExpenses,
        localTables,
        localMenuCategories,
        localMenuItems,
        localCustomers,
        localTaxes,
        localAdditionalCharges,
        localPaymentSettings,
        localRestaurantInfo,
      ] = await Promise.all([
        ordersService.getAll(restaurantId), // ALL orders, including past orders
        expensesService.getAll(restaurantId),
        tablesService.getAll(restaurantId),
        menuCategoriesService.getAll(restaurantId),
        menuItemsService.getAll(restaurantId),
        customersService.getAll(restaurantId),
        taxesService.getAll(restaurantId),
        additionalChargesService.getAll(restaurantId),
        paymentSettingsService.get(restaurantId).then(s => s ? [s] : []), // Convert single item to array
        restaurantInfoService.get(restaurantId).then(s => s ? [s] : []), // Convert single item to array
      ]);

      // Log fetched data counts
      console.log(`[SYNC] Fetched local data counts:`);
      console.log(`  Orders: ${localOrders.length}`);
      console.log(`  Expenses: ${localExpenses.length}`);
      console.log(`  Tables: ${localTables.length}`);
      console.log(`  Menu Categories: ${localMenuCategories.length}`);
      console.log(`  Menu Items: ${localMenuItems.length}`);
      console.log(`  Customers: ${localCustomers.length}`);
      console.log(`  Taxes: ${localTaxes.length}`);
      console.log(`  Additional Charges: ${localAdditionalCharges.length}`);
      
      if (localOrders.length > 0) {
        console.log(`[SYNC] Sample order from database:`, {
          id: localOrders[0].id,
          orderNumber: localOrders[0].orderNumber,
          status: localOrders[0].status,
          paymentStatus: localOrders[0].paymentStatus,
          totalAmount: localOrders[0].totalAmount,
          createdAt: localOrders[0].createdAt,
          lastUpdated: localOrders[0].lastUpdated,
        });
      }

      // Filter: Only sync records created/updated after last sync
      const filterByLastSync = <T extends { createdAt: string; lastUpdated: string }>(
        records: T[]
      ): T[] => {
        if (!lastSyncTimestamp) {
          console.log(`First sync - uploading all ${records.length} records`);
          return records; // First sync, upload all
        }
        
        const lastSync = new Date(lastSyncTimestamp);
        const filtered = records.filter((record) => {
          try {
            const created = new Date(record.createdAt);
            const updated = new Date(record.lastUpdated);
            // Include if created or updated after last sync
            const shouldInclude = created > lastSync || updated > lastSync;
            return shouldInclude;
          } catch (error) {
            // If date parsing fails, include the record to be safe
            console.warn('Error parsing date for record:', record, error);
            return true;
          }
        });
        
        console.log(`Filtered ${filtered.length} of ${records.length} records (lastSync: ${lastSyncTimestamp})`);
        return filtered;
      };

      // Upload Orders - Sync ALL orders (including past orders) to ensure complete history
      // Don't filter by lastSyncTimestamp for orders - sync everything
      const ordersToSync = localOrders; // Always sync all orders
      console.log(`[SYNC] Preparing to upload orders: ${ordersToSync.length} orders (total: ${localOrders.length}, lastSync: ${lastSyncTimestamp || 'none'})`);
      console.log(`[SYNC] ordersToSync.length: ${ordersToSync.length}, localOrders.length: ${localOrders.length}`);
      
      if (ordersToSync && ordersToSync.length > 0) {
        console.log(`[SYNC] Uploading ${ordersToSync.length} orders...`);
        try {
          // Format orders for server (match server schema)
          const formattedOrders = ordersToSync.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerId: order.customerId || null,
            tableId: order.tableId || null,
            orderType: order.orderType || 'Counter',
            status: order.status || order.paymentStatus || 'PENDING',
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod || null,
            // Include all order fields for accurate sync
            subtotal: order.subtotal || order.totalAmount || 0,
            taxAmount: order.taxAmount || 0,
            discountAmount: order.discountAmount || 0,
            discountPercent: order.discountPercent || 0,
            totalAmount: order.totalAmount || 0,
            serviceCharge: 0, // Would need to calculate from items
            kotSequence: order.kotSequence || 1,
            isOpen: order.isOpen !== undefined ? order.isOpen : true,
            createdAt: order.createdAt,
            updatedAt: order.lastUpdated,
          }));
          
          console.log(`Formatted ${formattedOrders.length} orders for upload`);
          console.log('Sample order:', formattedOrders[0]);
          
          const response = await apiService.syncData(restaurantId, 'orders', formattedOrders);
          console.log('Orders sync response:', response);
          
          if (response.success) {
            result.orders = response.syncedRecords || 0;
            console.log(`Successfully synced ${result.orders} orders`);
          } else {
            console.error('Orders sync failed:', response.error || response.message);
            result.orders = 0;
          }
        } catch (error: any) {
          console.error('Error syncing orders:', error);
          console.error('Error details:', error.message, error.stack);
          result.orders = 0;
        }
      } else {
        console.log(`No orders to sync (${localOrders.length} total orders in database)`);
        if (localOrders.length > 0) {
          console.log('Sample order timestamps:', localOrders.slice(0, 2).map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt,
            lastUpdated: order.lastUpdated,
            status: order.status,
            paymentStatus: order.paymentStatus,
          })));
        }
      }

      // Upload Expenses - Sync ALL expenses (they're transactional data, need complete history)
      // Don't filter by lastSyncTimestamp for expenses - sync everything
      const expensesToSync = localExpenses; // Always sync all expenses
      console.log(`[SYNC] Uploading ${expensesToSync.length} expenses (${localExpenses.length} total, lastSync: ${lastSyncTimestamp || 'none'})`);
      if (expensesToSync && expensesToSync.length > 0) {
        try {
          const response = await apiService.syncData(restaurantId, 'expenses', expensesToSync);
          console.log('Expenses sync response:', response);
          if (response.success) {
            result.expenses = response.syncedRecords || 0;
            console.log(`Successfully synced ${result.expenses} expenses`);
          } else {
            console.error('Expenses sync failed:', response.error || response.message);
            result.expenses = 0;
          }
        } catch (error: any) {
          console.error('Error syncing expenses:', error);
          console.error('Error details:', error.message, error.stack);
          result.expenses = 0;
        }
      } else {
        console.log(`No expenses to sync (${localExpenses.length} total expenses in database)`);
      }

      // Upload Tables - Sync ALL tables (they're configuration data, not transactional)
      // Don't filter by lastSyncTimestamp for tables - sync everything to ensure server has them
      const tablesToSync = localTables; // Always sync all tables
      console.log(`[SYNC] Uploading ${tablesToSync.length} tables (${localTables.length} total, lastSync: ${lastSyncTimestamp || 'none'})`);
      if (tablesToSync && tablesToSync.length > 0) {
        try {
          const response = await apiService.syncData(restaurantId, 'tables', tablesToSync);
          result.tables = response.syncedRecords || 0;
        } catch (error) {
          console.error('Error syncing tables:', error);
        }
      }

      // Upload Menu Categories - Sync ALL categories (they're configuration data, not transactional)
      // Don't filter by lastSyncTimestamp for categories - sync everything to ensure server has them
      const categoriesToSync = localMenuCategories; // Always sync all categories
      console.log(`[SYNC] Uploading ${categoriesToSync.length} menu categories (${localMenuCategories.length} total, lastSync: ${lastSyncTimestamp || 'none'})`);
      if (categoriesToSync && categoriesToSync.length > 0) {
        try {
          const response = await apiService.syncData(restaurantId, 'menu_categories', categoriesToSync);
          result.menuCategories = response.syncedRecords || 0;
        } catch (error) {
          console.error('Error syncing menu categories:', error);
        }
      }

      // Upload Menu Items - Sync ALL menu items (they're configuration data, not transactional)
      // Don't filter by lastSyncTimestamp for menu items - sync everything to ensure server has them
      const itemsToSync = localMenuItems; // Always sync all menu items
      console.log(`[SYNC] Uploading ${itemsToSync.length} menu items (${localMenuItems.length} total, lastSync: ${lastSyncTimestamp || 'none'})`);
      if (itemsToSync && itemsToSync.length > 0) {
        try {
          // Format menu items for server (map icon to imageUrl)
          const formattedItems = itemsToSync.map(item => ({
            id: item.id,
            restaurantId: item.restaurantId,
            categoryId: item.categoryId,
            name: item.name,
            description: item.description || null,
            price: item.price,
            imageUrl: item.icon || item.imageUrl || null, // Map icon to imageUrl for server
            available: true, // Default to available
            createdAt: item.createdAt,
            updatedAt: item.lastUpdated,
          }));
          
          const response = await apiService.syncData(restaurantId, 'menu_items', formattedItems);
          console.log('Menu items sync response:', response);
          if (response.success) {
            result.menuItems = response.syncedRecords || 0;
            console.log(`Successfully synced ${result.menuItems} menu items`);
          } else {
            console.error('Menu items sync failed:', response.error || response.message);
            result.menuItems = 0;
          }
        } catch (error: any) {
          console.error('Error syncing menu items:', error);
          console.error('Error details:', error.message, error.stack);
          result.menuItems = 0;
        }
      } else {
        console.log(`No menu items to sync (filtered out ${localMenuItems.length - itemsToSync.length} items)`);
        if (localMenuItems.length > 0) {
          console.log('Sample menu item timestamps:', localMenuItems.slice(0, 2).map(item => ({
            id: item.id,
            createdAt: item.createdAt,
            lastUpdated: item.lastUpdated,
          })));
        }
      }

      // Upload Customers - Sync ALL customers (they're reference data, need complete list)
      // Don't filter by lastSyncTimestamp for customers - sync everything
      const customersToSync = localCustomers; // Always sync all customers
      console.log(`[SYNC] Uploading ${customersToSync.length} customers (${localCustomers.length} total, lastSync: ${lastSyncTimestamp || 'none'})`);
      if (customersToSync && customersToSync.length > 0) {
        try {
          const response = await apiService.syncData(restaurantId, 'customers', customersToSync);
          console.log('Customers sync response:', response);
          if (response.success) {
            result.customers = response.syncedRecords || 0;
            console.log(`Successfully synced ${result.customers} customers`);
          } else {
            console.error('Customers sync failed:', response.error || response.message);
            result.customers = 0;
          }
        } catch (error: any) {
          console.error('Error syncing customers:', error);
          console.error('Error details:', error.message, error.stack);
          result.customers = 0;
        }
      } else {
        console.log(`No customers to sync (${localCustomers.length} total customers in database)`);
      }

      // Upload Credit Transactions - Sync ALL credit transactions
      let allCreditTransactions: CreditTransaction[] = [];
      for (const customer of localCustomers) {
        const transactions = await creditTransactionsService.getAll(customer.id);
        allCreditTransactions = allCreditTransactions.concat(transactions);
      }
      // Don't filter by lastSyncTimestamp for credit transactions - sync everything
      const transactionsToSync = allCreditTransactions;
      console.log(`[SYNC] Uploading ${transactionsToSync.length} credit transactions (lastSync: ${lastSyncTimestamp || 'none'})`);
      if (transactionsToSync && transactionsToSync.length > 0) {
        try {
          const response = await apiService.syncData(restaurantId, 'credit_transactions', transactionsToSync);
          console.log('Credit transactions sync response:', response);
          if (response.success) {
            result.creditTransactions = response.syncedRecords || 0;
            console.log(`Successfully synced ${result.creditTransactions} credit transactions`);
          } else {
            console.error('Credit transactions sync failed:', response.error || response.message);
            result.creditTransactions = 0;
          }
        } catch (error: any) {
          console.error('Error syncing credit transactions:', error);
          console.error('Error details:', error.message, error.stack);
          result.creditTransactions = 0;
        }
      } else {
        console.log(`No credit transactions to sync`);
      }

      // Upload Taxes - Sync ALL taxes (they're configuration data, not transactional)
      // Don't filter by lastSyncTimestamp for taxes - sync everything to ensure server has them
      const taxesToSync = localTaxes; // Always sync all taxes
      console.log(`[SYNC] Uploading ${taxesToSync.length} taxes (${localTaxes.length} total, lastSync: ${lastSyncTimestamp || 'none'})`);
      if (taxesToSync && taxesToSync.length > 0) {
        try {
          // Format taxes for server
          const formattedTaxes = taxesToSync.map(tax => ({
            id: tax.id,
            restaurantId: tax.restaurantId,
            name: tax.name,
            percentage: tax.percentage,
            createdAt: tax.createdAt,
            updatedAt: tax.lastUpdated,
          }));
          
          const response = await apiService.syncData(restaurantId, 'taxes', formattedTaxes);
          console.log('Taxes sync response:', response);
          if (response.success) {
            result.taxes = response.syncedRecords || 0;
            console.log(`Successfully synced ${result.taxes} taxes`);
          } else {
            console.error('Taxes sync failed:', response.error || response.message);
            result.taxes = 0;
          }
        } catch (error: any) {
          console.error('Error syncing taxes:', error);
          console.error('Error details:', error.message, error.stack);
          result.taxes = 0;
        }
      } else {
        console.log(`No taxes to sync (filtered out ${localTaxes.length - taxesToSync.length} taxes)`);
        if (localTaxes.length > 0) {
          console.log('Sample tax timestamps:', localTaxes.slice(0, 2).map(tax => ({
            id: tax.id,
            createdAt: tax.createdAt,
            lastUpdated: tax.lastUpdated,
          })));
        }
      }

      // Upload Additional Charges
      const chargesToSync = filterByLastSync(localAdditionalCharges);
      if (chargesToSync.length > 0) {
        try {
          const response = await apiService.syncData(restaurantId, 'additional_charges', chargesToSync);
          result.additionalCharges = response.syncedRecords || 0;
        } catch (error) {
          console.error('Error syncing additional charges:', error);
        }
      }

      // Upload Payment Settings
      if (localPaymentSettings.length > 0) {
        try {
          const response = await apiService.syncData(restaurantId, 'payment_settings', localPaymentSettings);
          result.paymentSettings = response.syncedRecords || 0;
        } catch (error) {
          console.error('Error syncing payment settings:', error);
        }
      }

      // Upload Restaurant Info
      if (localRestaurantInfo.length > 0) {
        try {
          const response = await apiService.syncData(restaurantId, 'restaurant_info', localRestaurantInfo);
          result.restaurantInfo = response.syncedRecords || 0;
        } catch (error) {
          console.error('Error syncing restaurant info:', error);
        }
      }

      return result;
    } catch (error) {
      console.error('Error uploading local changes:', error);
      throw error;
    }
  }

  /**
   * Download latest data from server
   * Updates local database with conflict resolution
   */
  private async downloadServerData(restaurantId: string): Promise<{
    orders: number;
    expenses: number;
    tables: number;
    menuCategories: number;
    menuItems: number;
    customers: number;
    creditTransactions: number;
    taxes: number;
    additionalCharges: number;
    paymentSettings: number;
    restaurantInfo: number;
  }> {
    const result = {
      orders: 0,
      expenses: 0,
      tables: 0,
      menuCategories: 0,
      menuItems: 0,
      customers: 0,
      creditTransactions: 0,
      taxes: 0,
      additionalCharges: 0,
      paymentSettings: 0,
      restaurantInfo: 0,
    };

    try {
      // Download all data types from server
      // Use Promise.allSettled to continue even if some requests fail
      const [
        serverTablesResult,
        serverMenuCategoriesResult,
        serverMenuItemsResult,
        serverOrdersResult,
        serverCustomersResult,
        serverExpensesResult,
        serverTaxesResult,
        serverAdditionalChargesResult,
        serverPaymentSettingsResult,
        serverRestaurantInfoResult,
        serverRestaurantDataResult,
      ] = await Promise.allSettled([
        apiService.syncGetData(restaurantId, 'tables'),
        apiService.syncGetData(restaurantId, 'menu_categories'),
        apiService.syncGetData(restaurantId, 'menu_items'),
        apiService.syncGetData(restaurantId, 'orders'), // ALL orders, including past orders
        apiService.syncGetData(restaurantId, 'customers'),
        apiService.syncGetData(restaurantId, 'expenses'),
        apiService.syncGetData(restaurantId, 'taxes'),
        apiService.syncGetData(restaurantId, 'additional_charges'),
        apiService.syncGetData(restaurantId, 'payment_settings'),
        apiService.syncGetData(restaurantId, 'restaurant_info'),
        apiService.getRestaurantData(restaurantId), // Get restaurant data with settings
      ]);

      // Extract results from Promise.allSettled
      const serverTables = serverTablesResult.status === 'fulfilled' ? serverTablesResult.value : { success: false, error: 'Failed to fetch tables' };
      const serverMenuCategories = serverMenuCategoriesResult.status === 'fulfilled' ? serverMenuCategoriesResult.value : { success: false, error: 'Failed to fetch menu categories' };
      const serverMenuItems = serverMenuItemsResult.status === 'fulfilled' ? serverMenuItemsResult.value : { success: false, error: 'Failed to fetch menu items' };
      const serverOrders = serverOrdersResult.status === 'fulfilled' ? serverOrdersResult.value : { success: false, error: 'Failed to fetch orders' };
      const serverCustomers = serverCustomersResult.status === 'fulfilled' ? serverCustomersResult.value : { success: false, error: 'Failed to fetch customers' };
      const serverExpenses = serverExpensesResult.status === 'fulfilled' ? serverExpensesResult.value : { success: false, error: 'Failed to fetch expenses' };
      const serverTaxes = serverTaxesResult.status === 'fulfilled' ? serverTaxesResult.value : { success: false, error: 'Failed to fetch taxes' };
      const serverAdditionalCharges = serverAdditionalChargesResult.status === 'fulfilled' ? serverAdditionalChargesResult.value : { success: false, error: 'Failed to fetch additional charges' };
      const serverPaymentSettings = serverPaymentSettingsResult.status === 'fulfilled' ? serverPaymentSettingsResult.value : { success: false, error: 'Failed to fetch payment settings' };
      const serverRestaurantInfo = serverRestaurantInfoResult.status === 'fulfilled' ? serverRestaurantInfoResult.value : { success: false, error: 'Failed to fetch restaurant info' };
      const serverRestaurantData = serverRestaurantDataResult.status === 'fulfilled' ? serverRestaurantDataResult.value : { success: false, error: 'Failed to fetch restaurant data' };

      // Log errors for debugging
      if (!serverTables.success) console.error('Failed to fetch tables:', serverTables.error);
      if (!serverMenuCategories.success) console.error('Failed to fetch menu categories:', serverMenuCategories.error);
      if (!serverMenuItems.success) console.error('Failed to fetch menu items:', serverMenuItems.error);
      if (!serverOrders.success) console.error('Failed to fetch orders:', serverOrders.error);
      if (!serverCustomers.success) console.error('Failed to fetch customers:', serverCustomers.error);
      if (!serverExpenses.success) console.error('Failed to fetch expenses:', serverExpenses.error);
      if (!serverTaxes.success) console.error('Failed to fetch taxes:', serverTaxes.error);
      if (!serverAdditionalCharges.success) console.error('Failed to fetch additional charges:', serverAdditionalCharges.error);
      if (!serverPaymentSettings.success) console.error('Failed to fetch payment settings:', serverPaymentSettings.error);
      if (!serverRestaurantInfo.success) console.error('Failed to fetch restaurant info:', serverRestaurantInfo.error);
      if (!serverRestaurantData.success) console.error('Failed to fetch restaurant data:', serverRestaurantData.error);

      // Get local data for conflict resolution
      const [
        localTables,
        localMenuCategories,
        localMenuItems,
        localOrders,
        localCustomers,
        localExpenses,
        localTaxes,
        localAdditionalCharges,
      ] = await Promise.all([
        tablesService.getAll(restaurantId),
        menuCategoriesService.getAll(restaurantId),
        menuItemsService.getAll(restaurantId),
        ordersService.getAll(restaurantId),
        customersService.getAll(restaurantId),
        expensesService.getAll(restaurantId),
        taxesService.getAll(restaurantId),
        additionalChargesService.getAll(restaurantId),
      ]);

      // Sync Tables with conflict resolution
      if (serverTables.success && serverTables.data) {
        if (Array.isArray(serverTables.data) && serverTables.data.length > 0) {
          console.log(`Syncing ${serverTables.data.length} tables from server`);
          result.tables = await this.syncWithConflictResolution(
            serverTables.data,
            localTables,
            'tables',
            restaurantId
          );
          console.log(`Successfully synced ${result.tables} tables`);
        } else {
          console.log('No tables to sync from server (empty array)');
        }
      } else {
        console.error('Failed to fetch tables from server:', serverTables.error || 'Unknown error');
      }
      // Note: Empty data is normal for new restaurants, no warning needed

      // Sync Menu Categories
      if (serverMenuCategories.success && serverMenuCategories.data && Array.isArray(serverMenuCategories.data) && serverMenuCategories.data.length > 0) {
        console.log(`Syncing ${serverMenuCategories.data.length} menu categories from server`);
        result.menuCategories = await this.syncWithConflictResolution(
          serverMenuCategories.data,
          localMenuCategories,
          'menu_categories',
          restaurantId
        );
      }
      // Note: Empty data is normal for new restaurants, no warning needed

      // Sync Menu Items
      if (serverMenuItems.success && serverMenuItems.data) {
        if (Array.isArray(serverMenuItems.data) && serverMenuItems.data.length > 0) {
          console.log(`Syncing ${serverMenuItems.data.length} menu items from server`);
          console.log('Sample menu item from server:', serverMenuItems.data[0]);
          result.menuItems = await this.syncWithConflictResolution(
            serverMenuItems.data,
            localMenuItems,
            'menu_items',
            restaurantId
          );
          console.log(`Successfully synced ${result.menuItems} menu items`);
        } else {
          console.log('No menu items to sync from server (empty array)');
        }
      } else {
        console.error('Failed to fetch menu items from server:', serverMenuItems.error || 'Unknown error');
        console.error('Server menu items response:', serverMenuItems);
      }
      // Note: Empty data is normal for new restaurants, no warning needed

      // Sync Orders
      if (serverOrders.success && serverOrders.data && Array.isArray(serverOrders.data) && serverOrders.data.length > 0) {
        console.log(`Syncing ${serverOrders.data.length} orders from server`);
        result.orders = await this.syncWithConflictResolution(
          serverOrders.data,
          localOrders,
          'orders',
          restaurantId
        );
      }
      // Note: Empty data is normal for new restaurants, no warning needed

      // Sync Customers
      if (serverCustomers.success && serverCustomers.data && Array.isArray(serverCustomers.data) && serverCustomers.data.length > 0) {
        console.log(`Syncing ${serverCustomers.data.length} customers from server`);
        result.customers = await this.syncWithConflictResolution(
          serverCustomers.data,
          localCustomers,
          'customers',
          restaurantId
        );
      }
      // Note: Empty data is normal for new restaurants, no warning needed

      // Sync Expenses
      if (serverExpenses.success && serverExpenses.data && Array.isArray(serverExpenses.data) && serverExpenses.data.length > 0) {
        console.log(`Syncing ${serverExpenses.data.length} expenses from server`);
        result.expenses = await this.syncWithConflictResolution(
          serverExpenses.data,
          localExpenses,
          'expenses',
          restaurantId
        );
      }
      // Note: Empty data is normal for new restaurants, no warning needed

      // Sync Taxes
      if (serverTaxes.success && serverTaxes.data && Array.isArray(serverTaxes.data) && serverTaxes.data.length > 0) {
        console.log(`Syncing ${serverTaxes.data.length} taxes from server`);
        result.taxes = await this.syncWithConflictResolution(
          serverTaxes.data,
          localTaxes,
          'taxes',
          restaurantId
        );
      }
      // Note: Empty data is normal for new restaurants, no warning needed

      // Sync Additional Charges
      if (serverAdditionalCharges.success && serverAdditionalCharges.data && Array.isArray(serverAdditionalCharges.data) && serverAdditionalCharges.data.length > 0) {
        console.log(`Syncing ${serverAdditionalCharges.data.length} additional charges from server`);
        result.additionalCharges = await this.syncWithConflictResolution(
          serverAdditionalCharges.data,
          localAdditionalCharges,
          'additional_charges',
          restaurantId
        );
      }
      // Note: Empty data is normal for new restaurants, no warning needed

      // Sync Payment Settings
      if (serverPaymentSettings.success && serverPaymentSettings.data) {
        if (Array.isArray(serverPaymentSettings.data) && serverPaymentSettings.data.length > 0) {
          const serverPaymentSetting = serverPaymentSettings.data[0]; // Payment settings is a single record
          await this.saveToLocal(serverPaymentSetting, 'payment_settings', restaurantId);
          result.paymentSettings = 1;
          console.log('Synced payment settings from server');
        } else if (typeof serverPaymentSettings.data === 'object' && serverPaymentSettings.data !== null) {
          // Handle case where data is returned as object instead of array
          await this.saveToLocal(serverPaymentSettings.data, 'payment_settings', restaurantId);
          result.paymentSettings = 1;
          console.log('Synced payment settings from server (object format)');
        }
        // Note: Empty payment settings is normal, no warning needed
      }
      // Note: Payment settings failure is already logged above, no duplicate warning needed

      // Sync Restaurant Info
      if (serverRestaurantInfo.success && serverRestaurantInfo.data) {
        if (Array.isArray(serverRestaurantInfo.data) && serverRestaurantInfo.data.length > 0) {
          const serverInfo = serverRestaurantInfo.data[0]; // Restaurant info is a single record
          await this.saveToLocal(serverInfo, 'restaurant_info', restaurantId);
          result.restaurantInfo = 1;
          console.log('Synced restaurant info from server');
        } else if (typeof serverRestaurantInfo.data === 'object' && serverRestaurantInfo.data !== null) {
          // Handle case where data is returned as object instead of array
          await this.saveToLocal(serverRestaurantInfo.data, 'restaurant_info', restaurantId);
          result.restaurantInfo = 1;
          console.log('Synced restaurant info from server (object format)');
        }
        // Note: Empty restaurant info is normal, no warning needed
      }
      // Note: Restaurant info failure is already logged above, no duplicate warning needed

      // Sync Restaurant Settings (Go Online settings)
      if (serverRestaurantData.success && serverRestaurantData.restaurant) {
        const settings = serverRestaurantData.restaurant.settings || {};
        if (settings.subdomain || settings.bannerImage || settings.restaurantImages || settings.tagline || settings.aboutUs || settings.socialMedia) {
          try {
            await restaurantSettingsService.save(restaurantId, {
              subdomain: settings.subdomain,
              bannerImage: settings.bannerImage,
              restaurantImages: settings.restaurantImages,
              tagline: settings.tagline,
              aboutUs: settings.aboutUs,
              socialMedia: settings.socialMedia,
            });
            console.log('Synced restaurant settings (Go Online) from server');
          } catch (error) {
            console.error('Error syncing restaurant settings:', error);
          }
        }
      }

      // Note: Credit Transactions sync would require fetching from server with customer IDs
      // For now, credit transactions are synced via customer sync

      return result;
    } catch (error) {
      console.error('Error downloading server data:', error);
      throw error;
    }
  }

  /**
   * Sync data with conflict resolution (latest timestamp wins)
   */
  private async syncWithConflictResolution<T extends { id: string; lastUpdated?: string; updatedAt?: string }>(
    serverData: T[],
    localData: T[],
    dataType: string,
    restaurantId: string
  ): Promise<number> {
    let syncedCount = 0;

    console.log(`Conflict resolution for ${dataType}: ${serverData.length} server items, ${localData.length} local items`);

    for (const serverItem of serverData) {
      try {
        const localItem = localData.find((item) => item.id === serverItem.id);

        // Conflict resolution: Latest timestamp wins
        const serverTimestamp = serverItem.lastUpdated || serverItem.updatedAt || '';
        const localTimestamp = localItem?.lastUpdated || localItem?.updatedAt || '';

        if (!localItem) {
          // New item from server, add to local
          console.log(`Adding new ${dataType} item: ${serverItem.id}`);
          await this.saveToLocal(serverItem, dataType, restaurantId);
          syncedCount++;
        } else if (!serverTimestamp || !localTimestamp) {
          // If timestamps are missing, update to ensure consistency
          console.log(`Updating ${dataType} item (missing timestamps): ${serverItem.id}`);
          await this.saveToLocal(serverItem, dataType, restaurantId);
          syncedCount++;
        } else {
          const serverDate = new Date(serverTimestamp);
          const localDate = new Date(localTimestamp);
          
          if (isNaN(serverDate.getTime()) || isNaN(localDate.getTime())) {
            // Invalid dates, update to ensure consistency
            console.log(`Updating ${dataType} item (invalid dates): ${serverItem.id}`);
            await this.saveToLocal(serverItem, dataType, restaurantId);
            syncedCount++;
          } else if (serverDate > localDate) {
            // Server version is newer, update local
            console.log(`Updating ${dataType} item (server newer): ${serverItem.id}`);
            await this.saveToLocal(serverItem, dataType, restaurantId);
            syncedCount++;
          } else if (localDate > serverDate) {
            // Local version is newer, keep local (already in local DB)
            console.log(`Keeping local ${dataType} item (local newer): ${serverItem.id}`);
            // Do nothing, local version takes precedence
          } else {
            // Same timestamp, update to ensure consistency
            console.log(`Updating ${dataType} item (same timestamp): ${serverItem.id}`);
            await this.saveToLocal(serverItem, dataType, restaurantId);
            syncedCount++;
          }
        }
      } catch (error) {
        console.error(`Error syncing ${dataType} item ${serverItem.id}:`, error);
        // Continue with other items even if one fails
      }
    }

    return syncedCount;
  }

  /**
   * Save item to local database based on type
   * Uses INSERT OR REPLACE to handle both new and existing records
   */
  private async saveToLocal(item: any, dataType: string, restaurantId: string): Promise<void> {
    try {
      switch (dataType) {
        case 'tables': {
          try {
            console.log(`Saving table: ${item.id}, name: ${item.name || item.number}`);
            // Check if table exists, update if yes, add if no
            const existingTables = await tablesService.getAll(restaurantId);
            const exists = existingTables.find((t) => t.id === item.id);
            if (exists) {
              console.log(`Updating existing table: ${item.id}`);
              await tablesService.update(item.id, item.name || `Table ${item.number}`, item.capacity || 4);
            } else {
              console.log(`Adding new table: ${item.id}`);
              // Use existing ID from server to maintain consistency
              await databaseService.initialize();
              const db = getDatabase();
              if (!db) throw new Error('Database not initialized');
              const now = new Date().toISOString();
              const query = `
                INSERT OR REPLACE INTO tables (id, restaurantId, name, capacity, createdAt, lastUpdated)
                VALUES (?, ?, ?, ?, ?, ?);
              `;
              db.execute(query, [
                item.id,
                restaurantId,
                item.name || `Table ${item.number}`,
                item.capacity || 4,
                item.createdAt || now,
                item.updatedAt || item.lastUpdated || now,
              ]);
              console.log(`Successfully saved table: ${item.id}`);
            }
          } catch (error) {
            console.error(`Error saving table ${item.id}:`, error);
            console.error('Table data:', item);
            throw error; // Re-throw to be caught by outer try-catch
          }
          break;
        }
        case 'menu_categories': {
          const existingCategories = await menuCategoriesService.getAll(restaurantId);
          const exists = existingCategories.find((c) => c.id === item.id);
          if (exists) {
            await menuCategoriesService.update(item.id, item.name, item.description);
          } else {
            await databaseService.initialize();
            const db = getDatabase();
            if (!db) throw new Error('Database not initialized');
            const now = new Date().toISOString();
            const query = `
              INSERT OR REPLACE INTO menu_categories (id, restaurantId, name, description, createdAt, lastUpdated)
              VALUES (?, ?, ?, ?, ?, ?);
            `;
            db.execute(query, [
              item.id,
              restaurantId,
              item.name,
              item.description || null,
              item.createdAt || now,
              item.updatedAt || item.lastUpdated || now,
            ]);
          }
          break;
        }
        case 'menu_items': {
          try {
            console.log(`Saving menu item: ${item.id}, name: ${item.name}, categoryId: ${item.categoryId}, price: ${item.price}`);
            const existingItems = await menuItemsService.getAll(restaurantId);
            const exists = existingItems.find((i) => i.id === item.id);
            
            if (exists) {
              console.log(`Updating existing menu item: ${item.id}`);
              await menuItemsService.update(
                item.id,
                item.name,
                typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                item.categoryId,
                item.description,
                item.icon || item.imageUrl
              );
            } else {
              console.log(`Adding new menu item: ${item.id}`);
              await databaseService.initialize();
              const db = getDatabase();
              if (!db) throw new Error('Database not initialized');
              const now = new Date().toISOString();
              
              // Ensure categoryId exists
              if (!item.categoryId) {
                console.error(`Menu item ${item.id} missing categoryId, skipping`);
                break;
              }
              
              const query = `
                INSERT OR REPLACE INTO menu_items (id, restaurantId, categoryId, name, description, price, icon, createdAt, lastUpdated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
              `;
              db.execute(query, [
                item.id,
                restaurantId,
                item.categoryId,
                item.name,
                item.description || null,
                typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                item.icon || item.imageUrl || null,
                item.createdAt || now,
                item.updatedAt || item.lastUpdated || now,
              ]);
              console.log(`Successfully saved menu item: ${item.id}`);
            }
          } catch (error) {
            console.error(`Error saving menu item ${item.id}:`, error);
            console.error('Menu item data:', item);
            throw error; // Re-throw to be caught by outer try-catch
          }
          break;
        }
        case 'customers': {
          // Parse creditBalance similar to other numeric fields (handles Decimal types from Prisma)
          const creditBalance = typeof item.creditBalance === 'object' 
            ? parseFloat(item.creditBalance.toString()) 
            : (typeof item.creditBalance === 'number' 
              ? item.creditBalance 
              : parseFloat(item.creditBalance) || 0);
          
          console.log(`Saving customer: ${item.name}, creditBalance: ${creditBalance} (original: ${JSON.stringify(item.creditBalance)})`);
          
          await customersService.save({
            id: item.id,
            restaurantId,
            name: item.name,
            mobile: item.mobile || '',
            address: item.address,
            creditBalance: creditBalance,
          });
          break;
        }
        case 'expenses': {
          await expensesService.save({
            id: item.id,
            restaurantId,
            category: item.category,
            amount: typeof item.amount === 'object' ? parseFloat(item.amount.toString()) : item.amount || 0,
            description: item.description,
            date: item.date instanceof Date ? item.date.toISOString().split('T')[0] : item.date || new Date().toISOString().split('T')[0],
            vendorName: item.vendorName,
          });
          break;
        }
        case 'orders': {
          // Orders sync with new schema including all fields
          await databaseService.initialize();
          const db = getDatabase();
          if (!db) throw new Error('Database not initialized');
          const now = new Date().toISOString();
          
          // Map server order data to Android schema
          const orderType = item.orderType || 'Counter';
          const status = item.status || item.paymentStatus || 'PENDING';
          const subtotal = typeof item.subtotal === 'object' ? parseFloat(item.subtotal.toString()) : (item.subtotal || 0);
          const taxAmount = typeof item.taxAmount === 'object' ? parseFloat(item.taxAmount.toString()) : (item.taxAmount || 0);
          const discountAmount = typeof item.discountAmount === 'object' ? parseFloat(item.discountAmount.toString()) : (item.discountAmount || 0);
          const discountPercent = typeof item.discountPercent === 'object' ? parseFloat(item.discountPercent.toString()) : (item.discountPercent || 0);
          const totalAmount = typeof item.totalAmount === 'object' ? parseFloat(item.totalAmount.toString()) : (item.totalAmount || 0);
          const kotSequence = item.kotSequence || item.kotNumber || 1;
          const isOpen = item.isOpen !== undefined ? (item.isOpen ? 1 : 0) : (status === 'SERVED' || status === 'CANCELLED' ? 0 : 1);
          
          const query = `
            INSERT OR REPLACE INTO orders (
              id, restaurantId, orderNumber, customerId, tableId, orderType, status,
              subtotal, taxAmount, discountAmount, discountPercent, totalAmount,
              paymentStatus, paymentMethod, kotSequence, isOpen, createdAt, lastUpdated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `;
          db.execute(query, [
            item.id,
            restaurantId,
            item.orderNumber,
            item.customerId || null,
            item.tableId || null,
            orderType,
            status,
            subtotal,
            taxAmount,
            discountAmount,
            discountPercent,
            totalAmount,
            item.paymentStatus || item.status || 'PENDING',
            item.paymentMethod || null,
            kotSequence,
            isOpen,
            item.createdAt || now,
            item.updatedAt || item.lastUpdated || now,
          ]);
          break;
        }
        case 'taxes': {
          const existingTaxes = await taxesService.getAll(restaurantId);
          const exists = existingTaxes.find((t) => t.id === item.id);
          if (exists) {
            await taxesService.update(item.id, item.name, item.percentage);
          } else {
            await databaseService.initialize();
            const db = getDatabase();
            if (!db) throw new Error('Database not initialized');
            const now = new Date().toISOString();
            const query = `
              INSERT OR REPLACE INTO taxes (id, restaurantId, name, percentage, createdAt, lastUpdated)
              VALUES (?, ?, ?, ?, ?, ?);
            `;
            db.execute(query, [
              item.id,
              restaurantId,
              item.name,
              item.percentage || 0,
              item.createdAt || now,
              item.updatedAt || item.lastUpdated || now,
            ]);
          }
          break;
        }
        case 'additional_charges': {
          const existingCharges = await additionalChargesService.getAll(restaurantId);
          const exists = existingCharges.find((c) => c.id === item.id);
          if (exists) {
            await additionalChargesService.update(item.id, item.name, item.percentage);
          } else {
            await databaseService.initialize();
            const db = getDatabase();
            if (!db) throw new Error('Database not initialized');
            const now = new Date().toISOString();
            const query = `
              INSERT OR REPLACE INTO additional_charges (id, restaurantId, name, percentage, createdAt, lastUpdated)
              VALUES (?, ?, ?, ?, ?, ?);
            `;
            db.execute(query, [
              item.id,
              restaurantId,
              item.name,
              item.percentage || 0,
              item.createdAt || now,
              item.updatedAt || item.lastUpdated || now,
            ]);
          }
          break;
        }
        case 'payment_settings': {
          await paymentSettingsService.save(
            restaurantId,
            item.deliveryChargeAmount || 0,
            item.upiId
          );
          break;
        }
        case 'restaurant_info': {
          await restaurantInfoService.save(
            restaurantId,
            item.name || '',
            item.gstNumber,
            item.fssaiNumber
          );
          break;
        }
        default:
          console.warn(`Unknown data type for sync: ${dataType}`);
      }
    } catch (error) {
      console.error(`Error saving ${dataType} to local:`, error);
      // Continue with other items even if one fails
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTimestamp(): Promise<string | null> {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return timestamp;
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }

  /**
   * Set last sync timestamp
   */
  async setLastSyncTimestamp(timestamp: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_SYNC_KEY, timestamp);
    } catch (error) {
      console.error('Error setting last sync timestamp:', error);
    }
  }

  /**
   * Log sync operation
   */
  async logSync(logEntry: SyncLogEntry): Promise<void> {
    try {
      const existingLogs = await AsyncStorage.getItem(SYNC_LOG_KEY);
      const logs: SyncLogEntry[] = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(logEntry);
      // Keep only last 50 sync logs
      const recentLogs = logs.slice(-50);
      await AsyncStorage.setItem(SYNC_LOG_KEY, JSON.stringify(recentLogs));
    } catch (error) {
      console.error('Error logging sync:', error);
    }
  }

  /**
   * Get sync logs (for debugging)
   */
  async getSyncLogs(): Promise<SyncLogEntry[]> {
    try {
      const logs = await AsyncStorage.getItem(SYNC_LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Error getting sync logs:', error);
      return [];
    }
  }

  /**
   * Clear sync logs
   */
  async clearSyncLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_LOG_KEY);
    } catch (error) {
      console.error('Error clearing sync logs:', error);
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();

