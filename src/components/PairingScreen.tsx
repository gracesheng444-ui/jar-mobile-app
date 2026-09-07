import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CREAM_FIELD, INK, PLACEHOLDER, cardStyles } from '../theme';
import { JarGlyph } from './JarGlyph';
import { LeaveJarButton } from './LeaveJarButton';

interface CreateOrJoinProps {
  onCreate: (targetDateUTC: Date) => void;
  onJoin: (code: string) => void;
  error: string | null;
  /** Only passed when the account already has other jars, so there's somewhere to go back to. */
  onBack?: () => void;
}

// Countdown jars render a fixed number of individually-visible stars in a
// fixed-size jar; beyond ~125 days (capacity 250, verified empirically
// against the actual jar illustration — re-checked after the starWrap floor
// padding fix, which slightly reduced the usable area) stars overflow past
// the ruffle. Capped here so the app can't create a jar past the point it
// can actually render well.
const MAX_TARGET_DAYS = 125;

type TargetDateError = 'invalid' | 'too_far' | null;

/** Auto-inserts the dashes as digits are typed, so "20261225" becomes "2026-12-25" without the user typing "-". */
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('-');
}

/** Parses a "YYYY-MM-DD" target date, requiring a real calendar date within the supported range. */
function parseTargetDate(text: string): { date: Date | null; error: TargetDateError } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return { date: null, error: null };
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(day)) return { date: null, error: null };
  if (date.getTime() <= Date.now()) return { date: null, error: 'invalid' };
  const daysOut = (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  if (daysOut > MAX_TARGET_DAYS) return { date: null, error: 'too_far' };
  return { date, error: null };
}

export function CreateOrJoinScreen({ onCreate, onJoin, error, onBack }: CreateOrJoinProps) {
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [code, setCode] = useState('');
  const [targetDateText, setTargetDateText] = useState('');
  const { date: targetDate, error: dateError } = parseTargetDate(targetDateText);

  return (
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>Start your jar</Text>
      {onBack && (
        <Pressable onPress={onBack}>
          <Text style={styles.backLink}>← My jars</Text>
        </Pressable>
      )}
      {mode === 'choose' ? (
        <>
          <Text style={cardStyles.label}>When are you meeting up? (within {MAX_TARGET_DAYS} days)</Text>
          <TextInput
            style={cardStyles.input}
            value={targetDateText}
            onChangeText={(t) => setTargetDateText(formatDateInput(t))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={PLACEHOLDER}
            keyboardType="number-pad"
            autoCorrect={false}
            maxLength={10}
          />
          {targetDateText.length > 0 && !targetDate && (
            <Text style={cardStyles.errorText}>
              {dateError === 'too_far' ? `Pick a date within ${MAX_TARGET_DAYS} days from now.` : 'Enter a real date in the future.'}
            </Text>
          )}
          <Pressable
            style={[cardStyles.primaryButton, !targetDate && cardStyles.primaryButtonDisabled]}
            disabled={!targetDate}
            onPress={() => targetDate && onCreate(targetDate)}
          >
            <Text style={cardStyles.primaryButtonText}>Create a new jar</Text>
          </Pressable>
          <View style={cardStyles.divider}>
            <View style={cardStyles.dividerLine} />
            <Text style={cardStyles.dividerText}>or</Text>
            <View style={cardStyles.dividerLine} />
          </View>
          <Pressable style={cardStyles.secondaryButton} onPress={() => setMode('join')}>
            <Text style={cardStyles.secondaryButtonText}>Join with a code</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={cardStyles.label}>Enter your partner's invite code</Text>
          <TextInput
            style={[cardStyles.input, styles.codeInput]}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="ABC123"
            placeholderTextColor={PLACEHOLDER}
            maxLength={6}
          />
          <Pressable
            style={[cardStyles.primaryButton, code.length !== 6 && cardStyles.primaryButtonDisabled]}
            onPress={() => onJoin(code)}
            disabled={code.length !== 6}
          >
            <Text style={cardStyles.primaryButtonText}>Join jar</Text>
          </Pressable>
          <Pressable onPress={() => setMode('choose')}>
            <Text style={cardStyles.link}>Back</Text>
          </Pressable>
        </>
      )}
      {error && <Text style={cardStyles.errorText}>{error}</Text>}
    </View>
  );
}

export function WaitingForPartnerScreen({
  inviteCode,
  onLeave,
  onBack,
}: {
  inviteCode: string;
  onLeave: () => void;
  onBack: () => void;
}) {
  return (
    <View style={cardStyles.card}>
      <Pressable onPress={onBack}>
        <Text style={styles.backLink}>← My jars</Text>
      </Pressable>
      <JarGlyph />
      <Text style={cardStyles.heading}>Waiting for your partner</Text>
      <Text style={cardStyles.label}>Share this code with them:</Text>
      <View style={styles.codeBox}>
        <Text style={styles.code}>{inviteCode}</Text>
      </View>
      <Text style={styles.hint}>This screen updates automatically once they join.</Text>
      <View style={styles.leaveSpacer}>
        <LeaveJarButton onLeave={onLeave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backLink: { textAlign: 'center', color: INK, fontWeight: '600', fontSize: 13, marginBottom: 12 },
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
  hint: { fontSize: 12, color: PLACEHOLDER, textAlign: 'center' },
  leaveSpacer: { marginTop: 16 },
});
