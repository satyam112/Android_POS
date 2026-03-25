/**
 * ZaykaBill POS - Printer Settings Screen
 * Configure and connect to Bluetooth printers
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { printerService } from '../../services/printer';

interface PrinterSettingsScreenProps {
  onBack: () => void;
}

interface BluetoothDevice {
  name: string;
  address: string;
}

const PrinterSettingsScreen: React.FC<PrinterSettingsScreenProps> = ({ onBack }) => {
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const connected = printerService.getConnectionStatus();
      const address = printerService.getPrinterAddress();
      setIsConnected(connected);
      setConnectedDevice(address);
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleScanDevices = async () => {
    try {
      setScanning(true);
      setDevices([]);

      const foundDevices = await printerService.scanDevices();
      setDevices(foundDevices);

      if (foundDevices.length === 0) {
        Alert.alert(
          'No Printers Found',
          'No Bluetooth printers found. Make sure your printer is turned on and in pairing mode.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error scanning for devices:', error);
      Alert.alert(
        'Scan Error',
        error.message || 'Failed to scan for Bluetooth printers. Make sure Bluetooth is enabled.',
        [{ text: 'OK' }]
      );
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async (device: BluetoothDevice) => {
    try {
      setConnecting(true);
      Alert.alert(
        'Connecting',
        `Connecting to ${device.name}...`,
        [],
        { cancelable: false }
      );

      const connected = await printerService.connect(device.address);
      
      if (connected) {
        setConnectedDevice(device.address);
        setIsConnected(true);
        Alert.alert('Success', `Successfully connected to ${device.name}`, [{ text: 'OK' }]);
        await checkConnectionStatus();
      } else {
        throw new Error('Failed to connect to printer');
      }
    } catch (error: any) {
      console.error('Error connecting to printer:', error);
      Alert.alert(
        'Connection Error',
        error.message || 'Failed to connect to printer. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      Alert.alert(
        'Disconnect Printer',
        'Are you sure you want to disconnect from the printer?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                await printerService.disconnect();
                setConnectedDevice(null);
                setIsConnected(false);
                Alert.alert('Success', 'Disconnected from printer', [{ text: 'OK' }]);
              } catch (error: any) {
                console.error('Error disconnecting:', error);
                Alert.alert('Error', 'Failed to disconnect from printer', [{ text: 'OK' }]);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error disconnecting:', error);
    }
  };

  const handleTestPrint = async () => {
    try {
      if (!isConnected) {
        Alert.alert('Not Connected', 'Please connect to a printer first', [{ text: 'OK' }]);
        return;
      }

      Alert.alert(
        'Test Print',
        'This will print a test receipt. Make sure your printer has paper.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Print',
            onPress: async () => {
              try {
                // Create a simple test print
                const testData = {
                  restaurantName: 'Test Restaurant',
                  restaurantAddress: 'Test Address',
                  restaurantPhone: '1234567890',
                  orderNumber: 'TEST-001',
                  orderType: 'Test',
                  timestamp: new Date().toLocaleString('en-IN'),
                  items: [
                    { name: 'Test Item 1', quantity: 1, price: 100, total: 100 },
                    { name: 'Test Item 2', quantity: 2, price: 50, total: 100 },
                  ],
                  subtotal: 200,
                  tax: 18,
                  discount: 0,
                  taxesAndCharges: 18,
                  total: 218,
                  paymentMethod: 'Cash',
                };

                const success = await printerService.printBill(testData);
                if (success) {
                  Alert.alert('Success', 'Test print sent successfully!', [{ text: 'OK' }]);
                } else {
                  throw new Error('Print failed');
                }
              } catch (error: any) {
                console.error('Error printing test:', error);
                Alert.alert(
                  'Print Error',
                  error.message || 'Failed to print. Please check your printer connection.',
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error in test print:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Printer Settings</Text>
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>🖨️</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, isConnected ? styles.statusConnected : styles.statusDisconnected]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
          {connectedDevice && (
            <Text style={styles.deviceInfo}>Device: {connectedDevice}</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.scanButton]}
            onPress={handleScanDevices}
            disabled={scanning || connecting}
            activeOpacity={0.7}
          >
            {scanning ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.actionButtonText}>🔍 Scan for Printers</Text>
            )}
          </TouchableOpacity>

          {isConnected && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.testButton]}
                onPress={handleTestPrint}
                disabled={connecting}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>🧪 Test Print</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.disconnectButton]}
                onPress={handleDisconnect}
                disabled={connecting}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>🔌 Disconnect</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Available Printers */}
        {devices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Printers</Text>
            <Text style={styles.sectionDescription}>
              Tap on a printer to connect
            </Text>
            {devices.map((device) => {
              const isCurrentDevice = device.address === connectedDevice;
              return (
                <TouchableOpacity
                  key={device.address}
                  style={[
                    styles.deviceCard,
                    isCurrentDevice && styles.deviceCardConnected,
                  ]}
                  onPress={() => handleConnect(device)}
                  disabled={connecting || isCurrentDevice}
                  activeOpacity={0.7}
                >
                  <View style={styles.deviceCardContent}>
                    <Text style={styles.deviceIcon}>🖨️</Text>
                    <View style={styles.deviceInfoContainer}>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <Text style={styles.deviceAddress}>{device.address}</Text>
                    </View>
                    {isCurrentDevice && (
                      <View style={styles.connectedBadge}>
                        <Text style={styles.connectedBadgeText}>✓ Connected</Text>
                      </View>
                    )}
                    {connecting && !isCurrentDevice && (
                      <ActivityIndicator size="small" color="#667eea" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionText}>
              1. Turn on your Bluetooth printer and set it to pairing mode{'\n'}
              2. Tap "Scan for Printers" to find available printers{'\n'}
              3. Tap on your printer from the list to connect{'\n'}
              4. Use "Test Print" to verify the connection{'\n'}
              5. The printer will be used automatically for KOT and Bill printing
            </Text>
          </View>
        </View>
      </ScrollView>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
    marginLeft: 40,
  },
  headerIconContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  headerIcon: {
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#10b981',
  },
  statusDisconnected: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  deviceInfo: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scanButton: {
    backgroundColor: '#667eea',
  },
  testButton: {
    backgroundColor: '#10b981',
  },
  disconnectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deviceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  deviceCardConnected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  deviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  deviceInfoContainer: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  deviceAddress: {
    fontSize: 12,
    color: '#64748b',
  },
  connectedBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  instructionsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
});

export default PrinterSettingsScreen;

