import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { cardStyles } from '../theme';
import { JarGlyph } from './JarGlyph';
import { PasswordInput } from './PasswordInput';

interface ResetPasswordScreenProps {
  onSave: (password: string) => Promise<void>;
  error: string | null;
}

export function ResetPasswordScreen({ onSave, error }: ResetPasswordScreenProps) {
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = async () => {
    setLocalError(null);
    if (password.length < 6) {
      setLocalError(t.signIn.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setLocalError(t.signIn.passwordsDontMatch);
      return;
    }
    setBusy(true);
    try {
      await onSave(password);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>{t.resetPassword.heading}</Text>
      <Text style={cardStyles.label}>{t.resetPassword.subtitle}</Text>
      <PasswordInput value={password} onChangeText={setPassword} placeholder={t.resetPassword.newPasswordPlaceholder} />
      <PasswordInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t.resetPassword.confirmPasswordPlaceholder} />
      <Pressable
        style={[cardStyles.primaryButton, (busy || password.length === 0) && cardStyles.primaryButtonDisabled]}
        onPress={handleSave}
        disabled={busy || password.length === 0}
      >
        <Text style={cardStyles.primaryButtonText}>{busy ? t.resetPassword.saving : t.resetPassword.save}</Text>
      </Pressable>
      {(localError || error) && <Text style={cardStyles.errorText}>{localError ?? error}</Text>}
    </View>
  );
}
