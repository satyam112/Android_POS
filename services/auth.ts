/**
 * ZaykaBill POS - Authentication Service
 * Handles authentication state and token storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { RestaurantData } from './api';

const AUTH_STORAGE_KEY = '@zaykabill_auth';
const RESTAURANT_STORAGE_KEY = '@zaykabill_restaurant';

export interface AuthState {
  isAuthenticated: boolean;
  restaurant: RestaurantData | null;
}

class AuthService {
  /**
   * Save authentication state and restaurant data
   */
  async saveAuth(restaurant: RestaurantData): Promise<void> {
    try {
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ isAuthenticated: true })
      );
      await AsyncStorage.setItem(
        RESTAURANT_STORAGE_KEY,
        JSON.stringify(restaurant)
      );
    } catch (error) {
      console.error('Error saving auth:', error);
      throw error;
    }
  }

  /**
   * Get stored authentication state
   */
  async getAuth(): Promise<AuthState> {
    try {
      const [authData, restaurantData] = await Promise.all([
        AsyncStorage.getItem(AUTH_STORAGE_KEY),
        AsyncStorage.getItem(RESTAURANT_STORAGE_KEY),
      ]);

      if (authData && restaurantData) {
        const auth = JSON.parse(authData);
        const restaurant = JSON.parse(restaurantData);

        return {
          isAuthenticated: auth.isAuthenticated,
          restaurant,
        };
      }

      return {
        isAuthenticated: false,
        restaurant: null,
      };
    } catch (error) {
      console.error('Error getting auth:', error);
      return {
        isAuthenticated: false,
        restaurant: null,
      };
    }
  }

  /**
   * Clear authentication state (logout)
   */
  async clearAuth(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_STORAGE_KEY),
        AsyncStorage.removeItem(RESTAURANT_STORAGE_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing auth:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const auth = await this.getAuth();
    return auth.isAuthenticated && auth.restaurant !== null;
  }
}

// Export singleton instance
export const authService = new AuthService();


