import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StarJar } from './src/components/StarJar';
import { formatDuration } from './src/formatDuration';
import { useJarApp } from './src/useJarApp';

const STATUS_LABEL: Record<string, string> = {
  open: 'Open — waiting for taps',
  complete: 'Complete',
  incomplete_grace: 'Missed — grace period',
  incomplete_expired: 'Expired',
  repaired: 'Repaired',
};

export default function App() {
  const { state, error, tap, repair, jumpTo, reset, now } = useJarApp();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!state) {
    return (
      <View style={styles.center}>
        <Text>Loading…</Text>
      </View>
    );
  }

  const { jar, userA, userB, cycle, streak, completedStarCount } = state;
  const currentTime = now();
  const remainingToEnd = cycle.cycleEndUTC.getTime() - currentTime.getTime();
  const remainingToGrace = cycle.graceExpiresAtUTC
    ? cycle.graceExpiresAtUTC.getTime() - currentTime.getTime()
    : null;

  return (
    <LinearGradient colors={['#EEF3FF', '#FDF6EC']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>Shared Memory Jar</Text>

      <View style={styles.card}>
        <Text style={styles.statusLabel}>{STATUS_LABEL[cycle.status] ?? cycle.status}</Text>
        {cycle.status === 'open' && <Text style={styles.subtle}>Cycle ends in {formatDuration(remainingToEnd)}</Text>}
        {cycle.status === 'incomplete_grace' && remainingToGrace !== null && (
          <Text style={styles.subtle}>Grace window closes in {formatDuration(remainingToGrace)}</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today's taps</Text>
        <View style={styles.row}>
          <TapButton
            label="You"
            tapped={cycle.userATapped}
            disabled={cycle.status !== 'open' || cycle.userATapped}
            onPress={() => tap('A')}
          />
          <TapButton
            label="Partner"
            tapped={cycle.userBTapped}
            disabled={cycle.status !== 'open' || cycle.userBTapped}
            onPress={() => tap('B')}
          />
        </View>
      </View>

      {cycle.status === 'incomplete_grace' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Repair a missed cycle</Text>
          {!cycle.userATapped && (
            <RepairRow
              label="You"
              balance={userA.repairBalance}
              spent={cycle.repairedBy.includes(jar.userAId)}
              onPress={() => repair('A')}
            />
          )}
          {!cycle.userBTapped && (
            <RepairRow
              label="Partner"
              balance={userB.repairBalance}
              spent={cycle.repairedBy.includes(jar.userBId)}
              onPress={() => repair('B')}
            />
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Streak</Text>
        <View style={styles.row}>
          <Stat label="Current" value={streak.currentStreak} />
          <Stat label="Longest" value={streak.longestStreak} />
        </View>
      </View>

      <StarJar starCount={completedStarCount} estimatedDaysApart={jar.estimatedDaysApart} />
      <Text style={styles.starCaption}>
        {completedStarCount} star{completedStarCount === 1 ? '' : 's'}
      </Text>

      <View style={styles.devSection}>
        <Text style={styles.devTitle}>Dev controls (testing only)</Text>
        <View style={styles.row}>
          <DevButton label="Skip to cycle end" onPress={() => jumpTo(new Date(cycle.cycleEndUTC.getTime() + 1000))} />
          {cycle.graceExpiresAtUTC && (
            <DevButton
              label="Skip grace period"
              onPress={() => jumpTo(new Date(cycle.graceExpiresAtUTC!.getTime() + 1000))}
            />
          )}
        </View>
        <DevButton label="Reset demo" onPress={reset} destructive />
      </View>
      </ScrollView>
    </LinearGradient>
  );
}

function TapButton({
  label,
  tapped,
  disabled,
  onPress,
}: {
  label: string;
  tapped: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.tapButton, tapped && styles.tapButtonDone, disabled && !tapped && styles.tapButtonDisabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.tapButtonText}>{tapped ? `✓ ${label}` : label}</Text>
    </Pressable>
  );
}

function RepairRow({
  label,
  balance,
  spent,
  onPress,
}: {
  label: string;
  balance: number;
  spent: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.repairRow}>
      <Text style={styles.repairLabel}>
        {label} missed this cycle — {balance} repair{balance === 1 ? '' : 's'} left
      </Text>
      <Pressable style={[styles.repairButton, spent && styles.tapButtonDisabled]} disabled={spent} onPress={onPress}>
        <Text style={styles.tapButtonText}>{spent ? 'Repaired' : 'Use repair'}</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.subtle}>{label}</Text>
    </View>
  );
}

function DevButton({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <Pressable style={[styles.devButton, destructive && styles.devButtonDestructive]} onPress={onPress}>
      <Text style={styles.devButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { padding: 20, paddingTop: 60, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, textAlign: 'center', color: '#33415C' },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#5B8DEF',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statusLabel: { fontSize: 18, fontWeight: '600' },
  subtle: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  tapButton: {
    flex: 1,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tapButtonDone: { backgroundColor: '#DCFCE7' },
  tapButtonDisabled: { opacity: 0.5 },
  tapButtonText: { fontWeight: '600', color: '#1F2937' },
  repairRow: { marginBottom: 10 },
  repairLabel: { fontSize: 13, color: '#374151', marginBottom: 6 },
  repairButton: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 4 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: '#1F2937' },
  starCaption: { textAlign: 'center', color: '#6B7280', marginBottom: 24 },
  devSection: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16, gap: 10 },
  devTitle: { fontSize: 12, color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase' },
  devButton: { backgroundColor: '#E5E7EB', borderRadius: 10, paddingVertical: 10, alignItems: 'center', flex: 1 },
  devButtonDestructive: { backgroundColor: '#FEE2E2' },
  devButtonText: { fontWeight: '600', color: '#374151', fontSize: 13 },
});
