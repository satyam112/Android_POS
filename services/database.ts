/**
 * ZaykaBill POS - SQLite Database Service
 * Handles local storage of restaurant data for offline access
 */

import { open } from 'react-native-quick-sqlite';

const DATABASE_NAME = 'ZaykaBill.db';
const TABLE_NAME = 'restaurant_data';
const PIN_VERIFIED_TABLE = 'pin_verification';
const RESTAURANT_INFO_TABLE = 'restaurant_info';
const TABLES_TABLE = 'tables';
const MENU_CATEGORIES_TABLE = 'menu_categories';
const MENU_ITEMS_TABLE = 'menu_items';
const TAXES_TABLE = 'taxes';
const ADDITIONAL_CHARGES_TABLE = 'additional_charges';
const PAYMENT_SETTINGS_TABLE = 'payment_settings';
const EXPENSES_TABLE = 'expenses';
const ORDERS_TABLE = 'orders';
const ORDER_ITEMS_TABLE = 'order_items';
const CUSTOMERS_TABLE = 'customers';
const CREDIT_TRANSACTIONS_TABLE = 'credit_transactions';
const NOTIFICATIONS_TABLE = 'notifications';
const RESTAURANT_SETTINGS_TABLE = 'restaurant_settings';

interface RestaurantData {
  id: string;
  name: string;
  logoUrl: string | null;
  lastUpdated: string;
}

let db: any = null;

// Export db getter for use in other services
export const getDatabase = () => db;

