/**
 * ZaykaBill POS - Extended Database Methods
 * Additional methods for Settings module data management
 */

import { databaseService, getDatabase } from './database';

// Re-export database service instance
export { databaseService };

// Types
export interface RestaurantInfo {
  restaurantId: string;
  name: string;
  gstNumber?: string;
  fssaiNumber?: string;
  lastUpdated: string;
}

export interface Table {
  id: string;
  restaurantId: string;
  name: string;
  capacity: number;
  status?: 'available' | 'busy';
  createdAt: string;
  lastUpdated: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  createdAt: string;
  lastUpdated: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  icon?: string;
  createdAt: string;
  lastUpdated: string;
}

export interface Tax {
  id: string;
  restaurantId: string;
  name: string;
  percentage: number;
  createdAt: string;
  lastUpdated: string;
}

export interface AdditionalCharge {
  id: string;
  restaurantId: string;
  name: string;
  percentage: number;
  createdAt: string;
  lastUpdated: string;
}

export interface PaymentSettings {
  restaurantId: string;
  deliveryChargeAmount: number;
  upiId?: string;
  lastUpdated: string;
}

export interface Expense {
  id: string;
  restaurantId: string;
  category: string;
  amount: number;
  description?: string;
  date: string;
  vendorName?: string;
  createdAt: string;
  lastUpdated: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  orderNumber: string;
  customerId?: string;
  tableId?: string;
  orderType: 'Counter' | 'Dine-In' | 'Takeaway' | 'Delivery';
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  discountPercent: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  kotSequence: number;
  isOpen: boolean;
  createdAt: string;
  lastUpdated: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  kotNumber: number;
  specialInstructions?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  restaurantId: string;
  name: string;
  mobile: string;
  address?: string;
  creditBalance: number;
  createdAt: string;
  lastUpdated: string;
}

export interface CreditTransaction {
  id: string;
  customerId: string;
  amount: number;
  type: 'CREDIT' | 'PAYMENT';
  description?: string;
  balanceAfter: number;
  createdAt: string;
}

// Helper to generate unique ID
const generateId = (): string => {
  return `android_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Helper function to convert react-native-quick-sqlite rows to array
 * Handles both item() method and array access patterns
 */
const rowsToArray = (rows: any): any[] => {
  if (!rows || !rows.length) {
    return [];
  }
  
  const result = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows.item ? rows.item(i) : rows[i];
    if (row) {
      result.push(row);
    }
  }
  return result;
};

// Restaurant Info Methods
export const restaurantInfoService = {
  async save(restaurantId: string, name: string, gstNumber?: string, fssaiNumber?: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const lastUpdated = new Date().toISOString();
    const query = `
      INSERT OR REPLACE INTO restaurant_info (restaurantId, name, gstNumber, fssaiNumber, lastUpdated)
      VALUES (?, ?, ?, ?, ?);
    `;
    db.execute(query, [restaurantId, name, gstNumber || null, fssaiNumber || null, lastUpdated]);
  },

  async get(restaurantId: string): Promise<RestaurantInfo | null> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM restaurant_info WHERE restaurantId = ? LIMIT 1;`;
    const result = db.execute(query, [restaurantId]);

    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows.item ? result.rows.item(0) : result.rows[0];
      if (row) {
        return {
          restaurantId: row.restaurantId,
          name: row.name,
          gstNumber: row.gstNumber || undefined,
          fssaiNumber: row.fssaiNumber || undefined,
          lastUpdated: row.lastUpdated,
        };
      }
    }
    return null;
  },
};

