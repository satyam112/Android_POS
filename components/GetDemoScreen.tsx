/**
 * ZaykaBill POS - Get Demo Screen Component
 * Clean form for requesting a demo with feature highlights
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  StatusBar,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { apiService } from '../services/api';

const { width } = Dimensions.get('window');

interface GetDemoScreenProps {
  onRequestDemo?: (data: DemoFormData) => void;
  onBack?: () => void;
}

interface DemoFormData {
  fullName: string;
  phoneNumber: string;
  email: string;
  restaurantName: string;
  additionalMessage: string;
}

const GetDemoScreen: React.FC<GetDemoScreenProps> = ({
  onRequestDemo,
  onBack,
}) => {
  const [formData, setFormData] = useState<DemoFormData>({
    fullName: '',
    phoneNumber: '',
    email: '',
    restaurantName: '',
    additionalMessage: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof DemoFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRequestDemo = async () => {
    setError(null);
    
    // Validate required fields
    if (!formData.fullName.trim() || !formData.phoneNumber.trim() || 
        !formData.email.trim() || !formData.restaurantName.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate phone number (basic check)
    if (formData.phoneNumber.trim().length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.requestDemo({
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim(),
        restaurantName: formData.restaurantName.trim(),
        additionalMessage: formData.additionalMessage.trim() || undefined,
      });

      if (response.demoRequest) {
        // Show success message
        Alert.alert(
          'Demo Request Submitted',
          'Thank you for your interest! We\'ll contact you soon to schedule your demo.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to login screen
                if (onBack) {
                  onBack();
                }
              },
            },
          ]
        );
      } else {
        setError(response.error || 'Failed to submit demo request. Please try again.');
      }
    } catch (error: any) {
      console.error('Demo request error:', error);
      
      // Check if it's a network/server error
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (error.status === 0 || error.message === 'Please connect to internet' || 
          error.message?.includes('Network') || error.message?.includes('fetch failed')) {
        errorMessage = 'Please connect to internet';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      // Show error alert
      Alert.alert(
        'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const demoFeatures = [
    'Complete walkthrough of all POS features',
    'QR code ordering demonstration',
    'Kitchen management system overview',
    'Reporting and analytics showcase',
    'Pricing and implementation discussion',
    'Q&A session tailored to your needs',
  ];

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
                width: Math.min(width * 0.4, 250),
                height: Math.min(width * 0.4, 250),
              },
            ]}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>zaykaBill</Text>
          <Text style={styles.brandTagline}>Restaurant POS System</Text>
        </View>

        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.heading}>Get Your Free Demo</Text>
          <Text style={styles.subtext}>
            See how our ZaykaBill POS system can transform your business. Fill
            out the form below, and we'll schedule a personalized demo for you.
          </Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Full Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor="#94a3b8"
              value={formData.fullName}
              onChangeText={(value) => handleInputChange('fullName', value)}
              editable={!isLoading}
            />
          </View>

          {/* Phone Number */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              placeholderTextColor="#94a3b8"
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange('phoneNumber', value)}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>

          {/* Email Address */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              placeholderTextColor="#94a3b8"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Restaurant Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Restaurant Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your restaurant name"
              placeholderTextColor="#94a3b8"
              value={formData.restaurantName}
              onChangeText={(value) =>
                handleInputChange('restaurantName', value)
              }
              editable={!isLoading}
            />
          </View>

          {/* Additional Message */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Additional Message <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional information or questions..."
              placeholderTextColor="#94a3b8"
              value={formData.additionalMessage}
              onChangeText={(value) =>
                handleInputChange('additionalMessage', value)
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Request Demo Button */}
          <TouchableOpacity
            style={[styles.requestButton, isLoading && styles.buttonDisabled]}
            onPress={handleRequestDemo}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.requestButtonText}>
              {isLoading ? 'Submitting...' : 'Request For Demo'}
            </Text>
          </TouchableOpacity>

          {/* Go Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Text style={styles.backButtonText}>← Go Back</Text>
          </TouchableOpacity>
        </View>

        {/* What You'll Get Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresHeading}>What you'll get in the demo:</Text>
          <View style={styles.featuresList}>
            {demoFeatures.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
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
  backButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#667eea',
    marginTop: 12,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 20 : 40,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: -40,
  },
  logo: {
    marginBottom: -20,
  },
  brandName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1e293b',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: -40, // Increased from -60 to push text away from logo (fix 20px overlap)
  },
  brandTagline: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '400',
  },
  headerSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  formSection: {
    marginBottom: 40,
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
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: '#94a3b8',
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
  textArea: {
    height: 120,
    paddingTop: 16,
    paddingBottom: 16,
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
  requestButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#667eea',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  requestButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  featuresSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featuresHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  featuresList: {
    // gap handled by marginBottom on featureItem
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkmark: {
    fontSize: 18,
    color: '#667eea',
    fontWeight: '700',
    marginRight: 12,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
  },
});

export default GetDemoScreen;

