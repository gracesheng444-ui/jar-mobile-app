import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { JarAppState } from './appState';
import { Language, useI18n } from './i18n';
import { progressState, repairAction, tapAction } from './jarEngine';
import { configureNotificationHandler, ensureAndroidNotificationChannel, requestNotificationPermission, syncCycleNotifications } from './notificationScheduler';
import {
  createJar,
  ensureUserProfile,
  fetchJar,
  fetchJarAppState,
  fetchMyJars,
  getCurrentUserId,
  joinJar,
  JarSummary,
  changePassword,
  confirmSignUp,
  deleteOwnAccount,
  leaveJar as leaveJarApi,
  sendPasswordReset,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  subscribeToJar,
  subscribeToMyJars,
  updatePassword,
  updateTargetDate,
  writeCycle,
  writeDisplayName,
  writeLanguage,
  writeMemoryNote,
  writeStreak,
  writeUserProfile,
} from './supabase/api';
import { supabase } from './supabase/client';

// Reunion-screen dismissal is tracked per-device (AsyncStorage), not server-side — simpler than
// a schema change, and the only cost is a viewer might see it again on a second device, which is
// a fine trade-off for a two-person app.
const REUNION_DISMISSED_PREFIX = 'jar-app-reunion-dismissed-';

// 'idle' covers "signed in, no jar currently open" — both the jar list and
// the create/join form render from this one status; which of the two is
// shown is a pure UI concern (which bottom tab is active), owned by the
// caller, not by this hook.
export type OnlineStatus = 'loading' | 'signed-out' | 'reset-password' | 'setup-profile' | 'idle' | 'waiting-for-partner' | 'ready' | 'error';

export interface MyAvatar {
  url: string | null;
  color: string;
}

interface Membership {
  jarId: string;
  role: 'A' | 'B';
}

// Supabase/PostgREST errors are plain objects (not Error instances) with a
// .message field — description helps development.
function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

