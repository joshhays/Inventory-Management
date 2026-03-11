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
import { API_BASE } from '@/constants/api';
import { WebTheme } from '@/constants/web-theme';
import { fetchLogs } from '@/lib/api';

type LogEntry = {
  id?: number;
  sku: string;
  productName: string;
  action: string;
  quantityBefore: number;
  quantityAfter: number;
  source?: string;
  createdAt: string;
};

export default function LogsScreen() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async (pageNum = 1) => {
    try {
      setError(null);
      const { logs: data } = await fetchLogs(pageNum, 50);
      setLogs(data as LogEntry[]);
      setPage(pageNum);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect';
      setError(
        `Trying: ${API_BASE}\n\n${msg}\n\n` +
          (API_BASE.includes('localhost')
            ? 'On a real phone? Set DEVICE_IP in constants/api.ts.'
            : 'Is your backend running?')
      );
      setLogs([]);
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
    load(1);
  }, [load]);

  const formatDate = (s: string) => new Date(s).toLocaleString();

  const getActionColor = (action: string) => {
    if (action === 'deduct' || action === 'offline_ship') return WebTheme.danger;
    if (action === 'receive' || action === 'add') return WebTheme.success;
    return WebTheme.textMuted;
  };

  const renderItem = ({ item }: { item: LogEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <ThemedText style={styles.productName}>{item.productName}</ThemedText>
        <ThemedText style={[styles.action, { color: getActionColor(item.action) }]}>
          {item.action}
        </ThemedText>
      </View>
      <ThemedText style={styles.meta}>
        {item.sku} · {formatDate(item.createdAt)}
      </ThemedText>
      <View style={styles.qtyRow}>
        <ThemedText style={styles.qty}>
          {item.quantityBefore} → {item.quantityAfter}
        </ThemedText>
        {item.source ? (
          <ThemedText style={styles.source}>{item.source}</ThemedText>
        ) : null}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={WebTheme.accent} />
        <ThemedText style={styles.loadingText}>Loading logs…</ThemedText>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ThemedText style={styles.errorTitle}>Connection Error</ThemedText>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable style={styles.retryBtn} onPress={() => load(1)}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Transaction Log
        </ThemedText>
        <ThemedText style={styles.headerSub}>Pull to refresh</ThemedText>
      </View>

      <FlatList
        data={logs}
        keyExtractor={(item, i) => `${item.sku}-${item.createdAt}-${i}`}
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
          <ThemedText style={styles.empty}>No transactions yet.</ThemedText>
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
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: { fontSize: 16, fontWeight: '600', color: WebTheme.text, flex: 1 },
  action: {
    fontSize: 12,
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  meta: { fontSize: 13, marginTop: 4, color: WebTheme.textMuted },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  qty: { fontSize: 14, fontWeight: '500', color: WebTheme.text },
  source: { fontSize: 12, color: WebTheme.textMuted },
  empty: { padding: 24, textAlign: 'center', color: WebTheme.textMuted },
});
