import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { CycleWithNotes, fetchJarCycles } from '../supabase/api';
import { cardStyles, CREAM_BORDER, INK, MUTED } from '../theme';
import { JarGlyph } from './JarGlyph';

interface ReunionCelebrationScreenProps {
  jarId: string;
  partnerName: string;
  selfName: string;
  onContinue: () => void;
}

interface NoteEntry {
  date: string;
  authorName: string;
  note: string;
}

/** Shown once per device, the first time a jar is opened after its meet-up date has passed — a
 *  recap of every memory either partner wrote along the way, not just a "you're done" banner. */
export function ReunionCelebrationScreen({ jarId, partnerName, selfName, onContinue }: ReunionCelebrationScreenProps) {
  const { t, language } = useI18n();
  const [cycles, setCycles] = useState<CycleWithNotes[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchJarCycles(jarId).then((fetched) => {
      if (!cancelled) setCycles(fetched);
    });
    return () => {
      cancelled = true;
    };
  }, [jarId]);

  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const entries: NoteEntry[] = (cycles ?? []).flatMap((c) => {
    const dateLabel = c.cycleStartUTC.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    const out: NoteEntry[] = [];
    if (c.userANote) out.push({ date: dateLabel, authorName: selfName, note: c.userANote });
    if (c.userBNote) out.push({ date: dateLabel, authorName: partnerName, note: c.userBNote });
    return out;
  });

  return (
    <View style={cardStyles.card}>
      <JarGlyph size={90} />
      <Text style={cardStyles.heading}>{t.reunion.heading}</Text>
      <Text style={cardStyles.label}>{t.reunion.subtitle(partnerName)}</Text>

      <View style={styles.notesSection}>
        <Text style={styles.notesHeading}>{t.reunion.notesHeading}</Text>
        {cycles !== null && entries.length === 0 && <Text style={styles.noNotes}>{t.reunion.noNotes}</Text>}
        {entries.map((entry, i) => (
          <View key={i} style={styles.noteRow}>
            <Text style={styles.noteMeta}>
              {entry.date} · {entry.authorName}
            </Text>
            <Text style={styles.noteText}>{entry.note}</Text>
          </View>
        ))}
      </View>

      <Pressable style={cardStyles.primaryButton} onPress={onContinue}>
        <Text style={cardStyles.primaryButtonText}>{t.reunion.continueButton}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notesSection: { marginTop: 4, marginBottom: 18 },
  notesHeading: { fontSize: 13, fontWeight: '700', color: MUTED, textAlign: 'center', marginBottom: 10 },
  noNotes: { fontSize: 13, color: MUTED, textAlign: 'center' },
  noteRow: { borderTopWidth: 1, borderTopColor: CREAM_BORDER, paddingVertical: 10 },
  noteMeta: { fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  noteText: { fontSize: 14, color: INK, lineHeight: 20 },
});
