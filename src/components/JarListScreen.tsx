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

  const daysUntilLabel = (targetDateUTC: Date | undefined): string => {
    if (!targetDateUTC) return t.jarList.noTargetDate;
    const days = Math.ceil((targetDateUTC.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days <= 0) return t.jarList.todayIsTheDay;
    return t.jarList.daysUntilMeet(days);
  };

  return (
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>{t.jarList.heading}</Text>
      {jars.length === 0 && <Text style={cardStyles.label}>{t.jarList.emptyState}</Text>}
      {jars.map((jar) => {
        const partnerName = jar.partnerDisplayName ?? jar.partnerEmail ?? t.jarList.yourPartnerFallback;
        return (
          <Pressable key={jar.jarId} style={styles.row} onPress={() => onSelect(jar.jarId, jar.role)}>
            {jar.hasStarted ? (
              <Avatar url={jar.partnerAvatarUrl} color={jar.partnerAvatarColor ?? '#FFC94A'} name={partnerName} size={36} />
            ) : (
              <View style={[styles.statusDot, styles.statusDotWaiting]} />
            )}
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{jar.hasStarted ? t.jarList.withPartner(partnerName) : t.jarList.waitingForPartner}</Text>
              <Text style={styles.rowSubtitle}>
                {jar.hasStarted ? daysUntilLabel(jar.targetDateUTC) : t.jarList.shareCodeToInvite(jar.inviteCode)}
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
  tapDots: { flexDirection: 'row', gap: 5 },
  tapDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: INK },
  tapDotDim: { opacity: 0.25 },
});
