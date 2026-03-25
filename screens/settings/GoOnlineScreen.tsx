/**
 * ZaykaBill POS - Go Online Screen
 * Configure subdomain, branding, and social media for online ordering
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { authService } from '../../services/auth';
import { apiService } from '../../services/api';
import { restaurantSettingsService } from '../../services/database-methods';

interface GoOnlineScreenProps {
  onBack?: () => void;
}

const GoOnlineScreen: React.FC<GoOnlineScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  
  // Subdomain
  const [subdomain, setSubdomain] = useState('');
  
  // Branding
  const [bannerImage, setBannerImage] = useState('');
  const [restaurantImages, setRestaurantImages] = useState<string[]>([]);
  const [tagline, setTagline] = useState('');
  const [aboutUs, setAboutUs] = useState('');
  
  // Social Media
  const [socialMedia, setSocialMedia] = useState({
    instagram: '',
    facebook: '',
    twitter: '',
  });

  useEffect(() => {
    loadRestaurantData();
  }, []);

  const domainPreview = subdomain.trim()
    ? `https://${subdomain.trim().toLowerCase()}.zaykabill.com`
    : 'https://your-subdomain.zaykabill.com';

  const loadRestaurantData = async () => {
    try {
      setLoading(true);
      const auth = await authService.getAuth();
      if (!auth.isAuthenticated || !auth.restaurant?.id) {
        Alert.alert('Error', 'Please login again');
        setLoading(false);
        return;
      }

      setRestaurantId(auth.restaurant.id);

      // First, try to load from local database (for offline access)
      try {
        const localSettings = await restaurantSettingsService.get(auth.restaurant.id);
        if (localSettings) {
          // Load from local database - show data immediately
          if (localSettings.subdomain) {
            setSubdomain(localSettings.subdomain);
          }
          if (localSettings.bannerImage) {
            setBannerImage(localSettings.bannerImage);
          }
          if (localSettings.restaurantImages && Array.isArray(localSettings.restaurantImages)) {
            setRestaurantImages(localSettings.restaurantImages);
          }
          if (localSettings.tagline) {
            setTagline(localSettings.tagline);
          }
          if (localSettings.aboutUs) {
            setAboutUs(localSettings.aboutUs);
          }
          if (localSettings.socialMedia) {
            setSocialMedia({
              instagram: localSettings.socialMedia.instagram || '',
              facebook: localSettings.socialMedia.facebook || '',
              twitter: localSettings.socialMedia.twitter || '',
            });
          }
          // Set loading to false after loading local data so UI shows immediately
          setLoading(false);
        } else {
          // No local data, keep loading until server data arrives
        }
      } catch (error) {
        console.error('Error loading local restaurant settings:', error);
        // Continue to try server fetch
      }

      // Then, fetch from server and update if available (in background)
      try {
        const response = await apiService.getRestaurantData(auth.restaurant.id);
        if (response.success && response.restaurant) {
          const settings = response.restaurant.settings || {};
          
          // Update state with server data (overwrites local if different)
          if (settings.subdomain !== undefined) {
            setSubdomain(settings.subdomain || '');
          }
          if (settings.bannerImage !== undefined) {
            setBannerImage(settings.bannerImage || '');
          }
          if (settings.restaurantImages !== undefined) {
            setRestaurantImages(Array.isArray(settings.restaurantImages) ? settings.restaurantImages : []);
          }
          if (settings.tagline !== undefined) {
            setTagline(settings.tagline || '');
          }
          if (settings.aboutUs !== undefined) {
            setAboutUs(settings.aboutUs || '');
          }
          if (settings.socialMedia !== undefined) {
            setSocialMedia({
              instagram: settings.socialMedia?.instagram || '',
              facebook: settings.socialMedia?.facebook || '',
              twitter: settings.socialMedia?.twitter || '',
            });
          }

          // Save server data to local database
          await restaurantSettingsService.save(auth.restaurant.id, {
            subdomain: settings.subdomain,
            bannerImage: settings.bannerImage,
            restaurantImages: settings.restaurantImages,
            tagline: settings.tagline,
            aboutUs: settings.aboutUs,
            socialMedia: settings.socialMedia,
          });
        }
      } catch (error) {
        console.error('Error loading restaurant data from server:', error);
        // Continue with local values if offline - no error shown to user
      } finally {
        // Ensure loading is set to false even if server fetch fails
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading restaurant data:', error);
      setLoading(false);
      // Don't show error alert if we have local data - just log it
      const auth = await authService.getAuth();
      if (auth.isAuthenticated && auth.restaurant?.id) {
        const localSettings = await restaurantSettingsService.get(auth.restaurant.id);
        if (!localSettings) {
          // Only show error if we have no local data at all
          Alert.alert('Error', 'Failed to load restaurant data. Please check your internet connection.');
        }
      }
    }
  };

  const requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 33) {
          // Android 13+ uses granular permissions
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          // Android 12 and below
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  };

  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      // If already a data URI, return as-is
      if (uri.startsWith('data:')) {
        return uri;
      }
      
      // For file:// URIs, read the file and convert to base64
      // Using React Native's fetch API
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Convert blob to base64 using FileReader (available in React Native)
      return new Promise((resolve, reject) => {
        const reader = new (global as any).FileReader();
        if (!reader) {
          // Fallback: return uri if FileReader is not available
          resolve(uri);
          return;
        }
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read image file'));
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      // Fallback: return the uri as-is
      return uri;
    }
  };

  const handleBannerImageUpload = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant storage permissions to upload images');
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo' as MediaType,
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
        selectionLimit: 1,
        includeBase64: true, // Get base64 directly from image picker
      },
      async (response: ImagePickerResponse) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorMessage) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (asset.base64 && asset.uri) {
            // Use base64 from image picker if available
            const base64Image = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
            setBannerImage(base64Image);
          } else if (asset.uri) {
            // Fallback: convert uri to base64
            try {
              const base64Image = await convertImageToBase64(asset.uri);
              setBannerImage(base64Image);
            } catch (error) {
              Alert.alert('Error', 'Failed to process image. Please try again.');
            }
          }
        }
      }
    );
  };

  const handleRestaurantImageUpload = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant storage permissions to upload images');
      return;
    }

    launchImageLibrary(
      {
        mediaType: 'photo' as MediaType,
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
        selectionLimit: 1,
        includeBase64: true, // Get base64 directly from image picker
      },
      async (response: ImagePickerResponse) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorMessage) {
          Alert.alert('Error', response.errorMessage);
          return;
        }
        if (response.assets && response.assets.length > 0) {
          const asset = response.assets[0];
          if (asset.base64 && asset.uri) {
            // Use base64 from image picker if available
            const base64Image = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
            setRestaurantImages(prev => [...prev, base64Image]);
          } else if (asset.uri) {
            // Fallback: convert uri to base64
            try {
              const base64Image = await convertImageToBase64(asset.uri);
              setRestaurantImages(prev => [...prev, base64Image]);
            } catch (error) {
              Alert.alert('Error', 'Failed to process image. Please try again.');
            }
          }
        }
      }
    );
  };

  const removeRestaurantImage = (index: number) => {
    setRestaurantImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant ID not found');
      return;
    }

    const normalizedSubdomain = subdomain.trim().toLowerCase();

    // Validate subdomain if provided
    if (normalizedSubdomain) {
      const subdomainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
      if (!subdomainRegex.test(normalizedSubdomain)) {
        Alert.alert('Error', 'Subdomain can only contain lowercase letters, numbers, and hyphens. It cannot start or end with a hyphen.');
        return;
      }
    }

    try {
      setSaving(true);

      // Prepare settings data
      const settingsData = {
        subdomain: normalizedSubdomain ? normalizedSubdomain : null,
        bannerImage: bannerImage.trim(),
        restaurantImages: restaurantImages.filter(img => img.trim() !== ''),
        tagline: tagline.trim(),
        aboutUs: aboutUs.trim(),
        socialMedia: {
          instagram: socialMedia.instagram.trim(),
          facebook: socialMedia.facebook.trim(),
          twitter: socialMedia.twitter.trim(),
        },
      };

      // Save to server first to ensure validation (especially for subdomain uniqueness)
      try {
        const response = await apiService.updateRestaurantSettings(restaurantId, settingsData);

        if (response.success) {
          await restaurantSettingsService.save(restaurantId, settingsData);
          Alert.alert('Success', 'Go Online settings saved successfully!');
        } else {
          Alert.alert('Error', response.error || response.message || 'Failed to save settings to server.');
          await loadRestaurantData();
          return;
        }
      } catch (error: any) {
        // Offline fallback: store locally so the user doesn't lose changes
        try {
          await restaurantSettingsService.save(restaurantId, settingsData);
        } catch (localError) {
          console.error('Error saving to local database:', localError);
        }

        Alert.alert(
          'Warning',
          'Settings saved locally but failed to sync with server. Please check your internet connection and sync later.'
        );
      }
      return;
    } catch (error: any) {
      console.error('Error saving Go Online settings:', error);
      Alert.alert('Error', error.message || 'Failed to save settings. Please check your internet connection.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>Go Online</Text>
        <View style={styles.headerIconContainer}>
          <Text style={styles.headerIcon}>🌐</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subdomain Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subdomain</Text>
          <Text style={styles.sectionDescription}>
            Create a custom subdomain for your restaurant's online ordering page
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., myrestaurant"
            value={subdomain}
            onChangeText={setSubdomain}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={50}
          />
          <Text style={styles.helperText}>
            Your restaurant will be accessible at: {domainPreview}
          </Text>
        </View>

        {/* Branding Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant Branding</Text>

          {/* Tagline */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Tagline / Short Description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Authentic flavors, served with love"
              value={tagline}
              onChangeText={setTagline}
              maxLength={100}
            />
            <Text style={styles.helperText}>
              A short, catchy tagline that appears below your restaurant name. Max 100 characters.
            </Text>
          </View>

          {/* About Us */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>About Us</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell your customers about your restaurant, your story, and what makes you special..."
              value={aboutUs}
              onChangeText={setAboutUs}
              multiline
              numberOfLines={5}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.helperText}>
              {aboutUs.length}/500 characters. This will be displayed in an "About Us" section on your subdomain page.
            </Text>
          </View>

          {/* Banner Image */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Banner Image</Text>
            {bannerImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: bannerImage }} style={styles.bannerPreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setBannerImage('')}
                >
                  <Text style={styles.removeImageButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleBannerImageUpload}
            >
              <Text style={styles.uploadButtonText}>
                {bannerImage ? 'Change Banner Image' : 'Upload Banner Image'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Upload a banner image that will be displayed at the top of your subdomain page. Max size: 5MB
            </Text>
          </View>

          {/* Restaurant Images Gallery */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Restaurant Images Gallery</Text>
            {restaurantImages.length > 0 && (
              <View style={styles.imagesGrid}>
                {restaurantImages.map((img, index) => (
                  <View key={index} style={styles.imageItem}>
                    <Image source={{ uri: img }} style={styles.galleryImage} />
                    <TouchableOpacity
                      style={styles.removeGalleryImageButton}
                      onPress={() => removeRestaurantImage(index)}
                    >
                      <Text style={styles.removeGalleryImageButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleRestaurantImageUpload}
            >
              <Text style={styles.uploadButtonText}>
                {restaurantImages.length > 0 ? 'Add More Images' : 'Upload Restaurant Images'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              Upload multiple images (food, ambience, etc.) that will be displayed in a gallery on your subdomain page. Max size per image: 5MB
            </Text>
          </View>
        </View>

        {/* Social Media Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Media Links</Text>
          <Text style={styles.sectionDescription}>
            Add your social media links to display on your subdomain page
          </Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Instagram</Text>
            <TextInput
              style={styles.input}
              placeholder="https://instagram.com/yourrestaurant"
              value={socialMedia.instagram}
              onChangeText={(text) => setSocialMedia(prev => ({ ...prev, instagram: text }))}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Facebook</Text>
            <TextInput
              style={styles.input}
              placeholder="https://facebook.com/yourrestaurant"
              value={socialMedia.facebook}
              onChangeText={(text) => setSocialMedia(prev => ({ ...prev, facebook: text }))}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>X (Twitter)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://twitter.com/yourrestaurant"
              value={socialMedia.twitter}
              onChangeText={(text) => setSocialMedia(prev => ({ ...prev, twitter: text }))}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'absolute',
    left: 20,
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 8 : 28,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
    marginLeft: 40, // Space for back button
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    lineHeight: 20,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1a202c',
    minHeight: 48,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
  imagePreviewContainer: {
    marginBottom: 12,
  },
  bannerPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  removeImageButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  removeImageButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  imageItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  removeGalleryImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeGalleryImageButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1a202c',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalButtonCancelText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSubmit: {
    backgroundColor: '#10b981',
  },
  modalButtonSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GoOnlineScreen;

