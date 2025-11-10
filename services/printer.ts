/**
 * ZaykaBill POS - Bluetooth Printer Service
 * Handles ESC/POS commands for Bluetooth thermal printers
 * 
 * Supports: 58mm and 80mm thermal printers
 * Format: ESC/POS text-based formatting
 * 
 * Uses: react-native-bluetooth-escpos-printer for Bluetooth communication
 */

// ESC/POS Command Constants
const ESC_POS_COMMANDS = {
  // Initialize printer
  INIT: '\x1B\x40',
  // Reset printer
  RESET: '\x1B\x40',
  // Alignment
  LEFT: '\x1B\x61\x00',
  CENTER: '\x1B\x61\x01',
  RIGHT: '\x1B\x61\x02',
  // Font sizes
  NORMAL_FONT: '\x1B\x21\x00',
  LARGE_FONT: '\x1B\x21\x10', // Double width
  DOUBLE_HEIGHT: '\x1B\x21\x20', // Double height
  LARGE_BOTH: '\x1B\x21\x30', // Double width and height
  // Bold
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  // Underline
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',
  // Line feeds
  LINE_FEED: '\x0A',
  DOUBLE_LINE_FEED: '\x0A\x0A',
  // Density
  DOUBLE_DENSITY: '\x1B\x47\x01',
  NORMAL_DENSITY: '\x1B\x47\x00',
  // Cut paper
  CUT_PAPER: '\x1D\x56\x00', // Full cut
  CUT_PAPER_PARTIAL: '\x1D\x56\x01', // Partial cut
  // Margins
  RESET_MARGINS: '\x1B\x4C',
  SET_LEFT_MARGIN: '\x1B\x6C\x00',
  SET_RIGHT_MARGIN: '\x1B\x51\x00',
  SET_PAPER_WIDTH: '\x1B\x57', // Paper width setting
  // QR Code commands
  QR_CODE_MODEL: '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00', // QR Code Model 2
  QR_CODE_SIZE: '\x1D\x28\x6B\x03\x00\x31\x43', // QR Code size (n = 3-10, default 3)
  QR_CODE_ERROR_CORRECTION: '\x1D\x28\x6B\x03\x00\x31\x45', // Error correction level (L=48, M=49, Q=50, H=51)
  QR_CODE_STORE: '\x1D\x28\x6B', // Store QR code data
  QR_CODE_PRINT: '\x1D\x28\x6B\x03\x00\x31\x51\x30', // Print QR code
};

export interface BillData {
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  gstNumber?: string;
  fssaiNumber?: string;
  orderNumber: string;
  table?: string;
  orderType: string;
  customer?: string;
  timestamp: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    specialInstructions?: string;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  taxesAndCharges: number;
  total: number;
  paymentMethod: string;
  upiId?: string; // UPI ID for dynamic QR code generation
}

export interface KOTData {
  orderNumber: string;
  kotId?: string;
  table?: string;
  orderType: string;
  customer?: string;
  mobile?: string;
  timestamp: string;
  items: Array<{
    name: string;
    quantity: number;
    specialInstructions?: string;
  }>;
  restaurantName: string;
  itemsTotal?: number;
}

// Type definitions for Bluetooth printer library
interface BluetoothManagerType {
  isBluetoothEnabled(): Promise<boolean>;
  enableBluetooth(): Promise<void>;
  scanDevices(): Promise<Array<{ name?: string; address: string }>>;
  connect(address: string): Promise<void>;
  isConnected(address: string): Promise<boolean>;
  unpair(address: string): Promise<void>;
}

interface BluetoothEscposPrinterType {
  printText(data: string): Promise<void>;
  printRawData(data: string): Promise<void>;
  print(data: string): Promise<void>;
  send(data: string): Promise<void>;
}

interface BluetoothTscPrinterType {
  // TSC printer methods (if needed in future)
  [key: string]: any;
}

