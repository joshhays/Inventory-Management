import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { DEPLOYMENTS } from '@/constants/deployments';
import { WebTheme } from '@/constants/web-theme';
import { useDeployment } from '@/contexts/DeploymentContext';

export default function DeploymentSelectScreen() {
  const { selectDeployment } = useDeployment();
  const router = useRouter();

  const handleSelect = async (deployment: (typeof DEPLOYMENTS)[0]) => {
    await selectDeployment(deployment);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Select deployment
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Choose which site to connect to. More will be added as customers onboard.
          </ThemedText>
        </View>

        <View style={styles.cards}>
          {DEPLOYMENTS.map((d) => (
            <Pressable
              key={d.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => handleSelect(d)}>
              <View style={styles.cardInner}>
                {d.logoUrl ? (
                  <Image
                    source={{ uri: d.logoUrl }}
                    style={styles.logo}
                    contentFit="contain"
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <ThemedText style={styles.logoPlaceholderText}>
                      {d.name.charAt(0)}
                    </ThemedText>
                  </View>
                )}
                <ThemedText style={styles.cardTitle}>{d.name}</ThemedText>
                <ThemedText style={styles.cardSubtitle} numberOfLines={1}>
                  {d.apiBase.replace(/^https?:\/\//, '')}
                </ThemedText>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: WebTheme.pageBg,
  },
  scroll: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    color: WebTheme.text,
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    color: WebTheme.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: WebTheme.glassBg,
    borderRadius: WebTheme.radiusLg,
    padding: 24,
    borderWidth: 1,
    borderColor: WebTheme.glassBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardInner: {
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 80,
    height: 48,
  },
  logoPlaceholder: {
    width: 80,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(227, 24, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontSize: 24,
    fontWeight: '700',
    color: WebTheme.accent,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: WebTheme.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: WebTheme.textMuted,
  },
});