// Tables Methods
export const tablesService = {
  async getAll(restaurantId: string): Promise<Table[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM tables WHERE restaurantId = ? ORDER BY name ASC;`;
    const result = db.execute(query, [restaurantId]);

    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        name: row.name,
        capacity: row.capacity,
        status: (row.status || 'available') as 'available' | 'busy',
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },

  async add(restaurantId: string, name: string, capacity: number): Promise<Table> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const id = generateId();
    const now = new Date().toISOString();
    const query = `
      INSERT INTO tables (id, restaurantId, name, capacity, status, createdAt, lastUpdated)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [id, restaurantId, name, capacity, 'available', now, now]);

    return {
      id,
      restaurantId,
      name,
      capacity,
      status: 'available',
      createdAt: now,
      lastUpdated: now,
    };
  },

  async update(id: string, name: string, capacity: number, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const lastUpdated = new Date().toISOString();
    const query = `UPDATE tables SET name = ?, capacity = ?, lastUpdated = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [name, capacity, lastUpdated, id, restaurantId]);
  },

  async updateStatus(id: string, status: 'available' | 'busy', restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const lastUpdated = new Date().toISOString();
    const query = `UPDATE tables SET status = ?, lastUpdated = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [status, lastUpdated, id, restaurantId]);
  },

  async delete(id: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data deletion
    const query = `DELETE FROM tables WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [id, restaurantId]);
  },
};

// Menu Categories Methods
export const menuCategoriesService = {
  async getAll(restaurantId: string): Promise<MenuCategory[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM menu_categories WHERE restaurantId = ? ORDER BY name ASC;`;
    const result = db.execute(query, [restaurantId]);

    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        name: row.name,
        description: row.description || undefined,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },

  async add(restaurantId: string, name: string, description?: string): Promise<MenuCategory> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const id = generateId();
    const now = new Date().toISOString();
    const query = `
      INSERT INTO menu_categories (id, restaurantId, name, description, createdAt, lastUpdated)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [id, restaurantId, name, description || null, now, now]);

    return {
      id,
      restaurantId,
      name,
      description,
      createdAt: now,
      lastUpdated: now,
    };
  },

  async update(id: string, name: string, description: string | undefined, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const lastUpdated = new Date().toISOString();
    const query = `UPDATE menu_categories SET name = ?, description = ?, lastUpdated = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [name, description || null, lastUpdated, id, restaurantId]);
  },

  async delete(id: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data deletion
    // First verify category belongs to restaurant
    const verifyQuery = `SELECT id FROM menu_categories WHERE id = ? AND restaurantId = ? LIMIT 1;`;
    const verifyResult = db.execute(verifyQuery, [id, restaurantId]);
    if (!verifyResult || !verifyResult.rows || verifyResult.rows.length === 0) {
      throw new Error('Category not found or does not belong to restaurant');
    }

    // Also delete all menu items in this category (they're linked via categoryId, which is already verified)
    const deleteItemsQuery = `DELETE FROM menu_items WHERE categoryId = ?;`;
    db.execute(deleteItemsQuery, [id]);

    const query = `DELETE FROM menu_categories WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [id, restaurantId]);
  },
};

// Menu Items Methods
export const menuItemsService = {
  async getAll(restaurantId: string, categoryId?: string): Promise<MenuItem[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    let query = `SELECT * FROM menu_items WHERE restaurantId = ?`;
    const params: any[] = [restaurantId];

    if (categoryId) {
      query += ` AND categoryId = ?`;
      params.push(categoryId);
    }

    query += ` ORDER BY name ASC;`;
    const result = db.execute(query, params);

    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        categoryId: row.categoryId,
        name: row.name,
        description: row.description || undefined,
        price: row.price,
        icon: row.icon || undefined,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },

  async add(
    restaurantId: string,
    categoryId: string,
    name: string,
    price: number,
    description?: string,
    icon?: string
  ): Promise<MenuItem> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const id = generateId();
    const now = new Date().toISOString();
    const query = `
      INSERT INTO menu_items (id, restaurantId, categoryId, name, description, price, icon, createdAt, lastUpdated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [id, restaurantId, categoryId, name, description || null, price, icon || null, now, now]);

    return {
      id,
      restaurantId,
      categoryId,
      name,
      description,
      price,
      icon,
      createdAt: now,
      lastUpdated: now,
    };
  },

  async update(id: string, name: string, price: number, categoryId: string, description: string | undefined, icon: string | undefined, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const lastUpdated = new Date().toISOString();
    const query = `UPDATE menu_items SET name = ?, price = ?, categoryId = ?, description = ?, icon = ?, lastUpdated = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [name, price, categoryId, description || null, icon || null, lastUpdated, id, restaurantId]);
  },

  async delete(id: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data deletion
    const query = `DELETE FROM menu_items WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [id, restaurantId]);
  },
};

// Taxes Methods
export const taxesService = {
  async getAll(restaurantId: string): Promise<Tax[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM taxes WHERE restaurantId = ? ORDER BY name ASC;`;
    const result = db.execute(query, [restaurantId]);

    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        name: row.name,
        percentage: row.percentage,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },

  async add(restaurantId: string, name: string, percentage: number): Promise<Tax> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const id = generateId();
    const now = new Date().toISOString();
    const query = `
      INSERT INTO taxes (id, restaurantId, name, percentage, createdAt, lastUpdated)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [id, restaurantId, name, percentage, now, now]);

    return {
      id,
      restaurantId,
      name,
      percentage,
      createdAt: now,
      lastUpdated: now,
    };
  },

  async update(id: string, name: string, percentage: number, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const lastUpdated = new Date().toISOString();
    const query = `UPDATE taxes SET name = ?, percentage = ?, lastUpdated = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [name, percentage, lastUpdated, id, restaurantId]);
  },

  async delete(id: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data deletion
    const query = `DELETE FROM taxes WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [id, restaurantId]);
  },
};

