import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Typography, Radius, Animation } from '../theme/tokens';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../store/appStore';
import { HapticPatterns } from '../utils/haptics';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import EditorScreen from '../screens/EditorScreen';
import TerminalScreen from '../screens/TerminalScreen';
import GitScreen from '../screens/GitScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';

import type { RootStackParamList, BottomTabParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

// ─── Animated Tab Bar ─────────────────────────────────────────────────────────
const TAB_ICONS: Record<string, string> = {
  Home: '🏠',
  Explorer: '📂',
  Git: '🌿',
  Terminal: '🖥️',
  Settings: '⚙️',
};

function HypexTabBar({ state, descriptors, navigation }: any) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.glass.bg,
          borderTopColor: theme.border,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const icon = TAB_ICONS[route.name] ?? '•';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            HapticPatterns.tabSwitch();
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.tabIconContainer, isFocused && styles.tabIconContainerActive]}>
              <Text style={[styles.tabIcon, { opacity: isFocused ? 1 : 0.55 }]}>
                {icon}
              </Text>
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? Colors.primary : theme.text.tertiary,
                  fontWeight: isFocused ? Typography.semibold : Typography.regular,
                },
              ]}
            >
              {route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Bottom Tab Navigator ─────────────────────────────────────────────────────
function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <HypexTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explorer" component={HomeScreen} />
      <Tab.Screen name="Git" component={GitScreen} />
      <Tab.Screen name="Terminal" component={TerminalScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ─────────────────────────────────────────────────────
export function AppNavigator() {
  const theme = useTheme();
  const { isOnboardingComplete } = useAppStore();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: theme.bg.primary },
          animationEnabled: true,
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, next, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 1],
              }),
            },
          }),
        }}
        initialRouteName={isOnboardingComplete ? 'Main' : 'Onboarding'}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Editor"
          component={EditorScreen}
          options={{ gestureDirection: 'horizontal' }}
        />
        <Stack.Screen name="Terminal" component={TerminalScreen} />
        <Stack.Screen name="Git" component={GitScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 83 : 64,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabIconContainer: {
    width: 40,
    height: 30,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconContainerActive: {
    backgroundColor: Colors.primary + '18',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
});
