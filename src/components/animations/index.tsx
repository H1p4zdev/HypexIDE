import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ViewStyle,
  View,
  StyleSheet,
  Easing,
} from 'react-native';
import { Colors, Animation, Radius } from '../../theme/tokens';

// ─── FadeIn ───────────────────────────────────────────────────────────────────
interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export function FadeIn({ children, duration = 300, delay = 0, style }: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── ScaleIn ──────────────────────────────────────────────────────────────────
interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
  from?: number;
}

export function ScaleIn({ children, delay = 0, style, from = 0.85 }: ScaleInProps) {
  const scale = useRef(new Animated.Value(from)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        ...Animation.springGentle,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── SlideUp ──────────────────────────────────────────────────────────────────
interface SlideUpProps {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}

export function SlideUp({ children, delay = 0, distance = 20, style }: SlideUpProps) {
  const translateY = useRef(new Animated.Value(distance)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        ...Animation.springGentle,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ translateY }], opacity }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── SlideInRight ─────────────────────────────────────────────────────────────
interface SlideInRightProps {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}

export function SlideInRight({ children, delay = 0, distance = 30, style }: SlideInRightProps) {
  const translateX = useRef(new Animated.Value(distance)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        ...Animation.springSnappy,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ translateX }], opacity }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── PressScale ───────────────────────────────────────────────────────────────
interface PressScaleProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scaleTo?: number;
  onPress?: () => void;
}

export function PressScale({ children, style, scaleTo = 0.95, onPress }: PressScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      ...Animation.springSnappy,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      ...Animation.springBouncy,
      useNativeDriver: true,
    }).start();
    onPress?.();
  };

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, style]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
    >
      {children}
    </Animated.View>
  );
}

// ─── Pulse ────────────────────────────────────────────────────────────────────
interface PulseProps {
  children: React.ReactNode;
  style?: ViewStyle;
  duration?: number;
}

export function Pulse({ children, style, duration = 1200 }: PulseProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── GlassCard ────────────────────────────────────────────────────────────────
interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  dark?: boolean;
}

export function GlassCard({ children, style, dark = false }: GlassCardProps) {
  return (
    <View
      style={[
        styles.glassCard,
        dark ? styles.glassCardDark : styles.glassCardLight,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── SkeletonLoader ───────────────────────────────────────────────────────────
interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({
  width = '100%',
  height = 16,
  borderRadius = Radius.sm,
  style,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.bgTertiary,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── ProjectSkeleton ──────────────────────────────────────────────────────────
export function ProjectSkeleton() {
  return (
    <View style={styles.projectSkeleton}>
      <SkeletonLoader width={48} height={48} borderRadius={Radius.md} />
      <View style={styles.projectSkeletonText}>
        <SkeletonLoader width="60%" height={14} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="80%" height={11} />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  glassCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glassCardLight: {
    backgroundColor: Colors.glassBg,
    borderColor: Colors.glassBorder,
  },
  glassCardDark: {
    backgroundColor: Colors.glassDarkBg,
    borderColor: Colors.glassDarkBorder,
  },
  projectSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  projectSkeletonText: {
    flex: 1,
  },
});
