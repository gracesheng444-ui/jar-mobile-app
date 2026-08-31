import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface CreateOrJoinProps {
  onCreate: () => void;
  onJoin: (code: string) => void;
  error: string | null;
}

export function CreateOrJoinScreen({ onCreate, onJoin, error }: CreateOrJoinProps) {
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [code, setCode] = useState('');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Start your jar</Text>
      {mode === 'choose' ? (
        <>
          <Pressable style={styles.primaryButton} onPress={onCreate}>
            <Text style={styles.primaryButtonText}>Create a new jar</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setMode('join')}>
            <Text style={styles.secondaryButtonText}>Join with a code</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.label}>Enter your partner's invite code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="ABC123"
            maxLength={6}
          />
          <Pressable style={styles.primaryButton} onPress={() => onJoin(code)} disabled={code.length !== 6}>
            <Text style={styles.primaryButtonText}>Join jar</Text>
          </Pressable>
          <Pressable onPress={() => setMode('choose')}>
            <Text style={styles.backLink}>Back</Text>
          </Pressable>
        </>
      )}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export function WaitingForPartnerScreen({ inviteCode }: { inviteCode: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Waiting for your partner</Text>
      <Text style={styles.label}>Share this code with them:</Text>
      <Text style={styles.code}>{inviteCode}</Text>
      <Text style={styles.hint}>This screen updates automatically once they join.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 16, padding: 24, margin: 20, alignItems: 'stretch' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: '#33415C' },
  label: { fontSize: 14, color: '#6B7280', marginBottom: 10, textAlign: 'center' },
  primaryButton: { backgroundColor: '#5B8DEF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: 'white', fontWeight: '600', fontSize: 15 },
  secondaryButton: { backgroundColor: '#EEF2FF', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#33415C', fontWeight: '600', fontSize: 15 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D9E6',
    borderRadius: 12,
    padding: 14,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 16,
  },
  backLink: { textAlign: 'center', color: '#5B8DEF', marginTop: 12 },
  code: { fontSize: 36, fontWeight: '700', letterSpacing: 6, textAlign: 'center', color: '#5B8DEF', marginBottom: 12 },
  hint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 12, textAlign: 'center' },
});