class DatabaseService {
  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    try {
      if (!db) {
        db = open({ name: DATABASE_NAME });
        await this.createTable();
      }
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Create the restaurant_data table
   */
  private async createTable(): Promise<void> {
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Create restaurant_data table
    const restaurantDataQuery = `
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        logoUrl TEXT,
        lastUpdated TEXT NOT NULL
      );
    `;

    db.execute(restaurantDataQuery);

    // Create pin_verification table to track PIN verification status
    const pinVerificationQuery = `
      CREATE TABLE IF NOT EXISTS ${PIN_VERIFIED_TABLE} (
        restaurantId TEXT PRIMARY KEY,
        isVerified INTEGER NOT NULL DEFAULT 0,
        verifiedAt TEXT NOT NULL,
        lastVerified TEXT NOT NULL
      );
    `;

    db.execute(pinVerificationQuery);

    // Create restaurant_info table
    const restaurantInfoQuery = `
      CREATE TABLE IF NOT EXISTS ${RESTAURANT_INFO_TABLE} (
        restaurantId TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gstNumber TEXT,
        fssaiNumber TEXT,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id)
      );
    `;
    db.execute(restaurantInfoQuery);

    // Create tables table
    const tablesQuery = `
      CREATE TABLE IF NOT EXISTS ${TABLES_TABLE} (
        id TEXT PRIMARY KEY,
        restaurantId TEXT NOT NULL,
        name TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        status TEXT DEFAULT 'available',
        createdAt TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id)
      );
    `;
    db.execute(tablesQuery);
    
    // Add status column if it doesn't exist (migration for existing databases)
    try {
      db.execute(`ALTER TABLE ${TABLES_TABLE} ADD COLUMN status TEXT DEFAULT 'available';`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Create menu_categories table
    const menuCategoriesQuery = `
      CREATE TABLE IF NOT EXISTS ${MENU_CATEGORIES_TABLE} (
        id TEXT PRIMARY KEY,
        restaurantId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        createdAt TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id)
      );
    `;
    db.execute(menuCategoriesQuery);

    // Create menu_items table
    const menuItemsQuery = `
      CREATE TABLE IF NOT EXISTS ${MENU_ITEMS_TABLE} (
        id TEXT PRIMARY KEY,
        restaurantId TEXT NOT NULL,
        categoryId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        icon TEXT,
        createdAt TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id),
        FOREIGN KEY (categoryId) REFERENCES ${MENU_CATEGORIES_TABLE}(id)
      );
    `;
    db.execute(menuItemsQuery);

    // Create taxes table
    const taxesQuery = `
      CREATE TABLE IF NOT EXISTS ${TAXES_TABLE} (
        id TEXT PRIMARY KEY,
        restaurantId TEXT NOT NULL,
        name TEXT NOT NULL,
        percentage REAL NOT NULL,
        createdAt TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id)
      );
    `;
    db.execute(taxesQuery);

    // Create additional_charges table
    const additionalChargesQuery = `
      CREATE TABLE IF NOT EXISTS ${ADDITIONAL_CHARGES_TABLE} (
        id TEXT PRIMARY KEY,
        restaurantId TEXT NOT NULL,
        name TEXT NOT NULL,
        percentage REAL NOT NULL,
        createdAt TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id)
      );
    `;
    db.execute(additionalChargesQuery);

    // Create payment_settings table
    const paymentSettingsQuery = `
      CREATE TABLE IF NOT EXISTS ${PAYMENT_SETTINGS_TABLE} (
        restaurantId TEXT PRIMARY KEY,
        deliveryChargeAmount REAL DEFAULT 0,
        upiId TEXT,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id)
      );
    `;
    db.execute(paymentSettingsQuery);

    // Create expenses table
    const expensesQuery = `
      CREATE TABLE IF NOT EXISTS ${EXPENSES_TABLE} (
        id TEXT PRIMARY KEY,
        restaurantId TEXT NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        vendorName TEXT,
        createdAt TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id)
      );
    `;
    db.execute(expensesQuery);

    // Create orders table
    const ordersQuery = `
      CREATE TABLE IF NOT EXISTS ${ORDERS_TABLE} (
        id TEXT PRIMARY KEY,
        restaurantId TEXT NOT NULL,
        orderNumber TEXT NOT NULL,
        customerId TEXT,
        tableId TEXT,
        orderType TEXT NOT NULL DEFAULT 'Counter',
        status TEXT NOT NULL DEFAULT 'PENDING',
        subtotal REAL NOT NULL DEFAULT 0,
        taxAmount REAL NOT NULL DEFAULT 0,
        discountAmount REAL NOT NULL DEFAULT 0,
        discountPercent REAL NOT NULL DEFAULT 0,
        totalAmount REAL NOT NULL,
        paymentStatus TEXT NOT NULL DEFAULT 'PENDING',
        paymentMethod TEXT,
        kotSequence INTEGER NOT NULL DEFAULT 1,
        isOpen INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id),
        FOREIGN KEY (customerId) REFERENCES ${CUSTOMERS_TABLE}(id),
        FOREIGN KEY (tableId) REFERENCES ${TABLES_TABLE}(id)
      );
    `;
    db.execute(ordersQuery);

    // Create order_items table
    const orderItemsQuery = `
      CREATE TABLE IF NOT EXISTS ${ORDER_ITEMS_TABLE} (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        menuItemId TEXT NOT NULL,
        itemName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unitPrice REAL NOT NULL,
        totalPrice REAL NOT NULL,
        kotNumber INTEGER NOT NULL DEFAULT 1,
        specialInstructions TEXT,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (orderId) REFERENCES ${ORDERS_TABLE}(id),
        FOREIGN KEY (menuItemId) REFERENCES ${MENU_ITEMS_TABLE}(id)
      );
    `;
    db.execute(orderItemsQuery);

    // Create customers table
    const customersQuery = `
      CREATE TABLE IF NOT EXISTS ${CUSTOMERS_TABLE} (
        id TEXT PRIMARY KEY,
        restaurantId TEXT NOT NULL,
        name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        address TEXT,
        creditBalance REAL NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id)
      );
    `;
    db.execute(customersQuery);

    // Create credit_transactions table
    const creditTransactionsQuery = `
      CREATE TABLE IF NOT EXISTS ${CREDIT_TRANSACTIONS_TABLE} (
        id TEXT PRIMARY KEY,
        customerId TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        balanceAfter REAL NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (customerId) REFERENCES ${CUSTOMERS_TABLE}(id)
      );
    `;
    db.execute(creditTransactionsQuery);

    // Create notifications table
    const notificationsQuery = `
      CREATE TABLE IF NOT EXISTS ${NOTIFICATIONS_TABLE} (
        id TEXT PRIMARY KEY,
        restaurantId TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        isRead INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id)
      );
    `;
    db.execute(notificationsQuery);

    // Create restaurant_settings table for Go Online settings
    const restaurantSettingsQuery = `
      CREATE TABLE IF NOT EXISTS ${RESTAURANT_SETTINGS_TABLE} (
        restaurantId TEXT PRIMARY KEY,
        subdomain TEXT,
        bannerImage TEXT,
        restaurantImages TEXT,
        tagline TEXT,
        aboutUs TEXT,
        socialMedia TEXT,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (restaurantId) REFERENCES ${TABLE_NAME}(id)
      );
    `;
    db.execute(restaurantSettingsQuery);
  }

  /**
   * Save restaurant data to SQLite
   */
  async saveRestaurantData(data: {
    id: string;
    name: string;
    logoUrl: string | null;
  }): Promise<void> {
    try {
      if (!db) {
        await this.initialize();
      }

      if (!db) {
        throw new Error('Database not initialized');
      }

      const { id, name, logoUrl } = data;
      const lastUpdated = new Date().toISOString();

      const query = `
        INSERT OR REPLACE INTO ${TABLE_NAME} (id, name, logoUrl, lastUpdated)
        VALUES (?, ?, ?, ?);
      `;

      db.execute(query, [id, name, logoUrl || null, lastUpdated]);
      console.log('Restaurant data saved to SQLite');
    } catch (error) {
      console.error('Error saving restaurant data:', error);
      throw error;
    }
  }

  /**
   * Get restaurant data from SQLite
   * CRITICAL: Filter by restaurantId to prevent cross-tenant data access
   */
  async getRestaurantData(restaurantId: string): Promise<RestaurantData | null> {
    try {
      if (!db) {
        await this.initialize();
      }

      if (!db) {
        throw new Error('Database not initialized');
      }

      // CRITICAL: Filter by restaurantId to prevent cross-tenant data access
      const query = `SELECT * FROM ${TABLE_NAME} WHERE id = ? LIMIT 1;`;
      const result = db.execute(query, [restaurantId]);

      if (result.rows && result.rows.length > 0) {
        const row = result.rows.item(0);
        return {
          id: row.id,
          name: row.name,
          logoUrl: row.logoUrl,
          lastUpdated: row.lastUpdated,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting restaurant data:', error);
      return null;
    }
  }

  /**
   * Clear restaurant data from SQLite (used on logout)
   */
  async clearRestaurantData(): Promise<void> {
    try {
      if (!db) {
        await this.initialize();
      }

      if (!db) {
        throw new Error('Database not initialized');
      }

      const query = `DELETE FROM ${TABLE_NAME};`;
      db.execute(query);
      
      // Also clear PIN verification status on logout
      const pinQuery = `DELETE FROM ${PIN_VERIFIED_TABLE};`;
      db.execute(pinQuery);
      
      console.log('Restaurant data and PIN verification cleared from SQLite');
    } catch (error) {
      console.error('Error clearing restaurant data:', error);
      throw error;
    }
  }

  /**
   * Save PIN verification status
   */
  async savePinVerification(restaurantId: string): Promise<void> {
    try {
      if (!db) {
        await this.initialize();
      }

      if (!db) {
        throw new Error('Database not initialized');
      }

      const now = new Date().toISOString();
      const query = `
        INSERT OR REPLACE INTO ${PIN_VERIFIED_TABLE} (restaurantId, isVerified, verifiedAt, lastVerified)
        VALUES (?, ?, ?, ?);
      `;

      db.execute(query, [restaurantId, 1, now, now]);
      console.log('PIN verification status saved to SQLite');
    } catch (error) {
      console.error('Error saving PIN verification:', error);
      throw error;
    }
  }

  /**
   * Get PIN verification status
   */
  async getPinVerification(restaurantId: string): Promise<boolean> {
    try {
      if (!db) {
        await this.initialize();
      }

      if (!db) {
        throw new Error('Database not initialized');
      }

      const query = `SELECT isVerified FROM ${PIN_VERIFIED_TABLE} WHERE restaurantId = ? LIMIT 1;`;
      const result = db.execute(query, [restaurantId]);

      if (result.rows && result.rows.length > 0) {
        const row = result.rows.item(0);
        return row.isVerified === 1;
      }

      return false;
    } catch (error) {
      console.error('Error getting PIN verification:', error);
      return false;
    }
  }

  /**
   * Clear PIN verification status (for re-verification)
   */
  async clearPinVerification(restaurantId: string): Promise<void> {
    try {
      if (!db) {
        await this.initialize();
      }

      if (!db) {
        throw new Error('Database not initialized');
      }

      const query = `DELETE FROM ${PIN_VERIFIED_TABLE} WHERE restaurantId = ?;`;
      db.execute(query, [restaurantId]);
      console.log('PIN verification cleared from SQLite');
    } catch (error) {
      console.error('Error clearing PIN verification:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
