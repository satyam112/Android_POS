/**
 * Captain POS - Auth Service
 * Stores captain token and session (key-based login only)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@captain_token';
const CAPTAIN_KEY = '@captain_profile';
const RESTAURANT_KEY = '@captain_restaurant';

export interface CaptainSession {
  token: string;
  captain: { id: string; name: string };
  restaurant: { id: string; name: string };
}

class CaptainAuthService {
  async saveSession(data: CaptainSession): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(CAPTAIN_KEY, JSON.stringify(data.captain));
    await AsyncStorage.setItem(RESTAURANT_KEY, JSON.stringify(data.restaurant));
  }

  async getSession(): Promise<CaptainSession | null> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const captainStr = await AsyncStorage.getItem(CAPTAIN_KEY);
    const restaurantStr = await AsyncStorage.getItem(RESTAURANT_KEY);
    if (!token || !captainStr || !restaurantStr) return null;
    try {
      return {
        token,
        captain: JSON.parse(captainStr),
        restaurant: JSON.parse(restaurantStr),
      };
    } catch {
      return null;
    }
  }

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  }

  async clearSession(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(CAPTAIN_KEY),
      AsyncStorage.removeItem(RESTAURANT_KEY),
    ]);
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session?.token;
  }
}

export const captainAuthService = new CaptainAuthService();
