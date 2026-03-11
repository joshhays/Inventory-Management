import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE } from '@/constants/api';
import { WebTheme } from '@/constants/web-theme';
import { fetchProducts, updateQuantity, type Product } from '@/lib/api';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustValue, setAdjustValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchProducts();
      setProducts(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect';
      setError(
        `Trying: ${API_BASE}\n\n${msg}\n\n` +
          (API_BASE.includes('localhost')
            ? 'On a real phone? Set DEVICE_IP in constants/api.ts to your computer IP.'
            : 'Is your backend running? Same Wi‑Fi?')
      );
      setProducts([]);
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

  const openAdjust = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustValue('');
  };

  const closeAdjust = () => {
    setAdjustingProduct(null);
    setAdjustValue('');
  };

  const handleAdjust = async (action: 'deduct' | 'receive') => {
    if (!adjustingProduct || !adjustValue.trim()) return;
    const qty = Math.abs(parseInt(adjustValue, 10) || 0);
    if (qty <= 0) return;

    setSubmitting(true);
    try {
      const delta = action === 'deduct' ? -qty : qty;
      const source = action === 'receive' ? 'receive' : 'manual';
      await updateQuantity(adjustingProduct.id, { adjust: delta, source });
      closeAdjust();
      load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (n: number) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderItem = ({ item }: { item: Product }) => {
    const isKit = item.productType === 'kit';
    const qtyVal = isKit && item.kitItems?.length ? item.quantity : isKit ? null : item.quantity;
    const qtyStyle =
      qtyVal !== null && qtyVal === 0
        ? [styles.qty, styles.qtyZero]
        : qtyVal !== null && qtyVal <= 5
          ? [styles.qty, styles.qtyLow]
          : [styles.qty, styles.qtyOk];

    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => openAdjust(item)}>
        <View style={styles.cardContent}>
          <View style={styles.cardMain}>
            <ThemedText style={styles.name}>
              {item.name}
              {isKit && (
                <ThemedText style={styles.kitBadge}> Kit</ThemedText>
              )}
            </ThemedText>
            <ThemedText style={styles.meta}>
              {item.sku} · {formatPrice(item.price)}
              {item.group ? ` · ${item.group.name}` : ''}
            </ThemedText>
          </View>
          <View style={[styles.qtyBadge, qtyVal === 0 && styles.qtyBadgeZero, qtyVal !== null && qtyVal > 0 && qtyVal <= 5 && styles.qtyBadgeLow]}>
            <ThemedText style={qtyStyle}>
              {qtyVal !== null ? qtyVal : '—'}
            </ThemedText>
          </View>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={WebTheme.accent} />
        <ThemedText style={styles.loadingText}>Loading products…</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.errorTitle}>Connection Error</ThemedText>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable style={styles.retryBtn} onPress={load}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Products</ThemedText>
        <ThemedText style={styles.headerSub}>
          Pull to refresh · Tap to adjust
        </ThemedText>
      </View>

      <FlatList
        data={products}
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
          <ThemedText style={styles.empty}>No products yet.</ThemedText>
        }
      />

      <Modal
        visible={!!adjustingProduct}
        transparent
        animationType="slide"
        onRequestClose={closeAdjust}>
        <Pressable style={styles.modalOverlay} onPress={closeAdjust}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Adjust: {adjustingProduct?.name}
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Quantity"
              placeholderTextColor={WebTheme.textMuted}
              keyboardType="numeric"
              value={adjustValue}
              onChangeText={setAdjustValue}
              editable={!submitting}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.btn, styles.btnDeduct]}
                onPress={() => handleAdjust('deduct')}
                disabled={submitting}>
                <ThemedText style={styles.btnText}>Deduct</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnReceive]}
                onPress={() => handleAdjust('receive')}
                disabled={submitting}>
                <ThemedText style={styles.btnText}>
                  {submitting ? '…' : 'Receive'}
                </ThemedText>
              </Pressable>
            </View>
            <Pressable style={styles.cancelBtn} onPress={closeAdjust}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, color: WebTheme.textMuted },
  errorTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
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
  list: { padding: 16, paddingBottom: 24, gap: 12 },
  card: {
    backgroundColor: WebTheme.glassBg,
    borderRadius: WebTheme.radius,
    borderWidth: 1,
    borderColor: WebTheme.glassBorder,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#1f2687',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardPressed: { opacity: 0.9 },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMain: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: WebTheme.text },
  meta: { fontSize: 13, color: WebTheme.textMuted, marginTop: 4 },
  kitBadge: { color: WebTheme.kit, fontWeight: '600' },
  qtyBadge: {
    backgroundColor: WebTheme.successBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: WebTheme.radiusSm,
    minWidth: 44,
    alignItems: 'center',
  },
  qtyBadgeZero: { backgroundColor: WebTheme.dangerBg },
  qtyBadgeLow: { backgroundColor: WebTheme.warningBg },
  qty: { fontSize: 16, fontWeight: '700', color: WebTheme.success },
  qtyZero: { color: WebTheme.danger },
  qtyLow: { color: WebTheme.warning },
  qtyOk: { color: WebTheme.success },
  empty: { textAlign: 'center', padding: 24, color: WebTheme.textMuted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: WebTheme.glassBg,
    borderTopLeftRadius: WebTheme.radiusLg,
    borderTopRightRadius: WebTheme.radiusLg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: WebTheme.glassBorder,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { marginBottom: 16, color: WebTheme.text },
  input: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
    borderColor: WebTheme.glassBorder,
    borderRadius: WebTheme.radiusSm,
    padding: 14,
    fontSize: 16,
    color: WebTheme.text,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: WebTheme.radiusSm,
    alignItems: 'center',
  },
  btnDeduct: { backgroundColor: WebTheme.danger },
  btnReceive: { backgroundColor: WebTheme.success },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: WebTheme.textMuted, fontSize: 15 },
});