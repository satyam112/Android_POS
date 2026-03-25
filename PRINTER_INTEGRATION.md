# 🖨️ Bluetooth Printer Integration Guide

## Overview

The ZaykaBill Android POS includes a complete printing system with ESC/POS command generation for Customer Bills and KOTs (Kitchen Order Tickets). The system is designed to match the Web POS format exactly.

## Current Implementation

### ✅ Completed Features

1. **ESC/POS Command Generation**: Complete implementation of ESC/POS commands for thermal printers
2. **Bill Format**: Customer Bill format matching Web POS exactly
3. **KOT Format**: Kitchen Order Ticket format matching Web POS exactly
4. **Print Service**: Comprehensive printer service with connection management
5. **Integration**: Fully integrated into BillingScreen for Quick Bill and Place Order actions

### 📋 Print Formats

#### Customer Bill Format
- Restaurant Logo (placeholder for future implementation)
- Restaurant Name (Bold, Large)
- Address & Phone
- GST Number & FSSAI License Number (Prominent)
- Order Information (Order ID, Date & Time, Table, Customer, Order Type)
- Itemized List (Item Name, Quantity, Price, Total)
- Bill Summary (Subtotal, Discount, Tax, Charges, Grand Total)
- Payment Method
- Footer ("Thank You for Visiting!", "Powered by ZaykaBill")

#### KOT Format
- Restaurant Name (Bold, Large)
- "KITCHEN ORDER TICKET" Title
- Order Details (Order Number, KOT ID, Table, Customer, Mobile, Order Type, Time)
- Items List (Each item with quantity in bold uppercase)
- Special Instructions (if any)
- Items Total
- Footer with blank space for Kitchen Remarks

## 🔌 Bluetooth Printer Library Integration

### Recommended Libraries

1. **react-native-thermal-receipt-printer** (Popular, actively maintained)
   ```bash
   npm install react-native-thermal-receipt-printer
   ```

2. **react-native-bluetooth-escpos-printer** (Specifically for ESC/POS)
   ```bash
   npm install react-native-bluetooth-escpos-printer
   ```

3. **react-native-bluetooth-serial-next** (Lower-level control)
   ```bash
   npm install react-native-bluetooth-serial-next
   ```

### Integration Steps

#### Step 1: Install Library

```bash
cd AndroidPOS/ZaykaBillPOS
npm install react-native-thermal-receipt-printer
cd android
./gradlew clean
```

#### Step 2: Update AndroidManifest.xml

Add Bluetooth permissions:

```xml
<manifest>
  <uses-permission android:name="android.permission.BLUETOOTH" />
  <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
  <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
  <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
  <uses-feature android:name="android.hardware.bluetooth" android:required="false" />
</manifest>
```

#### Step 3: Update printer.ts

Replace the placeholder `connect()` and `print()` methods in `services/printer.ts`:

```typescript
// Example with react-native-thermal-receipt-printer
import { BluetoothManager, BluetoothEscposPrinter } from 'react-native-thermal-receipt-printer';

async connect(): Promise<boolean> {
  try {
    // Scan for Bluetooth devices
    const devices = await BluetoothManager.scanDevices();
    
    // Find thermal printer (typically contains "Printer" or "POS" in name)
    const printer = devices.find(
      (device: any) => 
        device.name?.toLowerCase().includes('printer') ||
        device.name?.toLowerCase().includes('pos') ||
        device.name?.toLowerCase().includes('thermal')
    );
    
    if (!printer) {
      throw new Error('No printer found');
    }
    
    // Connect to printer
    await BluetoothManager.connect(printer.address);
    
    // Verify connection
    const connected = await BluetoothManager.isConnected();
    
    if (connected) {
      this.isConnected = true;
      this.printerDevice = printer;
      
      // Save printer address for auto-reconnect
      await AsyncStorage.setItem('@printer_address', printer.address);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error connecting to printer:', error);
    this.isConnected = false;
    return false;
  }
}

async print(commands: string): Promise<boolean> {
  try {
    if (!this.isConnected) {
      // Try to reconnect to last paired printer
      const lastAddress = await AsyncStorage.getItem('@printer_address');
      if (lastAddress) {
        await BluetoothManager.connect(lastAddress);
        this.isConnected = true;
      } else {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('Printer not connected');
        }
      }
    }
    
    // Send ESC/POS commands to printer
    await BluetoothEscposPrinter.printText(commands, {});
    
    return true;
  } catch (error) {
    console.error('Error printing:', error);
    // Try to reconnect
    this.isConnected = false;
    return false;
  }
}
```