// Additional Charges Methods
export const additionalChargesService = {
  async getAll(restaurantId: string): Promise<AdditionalCharge[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM additional_charges WHERE restaurantId = ? ORDER BY name ASC;`;
    const result = db.execute(query, [restaurantId]);

    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        name: row.name,
        percentage: row.percentage,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },

  async add(restaurantId: string, name: string, percentage: number): Promise<AdditionalCharge> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const id = generateId();
    const now = new Date().toISOString();
    const query = `
      INSERT INTO additional_charges (id, restaurantId, name, percentage, createdAt, lastUpdated)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [id, restaurantId, name, percentage, now, now]);

    return {
      id,
      restaurantId,
      name,
      percentage,
      createdAt: now,
      lastUpdated: now,
    };
  },

  async update(id: string, name: string, percentage: number, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const lastUpdated = new Date().toISOString();
    const query = `UPDATE additional_charges SET name = ?, percentage = ?, lastUpdated = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [name, percentage, lastUpdated, id, restaurantId]);
  },

  async delete(id: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data deletion
    const query = `DELETE FROM additional_charges WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [id, restaurantId]);
  },
};

// Payment Settings Methods
export const paymentSettingsService = {
  async get(restaurantId: string): Promise<PaymentSettings | null> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM payment_settings WHERE restaurantId = ? LIMIT 1;`;
    const result = db.execute(query, [restaurantId]);

    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows.item ? result.rows.item(0) : result.rows[0];
      if (row) {
        return {
          restaurantId: row.restaurantId,
          deliveryChargeAmount: row.deliveryChargeAmount || 0,
          upiId: row.upiId || undefined,
          lastUpdated: row.lastUpdated,
        };
      }
    }
    return null;
  },

  async save(restaurantId: string, deliveryChargeAmount: number, upiId?: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const lastUpdated = new Date().toISOString();
    const query = `
      INSERT OR REPLACE INTO payment_settings (restaurantId, deliveryChargeAmount, upiId, lastUpdated)
      VALUES (?, ?, ?, ?);
    `;
    db.execute(query, [restaurantId, deliveryChargeAmount, upiId || null, lastUpdated]);
  },
};

// Restaurant Settings Service (Go Online settings)
export interface RestaurantSettings {
  restaurantId: string;
  subdomain?: string;
  bannerImage?: string;
  restaurantImages?: string[];
  tagline?: string;
  aboutUs?: string;
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  lastUpdated: string;
}

export const restaurantSettingsService = {
  async get(restaurantId: string): Promise<RestaurantSettings | null> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM restaurant_settings WHERE restaurantId = ? LIMIT 1;`;
    const result = db.execute(query, [restaurantId]);

    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows.item ? result.rows.item(0) : result.rows[0];
      if (row) {
        return {
          restaurantId: row.restaurantId,
          subdomain: row.subdomain || undefined,
          bannerImage: row.bannerImage || undefined,
          restaurantImages: row.restaurantImages ? JSON.parse(row.restaurantImages) : undefined,
          tagline: row.tagline || undefined,
          aboutUs: row.aboutUs || undefined,
          socialMedia: row.socialMedia ? JSON.parse(row.socialMedia) : undefined,
          lastUpdated: row.lastUpdated,
        };
      }
    }
    return null;
  },

  async save(restaurantId: string, settings: {
    subdomain?: string;
    bannerImage?: string;
    restaurantImages?: string[];
    tagline?: string;
    aboutUs?: string;
    socialMedia?: {
      instagram?: string;
      facebook?: string;
      twitter?: string;
    };
  }): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const lastUpdated = new Date().toISOString();
    const query = `
      INSERT OR REPLACE INTO restaurant_settings (
        restaurantId, subdomain, bannerImage, restaurantImages, tagline, aboutUs, socialMedia, lastUpdated
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [
      restaurantId,
      settings.subdomain || null,
      settings.bannerImage || null,
      settings.restaurantImages ? JSON.stringify(settings.restaurantImages) : null,
      settings.tagline || null,
      settings.aboutUs || null,
      settings.socialMedia ? JSON.stringify(settings.socialMedia) : null,
      lastUpdated,
    ]);
  },
};

// Expenses Service
export const expensesService = {
  async save(expense: Omit<Expense, 'createdAt' | 'lastUpdated'>): Promise<Expense> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const existingExpense = await this.getById(expense.id, expense.restaurantId);
    const expenseData = {
      ...expense,
      createdAt: existingExpense?.createdAt || now,
      lastUpdated: now,
    };

    const query = `
      INSERT OR REPLACE INTO expenses (
        id, restaurantId, category, amount, description, date, vendorName, createdAt, lastUpdated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [
      expenseData.id,
      expenseData.restaurantId,
      expenseData.category,
      expenseData.amount,
      expenseData.description || null,
      expenseData.date,
      expenseData.vendorName || null,
      expenseData.createdAt,
      expenseData.lastUpdated,
    ]);

    return expenseData as Expense;
  },

  async getAll(restaurantId: string): Promise<Expense[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM expenses WHERE restaurantId = ? ORDER BY date DESC, createdAt DESC;`;
    const result = db.execute(query, [restaurantId]);
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        category: row.category,
        amount: row.amount,
        description: row.description || undefined,
        date: row.date,
        vendorName: row.vendorName || undefined,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },

  async getById(id: string, restaurantId: string): Promise<Expense | null> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data access
    const query = `SELECT * FROM expenses WHERE id = ? AND restaurantId = ? LIMIT 1;`;
    const result = db.execute(query, [id, restaurantId]);
    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows.item ? result.rows.item(0) : result.rows[0];
      if (row) {
        return {
          id: row.id,
          restaurantId: row.restaurantId,
          category: row.category,
          amount: row.amount,
          description: row.description || undefined,
          date: row.date,
          vendorName: row.vendorName || undefined,
          createdAt: row.createdAt,
          lastUpdated: row.lastUpdated,
        };
      }
    }
    return null;
  },

  async delete(id: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data deletion
    const query = `DELETE FROM expenses WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [id, restaurantId]);
  },

  async getExpensesByDateRange(restaurantId: string, startDate: string, endDate: string): Promise<Expense[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM expenses WHERE restaurantId = ? AND date(date) >= date(?) AND date(date) <= date(?) ORDER BY date DESC, createdAt DESC;`;
    const result = db.execute(query, [restaurantId, startDate, endDate]);
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        category: row.category,
        amount: row.amount,
        description: row.description || undefined,
        date: row.date,
        vendorName: row.vendorName || undefined,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },
};

// Orders Service
export const ordersService = {
  async getAll(restaurantId: string): Promise<Order[]> {
    console.log(`[ORDERS SERVICE] Fetching all orders for restaurant: ${restaurantId}`);
    
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM orders WHERE restaurantId = ? ORDER BY createdAt DESC;`;
    console.log(`[ORDERS SERVICE] Executing query: SELECT * FROM orders WHERE restaurantId = ?`);
    const result = db.execute(query, [restaurantId]);
    
    console.log(`[ORDERS SERVICE] Query result:`, {
      hasResult: !!result,
      hasRows: !!result?.rows,
      rowsLength: result?.rows?.length || 0,
    });
    
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      console.log(`[ORDERS SERVICE] Found ${rows.length} orders in database`);
      
      const orders = rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        orderNumber: row.orderNumber,
        customerId: row.customerId || undefined,
        tableId: row.tableId || undefined,
        orderType: (row.orderType || 'Counter') as 'Counter' | 'Dine-In' | 'Takeaway' | 'Delivery',
        status: (row.status || 'PENDING') as 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED',
        subtotal: row.subtotal || 0,
        taxAmount: row.taxAmount || 0,
        discountAmount: row.discountAmount || 0,
        discountPercent: row.discountPercent || 0,
        totalAmount: row.totalAmount,
        paymentStatus: row.paymentStatus,
        paymentMethod: row.paymentMethod || undefined,
        kotSequence: row.kotSequence || 1,
        isOpen: row.isOpen === 1,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
      
      if (orders.length > 0) {
        console.log(`[ORDERS SERVICE] Sample order from getAll:`, {
          orderNumber: orders[0].orderNumber,
          id: orders[0].id,
          totalAmount: orders[0].totalAmount,
          status: orders[0].status,
          createdAt: orders[0].createdAt,
        });
      }
      
      return orders;
    }
    
    console.log(`[ORDERS SERVICE] No orders found for restaurant: ${restaurantId}`);
    return [];
  },

  async getById(orderId: string, restaurantId: string): Promise<Order | null> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data access
    const query = `SELECT * FROM orders WHERE id = ? AND restaurantId = ? LIMIT 1;`;
    const result = db.execute(query, [orderId, restaurantId]);
    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows.item ? result.rows.item(0) : result.rows[0];
      if (row) {
        return {
          id: row.id,
          restaurantId: row.restaurantId,
          orderNumber: row.orderNumber,
          customerId: row.customerId || undefined,
          tableId: row.tableId || undefined,
          orderType: (row.orderType || 'Counter') as 'Counter' | 'Dine-In' | 'Takeaway' | 'Delivery',
          status: (row.status || 'PENDING') as 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED',
          subtotal: row.subtotal || 0,
          taxAmount: row.taxAmount || 0,
          discountAmount: row.discountAmount || 0,
          discountPercent: row.discountPercent || 0,
          totalAmount: row.totalAmount,
          paymentStatus: row.paymentStatus,
          paymentMethod: row.paymentMethod || undefined,
          kotSequence: row.kotSequence || 1,
          isOpen: row.isOpen === 1,
          createdAt: row.createdAt,
          lastUpdated: row.lastUpdated,
        };
      }
    }
    return null;
  },

  async getByOrderNumber(restaurantId: string, orderNumber: string): Promise<Order | null> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM orders WHERE restaurantId = ? AND orderNumber = ? LIMIT 1;`;
    const result = db.execute(query, [restaurantId, orderNumber]);
    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows.item ? result.rows.item(0) : result.rows[0];
      if (row) {
        return {
          id: row.id,
          restaurantId: row.restaurantId,
          orderNumber: row.orderNumber,
          customerId: row.customerId || undefined,
          tableId: row.tableId || undefined,
          orderType: (row.orderType || 'Counter') as 'Counter' | 'Dine-In' | 'Takeaway' | 'Delivery',
          status: (row.status || 'PENDING') as 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED',
          subtotal: row.subtotal || 0,
          taxAmount: row.taxAmount || 0,
          discountAmount: row.discountAmount || 0,
          discountPercent: row.discountPercent || 0,
          totalAmount: row.totalAmount,
          paymentStatus: row.paymentStatus,
          paymentMethod: row.paymentMethod || undefined,
          kotSequence: row.kotSequence || 1,
          isOpen: row.isOpen === 1,
          createdAt: row.createdAt,
          lastUpdated: row.lastUpdated,
        };
      }
    }
    return null;
  },

  async save(order: Omit<Order, 'createdAt' | 'lastUpdated'>): Promise<Order> {
    console.log(`[ORDERS SERVICE] Saving order: ${order.orderNumber} (ID: ${order.id})`);
    console.log(`[ORDERS SERVICE] Order details:`, {
      restaurantId: order.restaurantId,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      status: order.status,
      paymentStatus: order.paymentStatus,
    });
    
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const existingOrder = await this.getById(order.id, order.restaurantId);
    const orderData = {
      ...order,
      createdAt: existingOrder?.createdAt || now,
      lastUpdated: now,
    };

    const query = `
      INSERT OR REPLACE INTO orders (
        id, restaurantId, orderNumber, customerId, tableId, orderType, status,
        subtotal, taxAmount, discountAmount, discountPercent, totalAmount,
        paymentStatus, paymentMethod, kotSequence, isOpen, createdAt, lastUpdated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [
      orderData.id,
      orderData.restaurantId,
      orderData.orderNumber,
      orderData.customerId || null,
      orderData.tableId || null,
      orderData.orderType,
      orderData.status,
      orderData.subtotal,
      orderData.taxAmount,
      orderData.discountAmount,
      orderData.discountPercent,
      orderData.totalAmount,
      orderData.paymentStatus,
      orderData.paymentMethod || null,
      orderData.kotSequence,
      orderData.isOpen ? 1 : 0,
      orderData.createdAt,
      orderData.lastUpdated,
    ]);

    console.log(`[ORDERS SERVICE] Order saved successfully: ${orderData.orderNumber}`);
    
    // Verify the order was saved by fetching it back
    const verifyOrder = await this.getById(orderData.id, orderData.restaurantId);
    if (verifyOrder) {
      console.log(`[ORDERS SERVICE] Verified order exists in DB: ${verifyOrder.orderNumber}`);
    } else {
      console.error(`[ORDERS SERVICE] ERROR: Order ${orderData.orderNumber} not found after save!`);
    }

    return orderData as Order;
  },

  async updateStatus(orderId: string, status: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const lastUpdated = new Date().toISOString();
    const query = `UPDATE orders SET status = ?, lastUpdated = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [status, lastUpdated, orderId, restaurantId]);
  },

  async updateKotSequence(orderId: string, kotSequence: number, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const lastUpdated = new Date().toISOString();
    const query = `UPDATE orders SET kotSequence = ?, lastUpdated = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [kotSequence, lastUpdated, orderId, restaurantId]);
  },

  async closeOrder(orderId: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const lastUpdated = new Date().toISOString();
    const query = `UPDATE orders SET isOpen = 0, lastUpdated = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [lastUpdated, orderId, restaurantId]);
  },

  async getTodayOrders(restaurantId: string): Promise<Order[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // Get today's date in local timezone (YYYY-MM-DD format)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    
    // Use date() function to extract date part from createdAt and compare with today's date
    // This handles timezone differences by comparing only the date portion
    const query = `SELECT * FROM orders WHERE restaurantId = ? AND date(createdAt) = date(?) ORDER BY createdAt DESC;`;
    const result = db.execute(query, [restaurantId, today]);
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        orderNumber: row.orderNumber,
        customerId: row.customerId || undefined,
        tableId: row.tableId || undefined,
        orderType: (row.orderType || 'Counter') as 'Counter' | 'Dine-In' | 'Takeaway' | 'Delivery',
        status: (row.status || 'PENDING') as 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED',
        subtotal: row.subtotal || 0,
        taxAmount: row.taxAmount || 0,
        discountAmount: row.discountAmount || 0,
        discountPercent: row.discountPercent || 0,
        totalAmount: row.totalAmount,
        paymentStatus: row.paymentStatus,
        paymentMethod: row.paymentMethod || undefined,
        kotSequence: row.kotSequence || 1,
        isOpen: row.isOpen === 1,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },

  async getMonthOrders(restaurantId: string): Promise<Order[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // Get current month's start date in local timezone (YYYY-MM-DD format)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startDate = `${year}-${month}-01`;
    
    // Use date() function to extract date part from createdAt and compare with month start date
    // This handles timezone differences by comparing only the date portion
    const query = `SELECT * FROM orders WHERE restaurantId = ? AND date(createdAt) >= date(?) ORDER BY createdAt DESC;`;
    const result = db.execute(query, [restaurantId, startDate]);
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        orderNumber: row.orderNumber,
        customerId: row.customerId || undefined,
        tableId: row.tableId || undefined,
        orderType: (row.orderType || 'Counter') as 'Counter' | 'Dine-In' | 'Takeaway' | 'Delivery',
        status: (row.status || 'PENDING') as 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED',
        subtotal: row.subtotal || 0,
        taxAmount: row.taxAmount || 0,
        discountAmount: row.discountAmount || 0,
        discountPercent: row.discountPercent || 0,
        totalAmount: row.totalAmount,
        paymentStatus: row.paymentStatus,
        paymentMethod: row.paymentMethod || undefined,
        kotSequence: row.kotSequence || 1,
        isOpen: row.isOpen === 1,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },

  async getOrdersByDateRange(restaurantId: string, startDate: string, endDate: string): Promise<Order[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM orders WHERE restaurantId = ? AND date(createdAt) >= date(?) AND date(createdAt) <= date(?) ORDER BY createdAt DESC;`;
    const result = db.execute(query, [restaurantId, startDate, endDate]);
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        orderNumber: row.orderNumber,
        customerId: row.customerId || undefined,
        tableId: row.tableId || undefined,
        orderType: (row.orderType || 'Counter') as 'Counter' | 'Dine-In' | 'Takeaway' | 'Delivery',
        status: (row.status || 'PENDING') as 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED',
        subtotal: row.subtotal || 0,
        taxAmount: row.taxAmount || 0,
        discountAmount: row.discountAmount || 0,
        discountPercent: row.discountPercent || 0,
        totalAmount: row.totalAmount,
        paymentStatus: row.paymentStatus,
        paymentMethod: row.paymentMethod || undefined,
        kotSequence: row.kotSequence || 1,
        isOpen: row.isOpen === 1,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },
};

