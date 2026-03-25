/**
 * Captain POS - Splash (same branding as Zayka Bill)
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
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(30)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sequence = Animated.sequence([
      Animated.timing(backgroundOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(textTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]),
    ]);
    sequence.start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(textOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(backgroundOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => onAnimationComplete());
    }, 2500);
    return () => clearTimeout(t);
  }, [onAnimationComplete]);

  const logoSize = Math.min(width * 0.5, 320);

  return (
    <Animated.View style={[styles.container, { opacity: backgroundOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <View style={styles.gradientBackground} />
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          },
        ]}
      >
        <Image
          source={require('../logo.png')}
          style={[styles.logo, { width: logoSize, height: logoSize }]}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.textContainer,
          { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
        ]}
      >
        <Text style={styles.appName}>Zaykabill</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Captain – Table Orders</Text>
      </Animated.View>
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
    backgroundColor: '#667eea',
  },
  logoContainer: { marginBottom: 16 },
  logo: {},
  textContainer: { alignItems: 'center', marginTop: 8 },
  appName: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 12,
  },
  divider: {
    width: 60,
    height: 4,
    backgroundColor: '#ffffff',
    borderRadius: 2,
    marginBottom: 12,
    opacity: 0.9,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1,
  },
});

export default SplashScreen;
