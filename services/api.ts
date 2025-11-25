/**
 * ZaykaBill POS - API Service
 * Handles all API communication with the backend
 * 
 * Copyright (c) 2024 ZaykaBill
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// API Base URL Configuration
// Default to production domain (override via setBaseUrl when needed for development)
const API_BASE_URL = 'https://zaykabill.com';

// Export API_BASE_URL for use in other files
export { API_BASE_URL };

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RestaurantData {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone?: string;
  address?: string;
  platform: 'android';
  isActive: boolean;
  createdAt: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  restaurant?: RestaurantData;
}

export interface ApiError {
  message: string;
  status?: number;
}

class ApiService {
  private baseUrl: string;
  public API_BASE_URL = API_BASE_URL;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Set custom API base URL (useful for development)
   */
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * Get API base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Generic API request handler
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If JSON parsing fails, server might be down or returning HTML error page
          // Check status code - if 0 or network error, it's likely server is not running
          throw {
            message: 'Please connect to internet',
            status: 0,
          } as ApiError;
        }
        
        throw {
          message: errorData.message || 'An error occurred',
          status: response.status,
        } as ApiError;
      }

      // Parse JSON response
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, server might be returning non-JSON response (HTML error page)
        // This usually means server is not running properly
        throw {
          message: 'Please connect to internet',
          status: 0,
        } as ApiError;
      }

      return data;
    } catch (error: unknown) {
      // Type guard for error objects
      const isErrorWithMessage = (err: unknown): err is { message: string; status?: number } => {
        return typeof err === 'object' && err !== null && 'message' in err;
      };
      
      // If error is already an ApiError with status 0, rethrow it
      if (isErrorWithMessage(error) && error.status === 0 && error.message === 'Please connect to internet') {
        throw error;
      }
      
      // Handle network/server unavailable errors
      const errorMessage = isErrorWithMessage(error) ? error.message : String(error);
      const errorStatus = isErrorWithMessage(error) ? error.status : undefined;
      
      const isNetworkError = 
        errorMessage === 'Network request failed' ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection') ||
        errorStatus === 0 ||
        error instanceof TypeError;

      if (isNetworkError) {
        throw {
          message: 'Please connect to internet',
          status: 0,
        } as ApiError;
      }

      // Handle other errors
      throw {
        message: isErrorWithMessage(error) ? error.message : 'An unexpected error occurred',
        status: errorStatus,
      } as ApiError;
    }
  }

  /**
   * Login with email and password for Android restaurants
   * Uses the android-credentials-login endpoint with login_type filter
   */
  async loginAndroid(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/auth/android-credentials-login', {
      method: 'POST',
      body: JSON.stringify({
        email: credentials.email.toLowerCase().trim(),
        password: credentials.password,
        login_type: 'android', // Explicitly set login type
      }),
    });
  }

  /**
   * Request demo - Submit demo request from Android app
   */
  async requestDemo(demoData: {
    fullName: string;
    phoneNumber: string;
    email: string;
    restaurantName: string;
    additionalMessage?: string;
  }): Promise<{ demoRequest?: any; error?: string }> {
    try {
      const response = await this.request<{ demoRequest?: any; error?: string }>(
        '/api/demo-requests-simple',
        {
          method: 'POST',
          body: JSON.stringify({
            name: demoData.fullName,
            phone: demoData.phoneNumber,
            email: demoData.email.toLowerCase().trim(),
            restaurantName: demoData.restaurantName,
            message: demoData.additionalMessage || null,
            platform: 'android', // Explicitly mark as Android platform
            source: 'android', // Mark source as Android app
          }),
        }
      );
      return response;
    } catch (error: any) {
      return {
        error: error.message || 'Failed to submit demo request',
      };
    }
  }

  /**
   * Get restaurant details (name, logo) for Android app
   */
  async getRestaurantDetails(restaurantId: string): Promise<{
    success: boolean;
    restaurant?: {
      id: string;
      name: string;
      logoUrl: string | null;
    };
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        restaurant?: {
          id: string;
          name: string;
          logoUrl: string | null;
        };
        error?: string;
      }>(`/api/android/restaurant-details?restaurantId=${restaurantId}`, {
        method: 'GET',
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch restaurant details',
      };
    }
  }

  /**
   * Verify PIN for Android restaurant settings access
   */
  async verifyPin(restaurantId: string, pin: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        message?: string;
        error?: string;
      }>('/api/android/verify-pin', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId,
          pin,
        }),
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to verify PIN',
      };
    }
  }

  /**
   * Change password for Android restaurant
   */
  async changePassword(data: {
    restaurantId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        message?: string;
        error?: string;
      }>('/api/android/change-password', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: data.restaurantId,
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to change password',
      };
    }
  }

  /**
   * Change PIN for Android restaurant settings
   */
  async changePin(data: {
    restaurantId: string;
    currentPin: string;
    newPin: string;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        message?: string;
        error?: string;
      }>('/api/android/security', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId: data.restaurantId,
          settingsPin: data.currentPin,
          newSettingsPin: data.newPin,
        }),
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to change PIN',
      };
    }
  }

  /**
   * Sync data from Android to server (POST)
   * Used for uploading local changes to server
   */
  async syncData(
    restaurantId: string,
    operation: string,
    syncData: any[]
  ): Promise<{
    success: boolean;
    message?: string;
    syncedRecords?: number;
    timestamp?: string;
    error?: string;
  }> {
    try {
      console.log(`[API] Syncing ${syncData.length} ${operation} records to server`);
      console.log(`[API] Restaurant ID: ${restaurantId}`);
      console.log(`[API] Operation: ${operation}`);
      console.log(`[API] Data count: ${syncData.length}`);
      
      if (syncData.length > 0 && operation === 'orders') {
        console.log(`[API] Sample order data:`, JSON.stringify(syncData[0], null, 2));
      }
      
      const response = await this.request<{
        success: boolean;
        message?: string;
        syncedRecords?: number;
        timestamp?: string;
      }>('/api/android/sync', {
        method: 'POST',
        body: JSON.stringify({
          restaurantId,
          operation,
          syncData,
        }),
      });
      
      console.log(`[API] ${operation} sync response:`, response);
      return response;
    } catch (error: any) {
      console.error(`[API] Error syncing ${operation}:`, error);
      console.error(`[API] Error details:`, {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      return {
        success: false,
        error: error.message || 'Failed to sync data',
      };
    }
  }

  /**
   * Get data from server to Android (GET)
   * Used for downloading latest data from server
   */
  async syncGetData(
    restaurantId: string,
    operation: string
  ): Promise<{
    success: boolean;
    data?: any[];
    timestamp?: string;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        data?: any[];
        timestamp?: string;
      }>(`/api/android/sync?restaurantId=${restaurantId}&operation=${operation}`, {
        method: 'GET',
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch data',
      };
    }
  }

  /**
   * Get notifications for Android restaurant (filtered by platform)
   */
  async getNotifications(restaurantId: string): Promise<{
    success: boolean;
    notifications?: Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      isRead: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        notifications?: Array<{
          id: string;
          title: string;
          message: string;
          type: string;
          isRead: boolean;
          createdAt: string;
          updatedAt: string;
        }>;
      }>(`/api/android/notifications?restaurantId=${restaurantId}`, {
        method: 'GET',
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch notifications',
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        message?: string;
      }>('/api/android/notifications/mark-read', {
        method: 'PATCH',
        body: JSON.stringify({
          notificationId,
        }),
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark notification as read',
      };
    }
  }

  /**
   * Get restaurant data including settings
   */
  async getRestaurantData(restaurantId: string): Promise<{
    success: boolean;
    restaurant?: {
      id: string;
      name: string;
      settings?: {
        subdomain?: string;
        bannerImage?: string;
        restaurantImages?: string[];
        tagline?: string;
        aboutUs?: string;
        socialMedia?: {
          instagram?: string;
          facebook?: string;
          twitter?: string;
        };
        [key: string]: any;
      };
      [key: string]: any;
    };
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        restaurant?: any;
      }>(`/api/restaurant-data?restaurantId=${restaurantId}`, {
        method: 'GET',
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch restaurant data',
      };
    }
  }

  /**
   * Update restaurant settings (Go Online settings)
   */
  async updateRestaurantSettings(
    restaurantId: string,
    settings: {
      subdomain?: string;
      bannerImage?: string;
      restaurantImages?: string[];
      tagline?: string;
      aboutUs?: string;
      socialMedia?: {
        instagram?: string;
        facebook?: string;
        twitter?: string;
      };
    }
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      if (!restaurantId) {
        console.error('[API] Restaurant ID is missing!');
        return {
          success: false,
          error: 'Restaurant ID is required'
        };
      }
      
      // Ensure restaurantId is included in data object
      const settingsData: any = {
        restaurantId: restaurantId, // Include restaurantId for Android authentication - MUST be first
        subdomain: settings.subdomain,
        bannerImage: settings.bannerImage,
        restaurantImages: settings.restaurantImages,
        tagline: settings.tagline,
        aboutUs: settings.aboutUs,
        socialMedia: settings.socialMedia,
      };
      
      const requestBody = {
        type: 'update_settings',
        data: settingsData,
      };
      
      // Include restaurantId in query parameter as fallback
      const endpoint = `/api/restaurant-data?restaurantId=${encodeURIComponent(restaurantId)}`;
      
      console.log('[API] Updating restaurant settings:', {
        restaurantId,
        restaurantIdInData: requestBody.data.restaurantId,
        endpoint: endpoint,
        hasSubdomain: !!settings.subdomain,
        hasBannerImage: !!settings.bannerImage,
        restaurantImagesCount: settings.restaurantImages?.length || 0,
        hasTagline: !!settings.tagline,
        hasAboutUs: !!settings.aboutUs,
        requestBodyKeys: Object.keys(requestBody),
        dataKeys: Object.keys(requestBody.data),
        dataHasRestaurantId: 'restaurantId' in requestBody.data,
        fullUrl: `${this.baseUrl}${endpoint}`,
      });
      
      const response = await this.request<{
        success: boolean;
        message?: string;
      }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      return response;
    } catch (error: any) {
      console.error('[API] Error updating restaurant settings:', error);
      return {
        success: false,
        error: error.message || 'Failed to update restaurant settings',
      };
    }
  }

  /**
   * Get aggregator orders
   */
  async getAggregatorOrders(): Promise<{
    success: boolean;
    orders?: any[];
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        orders?: any[];
      }>('/api/aggregators/orders', {
        method: 'GET',
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch aggregator orders',
      };
    }
  }

  /**
   * Get aggregator config
   */
  async getAggregatorConfig(provider: 'zomato' | 'swiggy'): Promise<{
    success: boolean;
    config?: any;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        config?: any;
      }>(`/api/aggregators/config?provider=${provider}`, {
        method: 'GET',
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch aggregator config',
      };
    }
  }

  /**
   * Save aggregator config
   */
  async saveAggregatorConfig(config: {
    provider: 'zomato' | 'swiggy';
    apiKey?: string;
    secretKey?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    autoAccept?: boolean;
    statusUpdate?: boolean;
    enabled?: boolean;
  }): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await this.request<{
        success: boolean;
        message?: string;
      }>('/api/aggregators/config', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save aggregator config',
      };
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