// Import Bluetooth printer library
let BluetoothManager: BluetoothManagerType | null = null;
let BluetoothEscposPrinter: BluetoothEscposPrinterType | null = null;
let BluetoothTscPrinter: BluetoothTscPrinterType | null = null;

try {
  const BluetoothEscposPrinterModule = require('react-native-bluetooth-escpos-printer');
  BluetoothManager = BluetoothEscposPrinterModule?.BluetoothManager || BluetoothEscposPrinterModule?.default?.BluetoothManager;
  BluetoothEscposPrinter = BluetoothEscposPrinterModule?.BluetoothEscposPrinter || BluetoothEscposPrinterModule?.default?.BluetoothEscposPrinter;
  BluetoothTscPrinter = BluetoothEscposPrinterModule?.BluetoothTscPrinter || BluetoothEscposPrinterModule?.default?.BluetoothTscPrinter;
  
  if (!BluetoothManager || !BluetoothEscposPrinter) {
    console.log('[PrinterService] Bluetooth printer library structure may be different');
  }
} catch (error) {
  console.log('[PrinterService] Bluetooth printer library not available:', error);
}

// Base64 encoding helper for React Native
const base64Encode = (str: string): string => {
  try {
    // Try using built-in btoa if available
    if (typeof btoa !== 'undefined') {
      return btoa(unescape(encodeURIComponent(str)));
    }
    
    // React Native base64 encoding
    // Simple implementation for binary strings
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    let i = 0;
    
    while (i < str.length) {
      const a = str.charCodeAt(i++);
      const b = i < str.length ? str.charCodeAt(i++) : 0;
      const c = i < str.length ? str.charCodeAt(i++) : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars.charAt((bitmap >> 18) & 63);
      result += chars.charAt((bitmap >> 12) & 63);
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '=';
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '=';
    }
    
    return result;
  } catch (error) {
    console.error('[PrinterService] Base64 encoding error:', error);
    return str; // Return original string if encoding fails
  }
};

class PrinterService {
  private isConnected: boolean = false;
  private printerDevice: any = null;
  private printerAddress: string | null = null;

  /**
   * Generate dynamic UPI QR code URL
   * Creates UPI payment URL with dynamic amount
   */
  private generateDynamicUpiQrUrl(upiId: string, amount: number, merchantName: string, transactionNote: string): string {
    if (!upiId) return '';
    
    // Create UPI URL with dynamic amount
    // Format: upi://pay?pa={upiId}&pn={merchantName}&am={amount}&cu=INR&tn={transactionNote}
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
    return upiUrl;
  }

  /**
   * Generate ESC/POS QR code commands
   * Converts UPI URL to QR code and prints it
   * ESC/POS QR Code Format: GS ( k pL pH cn fn n1 n2 [data]
   */
  private generateQRCodeCommands(data: string): string {
    if (!data) return '';
    
    let commands = '';
    
    // Set QR code model (Model 2) - GS ( k 4 0 31 65 50 0
    // pL = 4, pH = 0, cn = 31, fn = 65 (Function A), n1 = 50 (Model 2), n2 = 0
    commands += '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00';
    
    // Set QR code size (6 = medium size, good for 58mm/80mm paper) - GS ( k 3 0 31 67 n
    // pL = 3, pH = 0, cn = 31, fn = 67 (Function C), n = 6 (size 3-10)
    commands += '\x1D\x28\x6B\x03\x00\x31\x43\x06';
    
    // Set error correction level (M = Medium, good balance) - GS ( k 3 0 31 69 n
    // pL = 3, pH = 0, cn = 31, fn = 69 (Function E), n = 48 (L=48, M=49, Q=50, H=51)
    commands += '\x1D\x28\x6B\x03\x00\x31\x45\x31'; // 49 = M (Medium)
    
    // Store QR code data - GS ( k pL pH 31 80 48 [data]
    // pL = data length + 3, pH = 0, cn = 31, fn = 80 (Function P), n1 = 48 (mode)
    const dataLength = data.length + 3; // +3 for mode indicator (48)
    const lenL = dataLength & 0xFF;
    const lenH = (dataLength >> 8) & 0xFF;
    commands += `\x1D\x28\x6B${String.fromCharCode(lenL)}${String.fromCharCode(lenH)}\x31\x50\x30${data}`;
    
    // Print QR code - GS ( k 3 0 31 81 48
    // pL = 3, pH = 0, cn = 31, fn = 81 (Function Q), n1 = 48 (mode)
    commands += '\x1D\x28\x6B\x03\x00\x31\x51\x30';
    
    return commands;
  }

