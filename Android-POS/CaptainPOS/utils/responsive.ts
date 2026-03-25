/**
 * Responsive Design Utilities (same as Zayka Bill)
 */

import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export const getDeviceType = (): 'phone' | 'tablet' | 'laptop' => {
  if (SCREEN_WIDTH >= 768) return 'laptop';
  if (SCREEN_WIDTH >= 600) return 'tablet';
  return 'phone';
};

export const scale = (size: number): number => {
  return Math.round(size * (SCREEN_WIDTH / BASE_WIDTH));
};

export const verticalScale = (size: number): number => {
  return Math.round(size * (SCREEN_HEIGHT / BASE_HEIGHT));
};

export const moderateScale = (size: number, factor: number = 0.5): number => {
  const scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size + (scaleFactor - 1) * size * factor);
};

export const responsiveFontSize = (size: number): number => {
  const deviceType = getDeviceType();
  let scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  if (deviceType === 'tablet') scaleFactor *= 1.2;
  else if (deviceType === 'laptop') scaleFactor *= 1.4;
  return Math.round(size * scaleFactor);
};

export const responsivePadding = (size: number): number => {
  const deviceType = getDeviceType();
  let scaleFactor = SCREEN_WIDTH / BASE_WIDTH;
  if (deviceType === 'tablet') scaleFactor *= 1.3;
  else if (deviceType === 'laptop') scaleFactor *= 1.5;
  return Math.round(size * scaleFactor);
};

export const responsiveMargin = (size: number): number => responsivePadding(size);
