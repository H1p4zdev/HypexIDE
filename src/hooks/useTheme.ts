import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type Theme } from '../theme/tokens';
import { useAppStore } from '../store/appStore';

export function useTheme(): Theme & { isDark: boolean } {
  const systemScheme = useColorScheme();
  const { settings } = useAppStore();
  const preference = settings?.appearance?.theme ?? 'system';

  const isDark =
    preference === 'dark' ||
    (preference === 'system' && systemScheme === 'dark');

  const theme = isDark ? darkTheme : lightTheme;
  return { ...theme, isDark };
}

export default useTheme;
