import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DeploymentProvider, useDeployment } from '@/contexts/DeploymentContext';
import { WebTheme } from '@/constants/web-theme';

import DeploymentSelectScreen from './deployment-select';
import LoginScreen from './login';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  const { deployment, isLoading: deploymentLoading } = useDeployment();
  const { isAuthenticated, isLoading: authLoading, checkAuth } = useAuth();

  useEffect(() => {
    if (deployment && !deploymentLoading) {
      checkAuth();
    }
  }, [deployment, deploymentLoading, checkAuth]);

  if (deploymentLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: WebTheme.pageBg }}>
        <ActivityIndicator size="large" color={WebTheme.accent} />
      </View>
    );
  }

  if (!deployment) {
    return <DeploymentSelectScreen />;
  }

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: WebTheme.pageBg }}>
        <ActivityIndicator size="large" color={WebTheme.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="product/[id]"
        options={{
          title: 'Product',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="order/[id]"
        options={{
          title: 'Order',
          headerShown: true,
          headerBackTitle: 'Orders',
        }}
      />
      <Stack.Screen
        name="orders"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <DeploymentProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </DeploymentProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
