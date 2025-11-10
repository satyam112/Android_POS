/**
 * ZaykaBill POS - Sync Logs Screen
 * View detailed sync logs for debugging
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { syncService } from '../services/sync';

interface SyncLogEntry {
  timestamp: string;
  success: boolean;
  message: string;
  details?: any;
}

const SyncLogsScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const syncLogs = await syncService.getSyncLogs();
      // Sort by timestamp (newest first)
      const sortedLogs = syncLogs.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });
      setLogs(sortedLogs);
    } catch (error) {
      console.error('Error loading sync logs:', error);
      Alert.alert('Error', 'Failed to load sync logs');
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = () => {
    Alert.alert(
      'Clear Sync Logs',
      'Are you sure you want to clear all sync logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await syncService.clearSyncLogs();
              setLogs([]);
              Alert.alert('Success', 'Sync logs cleared');
            } catch (error) {
              console.error('Error clearing sync logs:', error);
              Alert.alert('Error', 'Failed to clear sync logs');
            }
          },
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return timestamp;
    }
  };

  const formatDetails = (details: any): string => {
    if (!details) return 'No details';
    
    try {
      if (typeof details === 'object') {
        const formatted: string[] = [];
        
        if (details.uploaded) {
          formatted.push('📤 UPLOADED:');
          formatted.push(`  Orders: ${details.uploaded.orders || 0}`);
          formatted.push(`  Expenses: ${details.uploaded.expenses || 0}`);
          formatted.push(`  Tables: ${details.uploaded.tables || 0}`);
          formatted.push(`  Menu Categories: ${details.uploaded.menuCategories || 0}`);
          formatted.push(`  Menu Items: ${details.uploaded.menuItems || 0}`);
          formatted.push(`  Customers: ${details.uploaded.customers || 0}`);
          formatted.push(`  Taxes: ${details.uploaded.taxes || 0}`);
          formatted.push(`  Additional Charges: ${details.uploaded.additionalCharges || 0}`);
          formatted.push(`  Payment Settings: ${details.uploaded.paymentSettings || 0}`);
          formatted.push(`  Restaurant Info: ${details.uploaded.restaurantInfo || 0}`);
        }
        
        if (details.downloaded) {
          formatted.push('\n📥 DOWNLOADED:');
          formatted.push(`  Orders: ${details.downloaded.orders || 0}`);
          formatted.push(`  Expenses: ${details.downloaded.expenses || 0}`);
          formatted.push(`  Tables: ${details.downloaded.tables || 0}`);
          formatted.push(`  Menu Categories: ${details.downloaded.menuCategories || 0}`);
          formatted.push(`  Menu Items: ${details.downloaded.menuItems || 0}`);
          formatted.push(`  Customers: ${details.downloaded.customers || 0}`);
          formatted.push(`  Taxes: ${details.downloaded.taxes || 0}`);
          formatted.push(`  Additional Charges: ${details.downloaded.additionalCharges || 0}`);
          formatted.push(`  Payment Settings: ${details.downloaded.paymentSettings || 0}`);
          formatted.push(`  Restaurant Info: ${details.downloaded.restaurantInfo || 0}`);
        }
        
        return formatted.join('\n');
      }
      
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sync Logs</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading sync logs...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Logs</Text>
        <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          💡 Tip: Check console logs for detailed sync information. Look for messages starting with "=== SYNC RESULTS ===" or "Uploading", "Syncing", etc.
        </Text>
      </View>

      {/* Logs List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No sync logs found</Text>
            <Text style={styles.emptySubtext}>
              Sync logs will appear here after you perform a sync operation
            </Text>
          </View>
        ) : (
          logs.map((log, index) => (
            <View key={index} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={[
                  styles.statusBadge,
                  log.success ? styles.statusBadgeSuccess : styles.statusBadgeError,
                ]}>
                  <Text style={styles.statusBadgeText}>
                    {log.success ? '✅' : '❌'}
                  </Text>
                </View>
                <View style={styles.logHeaderText}>
                  <Text style={styles.logMessage}>{log.message}</Text>
                  <Text style={styles.logTimestamp}>{formatTimestamp(log.timestamp)}</Text>
                </View>
              </View>
              
              {log.details && (
                <View style={styles.logDetails}>
                  <Text style={styles.logDetailsText}>{formatDetails(log.details)}</Text>
                </View>
              )}
            </View>
          ))
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 60,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  infoBanner: {
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  logCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  statusBadgeError: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 16,
  },
  logHeaderText: {
    flex: 1,
  },
  logMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  logTimestamp: {
    fontSize: 12,
    color: '#64748b',
  },
  logDetails: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logDetailsText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#334155',
    lineHeight: 18,
  },
});

export default SyncLogsScreen;

