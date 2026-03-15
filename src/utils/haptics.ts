import { Platform } from 'react-native';

// Conditional import - expo-haptics may not be available in all envs
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch (e) {
  // Not available
}

export const HapticPatterns = {
  /** Very light tap - for hover/selection */
  light: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light);
  },

  /** Standard tap - for button presses */
  medium: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Medium);
  },

  /** Heavy impact - for destructive actions */
  heavy: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Heavy);
  },

  /** Success notification */
  success: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success);
  },

  /** Error notification */
  error: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Error);
  },

  /** Warning notification */
  warning: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Warning);
  },

  /** Selection changed */
  selection: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    Haptics?.selectionAsync();
  },

  /** Tab switch pattern */
  tabSwitch: () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light);
  },

  /** File save pattern */
  fileSave: async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    await Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light);
    setTimeout(
      () => Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success),
      80
    );
  },

  /** Git commit pattern */
  gitCommit: async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    await Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Medium);
    setTimeout(
      () => Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success),
      120
    );
  },

  /** Build complete */
  buildComplete: async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    await Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Medium);
    setTimeout(() => Haptics?.impactAsync(Haptics?.ImpactFeedbackStyle?.Light), 100);
    setTimeout(
      () => Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Success),
      200
    );
  },

  /** Error detected */
  errorDetected: async () => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    await Haptics?.notificationAsync(Haptics?.NotificationFeedbackType?.Error);
  },
};

export default HapticPatterns;
