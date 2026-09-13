import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { JarSummary } from '../supabase/api';
import { cardStyles, CREAM_BORDER, CREAM_FIELD, INK, MUTED } from '../theme';
import { Avatar } from './Avatar';
import { JarGlyph } from './JarGlyph';

interface JarListScreenProps {
  jars: JarSummary[];
  onSelect: (jarId: string, role: 'A' | 'B') => void;
  error: string | null;
}

export function JarListScreen({ jars, onSelect, error }: JarListScreenProps) {
  const { t } = useI18n();

  // Countdown mode's capacity/size are fixed at creation and never recalculated (see
  // starSizing.ts), and nothing stops either partner from continuing to tap after the meet-up
  // date — so a jar past its target date isn't disabled, just past its original milestone. Once
  // the date has actually passed (not just "today"), the list says so instead of indefinitely
  // claiming "today is the day."
  const jarStatusLabel = (targetDateUTC: Date | undefined): { text: string; isComplete: boolean } => {
    if (!targetDateUTC) return { text: t.jarList.noTargetDate, isComplete: false };
    const days = Math.ceil((targetDateUTC.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days < 0) return { text: t.jarList.jarComplete, isComplete: true };
    if (days === 0) return { text: t.jarList.todayIsTheDay, isComplete: false };
    return { text: t.jarList.daysUntilMeet(days), isComplete: false };
  };

  return (
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>{t.jarList.heading}</Text>
      {jars.length === 0 && <Text style={cardStyles.label}>{t.jarList.emptyState}</Text>}
      {jars.map((jar) => {
        const partnerName = jar.partnerDisplayName ?? jar.partnerEmail ?? t.jarList.yourPartnerFallback;
        const status = jar.hasStarted ? jarStatusLabel(jar.targetDateUTC) : null;
        return (
          <Pressable key={jar.jarId} style={styles.row} onPress={() => onSelect(jar.jarId, jar.role)}>
            {jar.hasStarted ? (
              <Avatar url={jar.partnerAvatarUrl} color={jar.partnerAvatarColor ?? '#FFC94A'} name={partnerName} size={36} />
            ) : (
              <View style={[styles.statusDot, styles.statusDotWaiting]} />
            )}
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{jar.hasStarted ? t.jarList.withPartner(partnerName) : t.jarList.waitingForPartner}</Text>
              <Text style={[styles.rowSubtitle, status?.isComplete && styles.rowSubtitleComplete]}>
                {jar.hasStarted ? status!.text : t.jarList.shareCodeToInvite(jar.inviteCode)}
              </Text>
            </View>
            {jar.hasStarted && (
              <View style={styles.tapDots}>
                <View style={[styles.tapDot, { backgroundColor: jar.selfStarColor }, !jar.selfTapped && styles.tapDotDim]} />
                <View
                  style={[styles.tapDot, { backgroundColor: jar.partnerStarColor ?? '#FFC94A' }, !jar.partnerTapped && styles.tapDotDim]}
                />
              </View>
            )}
          </Pressable>
        );
      })}
      {error && <Text style={cardStyles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CREAM_FIELD,
    borderWidth: 2,
    borderColor: CREAM_BORDER,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusDotWaiting: { backgroundColor: '#E0A82E' },
  rowText: { flex: 1 },
  rowTitle: { fontWeight: '700', color: INK, fontSize: 14 },
  rowSubtitle: { color: MUTED, fontSize: 12, marginTop: 2 },
  rowSubtitleComplete: { color: INK, fontWeight: '700' },
  tapDots: { flexDirection: 'row', gap: 5 },
  tapDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: INK },
  tapDotDim: { opacity: 0.25 },
});
