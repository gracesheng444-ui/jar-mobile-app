import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../i18n';
import { cardStyles, MUTED, PLACEHOLDER } from '../theme';
import { JarGlyph } from './JarGlyph';
import { PasswordInput } from './PasswordInput';

interface SignInScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  /** Returns true if the account is already signed in; false if it still needs to confirm its email first. */
  onSignUp: (email: string, password: string) => Promise<boolean>;
  /** Alternative to clicking the signup email's confirmation link — uses the code from that same email instead. */
  onConfirmAccount: (email: string, code: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  /** Provisions a fresh, private demo jar and signs straight into it — no signup needed. */
  onTryDemo: () => Promise<void>;
  error: string | null;
}

type Mode = 'signin' | 'signup' | 'forgot';

export function SignInScreen({ onSignIn, onSignUp, onConfirmAccount, onForgotPassword, onTryDemo, error }: SignInScreenProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetLinkSent, setResetLinkSent] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setConfirmationCode('');
    setLocalError(null);
    setConfirmationSent(false);
    setResetLinkSent(false);
  };

  const handleSignIn = async () => {
    setLocalError(null);
    setBusy(true);
    try {
      await onSignIn(email, password);
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
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
      const signedIn = await onSignUp(email, password);
      if (!signedIn) {
        setConfirmationSent(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmAccount = async () => {
    setLocalError(null);
    setBusy(true);
    try {
      await onConfirmAccount(email, confirmationCode);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setLocalError(null);
    setBusy(true);
    try {
      await onForgotPassword(email);
      setResetLinkSent(true);
    } finally {
      setBusy(false);
    }
  };

  const handleTryDemo = async () => {
    setLocalError(null);
    setDemoBusy(true);
    try {
      await onTryDemo();
    } catch {
      // onTryDemo already surfaces the failure via the shared `error` prop.
    } finally {
      setDemoBusy(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <View style={cardStyles.card}>
        <JarGlyph />
        <Text style={cardStyles.heading}>{t.signIn.forgotPassword}</Text>

        {resetLinkSent ? (
          <Text style={styles.infoText}>{t.signIn.checkEmailForReset}</Text>
        ) : (
          <>
            <TextInput
              style={cardStyles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder={t.signIn.emailPlaceholder}
              placeholderTextColor={PLACEHOLDER}
            />
            <Pressable
              style={[cardStyles.primaryButton, (busy || !email.includes('@')) && cardStyles.primaryButtonDisabled]}
              onPress={handleForgotPassword}
              disabled={busy || !email.includes('@')}
            >
              <Text style={cardStyles.primaryButtonText}>{busy ? t.signIn.sendingResetLink : t.signIn.sendResetLink}</Text>
            </Pressable>
          </>
        )}

        <Pressable onPress={() => switchMode('signin')}>
          <Text style={cardStyles.link}>{t.signIn.backToSignIn}</Text>
        </Pressable>

        {(localError || error) && <Text style={cardStyles.errorText}>{localError ?? error}</Text>}
      </View>
    );
  }

  const canSubmit = email.includes('@') && password.length > 0 && !busy;

  return (
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>{mode === 'signin' ? t.signIn.signInHeading : t.signIn.signUpHeading}</Text>

      {confirmationSent ? (
        <>
          <Text style={styles.infoText}>{t.signIn.checkEmailToConfirm}</Text>
          <TextInput
            style={cardStyles.input}
            value={confirmationCode}
            onChangeText={setConfirmationCode}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="number-pad"
            placeholder={t.signIn.confirmationCodePlaceholder}
            placeholderTextColor={PLACEHOLDER}
          />
          <Pressable
            style={[cardStyles.primaryButton, (busy || confirmationCode.length === 0) && cardStyles.primaryButtonDisabled]}
            onPress={handleConfirmAccount}
            disabled={busy || confirmationCode.length === 0}
          >
            <Text style={cardStyles.primaryButtonText}>{busy ? t.signIn.confirmingAccount : t.signIn.confirmAccountButton}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={cardStyles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder={t.signIn.emailPlaceholder}
            placeholderTextColor={PLACEHOLDER}
          />
          <PasswordInput value={password} onChangeText={setPassword} placeholder={t.signIn.passwordPlaceholder} />
          {mode === 'signup' && (
            <PasswordInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t.signIn.confirmPasswordPlaceholder} />
          )}

          {mode === 'signin' ? (
            <Pressable style={[cardStyles.primaryButton, !canSubmit && cardStyles.primaryButtonDisabled]} onPress={handleSignIn} disabled={!canSubmit}>
              <Text style={cardStyles.primaryButtonText}>{busy ? t.signIn.signingIn : t.signIn.signInButton}</Text>
            </Pressable>
          ) : (
            <Pressable style={[cardStyles.primaryButton, !canSubmit && cardStyles.primaryButtonDisabled]} onPress={handleSignUp} disabled={!canSubmit}>
              <Text style={cardStyles.primaryButtonText}>{busy ? t.signIn.signingUp : t.signIn.signUpButton}</Text>
            </Pressable>
          )}

          {mode === 'signin' && (
            <Pressable onPress={() => switchMode('forgot')}>
              <Text style={cardStyles.link}>{t.signIn.forgotPassword}</Text>
            </Pressable>
          )}
        </>
      )}

      <Pressable onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
        <Text style={cardStyles.link}>{mode === 'signin' ? t.signIn.switchToSignUp : t.signIn.switchToSignIn}</Text>
      </Pressable>

      {!confirmationSent && (
        <>
          <View style={cardStyles.divider}>
            <View style={cardStyles.dividerLine} />
            <View style={cardStyles.dividerLine} />
          </View>
          <Pressable style={[cardStyles.secondaryButton, demoBusy && cardStyles.primaryButtonDisabled]} onPress={handleTryDemo} disabled={demoBusy}>
            <Text style={cardStyles.secondaryButtonText}>{demoBusy ? t.signIn.settingUpDemo : t.signIn.tryDemo}</Text>
          </Pressable>
        </>
      )}

      {(localError || error) && <Text style={cardStyles.errorText}>{localError ?? error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  infoText: { color: MUTED, fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
});
