/**
 * ZaykaBill POS - Login Screen Component
 * Clean and modern login form with email, password, and demo access
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { apiService, ApiError } from '../services/api';
import { authService } from '../services/auth';

const { width } = Dimensions.get('window');

interface LoginScreenProps {
  onLogin?: (email: string, password: string) => void;
  onGetDemo?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGetDemo }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    // Reset error
    setError(null);

    // Validation
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Call Android authentication API
      const response = await apiService.loginAndroid({
        email: email.trim(),
        password: password.trim(),
      });

      if (response.success && response.restaurant) {
        // Save authentication state
        await authService.saveAuth(response.restaurant);

        // Call parent handler if provided
        if (onLogin) {
          await onLogin(email.trim(), password.trim());
        }
      } else {
        setError(response.message || 'Login failed. Please try again.');
      }
    } catch (error: any) {
      const apiError = error as ApiError;
      
      // Handle different error types
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (apiError.status === 0 || apiError.message === 'Please connect to internet') {
        // Server is not running or network is unavailable
        errorMessage = 'Please connect to internet';
      } else if (apiError.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (apiError.status === 403) {
        errorMessage = 'This account is not authorized for Android login or has been suspended';
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }

      setError(errorMessage);
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetDemo = () => {
    if (onGetDemo) {
      onGetDemo();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and Brand Section */}
        <View style={styles.logoSection}>
          <Image
            source={require('../logo.png')}
            style={[
              styles.logo,
              {
                width: Math.min(width * 0.85, 600),
                height: Math.min(width * 0.85, 600),
              },
            ]}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>zaykaBill</Text>
          <Text style={styles.brandTagline}>Restaurant POS System</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, error && styles.inputError]}
              placeholder="Enter your email"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setError(null); // Clear error when user types
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordContainer, error && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError(null); // Clear error when user types
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing in...' : 'Login'}
            </Text>
          </TouchableOpacity>

          {/* Get Demo Button */}
          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleGetDemo}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.demoButtonText}>Get Demo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: -40, // Pull logo section up
  },
  logo: {
    marginBottom: -20, // Pull logo and text closer together
  },
  brandName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: -60, // Pull brand name up closer to logo
  },
  brandTagline: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '400',
  },
  formContainer: {
    width: '100%',
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
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#667eea',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  demoButton: {
    width: '100%',
    height: 56,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  demoButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
    letterSpacing: 0.5,
  },
});

export default LoginScreen;

