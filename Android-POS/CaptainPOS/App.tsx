/**
 * Zayka Captain - Captain ordering app
 * Splash → Captain Key login → Menu (with cart) / Cart (table select, place order)
 */

import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen from './components/SplashScreen';
import CaptainLoginScreen from './components/CaptainLoginScreen';
import CaptainMenuScreen from './screens/CaptainMenuScreen';
import CaptainCartScreen from './screens/CaptainCartScreen';
import { captainAuthService } from './services/captain-auth';
import type { CartItem } from './screens/CaptainMenuScreen';

type Screen = 'menu' | 'cart';

function App(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('menu');
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await captainAuthService.getSession();
        if (session?.token) {
          setToken(session.token);
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.warn('Auth check failed:', e);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const handleSplashComplete = () => setShowSplash(false);

  const handleLogin = (loginToken: string) => {
    setToken(loginToken);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await captainAuthService.clearSession();
    setToken(null);
    setIsLoggedIn(false);
    setCart([]);
    setScreen('menu');
  };

  const handleOpenCart = () => setScreen('cart');
  const handleBackFromCart = () => setScreen('menu');
  const handleOrderPlaced = () => {
    setCart([]);
    setScreen('menu');
  };

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onAnimationComplete={handleSplashComplete} />
      </SafeAreaProvider>
    );
  }

  if (isCheckingAuth) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }} />
      </SafeAreaProvider>
    );
  }

  if (!isLoggedIn || !token) {
    return (
      <SafeAreaProvider>
        <CaptainLoginScreen onLogin={handleLogin} />
      </SafeAreaProvider>
    );
  }

  const addToCart = (item: { id: string; name: string; price: number }, qty: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && !i.notes);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && !i.notes ? { ...i, quantity: i.quantity + qty } : i
        );
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: qty }];
    });
  };

  if (screen === 'cart') {
    return (
      <SafeAreaProvider>
        <CaptainCartScreen
          token={token}
          cart={cart}
          onBack={handleBackFromCart}
          onOrderPlaced={handleOrderPlaced}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <CaptainMenuScreen
        token={token}
        cart={cart}
        addToCart={addToCart}
        onOpenCart={handleOpenCart}
      />
    </SafeAreaProvider>
  );
}

export default App;
