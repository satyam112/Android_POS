/**
 * ZaykaBill POS - PIN Verification Screen
 * Displays a minimalistic authentication screen for Settings access
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { apiService } from '../services/api';
import { authService } from '../services/auth';
import { databaseService } from '../services/database';

interface PinVerificationScreenProps {
  onVerified: () => void;
}

const PinVerificationScreen: React.FC<PinVerificationScreenProps> = ({
  onVerified,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showPin, setShowPin] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePinChange = (value: string) => {
    // Only allow digits, max 6 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setPin(numericValue);
    if (error && numericValue.length > 0) {
      setError('');
    }
  };

  const handleVerify = async () => {
    if (!pin || pin.length < 4) {
      setError('Please enter a valid PIN (minimum 4 digits)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get restaurant ID from auth
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        setError('Please login again');
        setIsLoading(false);
        return;
      }

      // Verify PIN with server
      const response = await apiService.verifyPin(auth.restaurant.id, pin);

      if (response.success) {
        // Save PIN verification to SQLite
        await databaseService.savePinVerification(auth.restaurant.id);

        // Animate transition
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Reset attempts on success
          setAttempts(0);
          onVerified();
        });
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setError(
            `Access blocked after ${MAX_ATTEMPTS} failed attempts. Please contact administrator.`
          );
          setPin('');
        } else {
          setError(
            `Invalid PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`
          );
          setPin('');
        }
      }
    } catch (error: any) {
      console.error('PIN verification error:', error);
      const errorMessage =
        error.message || error.error || 'Failed to verify PIN. Please try again.';
      
      if (errorMessage.includes('connect to internet')) {
        setError('Please connect to internet');
      } else {
        setError(errorMessage);
      }
      
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const isBlocked = attempts >= MAX_ATTEMPTS;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Settings Access</Text>
          <Text style={styles.subtitle}>Enter Security PIN</Text>
        </View>

        {/* PIN Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Enter PIN"
            placeholderTextColor="#94a3b8"
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="numeric"
            secureTextEntry={!showPin}
            maxLength={6}
            editable={!isLoading && !isBlocked}
            autoFocus
            onSubmitEditing={handleVerify}
          />
          
          {/* Show/Hide PIN Toggle */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setShowPin(!showPin)}
            disabled={isLoading || isBlocked}
          >
            <Text style={styles.toggleText}>{showPin ? '👁️‍🗨️' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (isLoading || isBlocked || pin.length < 4) && styles.buttonDisabled,
          ]}
          onPress={handleVerify}
          disabled={isLoading || isBlocked || pin.length < 4}
          activeOpacity={0.8}
        >
          <Text style={styles.verifyButtonText}>
            {isLoading ? 'Verifying...' : 'Verify PIN'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingRight: 60,
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  toggleButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 8,
  },
  toggleText: {
    fontSize: 20,
  },
  errorContainer: {
    width: '100%',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
    textAlign: 'center',
  },
  verifyButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
    letterSpacing: 0.5,
  },
});

export default PinVerificationScreen;

