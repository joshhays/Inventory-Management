import { useCallback, useEffect, useMemo, useState } from 'react';
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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InventoryCard } from '@/components/inventory-card';
import { ThemedText } from '@/components/themed-text';
import { getApiBase } from '@/contexts/DeploymentContext';
import { WebTheme } from '@/constants/web-theme';
import {
  ApiError,
  createProduct,
  fetchProducts,
  type Product,
} from '@/lib/api';

const PAGE_BG = '#F5F7FA';

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', sku: '', price: '', quantity: '0' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchProducts();
      setProducts(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not connect';
      const base = getApiBase();
      setError(
        `Trying: ${base}\n\n${msg}\n\n` +
          (base.includes('localhost')
            ? 'On a real phone? Use a deployment with a public URL.'
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

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.group?.name?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const handleAddProduct = async () => {
    const name = addForm.name.trim();
    const sku = addForm.sku.trim();
    const price = parseFloat(addForm.price);
    const quantity = parseInt(addForm.quantity, 10) || 0;
    if (!name || !sku || isNaN(price)) {
      Alert.alert('Error', 'Name, SKU, and price are required.');
      return;
    }
    setSubmitting(true);
    try {
      await createProduct({ name, sku, price, quantity });
      setAddModalVisible(false);
      setAddForm({ name: '', sku: '', price: '', quantity: '0' });
      load();
    } catch (e) {
      const msg =
        e instanceof ApiError && (e.status === 401 || e.status === 403)
          ? 'Adding products requires admin access. Use the web admin.'
          : e instanceof Error
            ? e.message
            : 'Failed to add product';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (n: number) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderItem = ({ item }: { item: Product }) => (
    <InventoryCard
      product={item}
      onPress={() => router.push(`/product/${item.id}`)}
      formatPrice={formatPrice}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={WebTheme.accent} />
        <ThemedText style={styles.loadingText}>Loading products…</ThemedText>
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
      {/* Search / Filter bar with Scan icon */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrap}>
          <MaterialIcons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <Pressable
          style={styles.scanBtn}
          onPress={() => Alert.alert('Scan', 'Barcode scanner coming soon.')}>
          <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={filteredProducts}
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
          <ThemedText style={styles.empty}>
            {searchQuery ? 'No matches.' : 'No products yet.'}
          </ThemedText>
        }
      />

      {/* FAB - Add New Item */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setAddModalVisible(true)}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Add New Item modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAddModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Add New Item
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={WebTheme.textMuted}
              value={addForm.name}
              onChangeText={(t) => setAddForm((f) => ({ ...f, name: t }))}
              editable={!submitting}
            />
            <TextInput
              style={styles.input}
              placeholder="SKU"
              placeholderTextColor={WebTheme.textMuted}
              value={addForm.sku}
              onChangeText={(t) => setAddForm((f) => ({ ...f, sku: t }))}
              editable={!submitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Price"
              placeholderTextColor={WebTheme.textMuted}
              keyboardType="decimal-pad"
              value={addForm.price}
              onChangeText={(t) => setAddForm((f) => ({ ...f, price: t }))}
              editable={!submitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Quantity (optional)"
              placeholderTextColor={WebTheme.textMuted}
              keyboardType="numeric"
              value={addForm.quantity}
              onChangeText={(t) => setAddForm((f) => ({ ...f, quantity: t }))}
              editable={!submitting}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setAddModalVisible(false)}
                disabled={submitting}>
                <ThemedText style={styles.btnText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnReceive]}
                onPress={handleAddProduct}
                disabled={submitting}>
                <ThemedText style={styles.btnText}>
                  {submitting ? '…' : 'Add'}
                </ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  centered: {
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  scanBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: WebTheme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  empty: { textAlign: 'center', padding: 24, color: WebTheme.textMuted },
  fab: {
    position: 'absolute',
    bottom: 88,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: WebTheme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: { opacity: 0.9 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: WebTheme.radiusLg,
    borderTopRightRadius: WebTheme.radiusLg,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { marginBottom: 16, color: WebTheme.text },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: WebTheme.radiusSm,
    padding: 14,
    fontSize: 16,
    color: WebTheme.text,
    marginBottom: 12,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: WebTheme.radiusSm,
    alignItems: 'center',
  },
  btnDeduct: { backgroundColor: WebTheme.danger },
  btnReceive: { backgroundColor: WebTheme.success },
  btnCancel: { backgroundColor: '#94a3b8' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: WebTheme.textMuted, fontSize: 15 },
});
