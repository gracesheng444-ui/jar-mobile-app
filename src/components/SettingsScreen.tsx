import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Language, useI18n } from '../i18n';
import { cardStyles, CREAM_BORDER, CREAM_FIELD, GOLD, INK, MUTED, PLACEHOLDER } from '../theme';
import { Avatar } from './Avatar';
import { AvatarPicker } from './AvatarPicker';
import { JarGlyph } from './JarGlyph';
import { PasswordInput } from './PasswordInput';

interface SettingsScreenProps {
  currentName: string;
  userId: string;
  email: string | null;
  avatarUrl: string | null;
  avatarColor: string;
  onSaveName: (name: string) => void;
  onChangeAvatar: (next: { url: string | null; color: string }) => void;
  onChangeLanguage: (language: Language) => void;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onSignOut: () => void;
}

type Section = 'list' | 'picture' | 'name' | 'language' | 'password' | 'delete-account';

export function SettingsScreen({
  currentName,
  userId,
  email,
  avatarUrl,
  avatarColor,
  onSaveName,
  onChangeAvatar,
  onChangeLanguage,
  onChangePassword,
  onDeleteAccount,
  onSignOut,
}: SettingsScreenProps) {
  const { language, t } = useI18n();
  const [section, setSection] = useState<Section>('list');

  if (section === 'picture') {
    return (
      <View style={cardStyles.card}>
        <BackRow onPress={() => setSection('list')} />
        <Text style={cardStyles.heading}>{t.settings.profilePictureLabel}</Text>
        <AvatarPicker userId={userId} name={currentName} avatarUrl={avatarUrl} avatarColor={avatarColor} onAvatarChange={onChangeAvatar} />
      </View>
    );
  }

  if (section === 'name') {
    return (
      <View style={cardStyles.card}>
        <BackRow onPress={() => setSection('list')} />
        <NameEditor currentName={currentName} onSave={(name) => {
          onSaveName(name);
          setSection('list');
        }} />
      </View>
    );
  }

  if (section === 'language') {
    return (
      <View style={cardStyles.card}>
        <BackRow onPress={() => setSection('list')} />
        <Text style={cardStyles.heading}>{t.settings.languageLabel}</Text>
        <View style={styles.languageRow}>
          <Pressable
            style={[styles.languagePill, language === 'en' && styles.languagePillSelected]}
            onPress={() => {
              onChangeLanguage('en');
              setSection('list');
            }}
          >
            <Text style={[styles.languagePillText, language === 'en' && styles.languagePillTextSelected]}>{t.settings.english}</Text>
          </Pressable>
          <Pressable
            style={[styles.languagePill, language === 'zh' && styles.languagePillSelected]}
            onPress={() => {
              onChangeLanguage('zh');
              setSection('list');
            }}
          >
            <Text style={[styles.languagePillText, language === 'zh' && styles.languagePillTextSelected]}>{t.settings.chinese}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (section === 'password') {
    return (
      <View style={cardStyles.card}>
        <BackRow onPress={() => setSection('list')} />
        <PasswordEditor onSave={onChangePassword} />
      </View>
    );
  }

  if (section === 'delete-account') {
    return (
      <View style={cardStyles.card}>
        <BackRow onPress={() => setSection('list')} />
        <DeleteAccountSection onDelete={onDeleteAccount} />
      </View>
    );
  }

  return (
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>{t.settings.heading}</Text>

      <SettingsRow
        label={t.settings.profilePictureLabel}
        preview={<Avatar url={avatarUrl} color={avatarColor} name={currentName} size={28} />}
        onPress={() => setSection('picture')}
      />
      <SettingsRow
        label={t.settings.nameLabel}
        preview={<Text style={styles.rowPreviewText}>{currentName === 'Partner' ? t.settings.nameUnset : currentName}</Text>}
        onPress={() => setSection('name')}
      />
      <InfoRow label={t.settings.emailLabel} value={email ?? t.settings.emailUnavailable} />
      <SettingsRow
        label={t.settings.languageLabel}
        preview={<Text style={styles.rowPreviewText}>{language === 'en' ? t.settings.english : t.settings.chinese}</Text>}
        onPress={() => setSection('language')}
      />
      <SettingsRow label={t.settings.changePasswordLabel} preview={null} onPress={() => setSection('password')} />

      <View style={cardStyles.divider}>
        <View style={cardStyles.dividerLine} />
      </View>

      <Pressable style={cardStyles.secondaryButton} onPress={onSignOut}>
        <Text style={cardStyles.secondaryButtonText}>{t.signOut}</Text>
      </Pressable>

      <Pressable style={[styles.dangerButton, styles.dangerButtonSpacing]} onPress={() => setSection('delete-account')}>
        <Text style={styles.dangerButtonText}>{t.settings.deleteAccountLabel}</Text>
      </Pressable>
    </View>
  );
}

function BackRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.backArrow} onPress={onPress}>
      <Text style={styles.backArrowText}>←</Text>
    </Pressable>
  );
}

