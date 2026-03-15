import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { AppNavigator } from './src/navigation';
import { useTheme } from './src/hooks/useTheme';
import { getExtensionHost } from './src/extensions/ExtensionHost';

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedApp() {
  const theme = useTheme();

  useEffect(() => {
    // Initialize extension host on app start
    getExtensionHost().initialize().catch(console.error);
  }, []);

  return (
    <>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />
      <AppNavigator />
    </>
  );
}

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load monospace font used throughout the editor and terminal
        await Font.loadAsync({
          'SpaceMono': require('./assets/fonts/SpaceMono-Regular.ttf'),
          'SpaceMono-Bold': require('./assets/fonts/SpaceMono-Bold.ttf'),
        });
      } catch {
        // Font files missing in dev — fall back to system monospace
        console.warn('Custom fonts not loaded; falling back to system monospace.');
      } finally {
        setAppReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();
  }, []);

  if (!appReady) {
    // Return an empty view while the splash screen is still visible
    return <View style={{ flex: 1 }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemedApp />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
