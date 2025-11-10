/**
 * ZaykaBill POS - Android Application
 * Main App Component with Splash Screen
 * 
 * Copyright (c) 2024 ZaykaBill
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import GetDemoScreen from './components/GetDemoScreen';
import AppNavigator from './navigation/AppNavigator';
import { authService } from './services/auth';
import { databaseService } from './services/database';
import { permissionsService } from './services/permissions';
import { notificationService } from './services/notifications';

function App(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check for existing authentication and request permissions on app start
  useEffect(() => {
    const checkAuthAndPermissions = async () => {
      try {
        // Initialize notification channels (required for Android 8.0+)
        await notificationService.initialize();

        // Request required permissions (Bluetooth, Storage, and Notifications)
        await permissionsService.requestAllPermissions();

        // Check authentication
        const auth = await authService.getAuth();
        if (auth.isAuthenticated && auth.restaurant) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Error checking auth or permissions:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndPermissions();
  }, []);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  const handleLogin = async (email: string, password: string) => {
    // Login is handled by LoginScreen component via API service
    // This callback is called after successful login
    const auth = await authService.getAuth();
    if (auth.isAuthenticated) {
      setIsLoggedIn(true);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear authentication
      await authService.clearAuth();
      
      // Clear restaurant data from SQLite
      await databaseService.clearRestaurantData();
      
      // Reset state
      setIsLoggedIn(false);
    } catch (error) {
      console.error('Error logging out:', error);
      // Still reset state even if there's an error
      setIsLoggedIn(false);
    }
  };

  const handleGetDemoClick = () => {
    setShowDemo(true);
  };

  const handleDemoRequest = async (data: any) => {
    // TODO: Implement demo request submission logic here
    console.log('Demo request submitted:', data);
    // For now, just go back
    setShowDemo(false);
  };

  const handleBackFromDemo = () => {
    setShowDemo(false);
  };

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

  // Check authentication state (only if splash is done)
  if (isCheckingAuth) {
    // Show loading state while checking auth
    return null; // Or you can show a loading indicator
  }

  // Show demo screen if requested
  if (showDemo) {
    return (
      <GetDemoScreen
        onRequestDemo={handleDemoRequest}
        onBack={handleBackFromDemo}
      />
    );
  }

  // Show login screen if not authenticated
  if (!isLoggedIn) {
  return (
      <LoginScreen
        onLogin={handleLogin}
        onGetDemo={handleGetDemoClick}
      />
  );
}

  // Show main app with drawer navigation if authenticated
  return <AppNavigator onLogout={handleLogout} />;
}


export default App;