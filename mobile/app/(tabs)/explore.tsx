import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getApiBase } from '@/contexts/DeploymentContext';
import { WebTheme } from '@/constants/web-theme';
import { ApiError, fetchOrders, type Order } from '@/lib/api';

const BENTO_CONFIG: { status: string; slug: string; title: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { status: 'pending', slug: 'pending', title: 'Pending', icon: 'schedule' },
  { status: 'in process', slug: 'in-process', title: 'In Process', icon: 'inventory-2' },
  { status: 'picked', slug: 'picked', title: 'Picked', icon: 'check-circle' },
  { status: 'ready', slug: 'ready', title: 'Ready', icon: 'local-shipping' },
  { status: 'shipped', slug: 'shipped', title: 'Shipped', icon: 'done-all' },
];

type BentoCardProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  count: number;
  onPress: () => void;
};

function BentoCard({ icon, title, count, onPress }: BentoCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.bentoCard, pressed && styles.bentoCardPressed]}
      onPress={onPress}>
      <View style={styles.bentoCardInner}>
        <View style={styles.iconWrap}>
          <MaterialIcons name={icon} size={28} color={WebTheme.accent} />
        </View>
        <ThemedText style={styles.bentoCardTitle}>{title}</ThemedText>
        <ThemedText style={styles.bentoCardCount}>{count} orders</ThemedText>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchOrders();
      setOrders(data.orders || []);
    } catch (e) {
      const isAuthError = e instanceof ApiError && (e.status === 401 || e.status === 403);
      if (isAuthError) {
        setError(
          'Orders require admin access.\n\nSign in via the web admin at your deployment URL.'
        );
      } else {
        const msg = e instanceof Error ? e.message : 'Could not connect';
        const base = getApiBase();
        setError(
          `Trying: ${base}\n\n${msg}\n\n` +
            (base.includes('localhost')
              ? 'On a real phone? Use a deployment with a public URL.'
              : 'Is your backend running? Same Wi‑Fi?')
        );
      }
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const ordersByStatus = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const c of BENTO_CONFIG) {
      map[c.status] = [];
    }
    for (const o of orders) {
      const key = o.status?.toLowerCase() || 'pending';
      if (map[key]) {
        map[key].push(o);
      } else {
        if (!map['_other']) map['_other'] = [];
        map['_other'].push(o);
      }
    }
    return map;
  }, [orders]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={WebTheme.accent} />
        <ThemedText style={styles.loadingText}>Loading orders…</ThemedText>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ThemedText style={styles.errorTitle}>Connection Error</ThemedText>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable style={styles.retryBtn} onPress={load}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Orders</ThemedText>
        <ThemedText style={styles.headerSub}>Tap a status to view orders</ThemedText>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={WebTheme.accent}
          />
        }
        showsVerticalScrollIndicator={false}>
        {BENTO_CONFIG.map(({ status, slug, title, icon }) => (
          <BentoCard
            key={slug}
            icon={icon}
            title={title}
            count={ordersByStatus[status]?.length ?? 0}
            onPress={() => router.push(`/orders/${slug}`)}
          />
        ))}
        {orders.length === 0 && (
          <ThemedText style={styles.empty}>No orders yet.</ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, color: WebTheme.textMuted },
  errorTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, color: WebTheme.text },
  errorText: { textAlign: 'center', marginBottom: 16, color: WebTheme.textMuted },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: WebTheme.accent,
    borderRadius: WebTheme.radiusSm,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  header: { padding: 20, paddingBottom: 12 },
  headerTitle: { color: WebTheme.text },
  headerSub: { color: WebTheme.textMuted, marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  bentoCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: WebTheme.radius,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#1f2687',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  bentoCardPressed: { opacity: 0.92 },
  bentoCardInner: { gap: 8 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(227, 24, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoCardTitle: { fontSize: 18, fontWeight: '600', color: WebTheme.text },
  bentoCardCount: { fontSize: 14, color: WebTheme.textMuted },
  empty: { padding: 24, textAlign: 'center', color: WebTheme.textMuted },
});
