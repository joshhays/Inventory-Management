import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { API_BASE } from '@/constants/api';
import { WebTheme } from '@/constants/web-theme';
import { fetchProduct, updateQuantity, type Product } from '@/lib/api';

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;
const PAGE_BG = '#F5F7FA';

function getImageUrl(file: { path: string }): string {
  return `${API_BASE}/uploads/${file.path}`;
}

function getFirstImageFile(product: Product) {
  const files = product.files || [];
  return files.find((f) => IMAGE_EXT.test(f.filename)) || files[0];
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [adjustValue, setAdjustValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await fetchProduct(Number(id));
      setProduct(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load product');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdjust = async (action: 'deduct' | 'receive') => {
    if (!product || !adjustValue.trim()) return;
    const qty = Math.abs(parseInt(adjustValue, 10) || 0);
    if (qty <= 0) return;

    setSubmitting(true);
    try {
      const delta = action === 'deduct' ? -qty : qty;
      const source = action === 'receive' ? 'receive' : 'manual';
      await updateQuantity(product.id, { adjust: delta, source });
      setAdjustModalVisible(false);
      setAdjustValue('');
      load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (n: number) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={WebTheme.accent} />
        <ThemedText style={styles.loadingText}>Loading…</ThemedText>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ThemedText style={styles.errorText}>{error || 'Product not found'}</ThemedText>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ThemedText style={styles.backBtnText}>Go back</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const imageFile = getFirstImageFile(product);
  const imageUrl = imageFile ? getImageUrl(imageFile) : null;
  const isKit = product.productType === 'kit';
  const qtyDisplay = isKit && product.kitItems?.length ? product.quantity : isKit ? '—' : product.quantity;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Large image preview */}
        <View style={styles.imageContainer}>
          {imageUrl && IMAGE_EXT.test(imageFile!.filename) ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <ThemedText style={styles.imagePlaceholderText}>
                {product.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Product info */}
        <View style={styles.card}>
          <ThemedText style={styles.name}>
            {product.name}
            {isKit && <ThemedText style={styles.kitBadge}> Kit</ThemedText>}
          </ThemedText>
          <ThemedText style={styles.meta}>
            {product.sku} · {formatPrice(product.price)}
            {product.group ? ` · ${product.group.name}` : ''}
          </ThemedText>

          {/* Current quantity - prominent */}
          <View style={styles.qtySection}>
            <ThemedText style={styles.qtyLabel}>Current quantity</ThemedText>
            <ThemedText style={styles.qtyValue}>{qtyDisplay}</ThemedText>
          </View>

          <Pressable
            style={styles.adjustBtn}
            onPress={() => {
              setAdjustValue('');
              setAdjustModalVisible(true);
            }}>
            <ThemedText style={styles.adjustBtnText}>Adjust stock</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {/* Adjust modal */}
      <Modal
        visible={adjustModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAdjustModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAdjustModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              Adjust: {product.name}
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
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setAdjustModalVisible(false)}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(width - 32, 320);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: WebTheme.textMuted },
  errorText: { textAlign: 'center', marginBottom: 16, color: WebTheme.textMuted },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: WebTheme.accent,
    borderRadius: 8,
  },
  backBtnText: { color: '#fff', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8ECF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 80,
    fontWeight: '700',
    color: '#94a3b8',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  kitBadge: { color: WebTheme.kit, fontWeight: '600' },
  meta: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 20,
  },
  qtySection: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  qtyValue: {
    fontSize: 36,
    fontWeight: '700',
    color: WebTheme.accent,
  },
  adjustBtn: {
    backgroundColor: WebTheme.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  adjustBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { marginBottom: 16, color: WebTheme.text },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: WebTheme.text,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDeduct: { backgroundColor: WebTheme.danger },
  btnReceive: { backgroundColor: WebTheme.success },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: WebTheme.textMuted, fontSize: 15 },
});
