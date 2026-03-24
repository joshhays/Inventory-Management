import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { WebTheme } from '@/constants/web-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useDeployment } from '@/contexts/DeploymentContext';

const PAGE_BG = '#fafafa';

type BentoCardProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  large?: boolean;
};

function BentoCard({ icon, title, subtitle, onPress, large }: BentoCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        large && styles.cardLarge,
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}>
      <View style={styles.cardInner}>
        <View style={styles.iconWrap}>
          <MaterialIcons name={icon} size={28} color={WebTheme.accent} />
        </View>
        <ThemedText style={styles.cardTitle}>{title}</ThemedText>
        <ThemedText style={styles.cardSubtitle}>{subtitle}</ThemedText>
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { deployment, clearDeployment } = useDeployment();
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="title" style={styles.title}>
              Dashboard
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {deployment?.name ?? 'Inventory'}
              {user?.username ? ` · ${user.username}` : ''}
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.switchBtn} onPress={logout}>
              <MaterialIcons name="logout" size={18} color={WebTheme.accent} />
              <ThemedText style={styles.switchText}>Log out</ThemedText>
            </Pressable>
            <Pressable style={styles.switchBtn} onPress={clearDeployment}>
              <MaterialIcons name="swap-horiz" size={18} color={WebTheme.accent} />
              <ThemedText style={styles.switchText}>Switch</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}>
        <BentoCard
          icon="inventory-2"
          title="Products"
          subtitle="View inventory, adjust quantities, scan barcodes"
          onPress={() => router.push('/products')}
          large
        />
        <BentoCard
          icon="description"
          title="Orders"
          subtitle="View and manage orders"
          onPress={() => router.push('/explore')}
        />
        <BentoCard
          icon="receipt-long"
          title="Transaction Log"
          subtitle="Audit trail of inventory changes"
          onPress={() => router.push('/logs')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(227, 24, 55, 0.08)',
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
    color: WebTheme.accent,
  },
  title: {
    color: WebTheme.text,
    fontSize: 28,
  },
  subtitle: {
    color: WebTheme.textMuted,
    marginTop: 4,
    fontSize: 15,
  },
  scroll: {
    flex: 1,
  },
  grid: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
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
  cardLarge: {
    padding: 24,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardInner: {
    gap: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(227, 24, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: WebTheme.text,
  },
  cardSubtitle: {
    fontSize: 14,
    color: WebTheme.textMuted,
    lineHeight: 20,
  },
});
