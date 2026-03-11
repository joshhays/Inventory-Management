import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Dashboard',
        headerStyle: {
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
        },
        headerTintColor: 'rgba(255, 255, 255, 0.9)',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        contentStyle: { backgroundColor: '#F5F7FA' },
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
