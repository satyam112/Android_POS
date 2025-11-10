# ⚙️ Offline-First Data Source Architecture

## Overview

All data in the ZaykaBill Android POS application is managed **offline-first** using SQLite, ensuring smooth operation without server dependency. Data is synced from Settings screens when available.

## Data Source Mapping

| Section | Data Source | SQLite Table | Notes |
|---------|------------|--------------|-------|
| **Menu & Category** | Settings → Menu Management | `menu_categories`, `menu_items` | Categories and menu items are created/edited in Settings and loaded in Billing Menu tab |
| **Taxes & Charges** | Settings → Taxes & Charges | `taxes`, `additional_charges`, `payment_settings` | Tax configurations, additional charges, and payment settings (delivery charges, UPI ID) |
| **Tables** | Settings → Table Management | `tables` | Restaurant tables for dine-in orders |
| **Customers** | Cart → Add New Customer | `customers` | Created directly in Cart section when adding credit customers |
| **Orders** | Billing / View Orders | `orders` | Created when "Place Order" is clicked, all CRUD operations are offline |

## Data Flow

### Menu & Category Data
```
Settings → Menu Management Screen
  ↓ (Save to SQLite)
SQLite: menu_categories, menu_items tables
  ↓ (Load from SQLite)
Billing → Menu Tab
```

### Taxes & Charges Data
```
Settings → Taxes & Charges Screen
  ↓ (Save to SQLite)
SQLite: taxes, additional_charges, payment_settings tables
  ↓ (Load from SQLite)
Billing → Cart Tab (for calculations)
```

### Tables Data
```
Settings → Table Management Screen
  ↓ (Save to SQLite)
SQLite: tables table
  ↓ (Load from SQLite)
Billing → Cart Tab (for dine-in orders)
```

### Customers Data
```
Billing → Cart Tab → Add New Customer
  ↓ (Save to SQLite)
SQLite: customers table
  ↓ (Load from SQLite)
Billing → Cart Tab (customer dropdown)
Billing → View Orders Tab (customer names)
```

### Orders Data
```
Billing → Cart Tab → Place Order
  ↓ (Save to SQLite)
SQLite: orders table
  ↓ (Load from SQLite)
Billing → View Orders Tab
  ↓ (Update in SQLite)
Billing → View Orders Tab (status updates, cancellations)
```

## Offline Operations

✅ **All operations are 100% offline:**
- No server calls required for menu, taxes, tables, customers, or orders
- All data is stored locally in SQLite
- Settings changes are immediately reflected when switching tabs
- Order creation, status updates, and cancellations work completely offline

## Data Refresh Strategy

- **Menu Tab**: Reloads menu data when tab is activated (picks up Settings changes)
- **Cart Tab**: Reloads cart data when tab is activated (picks up Settings changes)
- **View Orders Tab**: Reloads orders when tab is activated (shows latest status)

## Benefits

1. **Zero Server Dependency**: Works completely offline
2. **Fast Performance**: All queries are local SQLite operations
3. **Data Consistency**: Single source of truth (SQLite)
4. **Settings Sync**: Changes in Settings screens automatically available in Billing
5. **Reliable**: No network errors affecting core operations