// Order Items Service
export const orderItemsService = {
  async getByOrderId(orderId: string, restaurantId: string): Promise<OrderItem[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Verify order belongs to restaurant before fetching items
    const verifyOrderQuery = `SELECT id FROM orders WHERE id = ? AND restaurantId = ? LIMIT 1;`;
    const verifyResult = db.execute(verifyOrderQuery, [orderId, restaurantId]);
    if (!verifyResult || !verifyResult.rows || verifyResult.rows.length === 0) {
      // Order doesn't exist or doesn't belong to restaurant - return empty array
      return [];
    }

    const query = `SELECT * FROM order_items WHERE orderId = ? ORDER BY kotNumber ASC, createdAt ASC;`;
    const result = db.execute(query, [orderId]);
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        orderId: row.orderId,
        menuItemId: row.menuItemId,
        itemName: row.itemName,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        totalPrice: row.totalPrice,
        kotNumber: row.kotNumber || 1,
        specialInstructions: row.specialInstructions || undefined,
        createdAt: row.createdAt,
      }));
    }
    return [];
  },

  async getByKotNumber(orderId: string, kotNumber: number, restaurantId: string): Promise<OrderItem[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Verify order belongs to restaurant before fetching items
    const verifyOrderQuery = `SELECT id FROM orders WHERE id = ? AND restaurantId = ? LIMIT 1;`;
    const verifyResult = db.execute(verifyOrderQuery, [orderId, restaurantId]);
    if (!verifyResult || !verifyResult.rows || verifyResult.rows.length === 0) {
      // Order doesn't exist or doesn't belong to restaurant - return empty array
      return [];
    }

    const query = `SELECT * FROM order_items WHERE orderId = ? AND kotNumber = ? ORDER BY createdAt ASC;`;
    const result = db.execute(query, [orderId, kotNumber]);
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        orderId: row.orderId,
        menuItemId: row.menuItemId,
        itemName: row.itemName,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        totalPrice: row.totalPrice,
        kotNumber: row.kotNumber || 1,
        specialInstructions: row.specialInstructions || undefined,
        createdAt: row.createdAt,
      }));
    }
    return [];
  },

  async save(items: Omit<OrderItem, 'id' | 'createdAt'>[]): Promise<OrderItem[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const savedItems: OrderItem[] = [];

    for (const item of items) {
      const id = `oi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const itemData: OrderItem = {
        ...item,
        id,
        createdAt: now,
      };

      const query = `
        INSERT INTO order_items (
          id, orderId, menuItemId, itemName, quantity, unitPrice, totalPrice,
          kotNumber, specialInstructions, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      db.execute(query, [
        itemData.id,
        itemData.orderId,
        itemData.menuItemId,
        itemData.itemName,
        itemData.quantity,
        itemData.unitPrice,
        itemData.totalPrice,
        itemData.kotNumber,
        itemData.specialInstructions || null,
        itemData.createdAt,
      ]);

      savedItems.push(itemData);
    }

    return savedItems;
  },
};