  /**
   * Scan for available Bluetooth printers
   */
  async scanDevices(): Promise<Array<{ name: string; address: string }>> {
    try {
      if (!BluetoothManager) {
        throw new Error('Bluetooth printer library not available');
      }

      // Explicit null check before calling methods
      if (typeof BluetoothManager.isBluetoothEnabled !== 'function') {
        throw new Error('Bluetooth manager methods not available');
      }

      // Enable Bluetooth if not enabled
      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled) {
        await BluetoothManager.enableBluetooth();
        // Wait a bit for Bluetooth to enable
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Scan for devices
      const devices = await BluetoothManager.scanDevices();
      console.log('[PrinterService] Found Bluetooth devices:', devices);
      
      // Filter for printers (devices with "printer" in name or common printer names)
      const printerDevices = devices.filter((device: any) => {
        const name = (device.name || '').toLowerCase();
        return name.includes('printer') || 
               name.includes('pos') || 
               name.includes('thermal') ||
               name.includes('receipt') ||
               name.includes('epson') ||
               name.includes('star') ||
               name.includes('bixolon');
      });

      return printerDevices.map((device: any) => ({
        name: device.name || device.address,
        address: device.address,
      }));
    } catch (error) {
      console.error('Error scanning for printers:', error);
      throw error;
    }
  }

