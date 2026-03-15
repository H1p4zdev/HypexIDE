import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Animation } from '../theme/tokens';
import { HypexButton } from '../components/common';
import { FadeIn, ScaleIn } from '../components/animations';
import { HapticPatterns } from '../utils/haptics';
import { ONBOARDING_SLIDES } from '../constants';
import { useAppStore } from '../store/appStore';

const { width: SCREEN_W } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const dotScale = useRef(ONBOARDING_SLIDES.map(() => new Animated.Value(1))).current;
  const { completeOnboarding } = useAppStore();

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      HapticPatterns.selection();

      // Animate dots
      dotScale.forEach((s, i) => {
        Animated.spring(s, {
          toValue: i === newIndex ? 1.4 : 1,
          ...Animation.springSnappy,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * SCREEN_W, animated: true });
      HapticPatterns.medium();
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = () => {
    HapticPatterns.success();
    completeOnboarding();
    navigation.replace('Main');
  };

  const handleSkip = () => {
    HapticPatterns.light();
    handleGetStarted();
  };

  const isLast = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      {!isLast && (
        <FadeIn style={styles.skipContainer}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </FadeIn>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.slideContainer}
      >
        {ONBOARDING_SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <ScaleIn delay={100}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: slide.gradient[0] + '22' },
                ]}
              >
                <Text style={styles.icon}>{slide.icon}</Text>
              </View>
            </ScaleIn>

            <FadeIn delay={200} style={styles.textContainer}>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </FadeIn>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {ONBOARDING_SLIDES.map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
              { transform: [{ scale: dotScale[i] }] },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <FadeIn delay={400} style={styles.ctaContainer}>
        <HypexButton
          title={isLast ? 'Get Started' : 'Continue'}
          iconRight={isLast ? undefined : '→'}
          onPress={handleNext}
          size="lg"
          style={styles.ctaButton}
        />

        {isLast && (
          <TouchableOpacity onPress={handleSkip} style={{ marginTop: 16 }}>
            <Text style={styles.signInText}>Already have a project? Open it →</Text>
          </TouchableOpacity>
        )}
      </FadeIn>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  skipContainer: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  slideContainer: {
    flex: 1,
  },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: Radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 56,
  },
  textContainer: {
    alignItems: 'center',
    gap: 12,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.semibold,
    letterSpacing: Typography.letterSpacingWidest,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: Typography.xxxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: Typography.letterSpacingTight,
  },
  description: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.base * Typography.lineHeightRelaxed,
    marginTop: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    borderRadius: Radius.full,
  },
  dotActive: {
    width: 24,
    height: 8,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 8,
    height: 8,
    backgroundColor: Colors.borderMedium,
  },
  ctaContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
  },
  signInText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.medium,
  },
});
