/**
 * Responsive Design Utilities
 * Provides responsive dimensions and scaling for different screen sizes
 * Supports phones, tablets, and laptops
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 12 Pro - 390x844)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Device type detection
export const getDeviceType = (): 'phone' | 'tablet' | 'laptop' => {
  const aspectRatio = SCREEN_HEIGHT / SCREEN_WIDTH;
  const pixelDensity = PixelRatio.get();
  
  // Tablet: width > 600 or aspect ratio suggests tablet
  if (SCREEN_WIDTH >= 768) {
    return 'laptop';
  } else if (SCREEN_WIDTH >= 600) {
    return 'tablet';
  }
  return 'phone';
};

// Scale factor based on screen width
export const scale = (size: number): number => {
  const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size * scaleFactor);
};

// Vertical scale factor based on screen height
export const verticalScale = (size: number): number => {
  const scaleFactor = SCREEN_HEIGHT / BASE_HEIGHT;
  return Math.round(size * scaleFactor);
};

// Moderate scale - less aggressive scaling
export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size + (scaleFactor - 1) * size * factor);
};

// Responsive font size
export const responsiveFontSize = (size: number): number => {
  const deviceType = getDeviceType();
  let scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  
  // Adjust scaling based on device type
  if (deviceType === 'tablet') {
    scaleFactor *= 1.2; // Slightly larger on tablets
  } else if (deviceType === 'laptop') {
    scaleFactor *= 1.4; // Larger on laptops
  }
  
  return Math.round(size * scaleFactor);
};

// Responsive padding
export const responsivePadding = (size: number): number => {
  const deviceType = getDeviceType();
  let scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  
  if (deviceType === 'tablet') {
    scaleFactor *= 1.3;
  } else if (deviceType === 'laptop') {
    scaleFactor *= 1.5;
  }
  
  return Math.round(size * scaleFactor);
};

// Responsive margin
export const responsiveMargin = (size: number): number => {
  return responsivePadding(size);
};

// Get responsive width percentage
export const getWidthPercentage = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

// Get responsive height percentage
export const getHeightPercentage = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Check if device is tablet or larger
export const isTabletOrLarger = (): boolean => {
  return SCREEN_WIDTH >= 600;
};

// Check if device is laptop
export const isLaptop = (): boolean => {
  return SCREEN_WIDTH >= 768;
};

// Responsive grid columns based on device type
export const getGridColumns = (): number => {
  const deviceType = getDeviceType();
  if (deviceType === 'laptop') {
    return 4;
  } else if (deviceType === 'tablet') {
    return 3;
  }
  return 2; // Phone
};

// Responsive card width
export const getCardWidth = (columns: number = 2): number => {
  const padding = responsivePadding(20) * 2; // Left and right padding
  const gap = responsiveMargin(16) * (columns - 1); // Gaps between cards
  return (SCREEN_WIDTH - padding - gap) / columns;
};

// Responsive icon size
export const getIconSize = (baseSize: number): number => {
  const deviceType = getDeviceType();
  if (deviceType === 'laptop') {
    return baseSize * 1.5;
  } else if (deviceType === 'tablet') {
    return baseSize * 1.3;
  }
  return baseSize;
};

// Responsive button height
export const getButtonHeight = (): number => {
  const deviceType = getDeviceType();
  if (deviceType === 'laptop') {
    return 56;
  } else if (deviceType === 'tablet') {
    return 52;
  }
  return 48;
};

// Responsive input height
export const getInputHeight = (): number => {
  return getButtonHeight();
};

// Export screen dimensions
export const screenData = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  scale: SCREEN_WIDTH / BASE_WIDTH,
  fontScale: PixelRatio.getFontScale(),
  pixelRatio: PixelRatio.get(),
  deviceType: getDeviceType(),
  isTablet: isTabletOrLarger(),
  isLaptop: isLaptop(),
};