  /**
   * Connect to a Bluetooth printer by address
   * Includes retry logic with exponential backoff
   */
  async connect(deviceAddress?: string, retryCount: number = 0): Promise<boolean> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    
    try {
      if (!BluetoothManager || !BluetoothEscposPrinter) {
        console.log('[PrinterService] Bluetooth library not available, using placeholder');
        this.isConnected = true;
        return true;
      }

      // If already connected to the same device, return true
      if (this.isConnected && this.printerAddress === deviceAddress) {
        return true;
      }

      // Disconnect from previous device if any
      if (this.isConnected) {
        await this.disconnect();
      }

      // Use provided address or stored address
      const address = deviceAddress || this.printerAddress;
      if (!address) {
        throw new Error('No printer address provided');
      }

      // Explicit null check before calling methods
      if (typeof BluetoothManager.isBluetoothEnabled !== 'function') {
        throw new Error('Bluetooth manager methods not available');
      }

      // Enable Bluetooth if not enabled
      const isEnabled = await BluetoothManager.isBluetoothEnabled();
      if (!isEnabled) {
        await BluetoothManager.enableBluetooth();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Connect to printer
      console.log('[PrinterService] Connecting to printer:', address);
      await BluetoothManager.connect(address);
      
      // Wait a bit for connection to establish
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify connection
      if (typeof BluetoothManager.isConnected !== 'function') {
        throw new Error('Bluetooth manager connection check method not available');
      }
      
      const connected = await BluetoothManager.isConnected(address);
      if (connected) {
        this.isConnected = true;
        this.printerAddress = address;
        console.log('[PrinterService] Successfully connected to printer:', address);
        return true;
      } else {
        throw new Error('Failed to connect to printer');
      }
    } catch (error) {
      console.error('Error connecting to printer:', error);
      this.isConnected = false;
      this.printerAddress = null;
      
      // Retry with exponential backoff
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff: 1s, 2s, 4s
        console.log(`[PrinterService] Retrying connection in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connect(deviceAddress, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    try {
      if (BluetoothManager && this.printerAddress) {
        try {
          await BluetoothManager.unpair(this.printerAddress);
        } catch (error) {
          console.log('Error unpairing printer (may already be disconnected):', error);
        }
      }
      this.isConnected = false;
      this.printerDevice = null;
      this.printerAddress = null;
      console.log('[PrinterService] Disconnected from printer');
    } catch (error) {
      console.error('Error disconnecting from printer:', error);
      this.isConnected = false;
      this.printerDevice = null;
      this.printerAddress = null;
    }
  }

  /**
   * Get connected printer address
   */
  getPrinterAddress(): string | null {
    return this.printerAddress;
  }

  /**
   * Check if printer is connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Generate ESC/POS commands for Customer Bill
   * Matches Web POS format exactly
   */
  generateBillCommands(billData: BillData): string {
    let commands = '';

    // Initialize printer
    commands += ESC_POS_COMMANDS.INIT;
    commands += ESC_POS_COMMANDS.RESET_MARGINS;

    // Set double density for darker printing
    commands += ESC_POS_COMMANDS.DOUBLE_DENSITY;

    // Center alignment for header
    commands += ESC_POS_COMMANDS.CENTER;

    // Restaurant name - Bold and large
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += ESC_POS_COMMANDS.LARGE_BOTH;
    commands += `${billData.restaurantName}\n`;
    commands += ESC_POS_COMMANDS.NORMAL_FONT;
    commands += ESC_POS_COMMANDS.BOLD_OFF;

    // Address and contact info
    if (billData.restaurantAddress) {
      commands += `${billData.restaurantAddress}\n`;
    }
    if (billData.restaurantPhone) {
      commands += `Phone: ${billData.restaurantPhone}\n`;
    }

    // GST and FSSAI numbers (prominent display)
    if (billData.gstNumber || billData.fssaiNumber) {
      commands += ESC_POS_COMMANDS.BOLD_ON;
      if (billData.gstNumber) {
        commands += `GST No: ${billData.gstNumber}\n`;
      }
      if (billData.fssaiNumber) {
        commands += `FSSAI No: ${billData.fssaiNumber}\n`;
      }
      commands += ESC_POS_COMMANDS.BOLD_OFF;
    }

    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;
    commands += '--------------------------------\n';

    // Bill title - Bold
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += 'TAX INVOICE\n';
    commands += ESC_POS_COMMANDS.BOLD_OFF;

    // Order details - Left aligned
    commands += ESC_POS_COMMANDS.LEFT;
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += `Bill #: ${billData.orderNumber}\n`;
    commands += `Date & Time: ${billData.timestamp}\n`;
    
    if (billData.table) {
      commands += `Table: ${billData.table}\n`;
    }
    
    commands += `Order Type: ${billData.orderType}\n`;
    
    if (billData.customer) {
      commands += `Customer: ${billData.customer}\n`;
    }
    
    commands += ESC_POS_COMMANDS.BOLD_OFF;
    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;

    // Items table header - Bold
    commands += ESC_POS_COMMANDS.BOLD_ON;
    // Format: Item Name (20 chars) | Qty (3) | Price (8) | Total (8)
    // Adjust spacing for 58mm/80mm paper
    const itemHeader = 'Item'.padEnd(20) + 'Qty'.padStart(3) + 'Price'.padStart(8) + 'Total'.padStart(8);
    commands += `${itemHeader}\n`;
    commands += '--------------------------------\n';
    commands += ESC_POS_COMMANDS.BOLD_OFF;

    // Items list with proper alignment
    billData.items.forEach((item) => {
      // Truncate item name if too long
      const itemName = item.name.length > 20 ? item.name.substring(0, 17) + '...' : item.name;
      const qty = item.quantity.toString().padStart(3);
      const price = `₹${item.price.toFixed(2)}`.padStart(8);
      const total = `₹${item.total.toFixed(2)}`.padStart(8);

      // Format: Item Name (20) | Qty (3) | Price (8) | Total (8)
      commands += `${itemName.padEnd(20)}${qty}${price}${total}\n`;

      if (item.specialInstructions) {
        commands += `  Note: ${item.specialInstructions}\n`;
      }
    });

    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;
    commands += '--------------------------------\n';

    // Summary section - Right aligned
    commands += ESC_POS_COMMANDS.RIGHT;
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += 'BILL SUMMARY:\n';
    commands += ESC_POS_COMMANDS.BOLD_OFF;
    commands += ESC_POS_COMMANDS.LEFT;

    // Format totals with consistent spacing (matching WebPOS format)
    const subtotalStr = `Subtotal:              ₹${billData.subtotal.toFixed(2)}`;
    commands += `${subtotalStr}\n`;

    if (billData.tax > 0) {
      const taxStr = `Tax:                    ₹${billData.tax.toFixed(2)}`;
      commands += `${taxStr}\n`;
    }

    if (billData.taxesAndCharges > billData.tax) {
      const chargesStr = `Charges:                ₹${(billData.taxesAndCharges - billData.tax).toFixed(2)}`;
      commands += `${chargesStr}\n`;
    }

    if (billData.discount > 0) {
      const discountStr = `Discount:               -₹${billData.discount.toFixed(2)}`;
      commands += `${discountStr}\n`;
    }

    commands += '--------------------------------\n';

    // Final total - Bold and large, centered (matching WebPOS format)
    commands += ESC_POS_COMMANDS.CENTER;
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += ESC_POS_COMMANDS.LARGE_FONT; // Use LARGE_FONT instead of LARGE_BOTH to match WebPOS
    commands += `TOTAL: ₹${billData.total.toFixed(2)}\n`;
    commands += ESC_POS_COMMANDS.NORMAL_FONT;
    commands += ESC_POS_COMMANDS.BOLD_OFF;
    commands += ESC_POS_COMMANDS.LEFT;

    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;

    // Payment method
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += `Payment Method: ${billData.paymentMethod.toUpperCase()}\n`;
    commands += ESC_POS_COMMANDS.BOLD_OFF;

    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;

    // Dynamic Payment QR Code (if UPI ID available)
    if (billData.upiId) {
      // Generate dynamic UPI QR code URL
      const transactionNote = `Payment for Order ${billData.orderNumber}`;
      const upiUrl = this.generateDynamicUpiQrUrl(
        billData.upiId,
        billData.total,
        billData.restaurantName,
        transactionNote
      );
      
      if (upiUrl) {
        // Add separator
        commands += '--------------------------------\n';
        commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;
        
        // QR Code label - centered
        commands += ESC_POS_COMMANDS.CENTER;
        commands += ESC_POS_COMMANDS.BOLD_ON;
        commands += `Scan to Pay ₹${billData.total.toFixed(2)}\n`;
        commands += ESC_POS_COMMANDS.BOLD_OFF;
        commands += ESC_POS_COMMANDS.LEFT;
        
        commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;
        
        // Center the QR code
        commands += ESC_POS_COMMANDS.CENTER;
        
        // Generate and add QR code commands
        const qrCommands = this.generateQRCodeCommands(upiUrl);
        commands += qrCommands;
        
        // Return to left alignment
        commands += ESC_POS_COMMANDS.LEFT;
        
        commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;
        
        // QR code footer text
        commands += ESC_POS_COMMANDS.CENTER;
        commands += 'Amount Auto-filled\n';
        commands += 'UPI Payment\n';
        commands += ESC_POS_COMMANDS.LEFT;
        
        commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;
      }
    }

    // Footer
    commands += ESC_POS_COMMANDS.CENTER;
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += 'Thank You for Visiting!\n';
    commands += ESC_POS_COMMANDS.BOLD_OFF;
    commands += 'Powered by ZaykaBill\n';
    commands += ESC_POS_COMMANDS.LEFT;

    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;
    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;

    // Cut paper
    commands += ESC_POS_COMMANDS.CUT_PAPER;

    return commands;
  }

  /**
   * Generate ESC/POS commands for KOT (Kitchen Order Ticket)
   * Matches Web POS format exactly
   */
  generateKOTCommands(kotData: KOTData): string {
    let commands = '';

    // Initialize printer
    commands += ESC_POS_COMMANDS.INIT;
    commands += ESC_POS_COMMANDS.RESET_MARGINS;

    // Set double density for darker printing
    commands += ESC_POS_COMMANDS.DOUBLE_DENSITY;

    // Center alignment for header
    commands += ESC_POS_COMMANDS.CENTER;

    // Restaurant name - Bold and large
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += ESC_POS_COMMANDS.LARGE_BOTH;
    commands += `${kotData.restaurantName}\n`;
    commands += ESC_POS_COMMANDS.NORMAL_FONT;
    commands += ESC_POS_COMMANDS.BOLD_OFF;

    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;

    // KOT title - Bold and large
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += ESC_POS_COMMANDS.LARGE_FONT;
    commands += 'KITCHEN ORDER TICKET\n';
    commands += ESC_POS_COMMANDS.NORMAL_FONT;
    commands += ESC_POS_COMMANDS.BOLD_OFF;

    commands += '--------------------------------\n';

    // Order details - Left aligned
    commands += ESC_POS_COMMANDS.LEFT;
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += `Order: ${kotData.orderNumber}\n`;
    
    if (kotData.kotId) {
      commands += `KOT: ${kotData.kotId}\n`;
    }
    
    if (kotData.table) {
      commands += `Table: ${kotData.table}\n`;
    }
    
    if (kotData.customer) {
      commands += `Customer: ${kotData.customer}\n`;
    }
    
    if (kotData.mobile) {
      commands += `Mobile: ${kotData.mobile}\n`;
    }
    
    commands += `Order Type: ${kotData.orderType}\n`;
    commands += `Time: ${kotData.timestamp}\n`;
    commands += ESC_POS_COMMANDS.BOLD_OFF;

    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;
    commands += '--------------------------------\n';

    // Items section - Bold header
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += 'ITEMS TO PREPARE:\n';
    commands += ESC_POS_COMMANDS.BOLD_OFF;
    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;

    // Items list - Each item in bold uppercase
    kotData.items.forEach((item, index) => {
      commands += ESC_POS_COMMANDS.BOLD_ON;
      commands += `${item.quantity}x `;
      commands += `${item.name.toUpperCase()}\n`;
      commands += ESC_POS_COMMANDS.BOLD_OFF;

      if (item.specialInstructions) {
        commands += `  Note: ${item.specialInstructions}\n`;
      }

      // Divider between items (except last)
      if (index < kotData.items.length - 1) {
        commands += '--------------------------------\n';
      }
    });

    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;
    commands += '--------------------------------\n';

    // Items total (if available)
    if (kotData.itemsTotal) {
      commands += ESC_POS_COMMANDS.BOLD_ON;
      commands += `Items Total: ₹${kotData.itemsTotal.toFixed(2)}\n`;
      commands += ESC_POS_COMMANDS.BOLD_OFF;
    }

    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;

    // Footer - Blank space for kitchen remarks
    commands += ESC_POS_COMMANDS.CENTER;
    commands += '--- END OF KOT ---\n';
    commands += ESC_POS_COMMANDS.LEFT;
    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;
    commands += 'Kitchen Remarks:\n';
    commands += '_______________________\n';
    commands += '_______________________\n';
    commands += ESC_POS_COMMANDS.DOUBLE_LINE_FEED;

    // Cut paper
    commands += ESC_POS_COMMANDS.CUT_PAPER;

    return commands;
  }

  /**
   * Send commands to printer
   */
  async print(commands: string): Promise<boolean> {
    try {
      if (!BluetoothEscposPrinter) {
        console.log('[PrinterService] Bluetooth library not available, commands generated:', commands.length, 'bytes');
        return true; // Return true for placeholder mode
      }

      if (!this.isConnected || !this.printerAddress) {
        // Try to reconnect if address is stored
        if (this.printerAddress) {
          const connected = await this.connect(this.printerAddress);
          if (!connected) {
            throw new Error('Printer not connected. Please connect to a printer first.');
          }
        } else {
          throw new Error('Printer not connected. Please connect to a printer first.');
        }
      }

      // Convert string commands to base64 for transmission
      // The library typically expects base64 encoded data
      const base64Commands = base64Encode(commands);
      
      // Send commands to printer
      console.log('[PrinterService] Sending', commands.length, 'bytes to printer');
      
      // Try different methods based on library API
      // The library API may vary, so we try multiple approaches
      let printSuccess = false;
      let lastError: any = null;
      
      // Method 1: Try printText with base64 (most common)
      if (typeof BluetoothEscposPrinter?.printText === 'function') {
        try {
          await BluetoothEscposPrinter.printText(base64Commands);
          printSuccess = true;
        } catch (error: any) {
          lastError = error;
          console.log('[PrinterService] printText failed, trying alternatives:', error.message);
        }
      }
      
      // Method 2: Try printRawData (some libraries use this)
      if (!printSuccess && typeof BluetoothEscposPrinter?.printRawData === 'function') {
        try {
          await BluetoothEscposPrinter.printRawData(base64Commands);
          printSuccess = true;
        } catch (error: any) {
          lastError = error;
          console.log('[PrinterService] printRawData failed, trying alternatives:', error.message);
        }
      }
      
      // Method 3: Try print (generic method)
      if (!printSuccess && typeof BluetoothEscposPrinter?.print === 'function') {
        try {
          await BluetoothEscposPrinter.print(base64Commands);
          printSuccess = true;
        } catch (error: any) {
          lastError = error;
          console.log('[PrinterService] print failed, trying alternatives:', error.message);
        }
      }
      
      // Method 4: Try send (some libraries use this)
      if (!printSuccess && typeof BluetoothEscposPrinter?.send === 'function') {
        try {
          await BluetoothEscposPrinter.send(base64Commands);
          printSuccess = true;
        } catch (error: any) {
          lastError = error;
          console.log('[PrinterService] send failed:', error.message);
        }
      }
      
      // Method 5: Try sending raw string (fallback)
      if (!printSuccess) {
        try {
          console.log('[PrinterService] Trying raw string format');
          if (typeof BluetoothEscposPrinter?.printText === 'function') {
            await BluetoothEscposPrinter.printText(commands);
            printSuccess = true;
          } else {
            throw new Error('No valid print method found in Bluetooth library');
          }
        } catch (error: any) {
          lastError = error;
          console.error('[PrinterService] All print methods failed:', error);
        }
      }
      
      if (!printSuccess) {
        throw lastError || new Error('Failed to print: No valid print method available');
      }
      
      console.log('[PrinterService] Print job sent successfully');
      return true;
    } catch (error) {
      console.error('[PrinterService] Error printing:', error);
      throw error;
    }
  }

  /**
   * Print Customer Bill
   */
  async printBill(billData: BillData): Promise<boolean> {
    try {
      const commands = this.generateBillCommands(billData);
      return await this.print(commands);
    } catch (error) {
      console.error('Error printing bill:', error);
      return false;
    }
  }

  /**
   * Print KOT (Kitchen Order Ticket)
   */
  async printKOT(kotData: KOTData): Promise<boolean> {
    try {
      const commands = this.generateKOTCommands(kotData);
      return await this.print(commands);
    } catch (error) {
      console.error('Error printing KOT:', error);
      return false;
    }
  }
}

// Export singleton instance
export const printerService = new PrinterService();


