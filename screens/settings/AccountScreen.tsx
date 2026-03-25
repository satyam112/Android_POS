/**
 * ZaykaBill POS - Account Screen
 * Manage account settings, password, and PIN
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
import { apiService } from '../../services/api';
import CustomDialog from '../../components/CustomDialog';

interface AccountScreenProps {
  onBack?: () => void;
}

const AccountScreen: React.FC<AccountScreenProps> = ({ onBack }) => {
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  // Dialog states
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [showChangePinDialog, setShowChangePinDialog] = useState(false);

  // Password form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // PIN form states
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      setRestaurantId(auth.restaurant.id);
      setUserEmail(auth.restaurant.email || '');
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  // Password Management
  const handleChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setShowChangePasswordDialog(true);
  };

  const handleSavePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setSaving(true);

      const response = await apiService.changePassword({
        restaurantId,
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      if (response.success) {
        Alert.alert('Success', 'Password changed successfully');
        setShowChangePasswordDialog(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', response.message || response.error || 'Failed to change password');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      const errorMessage =
        error.message || error.error || 'Failed to change password. Please try again.';
      
      if (errorMessage.includes('connect to internet')) {
        Alert.alert('Error', 'Please connect to internet');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPassword = () => {
    setShowChangePasswordDialog(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  // PIN Management
  const handleChangePin = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setShowCurrentPin(false);
    setShowNewPin(false);
    setShowConfirmPin(false);
    setShowChangePinDialog(true);
  };

  const handleSavePin = async () => {
    if (!currentPin.trim()) {
      Alert.alert('Error', 'Please enter your current PIN');
      return;
    }

    if (!newPin.trim()) {
      Alert.alert('Error', 'Please enter a new PIN');
      return;
    }

    if (newPin.length < 4) {
      Alert.alert('Error', 'New PIN must be at least 4 digits long');
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      Alert.alert('Error', 'PIN must contain only digits');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'New PIN and confirm PIN do not match');
      return;
    }

    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    try {
      setSaving(true);

      const response = await apiService.changePin({
        restaurantId,
        currentPin: currentPin.trim(),
        newPin: newPin.trim(),
      });

      if (response.success) {
        Alert.alert('Success', 'PIN changed successfully');
        setShowChangePinDialog(false);
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        // Clear PIN verification status to require re-verification
        const { databaseService } = await import('../../services/database');
        await databaseService.clearPinVerification(restaurantId);
      } else {
        Alert.alert('Error', response.message || response.error || 'Failed to change PIN');
      }
    } catch (error: any) {
      console.error('Error changing PIN:', error);
      const errorMessage =
        error.message || error.error || 'Failed to change PIN. Please try again.';
      
      if (errorMessage.includes('connect to internet')) {
        Alert.alert('Error', 'Please connect to internet');
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPin = () => {
    setShowChangePinDialog(false);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setShowCurrentPin(false);
    setShowNewPin(false);
    setShowConfirmPin(false);
  };

  const isPasswordValid = () => {
    return (
      currentPassword.trim() &&
      newPassword.trim() &&
      confirmPassword.trim() &&
      newPassword.length >= 6 &&
      newPassword === confirmPassword
    );
  };

  const isPinValid = () => {
    return (
      currentPin.trim() &&
      newPin.trim() &&
      confirmPin.trim() &&
      newPin.length >= 4 &&
      /^\d+$/.test(newPin) &&
      newPin === confirmPin
    );
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
          <Text style={styles.headerTitle}>Account Settings</Text>
          <Text style={styles.headerIcon}>👤</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Manage your account and security settings</Text>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* User Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Details</Text>
          <View style={styles.userInfoCard}>
            <View style={styles.userInfoRow}>
              <Text style={styles.userInfoLabel}>Email</Text>
              <Text style={styles.userInfoValue}>{userEmail}</Text>
            </View>
            <Text style={styles.userInfoNote}>Registered email (read-only)</Text>
          </View>
        </View>

        {/* Security Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security Settings</Text>
          
          <TouchableOpacity
            style={styles.securityButton}
            onPress={handleChangePassword}
            activeOpacity={0.7}
          >
            <View style={styles.securityButtonContent}>
              <Text style={styles.securityButtonIcon}>🔑</Text>
              <View style={styles.securityButtonTextContainer}>
                <Text style={styles.securityButtonTitle}>Change Password</Text>
                <Text style={styles.securityButtonDescription}>
                  Update your account password
                </Text>
              </View>
              <Text style={styles.securityButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.securityButton}
            onPress={handleChangePin}
            activeOpacity={0.7}
          >
            <View style={styles.securityButtonContent}>
              <Text style={styles.securityButtonIcon}>🔒</Text>
              <View style={styles.securityButtonTextContainer}>
                <Text style={styles.securityButtonTitle}>Change Settings PIN</Text>
                <Text style={styles.securityButtonDescription}>
                  Update your settings access PIN
                </Text>
              </View>
              <Text style={styles.securityButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Change Password Dialog */}
      <CustomDialog
        visible={showChangePasswordDialog}
        title="Change Password"
        onClose={handleCancelPassword}
        primaryButtonText="Change Password"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSavePassword}
        onSecondaryPress={handleCancelPassword}
        primaryButtonDisabled={saving || !isPasswordValid()}
      >
        <View style={styles.dialogContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Current Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showCurrentPassword}
                editable={!saving}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={saving}
              >
                <Text style={styles.eyeButtonText}>
                  {showCurrentPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              New Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password (min 6 characters)"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showNewPassword}
                editable={!saving}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPassword(!showNewPassword)}
                disabled={saving}
              >
                <Text style={styles.eyeButtonText}>
                  {showNewPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Confirm New Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirmPassword}
                editable={!saving}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={saving}
              >
                <Text style={styles.eyeButtonText}>
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
            {confirmPassword && newPassword !== confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}
          </View>
        </View>
      </CustomDialog>

      {/* Change PIN Dialog */}
      <CustomDialog
        visible={showChangePinDialog}
        title="Change Settings PIN"
        onClose={handleCancelPin}
        primaryButtonText="Change PIN"
        secondaryButtonText="Cancel"
        onPrimaryPress={handleSavePin}
        onSecondaryPress={handleCancelPin}
        primaryButtonDisabled={saving || !isPinValid()}
      >
        <View style={styles.dialogContent}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Current PIN <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={currentPin}
                onChangeText={setCurrentPin}
                placeholder="Enter current PIN"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showCurrentPin}
                keyboardType="numeric"
                maxLength={6}
                editable={!saving}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowCurrentPin(!showCurrentPin)}
                disabled={saving}
              >
                <Text style={styles.eyeButtonText}>
                  {showCurrentPin ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              New PIN <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPin}
                onChangeText={setNewPin}
                placeholder="Enter new PIN (min 4 digits)"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showNewPin}
                keyboardType="numeric"
                maxLength={6}
                editable={!saving}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowNewPin(!showNewPin)}
                disabled={saving}
              >
                <Text style={styles.eyeButtonText}>
                  {showNewPin ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
            {newPin && (!/^\d+$/.test(newPin) || newPin.length < 4) && (
              <Text style={styles.errorText}>
                PIN must be at least 4 digits and contain only numbers
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Confirm New PIN <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Confirm new PIN"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirmPin}
                keyboardType="numeric"
                maxLength={6}
                editable={!saving}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPin(!showConfirmPin)}
                disabled={saving}
              >
                <Text style={styles.eyeButtonText}>
                  {showConfirmPin ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
            {confirmPin && newPin !== confirmPin && (
              <Text style={styles.errorText}>PINs do not match</Text>
            )}
          </View>
        </View>
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
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
    marginBottom: 16,
  },
  userInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  userInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  userInfoNote: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  securityButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  securityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityButtonIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  securityButtonTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  securityButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  securityButtonDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  securityButtonArrow: {
    fontSize: 24,
    color: '#94a3b8',
    fontWeight: '300',
  },
  dialogContent: {
    paddingVertical: 8,
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
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 52,
  },
  passwordInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  eyeButton: {
    padding: 12,
  },
  eyeButtonText: {
    fontSize: 20,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default AccountScreen;