#### Step 4: Auto-Reconnect on App Start

Add to `App.tsx` or a printer manager component:

```typescript
useEffect(() => {
  // Try to reconnect to last paired printer
  const reconnectPrinter = async () => {
    const lastAddress = await AsyncStorage.getItem('@printer_address');
    if (lastAddress) {
      try {
        await printerService.connect();
      } catch (error) {
        console.log('Auto-reconnect failed:', error);
      }
    }
  };
  
  reconnectPrinter();
}, []);
```

## 🎨 Print Format Customization

### Paper Sizes

The system supports both 58mm and 80mm paper:

- **58mm**: Adjust column widths in `generateBillCommands()` and `generateKOTCommands()`
- **80mm**: Current default, optimized for standard thermal printers

### Customization Points

1. **Item Name Width**: Currently 20 characters
2. **Column Spacing**: Adjust padding in item table formatting
3. **Font Sizes**: Modify `ESC_POS_COMMANDS` constants
4. **Header/Footer Text**: Modify strings in `generateBillCommands()` and `generateKOTCommands()`

## 🔧 Testing

### Test Print Function

Add a test print function to verify printer connection:

```typescript
async testPrint(): Promise<boolean> {
  try {
    const testData: BillData = {
      restaurantName: 'Test Restaurant',
      orderNumber: 'TEST-001',
      orderType: 'Dine-In',
      customer: 'Test Customer',
      timestamp: new Date().toLocaleString(),
      items: [
        { name: 'Test Item', quantity: 1, price: 100, total: 100 },
      ],
      subtotal: 100,
      tax: 18,
      discount: 0,
      taxesAndCharges: 18,
      total: 118,
      paymentMethod: 'Cash',
    };
    
    return await printerService.printBill(testData);
  } catch (error) {
    console.error('Test print failed:', error);
    return false;
  }
}
```

## 📱 Printer Connection UI (Future Enhancement)

Consider adding a printer selection screen in Settings:

```typescript
// screens/settings/PrinterSettingsScreen.tsx
const PrinterSettingsScreen = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  const scanForPrinters = async () => {
    const devices = await BluetoothManager.scanDevices();
    setDevices(devices.filter(d => 
      d.name?.toLowerCase().includes('printer') ||
      d.name?.toLowerCase().includes('pos')
    ));
  };
  
  const connectToPrinter = async (device: any) => {
    await BluetoothManager.connect(device.address);
    await AsyncStorage.setItem('@printer_address', device.address);
    setSelectedDevice(device);
  };
  
  // ... UI implementation
};
```

## 🚀 Future Enhancements

1. **Print Preview**: Add preview before printing
2. **Offline Print Queue**: Queue prints when printer is disconnected
3. **QR Code Generation**: Add payment QR codes to bills
4. **Logo Printing**: Print restaurant logo on bills
5. **Multiple Printers**: Support for kitchen printer + billing printer
6. **Print History**: Track all printed bills/KOTs

## 🐛 Troubleshooting

### Printer Not Found
- Ensure Bluetooth is enabled
- Check printer is in pairing mode
- Verify printer name contains "Printer" or "POS"

### Connection Fails
- Check Bluetooth permissions in Android settings
- Try disconnecting and reconnecting manually
- Restart the app and printer

### Print Quality Issues
- Verify paper width (58mm vs 80mm)
- Adjust font density in `ESC_POS_COMMANDS.DOUBLE_DENSITY`
- Check printer print head for debris

### ESC/POS Commands Not Working
- Verify printer supports ESC/POS protocol
- Check command encoding (UTF-8)
- Test with manufacturer's test print command

## 📚 Resources

- [ESC/POS Command Reference](https://reference.epson-biz.com/modules/ref_escpos/index.php)
- [React Native Bluetooth Documentation](https://reactnative.dev/docs/permissionsandroid)
- [Thermal Printer Setup Guide](https://www.epson.com/support/thermal-printers)

## ✅ Current Status

**Implementation Status**: ✅ **Complete**

All ESC/POS command generation is complete and ready for Bluetooth library integration. The print formats match the Web POS exactly, and the service is fully integrated into the BillingScreen.

**Next Steps**: Integrate actual Bluetooth printing library when ready for hardware testing.