export function useOnlineJarApp() {
  const { language, setLanguage, t } = useI18n();
  const [status, setStatus] = useState<OnlineStatus>('loading');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [appState, setAppState] = useState<JarAppState | null>(null);
  const [myJars, setMyJars] = useState<JarSummary[]>([]);
  const [myDisplayName, setMyDisplayName] = useState<string>('Partner');
  const [myAvatar, setMyAvatar] = useState<MyAvatar>({ url: null, color: '#FFC94A' });
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // True right after both members are first paired (either side), until dismissed — shows a
  // one-time congratulations screen instead of dropping straight into the jar view. Not tied to
  // the jar's own data, so it's local UI state rather than something persisted server-side.
  const [justPaired, setJustPaired] = useState(false);
  // True once this jar's meet-up date has passed and this device hasn't dismissed the "you made
  // it" screen for it yet — see REUNION_DISMISSED_PREFIX.
  const [showReunion, setShowReunion] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const appStateRef = useRef<JarAppState | null>(null);
  const statusRef = useRef<OnlineStatus>('loading');
  appStateRef.current = appState;
  statusRef.current = status;

  const loadReadyState = useCallback(async (jarId: string, userId: string) => {
    const bundle = await fetchJarAppState(jarId, userId);
    const progressed = progressState(bundle, new Date());
    setAppState(progressed);
    if (
      progressed.cycle.cycleIndex !== bundle.cycle.cycleIndex ||
      progressed.cycle.status !== bundle.cycle.status ||
      progressed.streak.currentStreak !== bundle.streak.currentStreak
    ) {
      await writeCycle(progressed.cycle);
      await writeStreak(jarId, progressed.streak, progressed.starCountA, progressed.starCountB);
    }
    // The creator's device is the one that discovers pairing this way (it was sitting on
    // 'waiting-for-partner' until a realtime push or the poll fallback found the jar had
    // started) — the joiner's side is marked in joinExistingJar instead, since for them the
    // join action itself is the pairing moment.
    if (statusRef.current === 'waiting-for-partner') setJustPaired(true);
    if (progressed.jar.targetDateUTC && progressed.jar.targetDateUTC.getTime() <= Date.now()) {
      const dismissed = await AsyncStorage.getItem(REUNION_DISMISSED_PREFIX + jarId).catch(() => null);
      if (!dismissed) setShowReunion(true);
    }
    setStatus('ready');
  }, []);

  const refreshFromServer = useCallback(async () => {
    if (!membership) return;
    try {
      const jar = await fetchJar(membership.jarId);
      if (!jar.hasStarted) {
        setInviteCode(jar.inviteCode);
        setStatus('waiting-for-partner');
        return;
      }
      await loadReadyState(membership.jarId, userIdRef.current!);
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
      setStatus('error');
    }
  }, [membership, loadReadyState]);

  /** Refetches the list of jars this account belongs to (for the picker screen). */
  const loadMyJars = useCallback(async (userId: string) => {
    const jars = await fetchMyJars(userId);
    setMyJars(jars);
    return jars;
  }, []);

  // After sign-in (fresh or restored session), see which jar(s) this account belongs to.
  // Exactly one -> jump straight in. Zero or several -> 'idle' (the jar list — empty or
  // not — plus the create/join form are both reachable from there via the tab bar).
  const resolveAccount = useCallback(
    async (userId: string) => {
      userIdRef.current = userId;
      setUserId(userId);
      const { displayName, language: profileLanguage, avatarUrl, avatarColor, email, isNewProfile } = await ensureUserProfile(userId, new Date(), language);
      setMyDisplayName(displayName);
      setMyAvatar({ url: avatarUrl, color: avatarColor });
      setMyEmail(email);
      if (profileLanguage === 'en' || profileLanguage === 'zh') setLanguage(profileLanguage);
      // A brand-new account has no jars yet by definition — route through a
      // one-time "set up your profile" step before ever reaching the jar list.
      if (isNewProfile) {
        setStatus('setup-profile');
        return;
      }
      const jars = await loadMyJars(userId);
      if (jars.length === 1) {
        setMembership({ jarId: jars[0].jarId, role: jars[0].role });
        return;
      }
      setStatus('idle');
    },
    [loadMyJars, language, setLanguage]
  );

  /** Finishes the one-time post-signup profile step (name only — the avatar picker persists itself as it's used) and moves on to creating/joining a first jar. */
  const completeProfileSetup = useCallback(async (name: string) => {
    const userId = userIdRef.current;
    if (!userId) return;
    setMyDisplayName(name);
    await writeDisplayName(userId, name);
    setStatus('idle');
  }, []);

  // Initial boot: restore an existing session if there is one. Skipped while the URL still
  // carries a password-reset redirect's #...&type=recovery hash — otherwise this races the
  // PASSWORD_RECOVERY handler below: supabase-js resolves that hash into a session asynchronously,
  // so getCurrentUserId() here can still see whatever (unrelated) session was already stored on
  // this device, resolve straight into that account, and then get clobbered a moment later when
  // the recovery event actually fires — which is exactly backwards from what should happen.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      return;
    }
    void (async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          setStatus('signed-out');
          return;
        }
        await resolveAccount(userId);
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
        setStatus('error');
      }
    })();
  }, [resolveAccount]);

  // A clicked password-reset email link lands back on this app already holding a recovery
  // session — supabase-js surfaces that as a PASSWORD_RECOVERY auth event rather than a normal
  // sign-in, so it's caught here instead of in the initial-boot check above.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setStatus('reset-password');
    });
    return () => subscription.unsubscribe();
  }, []);

  // Whenever membership changes (just created/joined/selected a jar), fetch its state.
  useEffect(() => {
    if (membership) void refreshFromServer();
  }, [membership, refreshFromServer]);

  // Realtime: refresh whenever the partner's device changes the jar, or when it starts.
  useEffect(() => {
    if (!membership) return;
    return subscribeToJar(membership.jarId, () => void refreshFromServer());
  }, [membership, refreshFromServer]);

  // Realtime for the "My Jars" list itself — otherwise its tap-status dots only refresh at
  // specific navigation moments (arriving at the list, creating/joining/leaving a jar), not
  // while just sitting on that screen watching for a partner to tap.
  useEffect(() => {
    if (status !== 'idle' || !userId) return;
    return subscribeToMyJars(() => void loadMyJars(userId));
  }, [status, userId, loadMyJars]);

  // Periodic tick for time-driven transitions (cycle close, grace expiry), and
  // for 'waiting-for-partner' a polling fallback in case the realtime push
  // for "partner joined" never arrives (flaky connection, or the app was only
  // backgrounded rather than truly relaunched) — otherwise that screen has no
  // other way to notice the jar has started.
  useEffect(() => {
    if ((status !== 'ready' && status !== 'waiting-for-partner') || !membership) return;
    const id = setInterval(() => void refreshFromServer(), 15000);
    return () => clearInterval(id);
  }, [status, membership, refreshFromServer]);

  // One-time local-notification setup: the OS handler (so reminders still show while the app is
  // open) and the Android notification channel. Cheap and side-effect-free to run on every boot.
  useEffect(() => {
    configureNotificationHandler();
    void ensureAndroidNotificationChannel();
  }, []);

  // Cycle-reset and incomplete-tap-reminder notifications: both are fully computable from a
  // CycleRecord alone (see jar-core-logic's src/notifications.ts), so they're scheduled entirely
  // on-device here — no push token, no backend. Re-syncs whenever this cycle's identity or this
  // user's own tap status changes; syncCycleNotifications is safe to call repeatedly (it cancels
  // every possible slot for the cycle before rescheduling only what's still due), so a tap that
  // flips hasTapped to true simply clears out whatever reminders were pending. Partner-activity
  // notifications aren't handled here — they depend on the *other* device's action, so they need
  // an actual server push rather than anything schedulable in advance.
  useEffect(() => {
    if (status !== 'ready' || !appState || !membership) return;
    const hasTapped = membership.role === 'A' ? appState.cycle.userATapped : appState.cycle.userBTapped;
    void (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) return;
      await syncCycleNotifications(appState.jar.id, appState.cycle, hasTapped, t.notifications);
    })();
  }, [status, appState?.jar.id, appState?.cycle.cycleIndex, appState?.cycle.userATapped, appState?.cycle.userBTapped, membership?.role, t]);

  /** Returns true if the new account is already signed in; false if it still needs to confirm its email first. */
  const signUp = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setError(null);
      try {
        const { userId, needsEmailConfirmation } = await signUpWithPassword(email, password);
        if (userId) await resolveAccount(userId);
        return !needsEmailConfirmation;
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
        throw e;
      }
    },
    [resolveAccount]
  );

  /** Alternative to clicking the signup email's confirmation link — uses the code from that same email instead. */
  const confirmAccount = useCallback(
    async (email: string, code: string) => {
      setError(null);
      try {
        const userId = await confirmSignUp(email, code);
        await resolveAccount(userId);
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
        throw e;
      }
    },
    [resolveAccount]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      try {
        const userId = await signInWithPassword(email, password);
        await resolveAccount(userId);
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
        throw e;
      }
    },
    [resolveAccount]
  );

  const forgotPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordReset(email);
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
      throw e;
    }
  }, []);

  /** Finishes the password-reset flow: sets the new password, then resumes into the account as normal. */
  const setNewPassword = useCallback(
    async (password: string) => {
      setError(null);
      try {
        await updatePassword(password);
        const id = await getCurrentUserId();
        if (id) await resolveAccount(id);
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
        throw e;
      }
    },
    [resolveAccount]
  );

  const startNewJar = useCallback(
    async (targetDateUTC: Date, starColor: string): Promise<boolean> => {
      try {
        const userId = userIdRef.current!;
        const { jarId, inviteCode: code } = await createJar(userId, targetDateUTC, starColor);
        setInviteCode(code);
        setError(null);
        setMembership({ jarId, role: 'A' });
        setStatus('waiting-for-partner');
        void loadMyJars(userId); // so it's already in the list if they navigate back
        return true;
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
        return false;
      }
    },
    [loadMyJars]
  );

  const joinExistingJar = useCallback(
    async (code: string, starColor: string): Promise<boolean> => {
      try {
        const jarId = await joinJar(code, starColor);
        setError(null);
        setMembership({ jarId, role: 'B' });
        setJustPaired(true);
        if (userIdRef.current) void loadMyJars(userIdRef.current);
        return true;
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
        return false;
      }
    },
    [loadMyJars]
  );

  /** Opens one jar from the picker, without touching the others. */
  const selectJar = useCallback((jarId: string, role: 'A' | 'B') => {
    setError(null);
    setJustPaired(false);
    setShowReunion(false);
    setMembership({ jarId, role });
  }, []);

  const dismissJustPaired = useCallback(() => setJustPaired(false), []);

  const dismissReunion = useCallback(async () => {
    setShowReunion(false);
    if (appStateRef.current) await AsyncStorage.setItem(REUNION_DISMISSED_PREFIX + appStateRef.current.jar.id, '1').catch(() => {});
  }, []);

  /** Closes whichever jar is currently open and returns to the jar list. */
  const backToJarList = useCallback(async () => {
    setMembership(null);
    setAppState(null);
    setInviteCode(null);
    setError(null);
    setJustPaired(false);
    setShowReunion(false);
    if (userIdRef.current) await loadMyJars(userIdRef.current);
    setStatus('idle');
  }, [loadMyJars]);

  /** Clears all local account state and drops back to the sign-in screen — shared by sign-out and account deletion. */
  const resetToSignedOut = useCallback(() => {
    userIdRef.current = null;
    setUserId(null);
    setMembership(null);
    setAppState(null);
    setInviteCode(null);
    setMyJars([]);
    setMyDisplayName('Partner');
    setMyAvatar({ url: null, color: '#FFC94A' });
    setError(null);
    setJustPaired(false);
    setShowReunion(false);
    setStatus('signed-out');
  }, []);

  const doSignOut = useCallback(async () => {
    await signOut();
    resetToSignedOut();
  }, [resetToSignedOut]);

  /** Sets this account's own display name — visible to partners in the jar list and jar view. */
  const updateDisplayName = useCallback(
    async (name: string) => {
      if (!userIdRef.current) return;
      const userId = userIdRef.current;
      setMyDisplayName(name);
      // Keep the currently-open jar's view in sync immediately, without waiting on a refetch.
      if (appStateRef.current && membership) {
        setAppState(
          membership.role === 'A' ? { ...appStateRef.current, userADisplayName: name } : { ...appStateRef.current, userBDisplayName: name }
        );
      }
      await writeDisplayName(userId, name);
    },
    [membership]
  );

  /** Deletes one specific jar (for both members) and returns to the jar list. */
  const leaveJar = useCallback(async () => {
    if (!membership) return;
    try {
      await leaveJarApi(membership.jarId);
      setMembership(null);
      setAppState(null);
      setInviteCode(null);
      setError(null);
      setJustPaired(false);
      setShowReunion(false);
      const userId = userIdRef.current;
      if (userId) await loadMyJars(userId);
      setStatus('idle');
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
    }
  }, [membership, loadMyJars]);

  const tap = useCallback(async () => {
    if (!appStateRef.current || !membership) return;
    // Fire immediately on the interaction itself, not after the async write below — haptics has
    // no web implementation, so this is a silent no-op there rather than an error.
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const before = appStateRef.current;
      const nowUTC = new Date();
      const updated = progressState(tapAction(before, membership.role, nowUTC), nowUTC);
      setAppState(updated);
      await writeCycle(updated.cycle);
      const starsChanged = updated.starCountA !== before.starCountA || updated.starCountB !== before.starCountB;
      if (starsChanged || updated.streak.lastUpdatedCycleIndex !== before.streak.lastUpdatedCycleIndex) {
        await writeStreak(membership.jarId, updated.streak, updated.starCountA, updated.starCountB);
      }
      setError(null);
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
    }
  }, [membership]);

  const repair = useCallback(async () => {
    if (!appStateRef.current || !membership) return;
    try {
      const before = appStateRef.current;
      const updated = repairAction(before, membership.role, new Date());
      setAppState(updated);
      const spender = membership.role === 'A' ? updated.userA : updated.userB;
      await writeUserProfile(spender);
      await writeCycle(updated.cycle);
      await writeStreak(membership.jarId, updated.streak, updated.starCountA, updated.starCountB);
      setError(null);
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
    }
  }, [membership]);

  /** Sets (or, with an empty string, clears) this account's note for the current cycle. Any day
   *  works server-side, but this always targets "today" since that's the only day the jar view
   *  currently offers an editor for. */
  const saveMemoryNote = useCallback(
    async (note: string) => {
      if (!appStateRef.current || !membership) return;
      setError(null);
      try {
        await writeMemoryNote(membership.jarId, appStateRef.current.cycle.cycleIndex, membership.role, note);
        const trimmed = note.trim() || null;
        setAppState(
          membership.role === 'A' ? { ...appStateRef.current, todayUserANote: trimmed } : { ...appStateRef.current, todayUserBNote: trimmed }
        );
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
        throw e;
      }
    },
    [membership]
  );

  /** Changes when this jar's meet-up is — either partner can do this at any time. Recomputes
   *  star_capacity_n/star_size_fixed from the new date too (see schema.sql), so every star —
   *  already dropped or still to come — resizes to fit the new countdown. */
  const changeTargetDate = useCallback(
    async (newDate: Date) => {
      if (!membership) return;
      setError(null);
      try {
        const { starCapacityN, starSizeFixed } = await updateTargetDate(membership.jarId, newDate);
        if (appStateRef.current) {
          setAppState({
            ...appStateRef.current,
            jar: { ...appStateRef.current.jar, targetDateUTC: newDate, starCapacityN, starSizeFixed },
          });
        }
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
        throw e;
      }
    },
    [membership]
  );

  /** Sets this account's UI language — persisted to their profile so it follows them across devices. */
  const updateLanguage = useCallback(
    async (lang: Language) => {
      setLanguage(lang);
      if (userIdRef.current) await writeLanguage(userIdRef.current, lang);
    },
    [setLanguage]
  );

  /** Mirrors an avatar change (already persisted by AvatarPicker itself, in api.ts) into local state — including the currently open jar's view, if any, so it updates immediately without waiting on a refetch. */
  const updateMyAvatar = useCallback(
    (avatar: MyAvatar) => {
      setMyAvatar(avatar);
      if (appStateRef.current && membership) {
        setAppState(
          membership.role === 'A'
            ? { ...appStateRef.current, userAAvatarUrl: avatar.url, userAAvatarColor: avatar.color }
            : { ...appStateRef.current, userBAvatarUrl: avatar.url, userBAvatarColor: avatar.color }
        );
      }
    },
    [membership]
  );

  const changeMyPassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
      throw e;
    }
  }, []);

  /** Permanently deletes this account (and, server-side, any jars it's in) and returns to the sign-in screen. */
  const deleteAccount = useCallback(async () => {
    setError(null);
    try {
      await deleteOwnAccount();
      // The account (and its session, server-side) is gone at this point, but the local
      // client still holds its access/refresh tokens — clear those too, or a relaunch
      // before they naturally expire resolves into a session for a user that no longer
      // exists (ensureUserProfile's insert then fails on the auth.users FK).
      await signOut();
      resetToSignedOut();
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
      throw e;
    }
  }, [resetToSignedOut]);

  return {
    status,
    inviteCode,
    appState,
    myJars,
    myDisplayName,
    myAvatar,
    myEmail,
    userId,
    error,
    selfRole: membership?.role ?? null,
    justPaired,
    dismissJustPaired,
    showReunion,
    dismissReunion,
    signUp,
    signIn,
    confirmAccount,
    forgotPassword,
    setNewPassword,
    completeProfileSetup,
    startNewJar,
    joinExistingJar,
    selectJar,
    backToJarList,
    signOut: doSignOut,
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
  };
}
