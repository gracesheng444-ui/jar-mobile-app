import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatDateInput, MAX_TARGET_DAYS, parseTargetDate } from '../dateInput';
import { useI18n } from '../i18n';
import { cardStyles, CREAM_BORDER, CREAM_FIELD, INK, MUTED, PLACEHOLDER } from '../theme';

interface MeetupDateEditorProps {
  targetDateUTC: Date | undefined;
  onSave: (date: Date) => Promise<void>;
}

function toDateInputText(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Lets either partner move a jar's meet-up date after creation (plans change). Doesn't affect
 *  the jar's existing stars — see update_target_date() in schema.sql for why. */
export function MeetupDateEditor({ targetDateUTC, onSave }: MeetupDateEditorProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(targetDateUTC ? toDateInputText(targetDateUTC) : '');
  const [busy, setBusy] = useState(false);
  const { date, error } = parseTargetDate(text);

  const startEditing = () => {
    setText(targetDateUTC ? toDateInputText(targetDateUTC) : '');
    setEditing(true);
  };

  const handleSave = async () => {
    if (!date) return;
    setBusy(true);
    try {
      await onSave(date);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <View style={cardStyles.card}>
        <View style={styles.row}>
          <View>
            <Text style={styles.label}>{t.meetupDate.label}</Text>
            <Text style={styles.value}>{targetDateUTC ? toDateInputText(targetDateUTC) : '—'}</Text>
          </View>
          <Pressable onPress={startEditing}>
            <Text style={styles.changeLink}>{t.meetupDate.change}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={cardStyles.card}>
      <Text style={styles.label}>{t.meetupDate.label}</Text>
      <TextInput
        style={[cardStyles.input, styles.input]}
        value={text}
        onChangeText={(next) => setText((prev) => formatDateInput(next, prev))}
        keyboardType="number-pad"
        autoCorrect={false}
        maxLength={10}
        placeholderTextColor={PLACEHOLDER}
      />
      {text.length > 0 && !date && (
        <Text style={cardStyles.errorText}>{error === 'too_far' ? t.pairing.pickWithinDays(MAX_TARGET_DAYS) : t.pairing.enterRealFutureDate}</Text>
      )}
      <View style={styles.actionsRow}>
        <Pressable style={[cardStyles.primaryButton, styles.actionButton, !date && cardStyles.primaryButtonDisabled]} disabled={!date || busy} onPress={handleSave}>
          <Text style={cardStyles.primaryButtonText}>{t.meetupDate.save}</Text>
        </Pressable>
        <Pressable style={[cardStyles.secondaryButton, styles.actionButton]} onPress={() => setEditing(false)}>
          <Text style={cardStyles.secondaryButtonText}>{t.meetupDate.cancel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '700', color: INK },
  changeLink: { fontSize: 13, fontWeight: '700', color: INK, textDecorationLine: 'underline' },
  input: { marginBottom: 10, backgroundColor: CREAM_FIELD, borderColor: CREAM_BORDER },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, marginBottom: 0 },
});
