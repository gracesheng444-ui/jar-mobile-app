import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CreateOrJoinScreen, WaitingForPartnerScreen } from './src/components/PairingScreen';
import { StarJar } from './src/components/StarJar';
import { formatDuration } from './src/formatDuration';
import { useOnlineJarApp } from './src/useOnlineJarApp';

const STATUS_LABEL: Record<string, string> = {
  open: 'Open — waiting for taps',
  complete: 'Complete',
  incomplete_grace: 'Missed — grace period',
  incomplete_expired: 'Expired',
  repaired: 'Repaired',
};

export default function App() {
  const { status, inviteCode, appState, error, selfRole, startNewJar, joinExistingJar, leaveJar, tap, repair } = useOnlineJarApp();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <LinearGradient colors={['#EEF3FF', '#FDF6EC']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <StatusBar style="auto" />
        <Text style={styles.title}>Shared Memory Jar</Text>

        {status === 'loading' && <Text style={styles.subtle}>Loading…</Text>}

        {status === 'no-jar' && <CreateOrJoinScreen onCreate={() => startNewJar()} onJoin={joinExistingJar} error={error} />}

        {status === 'waiting-for-partner' && inviteCode && <WaitingForPartnerScreen inviteCode={inviteCode} />}

        {status === 'error' && (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.leaveButton} onPress={leaveJar}>
              <Text style={styles.leaveButtonText}>Start over</Text>
            </Pressable>
          </View>
        )}

        {status === 'ready' && appState && selfRole && (
          <JarView appState={appState} selfRole={selfRole} error={error} onTap={tap} onRepair={repair} onLeave={leaveJar} />
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function JarView({
  appState,
  selfRole,
  error,
  onTap,
  onRepair,
  onLeave,
}: {
  appState: NonNullable<ReturnType<typeof useOnlineJarApp>['appState']>;
  selfRole: 'A' | 'B';
  error: string | null;
  onTap: () => void;
  onRepair: () => void;
  onLeave: () => void;
}) {
  const { jar, userA, userB, cycle, streak, completedStarCount } = appState;
  const now = new Date();
  const remainingToEnd = cycle.cycleEndUTC.getTime() - now.getTime();
  const remainingToGrace = cycle.graceExpiresAtUTC ? cycle.graceExpiresAtUTC.getTime() - now.getTime() : null;

  const selfTapped = selfRole === 'A' ? cycle.userATapped : cycle.userBTapped;
  const partnerTapped = selfRole === 'A' ? cycle.userBTapped : cycle.userATapped;
  const selfMissing = cycle.status === 'incomplete_grace' && !selfTapped;
  const selfRepairBalance = selfRole === 'A' ? userA.repairBalance : userB.repairBalance;
  const selfUserId = selfRole === 'A' ? jar.userAId : jar.userBId;
  const selfAlreadyRepaired = cycle.repairedBy.includes(selfUserId);

  return (
    <>
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
          <TapButton label="You" tapped={selfTapped} disabled={cycle.status !== 'open' || selfTapped} onPress={onTap} />
          <TapButton label="Partner" tapped={partnerTapped} disabled interactive={false} />
        </View>
      </View>

      {selfMissing && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Repair this cycle</Text>
          <Text style={styles.repairLabel}>
            You missed this cycle — {selfRepairBalance} repair{selfRepairBalance === 1 ? '' : 's'} left
          </Text>
          <Pressable
            style={[styles.repairButton, selfAlreadyRepaired && styles.tapButtonDisabled]}
            disabled={selfAlreadyRepaired}
            onPress={onRepair}
          >
            <Text style={styles.tapButtonText}>{selfAlreadyRepaired ? 'Repaired' : 'Use repair'}</Text>
          </Pressable>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      )}
      {cycle.status === 'incomplete_grace' && !selfMissing && (
        <View style={styles.card}>
          <Text style={styles.subtle}>Waiting on your partner to repair or tap.</Text>
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

      <Pressable style={styles.leaveButton} onPress={onLeave}>
        <Text style={styles.leaveButtonText}>Leave this jar</Text>
      </Pressable>
    </>
  );
}

function TapButton({
  label,
  tapped,
  disabled,
  interactive = true,
  onPress,
}: {
  label: string;
  tapped: boolean;
  disabled: boolean;
  interactive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={[styles.tapButton, tapped && styles.tapButtonDone, disabled && !tapped && styles.tapButtonDisabled]}
      disabled={disabled || !interactive}
      onPress={onPress}
    >
      <Text style={styles.tapButtonText}>{tapped ? `✓ ${label}` : label}</Text>
    </Pressable>
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
  repairLabel: { fontSize: 13, color: '#374151', marginBottom: 10 },
  repairButton: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 8 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: '#1F2937' },
  starCaption: { textAlign: 'center', color: '#6B7280', marginBottom: 20 },
  leaveButton: { alignItems: 'center', paddingVertical: 12, marginBottom: 20 },
  leaveButtonText: { color: '#9CA3AF', fontSize: 13, textDecorationLine: 'underline' },
});
