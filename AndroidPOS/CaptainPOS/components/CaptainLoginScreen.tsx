/**
 * Captain POS - Login (Captain Key only)
 * No username, password, or OTP. Key-based login only.
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
} from 'react-native';

const { width } = Dimensions.get('window');

interface CaptainLoginScreenProps {
  onLogin: (token: string) => void;
}

const CaptainLoginScreen: React.FC<CaptainLoginScreenProps> = ({ onLogin }) => {
  const [captainKey, setCaptainKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    const key = captainKey.trim();
    if (!key) {
      setError('Please enter your Captain Key');
      return;
    }

    setIsLoading(true);
    try {
      const { captainApiService } = await import('../services/captain-api');
      const { captainAuthService } = await import('../services/captain-auth');
      const data = await captainApiService.login(key);
      await captainAuthService.saveSession({
        token: data.token,
        captain: data.captain,
        restaurant: data.restaurant,
      });
      onLogin(data.token);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e.status === 401) {
        setError('Invalid Captain Key');
      } else {
        setError(e.message || 'Login failed. Check your key and connection.');
      }
    } finally {
      setIsLoading(false);
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
        <View style={styles.logoSection}>
          <Image
            source={require('../logo.png')}
            style={[styles.logo, { width: Math.min(width * 0.5, 280), height: Math.min(width * 0.5, 280) }]}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>zaykaBill</Text>
          <Text style={styles.brandTagline}>Captain – Table Orders</Text>
        </View>

        <View style={styles.formContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Captain Key</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Enter your Captain Key"
              placeholderTextColor="#94a3b8"
              value={captainKey}
              onChangeText={(v) => {
                setCaptainKey(v);
                setError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
    paddingBottom: 40,
  },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logo: { marginBottom: -10 },
  brandName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 1,
    marginBottom: 4,
  },
  brandTagline: { fontSize: 14, color: '#64748b', fontWeight: '400' },
  formContainer: { width: '100%' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
  },
  inputError: { borderColor: '#ef4444', borderWidth: 1.5 },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: { color: '#dc2626', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  loginButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#667eea',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  loginButtonText: { fontSize: 18, fontWeight: '600', color: '#fff' },
});

export default CaptainLoginScreen;
