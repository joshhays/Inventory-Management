import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { WebTheme } from '@/constants/web-theme';
import { useAuth } from '@/contexts/AuthContext';
import { useDeployment } from '@/contexts/DeploymentContext';

export default function LoginScreen() {
  const { deployment, clearDeployment } = useDeployment();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = useCallback(async () => {
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      setError('Username or email and password are required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await login(u, p);
      // AuthContext updates, layout shows main app
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }, [username, password, login]);

  const logoUrl = deployment?.logoUrl;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="contain" />
            ) : (
              <View style={styles.logoPlaceholder}>
                <ThemedText style={styles.logoPlaceholderText}>
                  {deployment?.name?.charAt(0) ?? 'I'}
                </ThemedText>
              </View>
            )}
            <ThemedText type="title" style={styles.title}>
              Sign in
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {deployment?.name ?? 'Inventory'} · Admin
            </ThemedText>

            <TextInput
              style={styles.input}
              placeholder="Username or email"
              placeholderTextColor={WebTheme.textMuted}
              value={username}
              onChangeText={(t) => { setUsername(t); setError(''); }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={WebTheme.textMuted}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry
              editable={!submitting}
            />

            {error ? (
              <ThemedText style={styles.error}>{error}</ThemedText>
            ) : null}

            <Pressable
              style={[styles.btn, submitting && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.btnText}>Sign in</ThemedText>
              )}
            </Pressable>

            <Pressable style={styles.switchLink} onPress={clearDeployment}>
              <ThemedText style={styles.switchText}>← Switch deployment</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WebTheme.pageBg },
  keyboard: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 48,
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
  logo: {
    width: 120,
    height: 56,
    alignSelf: 'center',
    marginBottom: 20,
  },
  logoPlaceholder: {
    width: 80,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(227, 24, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  logoPlaceholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: WebTheme.accent,
  },
  title: {
    color: WebTheme.text,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: WebTheme.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: WebTheme.glassBorder,
    borderRadius: WebTheme.radiusSm,
    padding: 14,
    fontSize: 16,
    color: WebTheme.text,
    marginBottom: 12,
  },
  error: {
    color: WebTheme.danger,
    fontSize: 14,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: WebTheme.accent,
    paddingVertical: 14,
    borderRadius: WebTheme.radiusSm,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  switchLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  switchText: {
    color: WebTheme.accent,
    fontSize: 14,
    fontWeight: '500',
  },
});
