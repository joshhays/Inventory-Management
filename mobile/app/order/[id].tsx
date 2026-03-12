import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { WebTheme } from '@/constants/web-theme';
import {
  fetchOrder,
  updateOrderItemPick,
  updateOrderStatus,
  type Order,
  type OrderItem,
} from '@/lib/api';

const PAGE_BG = '#fafafa';

/** Normalize barcode/SKU for comparison - trim, lowercase */
function normalizeForMatch(s: string): string {
  return String(s || '').trim().toLowerCase();
}

/** Check if scanned barcode matches item SKU (handles partial matches for UPC/EAN) */
function barcodeMatchesItem(scannedData: string, item: OrderItem): boolean {
  const scanned = normalizeForMatch(scannedData);
  const sku = normalizeForMatch(item.sku);
  if (scanned === sku) return true;
  // UPC/EAN often have leading zeros; barcode might be full code, SKU might be shorter
  if (scanned.endsWith(sku) || sku.endsWith(scanned)) return true;
  if (scanned.includes(sku) || sku.includes(scanned)) return true;
  return false;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickingMode, setPickingMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [scanning, setScanning] = useState(true);
  const [permission, requestPermission] = useCameraPermissions();

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const data = await fetchOrder(Number(id));
      setOrder(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load order');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStartPicking = async () => {
    if (!permission?.granted) {
      requestPermission?.();
      return;
    }
    if (!order) return;
    try {
      await updateOrderStatus(order.id, 'in process');
      const updated = await fetchOrder(order.id);
      setOrder(updated);
    } catch {
      // ignore
    }
    setPickingMode(true);
    setSelectedItem(null);
  };

  const handleSelectItem = (item: OrderItem) => {
    if (item.picked) return;
    setSelectedItem(item);
    setScanning(true);
  };

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (!selectedItem || !order) return;
      setScanning(false);

      if (barcodeMatchesItem(data, selectedItem)) {
        try {
          const updated = await updateOrderItemPick(order.id, selectedItem.id, true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setOrder(updated);
          setSelectedItem(null);
          setScanning(true);
        } catch {
          Alert.alert('Error', 'Failed to update pick status');
          setScanning(true);
        }
      } else {
        Alert.alert(
          'Wrong item',
          `Expected SKU: ${selectedItem.sku}\nScanned: ${data}\n\nScan the correct barcode for "${selectedItem.productName}".`,
          [{ text: 'OK', onPress: () => setScanning(true) }]
        );
      }
    },
    [selectedItem, order]
  );

  const handleDonePicking = async () => {
    const itemsList = order?.items || [];
    if (order && itemsList.length > 0 && itemsList.every((i) => i.picked)) {
      try {
        await updateOrderStatus(order.id, 'picked');
        const updated = await fetchOrder(order.id);
        setOrder(updated);
      } catch {
        // ignore
      }
    }
    setPickingMode(false);
    setSelectedItem(null);
  };

  const formatPrice = (n: number) =>
    Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color={WebTheme.accent} />
        <ThemedText style={styles.loadingText}>Loading order…</ThemedText>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ThemedText style={styles.errorText}>{error || 'Order not found'}</ThemedText>
      </SafeAreaView>
    );
  }

  const items = order.items || [];
  const unpickedItems = items.filter((i) => !i.picked);
  const pickedCount = items.filter((i) => i.picked).length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Order #{order.id}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {order.customerName} · {formatPrice(order.total)}
          </ThemedText>
          <View style={styles.progress}>
            <ThemedText style={styles.progressText}>
              {pickedCount} of {items.length} picked
            </ThemedText>
          </View>

          {!pickingMode ? (
            <Pressable style={styles.startBtn} onPress={handleStartPicking}>
              <MaterialIcons name="qr-code-scanner" size={24} color="#fff" />
              <ThemedText style={styles.startBtnText}>Start Picking</ThemedText>
            </Pressable>
          ) : (
            <View style={styles.pickingActions}>
              <ThemedText style={styles.pickingHint}>
                Tap an item below, then scan its barcode to confirm.
              </ThemedText>
              <Pressable style={styles.doneBtn} onPress={handleDonePicking}>
                <ThemedText style={styles.doneBtnText}>Done Picking</ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Pick list</ThemedText>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.itemRow,
                item.picked && styles.itemRowPicked,
                selectedItem?.id === item.id && styles.itemRowSelected,
              ]}
              onPress={() => pickingMode && handleSelectItem(item)}
              disabled={!pickingMode || item.picked}>
              <View style={styles.itemStatus}>
                {item.picked ? (
                  <MaterialIcons name="check-circle" size={24} color={WebTheme.success} />
                ) : selectedItem?.id === item.id ? (
                  <MaterialIcons name="qr-code-scanner" size={24} color={WebTheme.accent} />
                ) : (
                  <MaterialIcons name="radio-button-unchecked" size={24} color={WebTheme.textMuted} />
                )}
              </View>
              <View style={styles.itemContent}>
                <ThemedText style={[styles.itemName, item.picked && styles.itemNamePicked]}>
                  {item.productName}
                </ThemedText>
                <ThemedText style={styles.itemMeta}>
                  {item.quantity} × {formatPrice(item.unitPrice)} · SKU: {item.sku}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Scanner modal - when item selected */}
      <Modal
        visible={!!selectedItem}
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}>
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <ThemedText style={styles.scannerTitle}>
              Scan barcode for: {selectedItem?.productName}
            </ThemedText>
            <ThemedText style={styles.scannerSku}>SKU: {selectedItem?.sku}</ThemedText>
            <Pressable style={styles.cancelScanBtn} onPress={() => setSelectedItem(null)}>
              <ThemedText style={styles.cancelScanText}>Cancel</ThemedText>
            </Pressable>
          </View>
          {!permission?.granted ? (
            <View style={styles.cameraPlaceholder}>
              <ThemedText style={styles.cameraPlaceholderText}>
                Camera permission required to scan barcodes.
              </ThemedText>
              <Pressable style={styles.permissionBtn} onPress={() => requestPermission?.()}>
                <ThemedText style={styles.permissionBtnText}>Grant Permission</ThemedText>
              </Pressable>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
              }}
              onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  centered: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: WebTheme.textMuted },
  errorText: { textAlign: 'center', color: WebTheme.textMuted },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24 },
  title: { color: WebTheme.text, fontSize: 28 },
  subtitle: { color: WebTheme.textMuted, marginTop: 4, fontSize: 15 },
  progress: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(227, 24, 55, 0.08)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  progressText: { fontSize: 14, fontWeight: '600', color: WebTheme.accent },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: WebTheme.accent,
    borderRadius: 12,
  },
  startBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  pickingActions: { marginTop: 16 },
  pickingHint: {
    fontSize: 14,
    color: WebTheme.textMuted,
    marginBottom: 12,
  },
  doneBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 8,
  },
  doneBtnText: { fontSize: 15, fontWeight: '600', color: WebTheme.text },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: WebTheme.text, marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  itemRowPicked: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  itemRowSelected: {
    borderColor: WebTheme.accent,
    borderWidth: 2,
    backgroundColor: 'rgba(227, 24, 55, 0.06)',
  },
  itemStatus: {},
  itemContent: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: WebTheme.text },
  itemNamePicked: { color: WebTheme.success, textDecorationLine: 'line-through' },
  itemMeta: { fontSize: 13, color: WebTheme.textMuted, marginTop: 2 },
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerHeader: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  scannerTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 4 },
  scannerSku: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  cancelScanBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelScanText: { color: WebTheme.accent, fontWeight: '600', fontSize: 16 },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cameraPlaceholderText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: WebTheme.accent,
    borderRadius: 8,
  },
  permissionBtnText: { color: '#fff', fontWeight: '600' },
});
