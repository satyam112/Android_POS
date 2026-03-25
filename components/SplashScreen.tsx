/**
 * ZaykaBill POS - Splash Screen Component
 * Displays animated logo and "Zaykabill" text with smooth transitions
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(50)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start all animations in sequence
    const animationSequence = Animated.sequence([
      // Background fade in
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Logo entrance with scale, opacity, and rotation
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      // Text entrance
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]);

    // Start pulse animation (continuous)
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1 }
    );

    // Run animations
    animationSequence.start();
    pulseAnimation.start();

    // Navigate to main app after animation completes
    const timer = setTimeout(() => {
      // Fade out animation before navigating
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onAnimationComplete();
      });
    }, 3000); // Show splash for 3 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [onAnimationComplete]);

  // Rotation interpolation
  const logoRotationInterpolate = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate logo size responsively - using larger size since logo is 1024x1024
  const logoSize = Math.min(width * 0.85, 600); // 85% of screen width, max 600px
  const logoRadius = logoSize / 2;

  // Background gradient colors matching landing page (#667eea to #764ba2)
  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: backgroundOpacity,
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Gradient Background - Purple theme matching landing page */}
      <View style={styles.gradientBackground} />

      {/* Animated Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: Animated.multiply(logoScale, pulseScale) },
              { rotate: logoRotationInterpolate },
            ],
            opacity: logoOpacity,
          },
        ]}
      >
        <Image
          source={require('../logo.png')}
          style={[
            styles.logo,
            {
              width: logoSize,
              height: logoSize,
            },
          ]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Animated Text */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.appName}>Zaykabill</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Restaurant POS System</Text>
        <Text style={styles.subTagline}>Billing • Orders • Inventory</Text>
      </Animated.View>

      {/* Restaurant Billing Icons */}
      <Animated.View
        style={[
          styles.iconsContainer,
          {
            opacity: textOpacity,
          },
        ]}
      >
        <Animated.View style={[styles.icon, { opacity: textOpacity }]}>
          <Text style={styles.iconText}>🍽️</Text>
        </Animated.View>
        <Animated.View style={[styles.icon, { opacity: textOpacity }]}>
          <Text style={styles.iconText}>📋</Text>
        </Animated.View>
        <Animated.View style={[styles.icon, { opacity: textOpacity }]}>
          <Text style={styles.iconText}>💰</Text>
        </Animated.View>
        <Animated.View style={[styles.icon, { opacity: textOpacity }]}>
          <Text style={styles.iconText}>📊</Text>
        </Animated.View>
      </Animated.View>

      {/* Decorative particles */}
      <View style={styles.particlesContainer}>
        {[...Array(6)].map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: `${15 + index * 15}%`,
                top: `${20 + (index % 3) * 30}%`,
                opacity: logoOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3],
                }),
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    width,
    height,
    zIndex: 1000,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    // Purple gradient background matching landing page
    // Using linear gradient approximation with primary purple-blue color
    backgroundColor: '#667eea',
    // We can enhance this with react-native-linear-gradient later if needed
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: '#ffffff',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  logo: {
    // No background container - logo displayed directly
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  appName: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 16,
  },
  divider: {
    width: 80,
    height: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
    marginBottom: 16,
    opacity: 0.9,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  subTagline: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginTop: 8,
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: '#ffffff',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  iconText: {
    fontSize: 28,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
});

export default SplashScreen;

