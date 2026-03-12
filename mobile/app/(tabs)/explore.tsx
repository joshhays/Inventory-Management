import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getApiBase } from '@/contexts/DeploymentContext';
import { WebTheme } from '@/constants/web-theme';
import { ApiError, fetchOrders, type Order } from '@/lib/api';

export default function OrdersScreen() {
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

  const formatPrice = (n: number) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (s: string) => new Date(s).toLocaleDateString();

  const renderItem = ({ item }: { item: Order }) => {
    const itemCount = item.items?.reduce((s, i) => s + i.quantity, 0) || 0;
    return (
      <View style={styles.card}>
        <View style={styles.cardContent}>
          <View style={styles.cardMain}>
            <ThemedText style={styles.customer}>{item.customerName}</ThemedText>
            <ThemedText style={styles.meta}>
              #{item.id} · {formatDate(item.createdAt)} · {itemCount} items
            </ThemedText>
          </View>
          <View style={styles.right}>
            <ThemedText style={styles.total}>{formatPrice(item.total)}</ThemedText>
            <ThemedText
              style={[
                styles.badge,
                item.status === 'shipped' && styles.badgeShipped,
                item.status === 'completed' && styles.badgeCompleted,
                item.status === 'cancelled' && styles.badgeCancelled,
              ]}>
              {item.status}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

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
        <ThemedText style={styles.headerSub}>Pull to refresh</ThemedText>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={WebTheme.accent}
          />
        }
        ListEmptyComponent={
          <ThemedText style={styles.empty}>No orders yet.</ThemedText>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
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
  list: { padding: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: WebTheme.radius,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMain: { flex: 1 },
  customer: { fontSize: 16, fontWeight: '600', color: WebTheme.text },
  meta: { fontSize: 13, marginTop: 2, color: WebTheme.textMuted },
  right: { alignItems: 'flex-end' },
  total: { fontSize: 16, fontWeight: '600', color: WebTheme.text },
  badge: {
    fontSize: 11,
    textTransform: 'capitalize',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  badgeShipped: { backgroundColor: WebTheme.successBg, color: WebTheme.successText },
  badgeCompleted: { backgroundColor: '#e5e7eb', color: '#374151' },
  badgeCancelled: { backgroundColor: WebTheme.dangerBg, color: WebTheme.danger },
  empty: { padding: 24, textAlign: 'center', color: WebTheme.textMuted },
});