function SettingsRow({ label, preview, onPress }: { label: string; preview: ReactNode; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {preview}
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

/** Same look as SettingsRow, but for a field with nothing to navigate to or edit here (the
 *  account's linked email — changing it isn't offered anywhere in this screen). */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowPreviewText, styles.infoRowValue]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function NameEditor({ currentName, onSave }: { currentName: string; onSave: (name: string) => void }) {
  const { t } = useI18n();
  // 'Partner' is the DB default for "never customized" — don't prefill it as if it were a real name.
  const [name, setName] = useState(currentName === 'Partner' ? '' : currentName);
  const trimmed = name.trim();

  return (
    <>
      <Text style={cardStyles.heading}>{t.settings.nameLabel}</Text>
      <TextInput
        style={cardStyles.input}
        value={name}
        onChangeText={setName}
        placeholder={t.settings.namePlaceholder}
        placeholderTextColor={PLACEHOLDER}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={40}
      />
      <Pressable style={[cardStyles.primaryButton, !trimmed && cardStyles.primaryButtonDisabled]} disabled={!trimmed} onPress={() => trimmed && onSave(trimmed)}>
        <Text style={cardStyles.primaryButtonText}>{t.settings.save}</Text>
      </Pressable>
    </>
  );
}

function PasswordEditor({ onSave }: { onSave: (currentPassword: string, newPassword: string) => Promise<void> }) {
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setLocalError(null);
    if (newPassword.length < 6) {
      setLocalError(t.signIn.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError(t.signIn.passwordsDontMatch);
      return;
    }
    setBusy(true);
    try {
      await onSave(currentPassword, newPassword);
      setDone(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={cardStyles.heading}>{t.settings.changePasswordLabel}</Text>
      <PasswordInput value={currentPassword} onChangeText={setCurrentPassword} placeholder={t.settings.currentPasswordPlaceholder} />
      <PasswordInput value={newPassword} onChangeText={setNewPassword} placeholder={t.settings.newPasswordPlaceholder} />
      <PasswordInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t.settings.confirmNewPasswordPlaceholder} />
      <Pressable
        style={[cardStyles.primaryButton, (busy || !currentPassword || !newPassword) && cardStyles.primaryButtonDisabled]}
        disabled={busy || !currentPassword || !newPassword}
        onPress={handleSave}
      >
        <Text style={cardStyles.primaryButtonText}>{busy ? t.settings.changingPassword : t.settings.changePasswordButton}</Text>
      </Pressable>
      {done && <Text style={styles.infoText}>{t.settings.passwordChanged}</Text>}
      {localError && <Text style={cardStyles.errorText}>{localError}</Text>}
    </>
  );
}

function DeleteAccountSection({ onDelete }: { onDelete: () => Promise<void> }) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLocalError(null);
    setBusy(true);
    try {
      await onDelete();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <>
      <Text style={cardStyles.heading}>{t.settings.deleteAccountLabel}</Text>
      <Text style={cardStyles.label}>{t.settings.deleteAccountWarning}</Text>
      {!confirming ? (
        <Pressable style={styles.dangerButton} onPress={() => setConfirming(true)}>
          <Text style={styles.dangerButtonText}>{t.settings.deleteAccountButton}</Text>
        </Pressable>
      ) : (
        <>
          <Text style={[cardStyles.label, styles.confirmPrompt]}>{t.settings.deleteAccountConfirmPrompt}</Text>
          <Pressable style={[styles.dangerButton, busy && cardStyles.primaryButtonDisabled]} disabled={busy} onPress={handleDelete}>
            <Text style={styles.dangerButtonText}>{busy ? t.settings.deletingAccount : t.settings.deleteAccountConfirmButton}</Text>
          </Pressable>
          <Pressable onPress={() => setConfirming(false)} disabled={busy}>
            <Text style={cardStyles.link}>{t.settings.cancel}</Text>
          </Pressable>
        </>
      )}
      {localError && <Text style={cardStyles.errorText}>{localError}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CREAM_FIELD,
    borderWidth: 2,
    borderColor: CREAM_BORDER,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  rowLabel: { fontWeight: '700', color: INK, fontSize: 14 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowPreviewText: { color: MUTED, fontSize: 13 },
  infoRowValue: { flexShrink: 1, marginLeft: 8, textAlign: 'right' },
  chevron: { color: MUTED, fontSize: 18, fontWeight: '700' },
  backArrow: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 4, marginBottom: 8, marginLeft: -4 },
  backArrowText: { fontSize: 22, fontWeight: '700', color: INK },
  languageRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 4 },
  languagePill: {
    flex: 1,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  languagePillSelected: { backgroundColor: GOLD },
  languagePillText: { fontWeight: '700', color: INK },
  languagePillTextSelected: { fontWeight: '800' },
  infoText: { color: MUTED, fontSize: 13, textAlign: 'center', marginTop: 4 },
  dangerButtonSpacing: { marginTop: 10, marginBottom: 0 },
  dangerButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 2,
    borderColor: '#B3261E',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButtonText: { fontWeight: '800', color: '#B3261E', fontSize: 15 },
  confirmPrompt: { fontWeight: '700', color: '#B3261E' },
});
