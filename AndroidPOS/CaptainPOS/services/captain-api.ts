/**
 * Captain POS - API Service
 * Captain app: auth (key), menu, tables (vacant), status (store open), order
 * On Android emulator, 10.0.2.2 is the host machine (localhost).
 * For a physical device, use your computer's IP (e.g. http://192.168.1.x:3000).
 */

const API_BASE_URL = 'http://10.0.2.2:3000';

export interface CaptainAuthResponse {
  token: string;
  captain: { id: string; name: string };
  restaurant: { id: string; name: string };
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  menuItems: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  sortOrder?: number;
}

export interface TableInfo {
  id: string;
  number: number;
  name: string;
  status: string;
}

export interface CaptainStatusResponse {
  isOpenForBusiness: boolean;
  restaurantName: string;
}

export interface CaptainOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface CaptainOrderResponse {
  success: boolean;
  isNewOrder?: boolean;
  isAddOn?: boolean;
  order?: {
    id: string;
    orderNumber: string;
    kotNumber?: number;
    tableName?: string;
    totalAmount?: number;
    additionalAmount?: number;
    status?: string;
  };
  message?: string;
}

class CaptainApiService {
  private baseUrl = API_BASE_URL;

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { token?: string } = {}
  ): Promise<T> {
    const { token, ...rest } = options;
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(rest.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { ...rest, headers });

    if (!response.ok) {
      let message = 'Request failed';
      try {
        const data = await response.json();
        message = data.error || message;
      } catch {
        if (response.status === 0 || !response.ok) {
          message = 'Please connect to internet';
        }
      }
      throw { message, status: response.status };
    }

    const data = await response.json().catch(() => ({}));
    return data as T;
  }

  async login(captainKey: string): Promise<CaptainAuthResponse> {
    return this.request<CaptainAuthResponse>('/api/captain/auth', {
      method: 'POST',
      body: JSON.stringify({ captainKey: captainKey.trim() }),
    });
  }

  async getMenu(token: string): Promise<{ menu: MenuCategory[] }> {
    return this.request<{ menu: MenuCategory[] }>('/api/captain/menu', {
      method: 'GET',
      token,
    });
  }

  async getTables(token: string): Promise<{ tables: TableInfo[] }> {
    return this.request<{ tables: TableInfo[] }>('/api/captain/tables', {
      method: 'GET',
      token,
    });
  }

  async getStatus(token: string): Promise<CaptainStatusResponse> {
    return this.request<CaptainStatusResponse>('/api/captain/status', {
      method: 'GET',
      token,
    });
  }

  async placeOrder(
    token: string,
    payload: {
      tableId: string;
      items: CaptainOrderItem[];
      subtotal: number;
      taxAmount: number;
      totalAmount: number;
      notes?: string;
    }
  ): Promise<CaptainOrderResponse> {
    return this.request<CaptainOrderResponse>('/api/captain/order', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  }
}

export const captainApiService = new CaptainApiService();
