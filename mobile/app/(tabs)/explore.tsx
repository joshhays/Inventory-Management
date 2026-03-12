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
import { ApiError, fetchOrders, updateOrderStatus, type Order } from '@/lib/api';

const STATUS_ORDER = ['pending', 'in process', 'picked', 'ready', 'shipped'];
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
    for (const s of STATUS_ORDER) {
      map[s] = [];
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

  const formatPrice = (n: number) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (s: string) => new Date(s).toLocaleDateString();

  const [updatingId, setUpdatingId] = useState<number | null>(null);

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

  const renderOrderCard = (item: Order, statusKey?: string) => {
    const itemCount = item.items?.reduce((s, i) => s + i.quantity, 0) || 0;
    const isPicked = statusKey === 'picked';
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
              <ThemedText style={[styles.badge, styles[`badge${item.status?.replace(/\s/g, '')}` as keyof typeof styles] || styles.badgeDefault]}>
                {getStatusLabel(item.status)}
              </ThemedText>
            </View>
          </View>
        </Pressable>
        {isPicked && (
          <Pressable
            style={[styles.doubleCheckBtn, isUpdating && styles.doubleCheckBtnDisabled]}
            onPress={() => !isUpdating && handleDoubleCheckComplete(item.id)}
            disabled={isUpdating}>
            <MaterialIcons name="verified" size={18} color="#fff" />
            <ThemedText style={styles.doubleCheckBtnText}>
              {isUpdating ? '…' : 'Double check complete'}
            </ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  const renderBentoSection = (statusKey: string, title: string, icon: keyof typeof MaterialIcons.glyphMap) => {
    const list = ordersByStatus[statusKey] || [];
    if (list.length === 0) return null;
    return (
      <View key={statusKey} style={styles.bentoSection}>
        <View style={styles.bentoHeader}>
          <MaterialIcons name={icon} size={20} color={WebTheme.accent} />
          <ThemedText style={styles.bentoTitle}>{title}</ThemedText>
          <ThemedText style={styles.bentoCount}>{list.length}</ThemedText>
        </View>
        <View style={styles.bentoCards}>
          {list.map((o) => renderOrderCard(o, statusKey))}
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
        {renderBentoSection('pending', 'Pending', 'schedule')}
        {renderBentoSection('in process', 'In Process', 'inventory-2')}
        {renderBentoSection('picked', 'Picked', 'check-circle')}
        {renderBentoSection('ready', 'Ready', 'local-shipping')}
        {renderBentoSection('shipped', 'Shipped', 'done-all')}
        {(ordersByStatus['_other']?.length ?? 0) > 0 && (
          <View style={styles.bentoSection}>
            <View style={styles.bentoHeader}>
              <ThemedText style={styles.bentoTitle}>Other</ThemedText>
            </View>
            <View style={styles.bentoCards}>
              {(ordersByStatus['_other'] || []).map((o) => renderOrderCard(o, '_other'))}
            </View>
          </View>
        )}
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
  bentoSection: {
    marginBottom: 24,
  },
  bentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bentoTitle: { fontSize: 16, fontWeight: '600', color: WebTheme.text },
  bentoCount: {
    fontSize: 13,
    color: WebTheme.textMuted,
    marginLeft: 4,
  },
  bentoCards: { gap: 10 },
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
  },
  cardPressable: { padding: 16 },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  doubleCheckBtn: {
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
  doubleCheckBtnDisabled: { opacity: 0.7 },
  doubleCheckBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
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
  badgeDefault: { backgroundColor: '#e5e7eb', color: '#374151' },
  badgepending: { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeinprocess: { backgroundColor: '#dbeafe', color: '#1e40af' },
  badgepicked: { backgroundColor: '#e0e7ff', color: '#3730a3' },
  badgeready: { backgroundColor: '#d1fae5', color: '#065f46' },
  badgeshipped: { backgroundColor: '#dcfce7', color: '#166534' },
  empty: { padding: 24, textAlign: 'center', color: WebTheme.textMuted },
});