// Customers Service
export const customersService = {
  async getAll(restaurantId: string): Promise<Customer[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM customers WHERE restaurantId = ? ORDER BY name ASC;`;
    const result = db.execute(query, [restaurantId]);
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        name: row.name,
        mobile: row.mobile,
        address: row.address || undefined,
        creditBalance: typeof row.creditBalance === 'number' ? row.creditBalance : parseFloat(row.creditBalance) || 0,
        createdAt: row.createdAt,
        lastUpdated: row.lastUpdated,
      }));
    }
    return [];
  },

  async getById(id: string, restaurantId: string): Promise<Customer | null> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data access
    const query = `SELECT * FROM customers WHERE id = ? AND restaurantId = ? LIMIT 1;`;
    const result = db.execute(query, [id, restaurantId]);
    if (result && result.rows && result.rows.length > 0) {
      const row = result.rows.item ? result.rows.item(0) : result.rows[0];
      if (row) {
        return {
          id: row.id,
          restaurantId: row.restaurantId,
          name: row.name,
          mobile: row.mobile,
          address: row.address || undefined,
          creditBalance: typeof row.creditBalance === 'number' ? row.creditBalance : parseFloat(row.creditBalance) || 0,
          createdAt: row.createdAt,
          lastUpdated: row.lastUpdated,
        };
      }
    }
    return null;
  },

  async save(customer: Omit<Customer, 'createdAt' | 'lastUpdated'>): Promise<Customer> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const existingCustomer = await this.getById(customer.id, customer.restaurantId);
    const customerData = {
      ...customer,
      createdAt: existingCustomer?.createdAt || now,
      lastUpdated: now,
    };

    const query = `
      INSERT OR REPLACE INTO customers (
        id, restaurantId, name, mobile, address, creditBalance, createdAt, lastUpdated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [
      customerData.id,
      customerData.restaurantId,
      customerData.name,
      customerData.mobile,
      customerData.address || null,
      customerData.creditBalance,
      customerData.createdAt,
      customerData.lastUpdated,
    ]);

    return customerData as Customer;
  },

  async updateCredit(customerId: string, amount: number, type: 'add' | 'subtract', restaurantId: string): Promise<Customer> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const customer = await this.getById(customerId, restaurantId);
    if (!customer) throw new Error('Customer not found or does not belong to restaurant');

    const newBalance = type === 'add' 
      ? customer.creditBalance + amount 
      : customer.creditBalance - amount;

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const lastUpdated = new Date().toISOString();
    const query = `UPDATE customers SET creditBalance = ?, lastUpdated = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [newBalance, lastUpdated, customerId, restaurantId]);

    return {
      ...customer,
      creditBalance: newBalance,
      lastUpdated,
    };
  },

  async delete(id: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data deletion
    // First verify customer belongs to restaurant
    const verifyQuery = `SELECT id FROM customers WHERE id = ? AND restaurantId = ? LIMIT 1;`;
    const verifyResult = db.execute(verifyQuery, [id, restaurantId]);
    if (!verifyResult || !verifyResult.rows || verifyResult.rows.length === 0) {
      throw new Error('Customer not found or does not belong to restaurant');
    }

    // Delete credit transactions first (they're linked via customerId, which is already verified)
    const deleteTransactionsQuery = `DELETE FROM credit_transactions WHERE customerId = ?;`;
    db.execute(deleteTransactionsQuery, [id]);

    // Delete customer (restaurantId already verified above)
    const deleteCustomerQuery = `DELETE FROM customers WHERE id = ? AND restaurantId = ?;`;
    db.execute(deleteCustomerQuery, [id, restaurantId]);
  },
};

// Credit Transactions Service
export const creditTransactionsService = {
  async getAll(customerId: string, restaurantId: string): Promise<CreditTransaction[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Verify customer belongs to restaurant before fetching transactions
    const verifyCustomerQuery = `SELECT id FROM customers WHERE id = ? AND restaurantId = ? LIMIT 1;`;
    const verifyResult = db.execute(verifyCustomerQuery, [customerId, restaurantId]);
    if (!verifyResult || !verifyResult.rows || verifyResult.rows.length === 0) {
      // Customer doesn't exist or doesn't belong to restaurant - return empty array
      return [];
    }

    const query = `SELECT * FROM credit_transactions WHERE customerId = ? ORDER BY createdAt DESC;`;
    const result = db.execute(query, [customerId]);
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        customerId: row.customerId,
        amount: row.amount,
        type: row.type as 'CREDIT' | 'PAYMENT',
        description: row.description || undefined,
        balanceAfter: row.balanceAfter,
        createdAt: row.createdAt,
      }));
    }
    return [];
  },

  async save(transaction: Omit<CreditTransaction, 'id'>): Promise<CreditTransaction> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const id = `ct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const transactionData = {
      ...transaction,
      id,
      createdAt: now,
    };

    const query = `
      INSERT INTO credit_transactions (
        id, customerId, amount, type, description, balanceAfter, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [
      transactionData.id,
      transactionData.customerId,
      transactionData.amount,
      transactionData.type,
      transactionData.description || null,
      transactionData.balanceAfter,
      transactionData.createdAt,
    ]);

    return transactionData as CreditTransaction;
  },
};

// Notification Interface
export interface Notification {
  id: string;
  restaurantId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

// Notifications Service
export const notificationsService = {
  async save(notification: Omit<Notification, 'createdAt' | 'updatedAt'>): Promise<Notification> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    const notificationData = {
      ...notification,
      createdAt: notification.createdAt || now,
      updatedAt: notification.updatedAt || now,
    };

    const query = `
      INSERT OR REPLACE INTO notifications (
        id, restaurantId, title, message, type, isRead, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `;
    db.execute(query, [
      notificationData.id,
      notificationData.restaurantId,
      notificationData.title,
      notificationData.message,
      notificationData.type,
      notificationData.isRead ? 1 : 0,
      notificationData.createdAt,
      notificationData.updatedAt,
    ]);

    return notificationData as Notification;
  },

  async getAll(restaurantId: string): Promise<Notification[]> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const query = `SELECT * FROM notifications WHERE restaurantId = ? ORDER BY createdAt DESC;`;
    const result = db.execute(query, [restaurantId]);
    if (result && result.rows && result.rows.length > 0) {
      const rows = rowsToArray(result.rows);
      return rows.map((row: any) => ({
        id: row.id,
        restaurantId: row.restaurantId,
        title: row.title,
        message: row.message,
        type: row.type as 'info' | 'warning' | 'success' | 'error',
        isRead: row.isRead === 1,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    }
    return [];
  },

  async getUnreadCount(restaurantId: string): Promise<number> {
    try {
      await databaseService.initialize();
      const db = getDatabase();
      if (!db) throw new Error('Database not initialized');

      const query = `SELECT COUNT(*) as count FROM notifications WHERE restaurantId = ? AND isRead = 0;`;
      const result = db.execute(query, [restaurantId]);
      
      if (result && result.rows && result.rows.length > 0) {
        // Handle both array access and item() method
        const row = result.rows.item ? result.rows.item(0) : result.rows[0];
        if (row) {
          // Handle different column name formats
          const count = row.count !== undefined ? row.count : (row['COUNT(*)'] !== undefined ? row['COUNT(*)'] : 0);
          return typeof count === 'number' ? count : parseInt(count || '0', 10);
        }
      }
      return 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      // Return 0 if there's an error (e.g., table doesn't exist yet)
      return 0;
    }
  },

  async markAsRead(notificationId: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data modification
    const updatedAt = new Date().toISOString();
    const query = `UPDATE notifications SET isRead = 1, updatedAt = ? WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [updatedAt, notificationId, restaurantId]);
  },

  async markAllAsRead(restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    const updatedAt = new Date().toISOString();
    const query = `UPDATE notifications SET isRead = 1, updatedAt = ? WHERE restaurantId = ? AND isRead = 0;`;
    db.execute(query, [updatedAt, restaurantId]);
  },

  async delete(notificationId: string, restaurantId: string): Promise<void> {
    await databaseService.initialize();
    const db = getDatabase();
    if (!db) throw new Error('Database not initialized');

    // CRITICAL: Filter by restaurantId to prevent cross-tenant data deletion
    const query = `DELETE FROM notifications WHERE id = ? AND restaurantId = ?;`;
    db.execute(query, [notificationId, restaurantId]);
  },
};

export { databaseService };

