import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface SignInScreenProps {
  onSendCode: (email: string) => Promise<void>;
  onVerifyCode: (email: string, code: string) => Promise<void>;
  error: string | null;
}

export function SignInScreen({ onSendCode, onVerifyCode, error }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);

  const handleSendCode = async () => {
    setBusy(true);
    try {
      await onSendCode(email);
      setStage('code');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    setBusy(true);
    try {
      await onVerifyCode(email, code);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Sign in</Text>
      {stage === 'email' ? (
        <>
          <Text style={styles.label}>We'll email you a 6-digit code — no password needed.</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Pressable
            style={[styles.primaryButton, (busy || !email.includes('@')) && styles.disabled]}
            onPress={handleSendCode}
            disabled={busy || !email.includes('@')}
          >
            <Text style={styles.primaryButtonText}>{busy ? 'Sending…' : 'Send code'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>Enter the code sent to {email}</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="123456"
            maxLength={6}
          />
          <Pressable
            style={[styles.primaryButton, (busy || code.length !== 6) && styles.disabled]}
            onPress={handleVerify}
            disabled={busy || code.length !== 6}
          >
            <Text style={styles.primaryButtonText}>{busy ? 'Verifying…' : 'Verify'}</Text>
          </Pressable>
          <Pressable onPress={() => setStage('email')}>
            <Text style={styles.backLink}>Use a different email</Text>
          </Pressable>
        </>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 16, padding: 24, margin: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: '#33415C' },
  label: { fontSize: 14, color: '#6B7280', marginBottom: 14, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryButton: { backgroundColor: '#5B8DEF', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  primaryButtonText: { color: 'white', fontWeight: '600', fontSize: 15 },
  backLink: { textAlign: 'center', color: '#5B8DEF', marginTop: 14 },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 14, textAlign: 'center' },
});
