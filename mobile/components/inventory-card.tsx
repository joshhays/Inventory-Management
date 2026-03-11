import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { WebTheme } from '@/constants/web-theme';
import type { Product } from '@/lib/api';

type StockLevel = 'in-stock' | 'low' | 'out';

function getStockLevel(product: Product): StockLevel | null {
  const isKit = product.productType === 'kit';
  const qty = isKit && product.kitItems?.length ? product.quantity : isKit ? null : product.quantity;
  if (qty === null) return null;
  if (qty === 0) return 'out';
  if (qty <= 5) return 'low';
  return 'in-stock';
}

const stockStyles = {
  'in-stock': { bg: WebTheme.successBg, text: WebTheme.success, label: 'In Stock' },
  low: { bg: WebTheme.warningBg, text: WebTheme.warning, label: 'Low' },
  out: { bg: WebTheme.dangerBg, text: WebTheme.danger, label: 'Out of Stock' },
};

export function InventoryCard({
  product,
  onPress,
  formatPrice,
}: {
  product: Product;
  onPress: () => void;
  formatPrice: (n: number) => string;
}) {
  const stock = getStockLevel(product);
  const isKit = product.productType === 'kit';
  const qtyDisplay = stock === null ? '—' : product.quantity;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}>
      <View style={styles.thumbnail}>
        <ThemedText style={styles.thumbnailText}>
          {product.name.charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.content}>
        <ThemedText style={styles.name} numberOfLines={2}>
          {product.name}
          {isKit && <ThemedText style={styles.kitBadge}> Kit</ThemedText>}
        </ThemedText>
        <ThemedText style={styles.meta} numberOfLines={1}>
          {product.sku} · {formatPrice(product.price)}
          {product.group ? ` · ${product.group.name}` : ''}
        </ThemedText>
        <View style={styles.footer}>
          <View
            style={[
              styles.pill,
              stock && { backgroundColor: stockStyles[stock].bg },
            ]}>
            <ThemedText
              style={[
                styles.pillText,
                stock && { color: stockStyles[stock].text },
              ]}>
              {stock ? stockStyles[stock].label : `${qtyDisplay} in stock`}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: { opacity: 0.9 },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#E8ECF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  thumbnailText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748b',
  },
  content: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  kitBadge: { color: WebTheme.kit, fontWeight: '600' },
  meta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  footer: { flexDirection: 'row', alignItems: 'center' },
  pill: {
    backgroundColor: WebTheme.successBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: WebTheme.success,
  },
});
