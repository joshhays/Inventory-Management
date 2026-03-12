import { Stack } from 'expo-router';

import { WebTheme } from '@/constants/web-theme';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  'in-process': 'In Process',
  picked: 'Picked',
  ready: 'Ready',
  shipped: 'Shipped',
};

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Orders',
        headerStyle: { backgroundColor: WebTheme.navBg },
        headerTintColor: WebTheme.navText,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        contentStyle: { backgroundColor: '#fafafa' },
      }}>
      <Stack.Screen
        name="[status]"
        options={({ route }) => ({
          title: STATUS_LABELS[(route.params as { status?: string })?.status ?? ''] ?? 'Orders',
        })}
      />
    </Stack>
  );
}
