import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider } from '@/context/auth-context';
import { DataProvider } from '@/context/data-context';
import { AppThemeProvider } from '@/context/theme-context';
import { UserDataProvider } from '@/context/user-data-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

function ThemedApp() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        <UserDataProvider>
          <AppThemeProvider>
            <ThemedApp />
          </AppThemeProvider>
        </UserDataProvider>
      </DataProvider>
    </AuthProvider>
  );
}
