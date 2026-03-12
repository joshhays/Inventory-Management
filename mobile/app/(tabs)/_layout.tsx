import { Stack } from 'expo-router';

import { WebTheme } from '@/constants/web-theme';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Dashboard',
        headerStyle: {
          backgroundColor: WebTheme.navBg,
        },
        headerTintColor: WebTheme.navText,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        contentStyle: { backgroundColor: WebTheme.pageBg },
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Inventory',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="products"
        options={{
          title: 'Products',
        }}
      />
      <Stack.Screen
        name="explore"
        options={{
          title: 'Orders',
        }}
      />
      <Stack.Screen
        name="logs"
        options={{
          title: 'Transaction Log',
        }}
      />
    </Stack>
  );
}
