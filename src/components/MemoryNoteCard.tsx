import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../i18n';
import { cardStyles, CREAM_BORDER, INK, MUTED, PLACEHOLDER } from '../theme';

interface MemoryNoteCardProps {
  selfNote: string | null;
  partnerNote: string | null;
  partnerName: string;
  onSave: (note: string) => Promise<void>;
}

/** Lets either partner attach a short optional note to today's cycle — independent of whether
 *  they've tapped. Shows the partner's note too, once they've written one, so the jar carries an
 *  actual memory alongside the streak mechanics. */
export function MemoryNoteCard({ selfNote, partnerNote, partnerName, onSave }: MemoryNoteCardProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(selfNote ?? '');
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={cardStyles.card}>
      <Text style={styles.sectionTitle}>{t.memory.heading}</Text>

      {editing ? (
        <>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={t.memory.placeholder}
            placeholderTextColor={PLACEHOLDER}
            multiline
            maxLength={280}
          />
          <Pressable style={[cardStyles.primaryButton, styles.saveButton]} onPress={handleSave} disabled={busy}>
            <Text style={cardStyles.primaryButtonText}>{t.memory.save}</Text>
          </Pressable>
        </>
      ) : selfNote ? (
        <>
          <Text style={styles.noteText}>{selfNote}</Text>
          <Pressable onPress={() => setEditing(true)}>
            <Text style={styles.editLink}>{t.memory.edit}</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={() => setEditing(true)}>
          <Text style={styles.placeholderText}>{t.memory.placeholder}</Text>
        </Pressable>
      )}

      {partnerNote && (
        <View style={styles.partnerNoteWrap}>
          <Text style={styles.partnerNoteLabel}>{t.memory.partnerNoteLabel(partnerName)}</Text>
          <Text style={styles.noteText}>{partnerNote}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  input: {
    borderWidth: 2,
    borderColor: CREAM_BORDER,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: INK,
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  saveButton: { marginBottom: 0 },
  noteText: { fontSize: 14, color: INK, lineHeight: 20, marginBottom: 6 },
  editLink: { fontSize: 12, fontWeight: '700', color: MUTED, textDecorationLine: 'underline' },
  placeholderText: { fontSize: 14, color: PLACEHOLDER, lineHeight: 20 },
  partnerNoteWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: CREAM_BORDER },
  partnerNoteLabel: { fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
});
