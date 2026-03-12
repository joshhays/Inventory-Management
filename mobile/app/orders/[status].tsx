import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { getApiBase } from '@/contexts/DeploymentContext';
import { WebTheme } from '@/constants/web-theme';
import { ApiError, fetchOrders, updateOrderStatus, type Order } from '@/lib/api';

/** URL slug -> API status value */
const SLUG_TO_STATUS: Record<string, string> = {
  pending: 'pending',
  'in-process': 'in process',
  picked: 'picked',
  ready: 'ready',
  shipped: 'shipped',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  'in process': 'In Process',
  picked: 'Picked',
  ready: 'Ready',
  shipped: 'Shipped',
};

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export default function OrdersByStatusScreen() {
  const { status: slug } = useLocalSearchParams<{ status: string }>();
  const router = useRouter();
  const apiStatus = slug ? SLUG_TO_STATUS[slug] ?? slug : null;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!apiStatus) return;
    try {
      setError(null);
      const data = await fetchOrders(apiStatus);
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
  }, [apiStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleDoubleCheckComplete = useCallback(
    async (orderId: number) => {
      setUpdatingId(orderId);
      try {
        await updateOrderStatus(orderId, 'ready');
        load();
      } catch {
        // ignore
      } finally {
        setUpdatingId(null);
      }
    },
    [load]
  );

  const handleShip = useCallback(
    async (orderId: number) => {
      setUpdatingId(orderId);
      try {
        await updateOrderStatus(orderId, 'shipped');
        load();
      } catch {
        // ignore
      } finally {
        setUpdatingId(null);
      }
    },
    [load]
  );

  const formatPrice = (n: number) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (s: string) => new Date(s).toLocaleDateString();

  if (!apiStatus) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ThemedText style={styles.errorText}>Invalid status</ThemedText>
      </SafeAreaView>
    );
  }

  const title = getStatusLabel(apiStatus);
  const isPicked = apiStatus === 'picked';
  const isReady = apiStatus === 'ready';

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
        {orders.map((item) => {
          const itemCount = item.items?.reduce((s, i) => s + i.quantity, 0) || 0;
          const isUpdating = updatingId === item.id;
          return (
            <View key={item.id} style={styles.card}>
              <Pressable
                style={styles.cardPressable}
                onPress={() => !isUpdating && router.push(`/order/${item.id}`)}>
                <View style={styles.cardContent}>
                  <View style={styles.cardMain}>
                    <ThemedText style={styles.customer}>{item.customerName}</ThemedText>
                    <ThemedText style={styles.meta}>
                      #{item.id} · {formatDate(item.createdAt)} · {itemCount} items
                    </ThemedText>
                  </View>
                  <View style={styles.right}>
                    <ThemedText style={styles.total}>{formatPrice(item.total)}</ThemedText>
                  </View>
                </View>
              </Pressable>
              {isPicked && (
                <Pressable
                  style={[styles.actionBtn, isUpdating && styles.actionBtnDisabled]}
                  onPress={() => !isUpdating && handleDoubleCheckComplete(item.id)}
                  disabled={isUpdating}>
                  <MaterialIcons name="verified" size={18} color="#fff" />
                  <ThemedText style={styles.actionBtnText}>
                    {isUpdating ? '…' : 'Double check complete'}
                  </ThemedText>
                </Pressable>
              )}
              {isReady && (
                <Pressable
                  style={[styles.actionBtn, styles.shipBtn, isUpdating && styles.actionBtnDisabled]}
                  onPress={() => !isUpdating && handleShip(item.id)}
                  disabled={isUpdating}>
                  <MaterialIcons name="local-shipping" size={18} color="#fff" />
                  <ThemedText style={styles.actionBtnText}>
                    {isUpdating ? '…' : 'Ship'}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          );
        })}
        {orders.length === 0 && (
          <ThemedText style={styles.empty}>No {title.toLowerCase()} orders.</ThemedText>
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
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: WebTheme.radius,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  cardPressable: { padding: 16 },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMain: { flex: 1 },
  customer: { fontSize: 16, fontWeight: '600', color: WebTheme.text },
  meta: { fontSize: 13, marginTop: 2, color: WebTheme.textMuted },
  right: { alignItems: 'flex-end' },
  total: { fontSize: 16, fontWeight: '600', color: WebTheme.text },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    backgroundColor: WebTheme.success,
    borderRadius: 8,
  },
  shipBtn: {
    backgroundColor: WebTheme.accent,
  },
  actionBtnDisabled: { opacity: 0.7 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty: { padding: 24, textAlign: 'center', color: WebTheme.textMuted },
});
