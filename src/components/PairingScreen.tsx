import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatDateInput, MAX_TARGET_DAYS, parseTargetDate } from '../dateInput';
import { useI18n } from '../i18n';
import { DOODLE_PALETTE, defaultStarColorFor } from '../starColors';
import { CREAM_FIELD, INK, PLACEHOLDER, cardStyles } from '../theme';
import { JarGlyph } from './JarGlyph';
import { LeaveJarButton } from './LeaveJarButton';

interface CreateOrJoinProps {
  userId: string;
  onCreate: (targetDateUTC: Date, starColor: string) => void;
  onJoin: (code: string, starColor: string) => void;
  error: string | null;
  /** Which sub-form to land on — set when arriving via a dedicated "Join a jar" entry point, so it skips the combined choose-view. Defaults to the create form. */
  initialMode?: 'create' | 'join';
}

function StarColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.colorPicker}>
      <Text style={styles.colorLabel}>{t.pairing.starColorLabel}</Text>
      <View style={styles.swatchRow}>
        {DOODLE_PALETTE.map((c) => (
          <Pressable key={c} onPress={() => onChange(c)} style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchSelected]} />
        ))}
      </View>
    </View>
  );
}

export function CreateOrJoinScreen({ userId, onCreate, onJoin, error, initialMode }: CreateOrJoinProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'choose' | 'join'>(initialMode === 'join' ? 'join' : 'choose');
  const [code, setCode] = useState('');
  const [targetDateText, setTargetDateText] = useState('');
  const [color, setColor] = useState(() => defaultStarColorFor(userId));
  const { date: targetDate, error: dateError } = parseTargetDate(targetDateText);

  return (
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>{t.pairing.heading}</Text>
      {mode === 'choose' ? (
        <>
          <Text style={cardStyles.label}>{t.pairing.whenMeetingUp}</Text>
          <TextInput
            style={cardStyles.input}
            value={targetDateText}
            onChangeText={(text) => setTargetDateText((previous) => formatDateInput(text, previous))}
            placeholder={t.pairing.datePlaceholder}
            placeholderTextColor={PLACEHOLDER}
            keyboardType="number-pad"
            autoCorrect={false}
            maxLength={10}
          />
          {targetDateText.length > 0 && !targetDate && (
            <Text style={cardStyles.errorText}>
              {dateError === 'too_far' ? t.pairing.pickWithinDays(MAX_TARGET_DAYS) : t.pairing.enterRealFutureDate}
            </Text>
          )}
          <StarColorPicker color={color} onChange={setColor} />
          <Pressable
            style={[cardStyles.primaryButton, !targetDate && cardStyles.primaryButtonDisabled]}
            disabled={!targetDate}
            onPress={() => targetDate && onCreate(targetDate, color)}
          >
            <Text style={cardStyles.primaryButtonText}>{t.pairing.createNewJar}</Text>
          </Pressable>
          <View style={cardStyles.divider}>
            <View style={cardStyles.dividerLine} />
            <Text style={cardStyles.dividerText}>{t.pairing.or}</Text>
            <View style={cardStyles.dividerLine} />
          </View>
          <Pressable style={cardStyles.secondaryButton} onPress={() => setMode('join')}>
            <Text style={cardStyles.secondaryButtonText}>{t.pairing.joinWithCode}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={cardStyles.label}>{t.pairing.enterPartnerCode}</Text>
          <TextInput
            style={[cardStyles.input, styles.codeInput]}
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={t.pairing.codePlaceholder}
            placeholderTextColor={PLACEHOLDER}
            maxLength={6}
          />
          <StarColorPicker color={color} onChange={setColor} />
          <Pressable
            style={[cardStyles.primaryButton, code.length !== 6 && cardStyles.primaryButtonDisabled]}
            onPress={() => onJoin(code, color)}
            disabled={code.length !== 6}
          >
            <Text style={cardStyles.primaryButtonText}>{t.pairing.joinJarButton}</Text>
          </Pressable>
          <Pressable onPress={() => setMode('choose')}>
            <Text style={cardStyles.link}>{t.pairing.back}</Text>
          </Pressable>
        </>
      )}
      {error && <Text style={cardStyles.errorText}>{error}</Text>}
    </View>
  );
}

export function WaitingForPartnerScreen({ inviteCode, onLeave }: { inviteCode: string; onLeave: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: t.pairing.shareMessage(inviteCode) });
    } catch {
      // User cancelled, or the platform has no share sheet (e.g. desktop web without the
      // Web Share API) — Copy above is the reliable fallback either way.
    }
  };

  return (
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>{t.pairing.waitingHeading}</Text>
      <Text style={cardStyles.label}>{t.pairing.shareCodeLabel}</Text>
      <View style={styles.codeBox}>
        <Text style={styles.code}>{inviteCode}</Text>
      </View>
      <View style={styles.codeActionsRow}>
        <Pressable style={styles.codeActionButton} onPress={handleCopy}>
          <Text style={styles.codeActionText}>{copied ? t.pairing.codeCopied : t.pairing.copyCode}</Text>
        </Pressable>
        <Pressable style={styles.codeActionButton} onPress={handleShare}>
          <Text style={styles.codeActionText}>{t.pairing.shareCode}</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>{t.pairing.autoUpdateHint}</Text>
      <View style={styles.leaveSpacer}>
        <LeaveJarButton onLeave={onLeave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  codeInput: { fontSize: 22, letterSpacing: 6 },
  codeBox: {
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: CREAM_FIELD,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  code: { fontSize: 34, fontWeight: '800', letterSpacing: 6, textAlign: 'center', color: INK },
  codeActionsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  codeActionButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  codeActionText: { fontWeight: '700', color: INK, fontSize: 13 },
  hint: { fontSize: 12, color: PLACEHOLDER, textAlign: 'center' },
  leaveSpacer: { marginTop: 16 },
  colorPicker: { alignItems: 'center', marginBottom: 14 },
  colorLabel: { fontSize: 13, fontWeight: '700', color: INK, marginBottom: 10, textAlign: 'center' },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: INK },
});
