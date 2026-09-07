import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { cardStyles, PLACEHOLDER } from '../theme';
import { JarGlyph } from './JarGlyph';

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
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>Sign in</Text>
      {stage === 'email' ? (
        <>
          <Text style={cardStyles.label}>We'll email you a sign-in code — no password needed.</Text>
          <TextInput
            style={cardStyles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={PLACEHOLDER}
          />
          <Pressable
            style={[cardStyles.primaryButton, (busy || !email.includes('@')) && cardStyles.primaryButtonDisabled]}
            onPress={handleSendCode}
            disabled={busy || !email.includes('@')}
          >
            <Text style={cardStyles.primaryButtonText}>{busy ? 'Sending…' : 'Send code'}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={cardStyles.label}>Enter the code sent to {email}</Text>
          <TextInput
            style={cardStyles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="12345678"
            placeholderTextColor={PLACEHOLDER}
            maxLength={10}
          />
          <Pressable
            style={[cardStyles.primaryButton, (busy || code.length < 6) && cardStyles.primaryButtonDisabled]}
            onPress={handleVerify}
            disabled={busy || code.length < 6}
          >
            <Text style={cardStyles.primaryButtonText}>{busy ? 'Verifying…' : 'Verify'}</Text>
          </Pressable>
          <Pressable onPress={() => setStage('email')}>
            <Text style={cardStyles.link}>Use a different email</Text>
          </Pressable>
        </>
      )}
      {error && <Text style={cardStyles.errorText}>{error}</Text>}
    </View>
  );
}
