import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JarGlyph } from './src/components/JarGlyph';
import { JarListScreen } from './src/components/JarListScreen';
import { LeaveJarButton } from './src/components/LeaveJarButton';
import { CreateOrJoinScreen, WaitingForPartnerScreen } from './src/components/PairingScreen';
import { ProfileScreen } from './src/components/ProfileScreen';
import { SignInScreen } from './src/components/SignInScreen';
import { StarJar } from './src/components/StarJar';
import { formatDuration } from './src/formatDuration';
import { DOODLE_PALETTE } from './src/starColors';
import { cardStyles, INK } from './src/theme';
import { useOnlineJarApp } from './src/useOnlineJarApp';

const STATUS_LABEL: Record<string, string> = {
  open: 'Open — waiting for taps',
  complete: 'Complete',
  incomplete_grace: 'Missed — grace period',
  incomplete_expired: 'Expired',
  repaired: 'Repaired',
};

export default function App() {
  const {
    status,
    inviteCode,
    appState,
    myJars,
    myDisplayName,
    error,
    selfRole,
    sendCode,
    verifyCode,
    startNewJar,
    joinExistingJar,
    selectJar,
    backToJarList,
    startCreatingJar,
    signOut,
    leaveJar,
    tap,
    repair,
    updateStarColor,
    updateDisplayName,
  } = useOnlineJarApp();
  const [, forceTick] = useState(0);
  const [showingProfile, setShowingProfile] = useState(false);

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

        {status === 'signed-out' && <SignInScreen onSendCode={sendCode} onVerifyCode={verifyCode} error={error} />}

        {status !== 'loading' && status !== 'signed-out' && showingProfile && (
          <ProfileScreen
            currentName={myDisplayName}
            onSave={(name) => {
              updateDisplayName(name);
              setShowingProfile(false);
            }}
            onBack={() => setShowingProfile(false)}
          />
        )}

        {status === 'picking' && !showingProfile && (
          <JarListScreen jars={myJars} onSelect={selectJar} onCreateNew={startCreatingJar} onEditName={() => setShowingProfile(true)} error={error} />
        )}

        {status === 'creating' && !showingProfile && (
          <CreateOrJoinScreen
            onCreate={startNewJar}
            onJoin={joinExistingJar}
            error={error}
            onBack={myJars.length > 0 ? backToJarList : undefined}
          />
        )}

        {status === 'waiting-for-partner' && inviteCode && !showingProfile && (
          <WaitingForPartnerScreen inviteCode={inviteCode} onLeave={leaveJar} onBack={backToJarList} />
        )}

        {status === 'error' && (
          <View style={cardStyles.card}>
            <JarGlyph />
            <Text style={cardStyles.errorText}>{error}</Text>
            <Pressable style={[cardStyles.secondaryButton, styles.errorScreenButton]} onPress={signOut}>
              <Text style={cardStyles.secondaryButtonText}>Sign out and start over</Text>
            </Pressable>
          </View>
        )}

        {status === 'ready' && appState && selfRole && !showingProfile && (
          <JarView
            appState={appState}
            selfRole={selfRole}
            error={error}
            onTap={tap}
            onRepair={repair}
            onSignOut={signOut}
            onLeaveJar={leaveJar}
            onBack={backToJarList}
            onChangeStarColor={updateStarColor}
            onEditName={() => setShowingProfile(true)}
          />
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
  onSignOut,
  onLeaveJar,
  onBack,
  onChangeStarColor,
  onEditName,
}: {
  appState: NonNullable<ReturnType<typeof useOnlineJarApp>['appState']>;
  selfRole: 'A' | 'B';
  error: string | null;
  onTap: () => void;
  onRepair: () => void;
  onSignOut: () => void;
  onLeaveJar: () => void;
  onBack: () => void;
  onChangeStarColor: (color: string) => void;
  onEditName: () => void;
}) {
  const { jar, userA, userB, cycle, streak, starCountA, starCountB, userAStarColor, userBStarColor, userADisplayName, userBDisplayName } = appState;
  const now = new Date();
  const remainingToEnd = cycle.cycleEndUTC.getTime() - now.getTime();
  const remainingToGrace = cycle.graceExpiresAtUTC ? cycle.graceExpiresAtUTC.getTime() - now.getTime() : null;

  const selfTapped = selfRole === 'A' ? cycle.userATapped : cycle.userBTapped;
  const partnerTapped = selfRole === 'A' ? cycle.userBTapped : cycle.userATapped;
  const selfMissing = cycle.status === 'incomplete_grace' && !selfTapped;
  const selfRepairBalance = selfRole === 'A' ? userA.repairBalance : userB.repairBalance;
  const selfUserId = selfRole === 'A' ? jar.userAId : jar.userBId;
  const selfAlreadyRepaired = cycle.repairedBy.includes(selfUserId);
  const selfColor = selfRole === 'A' ? userAStarColor : userBStarColor;
  const partnerColor = selfRole === 'A' ? userBStarColor : userAStarColor;
  const partnerDisplayName = selfRole === 'A' ? userBDisplayName : userADisplayName;
  const partnerLabel = partnerDisplayName === 'Partner' ? 'Partner' : partnerDisplayName;
  const totalStars = starCountA + starCountB;

  return (
    <>
      <View style={styles.row}>
        <Pressable onPress={onBack}>
          <Text style={styles.myJarsLink}>← My jars</Text>
        </Pressable>
        <Pressable onPress={onEditName}>
          <Text style={styles.myJarsLink}>Edit your name</Text>
        </Pressable>
      </View>

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
          <TapButton label="You" color={selfColor} tapped={selfTapped} disabled={cycle.status !== 'open' || selfTapped} onPress={onTap} />
          <TapButton label={partnerLabel} color={partnerColor} tapped={partnerTapped} disabled interactive={false} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your star color</Text>
        <View style={styles.row}>
          {DOODLE_PALETTE.map((c) => (
            <Pressable
              key={c}
              onPress={() => onChangeStarColor(c)}
              style={[styles.swatch, { backgroundColor: c }, c === selfColor && styles.swatchSelected]}
            />
          ))}
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

      <StarJar
        starCountA={starCountA}
        starCountB={starCountB}
        colorA={userAStarColor}
        colorB={userBStarColor}
        starSize={jar.starSizeFixed ?? 30}
      />
      <Text style={styles.starCaption}>
        {totalStars} of {jar.starCapacityN ?? '?'} stars
      </Text>

      <LeaveJarButton onLeave={onLeaveJar} />

      <Pressable style={styles.leaveButton} onPress={onSignOut}>
        <Text style={styles.leaveButtonText}>Sign out</Text>
      </Pressable>
    </>
  );
}

function TapButton({
  label,
  color,
  tapped,
  disabled,
  interactive = true,
  onPress,
}: {
  label: string;
  color: string;
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
      <View style={[styles.tapButtonDot, { backgroundColor: color }]} />
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
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center', color: INK },
  errorScreenButton: { marginTop: 4 },
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
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tapButtonDot: { width: 10, height: 10, borderRadius: 5 },
  tapButtonDone: { backgroundColor: '#DCFCE7' },
  tapButtonDisabled: { opacity: 0.5 },
  tapButtonText: { fontWeight: '600', color: '#1F2937' },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: '#1F2937' },
  repairLabel: { fontSize: 13, color: '#374151', marginBottom: 10 },
  repairButton: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 8 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: '#1F2937' },
  starCaption: { textAlign: 'center', color: '#6B7280', marginBottom: 20 },
  leaveButton: { alignItems: 'center', paddingVertical: 12, marginBottom: 20 },
  leaveButtonText: { color: '#9CA3AF', fontSize: 13, textDecorationLine: 'underline' },
  myJarsLink: { color: INK, fontWeight: '600', fontSize: 13, marginBottom: 12 },
});
