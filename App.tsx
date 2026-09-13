import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { MONTHLY_REPAIR_ALLOWANCE } from 'jar-core-logic';
import { ReactElement, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './src/components/Avatar';
import { JarCalendar } from './src/components/JarCalendar';
import { JarGlyph } from './src/components/JarGlyph';
import { JarListScreen } from './src/components/JarListScreen';
import { LeaveJarButton } from './src/components/LeaveJarButton';
import { MeetupDateEditor } from './src/components/MeetupDateEditor';
import { MemoryNoteCard } from './src/components/MemoryNoteCard';
import { NotificationsGallery } from './src/components/NotificationsGallery';
import { CreateOrJoinScreen, WaitingForPartnerScreen } from './src/components/PairingScreen';
import { PairedCelebrationScreen } from './src/components/PairedCelebrationScreen';
import { ResetPasswordScreen } from './src/components/ResetPasswordScreen';
import { ReunionCelebrationScreen } from './src/components/ReunionCelebrationScreen';
import { SettingsScreen } from './src/components/SettingsScreen';
import { SetupProfileScreen } from './src/components/SetupProfileScreen';
import { SignInScreen } from './src/components/SignInScreen';
import { StarJar } from './src/components/StarJar';
import { JarTabIcon, PlusTabIcon, SettingsTabIcon } from './src/components/TabIcons';
import { formatDuration, I18nProvider, I18nStrings, useI18n } from './src/i18n';
import { CREAM, CREAM_BORDER, CREAM_FIELD, GOLD, INK, MUTED, cardStyles } from './src/theme';
import { useOnlineJarApp } from './src/useOnlineJarApp';

type Tab = 'jars' | 'start' | 'settings';

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

function AppInner() {
  const { t, language } = useI18n();
  const {
    status,
    inviteCode,
    appState,
    myJars,
    myDisplayName,
    myAvatar,
    myEmail,
    userId,
    error,
    selfRole,
    justPaired,
    dismissJustPaired,
    showReunion,
    dismissReunion,
    showNotificationPriming,
    enableNotifications,
    dismissNotificationPriming,
    signIn,
    signUp,
    tryDemo,
    resetDemo,
    confirmAccount,
    forgotPassword,
    setNewPassword,
    completeProfileSetup,
    startNewJar,
    joinExistingJar,
    selectJar,
    backToJarList,
    signOut,
    leaveJar,
    tap,
    repair,
    saveMemoryNote,
    changeTargetDate,
    updateDisplayName,
    updateLanguage,
    updateMyAvatar,
    changeMyPassword,
    deleteAccount,
  } = useOnlineJarApp();
  const [, forceTick] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('jars');
  const [creatingInitialMode, setCreatingInitialMode] = useState<'create' | 'join'>('create');
  const [resetDemoBusy, setResetDemoBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // A specific jar (open or still waiting for a partner) is its own focused
  // page — no bottom tabs there, just a back arrow to the jar list, which is
  // where the tab bar lives.
  const jarPageOpen = status === 'ready' || status === 'waiting-for-partner';
  const showTabs = status === 'idle';
  const rawPartnerName = appState ? (selfRole === 'A' ? appState.userBDisplayName : appState.userADisplayName) : t.partnerFallback;
  const partnerLabel = rawPartnerName === 'Partner' ? t.partnerFallback : rawPartnerName;
  // Demo accounts (see supabase/functions/create-demo-jar) all live under this fake domain —
  // the one signal the client has that this is a throwaway "Try a live demo" session, not a real
  // account, worth a dedicated exit affordance instead of making it hunt for plain Sign out.
  const isDemoAccount = myEmail?.endsWith('@sharedmemoryjar.demo') ?? false;
  // The demo's three scenario tabs — see create-demo-jar for how the two jars are seeded and
  // tagged. Not applicable to real accounts, which never have a demoScenario-tagged jar.
  const [demoTab, setDemoTab] = useState<'normal' | 'grace' | 'notifications'>('normal');
  const demoNormalJar = myJars.find((j) => j.demoScenario === 'normal');
  const demoGraceJar = myJars.find((j) => j.demoScenario === 'grace');
  const handleDemoTabPress = (tab: 'normal' | 'grace' | 'notifications') => {
    setDemoTab(tab);
    if (tab === 'normal' && demoNormalJar) selectJar(demoNormalJar.jarId, demoNormalJar.role);
    if (tab === 'grace' && demoGraceJar) selectJar(demoGraceJar.jarId, demoGraceJar.role);
  };

  const goToStartTab = (mode: 'create' | 'join') => {
    setCreatingInitialMode(mode);
    setActiveTab('start');
  };

  const handleResetDemo = async () => {
    setResetDemoBusy(true);
    try {
      await resetDemo();
    } catch {
      // resetDemo already surfaces the failure via the shared `error` state.
    } finally {
      setResetDemoBusy(false);
    }
  };

  // Matches the native splash screen's flat cream background and centered jar glyph, instead of
  // the app's usual blue-to-cream gradient shell — so the handoff from splash (which hides the
  // instant this component mounts) into this loading state reads as one continuous screen rather
  // than a jarring cut to different colors and layout.
  if (status === 'loading') {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style="auto" />
        <JarGlyph size={90} />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#EEF3FF', '#FDF6EC']} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flexArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.container}>
          <StatusBar style="auto" />
          <Text style={styles.title}>{t.appTitle}</Text>

          {status === 'signed-out' && (
            <SignInScreen onSignIn={signIn} onSignUp={signUp} onConfirmAccount={confirmAccount} onForgotPassword={forgotPassword} onTryDemo={tryDemo} error={error} />
          )}

          {status === 'reset-password' && <ResetPasswordScreen onSave={setNewPassword} error={error} />}

          {status === 'setup-profile' && userId && (
            <SetupProfileScreen
              userId={userId}
              initialAvatarColor={myAvatar.color}
              onComplete={(name) => {
                void completeProfileSetup(name);
                setActiveTab('start');
              }}
            />
          )}

          {status === 'error' && (
            <View style={cardStyles.card}>
              <JarGlyph />
              <Text style={cardStyles.errorText}>{error}</Text>
              <Pressable style={[cardStyles.secondaryButton, styles.errorScreenButton]} onPress={signOut}>
                <Text style={cardStyles.secondaryButtonText}>{t.errorScreenSignOut}</Text>
              </Pressable>
            </View>
          )}

          {jarPageOpen && (
            <>
              <View style={styles.pageHeaderRow}>
                {!isDemoAccount && (
                  <Pressable style={styles.backArrow} onPress={() => void backToJarList()}>
                    <Text style={styles.backArrowText}>←</Text>
                  </Pressable>
                )}
                {isDemoAccount && (
                  <View style={styles.demoButtonGroup}>
                    <Pressable style={styles.resetDemoButton} onPress={() => void handleResetDemo()} disabled={resetDemoBusy}>
                      <Text style={styles.resetDemoText}>{resetDemoBusy ? t.resettingDemo : t.resetDemo}</Text>
                    </Pressable>
                    <Pressable style={styles.exitDemoButton} onPress={signOut}>
                      <Text style={styles.exitDemoText}>{t.exitDemo}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
              {isDemoAccount && demoNormalJar && demoGraceJar && (
                <View style={styles.viewToggleRow}>
                  <Pressable style={[styles.viewToggleButton, demoTab === 'normal' && styles.viewToggleButtonActive]} onPress={() => handleDemoTabPress('normal')}>
                    <Text style={[styles.viewToggleText, demoTab === 'normal' && styles.viewToggleTextActive]}>{t.demoScenarios.normalTab}</Text>
                  </Pressable>
                  <Pressable style={[styles.viewToggleButton, demoTab === 'grace' && styles.viewToggleButtonActive]} onPress={() => handleDemoTabPress('grace')}>
                    <Text style={[styles.viewToggleText, demoTab === 'grace' && styles.viewToggleTextActive]}>{t.demoScenarios.graceTab}</Text>
                  </Pressable>
                  <Pressable style={[styles.viewToggleButton, demoTab === 'notifications' && styles.viewToggleButtonActive]} onPress={() => handleDemoTabPress('notifications')}>
                    <Text style={[styles.viewToggleText, demoTab === 'notifications' && styles.viewToggleTextActive]}>{t.demoScenarios.notificationsTab}</Text>
                  </Pressable>
                </View>
              )}
              {status === 'ready' && showNotificationPriming && (
                <View style={cardStyles.card}>
                  <Text style={styles.sectionTitle}>{t.notificationPriming.heading}</Text>
                  <Text style={styles.subtle}>{t.notificationPriming.body}</Text>
                  <View style={styles.notificationPrimingActions}>
                    <Pressable style={[cardStyles.primaryButton, styles.notificationPrimingButton]} onPress={() => void enableNotifications()}>
                      <Text style={cardStyles.primaryButtonText}>{t.notificationPriming.enableButton}</Text>
                    </Pressable>
                    <Pressable style={[cardStyles.secondaryButton, styles.notificationPrimingButton]} onPress={() => void dismissNotificationPriming()}>
                      <Text style={cardStyles.secondaryButtonText}>{t.notificationPriming.notNowButton}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              {status === 'waiting-for-partner' && inviteCode && <WaitingForPartnerScreen inviteCode={inviteCode} onLeave={leaveJar} />}
              {status === 'ready' && appState && selfRole && showReunion && (
                <ReunionCelebrationScreen jarId={appState.jar.id} partnerName={partnerLabel} selfName={myDisplayName} onContinue={() => void dismissReunion()} />
              )}
              {status === 'ready' && appState && selfRole && !showReunion && justPaired && (
                <PairedCelebrationScreen partnerName={partnerLabel} targetDateUTC={appState.jar.targetDateUTC} onContinue={dismissJustPaired} />
              )}
              {status === 'ready' && appState && selfRole && !showReunion && !justPaired && isDemoAccount && demoTab === 'notifications' && (
                <NotificationsGallery partnerName={partnerLabel} />
              )}
              {status === 'ready' && appState && selfRole && !showReunion && !justPaired && !(isDemoAccount && demoTab === 'notifications') && (
                <JarView
                  appState={appState}
                  selfRole={selfRole}
                  error={error}
                  t={t}
                  language={language}
                  onTap={tap}
                  onRepair={repair}
                  onSaveMemoryNote={saveMemoryNote}
                  onChangeTargetDate={changeTargetDate}
                  onSignOut={signOut}
                  onLeaveJar={leaveJar}
                />
              )}
            </>
          )}

          {showTabs && activeTab === 'settings' && userId && (
            <SettingsScreen
              currentName={myDisplayName}
              userId={userId}
              email={myEmail}
              avatarUrl={myAvatar.url}
              avatarColor={myAvatar.color}
              onSaveName={(name) => updateDisplayName(name)}
              onChangeAvatar={updateMyAvatar}
              onChangeLanguage={(lang) => updateLanguage(lang)}
              onChangePassword={changeMyPassword}
              onDeleteAccount={deleteAccount}
              onSignOut={signOut}
              onEnableNotifications={enableNotifications}
            />
          )}

          {showTabs && activeTab === 'start' && userId && (
            <CreateOrJoinScreen
              userId={userId}
              onCreate={async (date, color) => {
                const ok = await startNewJar(date, color);
                if (ok) setActiveTab('jars');
              }}
              onJoin={async (code, color) => {
                const ok = await joinExistingJar(code, color);
                if (ok) setActiveTab('jars');
              }}
              error={error}
              initialMode={creatingInitialMode}
            />
          )}

          {showTabs && activeTab === 'jars' && <JarListScreen jars={myJars} onSelect={selectJar} error={error} />}
        </ScrollView>
      </KeyboardAvoidingView>

      {showTabs && (
        <View style={styles.tabBar}>
          <TabBarButton label={t.tabs.jars} renderIcon={JarTabIcon} active={activeTab === 'jars'} onPress={() => setActiveTab('jars')} />
          <TabBarButton label={t.tabs.start} renderIcon={PlusTabIcon} active={activeTab === 'start'} onPress={() => goToStartTab('create')} />
          <TabBarButton label={t.tabs.settings} renderIcon={SettingsTabIcon} active={activeTab === 'settings'} onPress={() => setActiveTab('settings')} />
        </View>
      )}
    </LinearGradient>
  );
}

function TabBarButton({
  label,
  renderIcon: Icon,
  active,
  onPress,
}: {
  label: string;
  renderIcon: (props: { color: string; size?: number }) => ReactElement;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tabButtonWrap} onPress={onPress}>
      <Icon color={active ? INK : MUTED} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function JarView({
  appState,
  selfRole,
  error,
  t,
  language,
  onTap,
  onRepair,
  onSaveMemoryNote,
  onChangeTargetDate,
  onSignOut,
  onLeaveJar,
}: {
  appState: NonNullable<ReturnType<typeof useOnlineJarApp>['appState']>;
  selfRole: 'A' | 'B';
  error: string | null;
  t: I18nStrings;
  language: 'en' | 'zh';
  onTap: () => void;
  onRepair: () => void;
  onSaveMemoryNote: (note: string) => Promise<void>;
  onChangeTargetDate: (date: Date) => Promise<void>;
  onSignOut: () => void;
  onLeaveJar: () => void;
}) {
  const {
    jar,
    userA,
    userB,
    cycle,
    streak,
    starCountA,
    starCountB,
    userAStarColor,
    userBStarColor,
    userADisplayName,
    userBDisplayName,
    userAAvatarUrl,
    userBAvatarUrl,
    userAAvatarColor,
    userBAvatarColor,
    todayUserANote,
    todayUserBNote,
  } = appState;
  const now = new Date();
  const remainingToEnd = cycle.cycleEndUTC.getTime() - now.getTime();
  const remainingToGrace = cycle.graceExpiresAtUTC ? cycle.graceExpiresAtUTC.getTime() - now.getTime() : null;

  const selfTapped = selfRole === 'A' ? cycle.userATapped : cycle.userBTapped;
  const partnerTapped = selfRole === 'A' ? cycle.userBTapped : cycle.userATapped;
  const selfMissing = cycle.status === 'incomplete_grace' && !selfTapped;
  // A tap during an unresolved grace window means something different from a normal tap — it
  // forfeits the repair and starts a fresh cycle/streak (see jarEngine's tapAction) — so it stays
  // available regardless of whatever userATapped/userBTapped say about the cycle that's dying,
  // for either person, the same way repairing it isn't restricted to whoever actually missed.
  const canTap = cycle.status === 'open' ? !selfTapped : cycle.status === 'incomplete_grace';
  const selfRepairBalance = selfRole === 'A' ? userA.repairBalance : userB.repairBalance;
  const selfLastRepairUsedAtUTC = selfRole === 'A' ? userA.lastRepairUsedAtUTC : userB.lastRepairUsedAtUTC;
  const selfLastRepairUsedLabel = selfLastRepairUsedAtUTC
    ? selfLastRepairUsedAtUTC.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
    : null;
  const selfUserId = selfRole === 'A' ? jar.userAId : jar.userBId;
  const selfAlreadyRepaired = cycle.repairedBy.includes(selfUserId);
  const selfColor = selfRole === 'A' ? userAStarColor : userBStarColor;
  const partnerColor = selfRole === 'A' ? userBStarColor : userAStarColor;
  const selfDisplayName = selfRole === 'A' ? userADisplayName : userBDisplayName;
  const partnerDisplayName = selfRole === 'A' ? userBDisplayName : userADisplayName;
  const partnerLabel = partnerDisplayName === 'Partner' ? t.partnerFallback : partnerDisplayName;
  const selfAvatarUrl = selfRole === 'A' ? userAAvatarUrl : userBAvatarUrl;
  const selfAvatarColor = selfRole === 'A' ? userAAvatarColor : userBAvatarColor;
  const partnerAvatarUrl = selfRole === 'A' ? userBAvatarUrl : userAAvatarUrl;
  const partnerAvatarColor = selfRole === 'A' ? userBAvatarColor : userAAvatarColor;
  const totalStars = starCountA + starCountB;
  const [viewMode, setViewMode] = useState<'today' | 'calendar'>('today');

  return (
    <>
      <StarJar
        starCountA={starCountA}
        starCountB={starCountB}
        colorA={userAStarColor}
        colorB={userBStarColor}
        starSize={jar.starSizeFixed ?? 30}
      />
      <Text style={styles.starCaption}>{t.starsOfCapacity(totalStars, jar.starCapacityN ?? '?')}</Text>

      <ViewModeToggle mode={viewMode} onChange={setViewMode} t={t} />

      {viewMode === 'calendar' ? (
        <View style={cardStyles.card}>
          <JarCalendar jarId={jar.id} colorA={userAStarColor} colorB={userBStarColor} selfRole={selfRole} partnerName={partnerLabel} />
        </View>
      ) : (
        <>
          <View style={cardStyles.card}>
            <Text style={styles.statusLabel}>{t.statusLabel[cycle.status] ?? cycle.status}</Text>
            {cycle.status === 'open' && <Text style={styles.subtle}>{t.cycleEndsIn(formatDuration(remainingToEnd, language))}</Text>}
            {cycle.status === 'incomplete_grace' && remainingToGrace !== null && (
              <>
                <Text style={styles.subtle}>{t.graceClosesIn(formatDuration(remainingToGrace, language))}</Text>
                <Text style={styles.graceExplainer}>{t.graceExplainer}</Text>
              </>
            )}
          </View>

          {selfMissing && (
            <View style={cardStyles.card}>
              <Text style={styles.sectionTitle}>{t.repairThisCycle}</Text>
              <Text style={styles.repairLabel}>{t.missedCycleRepairsLeft(selfRepairBalance, MONTHLY_REPAIR_ALLOWANCE)}</Text>
              {selfLastRepairUsedLabel && <Text style={styles.lastRepairUsed}>{t.lastRepairUsed(selfLastRepairUsedLabel)}</Text>}
              <Pressable
                style={[styles.repairButton, (selfAlreadyRepaired || selfRepairBalance <= 0) && styles.tapButtonDisabled]}
                disabled={selfAlreadyRepaired || selfRepairBalance <= 0}
                onPress={onRepair}
              >
                <Text style={styles.tapButtonText}>
                  {selfAlreadyRepaired ? t.repairedButton : selfRepairBalance <= 0 ? t.noRepairsLeftButton : t.useRepair}
                </Text>
              </Pressable>
            </View>
          )}
          {cycle.status === 'incomplete_grace' && !selfMissing && (
            <View style={cardStyles.card}>
              <Text style={styles.subtle}>{t.waitingOnPartnerRepair}</Text>
            </View>
          )}

          <MeetupDateEditor targetDateUTC={jar.targetDateUTC} onSave={onChangeTargetDate} />

          <View style={cardStyles.card}>
            <Text style={styles.sectionTitle}>{t.todaysTaps}</Text>
            <View style={styles.row}>
              <TapButton
                label={t.you}
                avatarName={selfDisplayName}
                color={selfColor}
                avatarUrl={selfAvatarUrl}
                avatarColor={selfAvatarColor}
                tapped={cycle.status === 'open' && selfTapped}
                disabled={!canTap}
                onPress={onTap}
              />
              <TapButton
                label={partnerLabel}
                avatarName={partnerDisplayName}
                color={partnerColor}
                avatarUrl={partnerAvatarUrl}
                avatarColor={partnerAvatarColor}
                tapped={partnerTapped}
                disabled
                interactive={false}
              />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          <MemoryNoteCard
            selfNote={selfRole === 'A' ? todayUserANote : todayUserBNote}
            partnerNote={selfRole === 'A' ? todayUserBNote : todayUserANote}
            partnerName={partnerLabel}
            selfTapped={selfTapped}
            onSave={onSaveMemoryNote}
          />

          <View style={cardStyles.card}>
            <Text style={styles.sectionTitle}>{t.streakLabel}</Text>
            <View style={styles.row}>
              <Stat label={t.current} value={streak.currentStreak} />
              <Stat label={t.longest} value={streak.longestStreak} />
            </View>
          </View>

          <LeaveJarButton onLeave={onLeaveJar} />

          <Pressable style={styles.leaveButton} onPress={onSignOut}>
            <Text style={styles.leaveButtonText}>{t.signOut}</Text>
          </Pressable>
        </>
      )}
    </>
  );
}

function ViewModeToggle({ mode, onChange, t }: { mode: 'today' | 'calendar'; onChange: (mode: 'today' | 'calendar') => void; t: I18nStrings }) {
  return (
    <View style={styles.viewToggleRow}>
      <Pressable style={[styles.viewToggleButton, mode === 'today' && styles.viewToggleButtonActive]} onPress={() => onChange('today')}>
        <Text style={[styles.viewToggleText, mode === 'today' && styles.viewToggleTextActive]}>{t.calendar.todayTab}</Text>
      </Pressable>
      <Pressable style={[styles.viewToggleButton, mode === 'calendar' && styles.viewToggleButtonActive]} onPress={() => onChange('calendar')}>
        <Text style={[styles.viewToggleText, mode === 'calendar' && styles.viewToggleTextActive]}>{t.calendar.calendarTab}</Text>
      </Pressable>
    </View>
  );
}

function TapButton({
  label,
  avatarName,
  color,
  avatarUrl,
  avatarColor,
  tapped,
  disabled,
  interactive = true,
  onPress,
}: {
  label: string;
  /** The account's actual display name, used only for the avatar's initial-letter fallback — distinct from `label`, which is "You" for the self button. */
  avatarName: string;
  color: string;
  avatarUrl: string | null;
  avatarColor: string;
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
      <Avatar url={avatarUrl} color={avatarColor} name={avatarName} size={22} />
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

// On web, a wide browser window would otherwise stretch every screen (the calendar grid
// especially) to fill it; capping and centering the column keeps the phone-shaped layout the
// whole app was designed around, while being a no-op on an actual phone (viewport already
// narrower than this).
const MAX_CONTENT_WIDTH = 480;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  loadingScreen: { flex: 1, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 14, fontSize: 13, color: MUTED },
  flexArea: { flex: 1 },
  scrollArea: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  container: { padding: 20, paddingTop: 60, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center', color: INK },
  errorScreenButton: { marginTop: 4 },
  pageHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  backArrow: { paddingVertical: 4, paddingHorizontal: 8, marginLeft: -8 },
  backArrowText: { fontSize: 24, fontWeight: '700', color: INK },
  demoButtonGroup: { marginLeft: 'auto', flexDirection: 'row', gap: 8 },
  exitDemoButton: { backgroundColor: GOLD, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  exitDemoText: { fontSize: 13, fontWeight: '700', color: INK },
  resetDemoButton: { backgroundColor: CREAM_FIELD, borderWidth: 1, borderColor: CREAM_BORDER, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  resetDemoText: { fontSize: 13, fontWeight: '700', color: INK },
  statusLabel: { fontSize: 18, fontWeight: '600' },
  subtle: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  lastRepairUsed: { color: '#6B7280', fontSize: 13, marginTop: 4, marginBottom: 12 },
  graceExplainer: { color: '#6B7280', fontSize: 12, marginTop: 8, lineHeight: 17 },
  notificationPrimingActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  notificationPrimingButton: { flex: 1, marginBottom: 0 },
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
  repairLabel: { fontSize: 13, color: '#374151', marginBottom: 10 },
  repairButton: { backgroundColor: '#FEE2E2', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  errorText: { color: '#DC2626', fontSize: 13, marginTop: 8 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: '#1F2937' },
  starCaption: { textAlign: 'center', color: '#6B7280', marginBottom: 20 },
  viewToggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#FDF6EC',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CREAM_BORDER,
    padding: 3,
    marginBottom: 16,
  },
  viewToggleButton: { paddingVertical: 6, paddingHorizontal: 18, borderRadius: 9 },
  viewToggleButtonActive: { backgroundColor: GOLD },
  viewToggleText: { fontSize: 13, fontWeight: '700', color: MUTED },
  viewToggleTextActive: { color: INK },
  leaveButton: { alignItems: 'center', paddingVertical: 12, marginBottom: 20 },
  leaveButtonText: { color: '#9CA3AF', fontSize: 13, textDecorationLine: 'underline' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FDF6EC',
    borderTopWidth: 2,
    borderTopColor: CREAM_BORDER,
    paddingBottom: 18,
    paddingTop: 10,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  tabButtonWrap: { flex: 1, alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#8A7C68' },
  tabLabelActive: { color: INK, fontWeight: '800' },
});
