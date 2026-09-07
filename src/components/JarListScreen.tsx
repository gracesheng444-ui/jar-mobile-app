import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JarSummary } from '../supabase/api';
import { cardStyles, CREAM_BORDER, CREAM_FIELD, INK, MUTED } from '../theme';
import { JarGlyph } from './JarGlyph';

interface JarListScreenProps {
  jars: JarSummary[];
  onSelect: (jarId: string, role: 'A' | 'B') => void;
  onCreateNew: () => void;
  onEditName: () => void;
  error: string | null;
}

export function JarListScreen({ jars, onSelect, onCreateNew, onEditName, error }: JarListScreenProps) {
  return (
    <View style={cardStyles.card}>
      <JarGlyph />
      <Text style={cardStyles.heading}>Your jars</Text>
      <Pressable onPress={onEditName}>
        <Text style={[cardStyles.link, styles.editNameLink]}>Edit your name</Text>
      </Pressable>
      {jars.map((jar) => (
        <Pressable key={jar.jarId} style={styles.row} onPress={() => onSelect(jar.jarId, jar.role)}>
          <View style={[styles.statusDot, jar.hasStarted ? styles.statusDotActive : styles.statusDotWaiting]} />
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>
              {jar.hasStarted ? (jar.partnerDisplayName ?? jar.partnerEmail ?? 'Jar with a partner') : 'Waiting for partner'}
            </Text>
            <Text style={styles.rowSubtitle}>
              {jar.targetDateUTC ? `Target ${jar.targetDateUTC.toISOString().slice(0, 10)}` : 'No target date'}
              {jar.hasStarted ? ` · streak ${jar.currentStreak}` : ` · code ${jar.inviteCode}`}
            </Text>
          </View>
        </Pressable>
      ))}
      <Pressable style={cardStyles.primaryButton} onPress={onCreateNew}>
        <Text style={cardStyles.primaryButtonText}>+ Start a new jar</Text>
      </Pressable>
      {error && <Text style={cardStyles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  editNameLink: { marginBottom: 16, textDecorationLine: 'none' },
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
  statusDotActive: { backgroundColor: '#5FAE60' },
  statusDotWaiting: { backgroundColor: '#E0A82E' },
  rowText: { flex: 1 },
  rowTitle: { fontWeight: '700', color: INK, fontSize: 14 },
  rowSubtitle: { color: MUTED, fontSize: 12, marginTop: 2 },
});
