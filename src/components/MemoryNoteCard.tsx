import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useI18n } from '../i18n';
import { cardStyles, CREAM_BORDER, INK, MUTED, PLACEHOLDER } from '../theme';

interface MemoryNoteCardProps {
  selfNote: string | null;
  partnerNote: string | null;
  partnerName: string;
  /** Writing a note is only unlocked once this account has tapped for the current cycle. */
  selfTapped: boolean;
  onSave: (note: string) => Promise<void>;
}

/** Lets either partner attach one short note to today's cycle, once they've tapped — a single
 *  shot each, never editable afterward, so it reads as a real in-the-moment note rather than
 *  something touched up later. Shows the partner's note too, once they've written one, labeled
 *  by their name, so the jar carries an actual memory alongside the streak mechanics. */
export function MemoryNoteCard({ selfNote, partnerNote, partnerName, selfTapped, onSave }: MemoryNoteCardProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
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

      {selfNote ? (
        <Text style={styles.noteText}>
          <Text style={styles.noteLabel}>{t.memory.meLabel}: </Text>
          {selfNote}
        </Text>
      ) : selfTapped ? (
        editing ? (
          <>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={t.memory.placeholder}
              placeholderTextColor={PLACEHOLDER}
              multiline
              maxLength={280}
              autoFocus
            />
            <Pressable style={[cardStyles.primaryButton, styles.saveButton]} onPress={handleSave} disabled={busy}>
              <Text style={cardStyles.primaryButtonText}>{t.memory.save}</Text>
            </Pressable>
          </>
        ) : (
          <Pressable onPress={() => setEditing(true)}>
            <Text style={styles.placeholderText}>{t.memory.placeholder}</Text>
          </Pressable>
        )
      ) : (
        <Text style={styles.lockedText}>{t.memory.tapToUnlock}</Text>
      )}

      {partnerNote && (
        <View style={styles.partnerNoteWrap}>
          <Text style={styles.noteText}>
            <Text style={styles.noteLabel}>{partnerName}: </Text>
            {partnerNote}
          </Text>
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
  noteText: { fontSize: 14, color: INK, lineHeight: 20 },
  noteLabel: { fontWeight: '700' },
  placeholderText: { fontSize: 14, color: PLACEHOLDER, lineHeight: 20 },
  lockedText: { fontSize: 13, color: MUTED, lineHeight: 18 },
  partnerNoteWrap: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: CREAM_BORDER },
});
