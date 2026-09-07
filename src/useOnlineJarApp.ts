import { useCallback, useEffect, useRef, useState } from 'react';
import { JarAppState } from './appState';
import { progressState, repairAction, tapAction } from './jarEngine';
import {
  createJar,
  ensureUserProfile,
  fetchJar,
  fetchJarAppState,
  fetchMyJars,
  getCurrentUserId,
  joinJar,
  JarSummary,
  leaveJar as leaveJarApi,
  sendSignInCode,
  signOut,
  subscribeToJar,
  verifySignInCode,
  writeCycle,
  writeDisplayName,
  writeStarColor,
  writeStreak,
  writeUserProfile,
} from './supabase/api';

export type OnlineStatus = 'loading' | 'signed-out' | 'picking' | 'creating' | 'waiting-for-partner' | 'ready' | 'error';

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
  const [status, setStatus] = useState<OnlineStatus>('loading');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [appState, setAppState] = useState<JarAppState | null>(null);
  const [myJars, setMyJars] = useState<JarSummary[]>([]);
  const [myDisplayName, setMyDisplayName] = useState<string>('Partner');
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const appStateRef = useRef<JarAppState | null>(null);
  appStateRef.current = appState;

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
  // Exactly one -> jump straight in, like before. Zero -> straight to create/join. Two or
  // more -> there's no way to guess which one they want, so show the picker.
  const resolveAccount = useCallback(
    async (userId: string) => {
      userIdRef.current = userId;
      const { displayName } = await ensureUserProfile(userId, new Date());
      setMyDisplayName(displayName);
      const jars = await loadMyJars(userId);
      if (jars.length === 0) {
        setStatus('creating');
        return;
      }
      if (jars.length === 1) {
        setMembership({ jarId: jars[0].jarId, role: jars[0].role });
        return;
      }
      setStatus('picking');
    },
    [loadMyJars]
  );

  // Initial boot: restore an existing session if there is one.
  useEffect(() => {
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

  // Whenever membership changes (just created/joined/selected a jar), fetch its state.
  useEffect(() => {
    if (membership) void refreshFromServer();
  }, [membership, refreshFromServer]);

  // Realtime: refresh whenever the partner's device changes the jar, or when it starts.
  useEffect(() => {
    if (!membership) return;
    return subscribeToJar(membership.jarId, () => void refreshFromServer());
  }, [membership, refreshFromServer]);

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

  const sendCode = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendSignInCode(email);
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
      throw e;
    }
  }, []);

  const verifyCode = useCallback(
    async (email: string, code: string) => {
      setError(null);
      try {
        const userId = await verifySignInCode(email, code);
        await resolveAccount(userId);
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
        throw e;
      }
    },
    [resolveAccount]
  );

  const startNewJar = useCallback(
    async (targetDateUTC: Date) => {
      try {
        const userId = userIdRef.current!;
        const { jarId, inviteCode: code } = await createJar(userId, targetDateUTC);
        setInviteCode(code);
        setError(null);
        setMembership({ jarId, role: 'A' });
        setStatus('waiting-for-partner');
        void loadMyJars(userId); // so it's already in the list if they navigate back
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
      }
    },
    [loadMyJars]
  );

  const joinExistingJar = useCallback(
    async (code: string) => {
      try {
        const jarId = await joinJar(code);
        setError(null);
        setMembership({ jarId, role: 'B' });
        if (userIdRef.current) void loadMyJars(userIdRef.current);
      } catch (e) {
        console.error('jar-app error:', e);
        setError(describeError(e));
      }
    },
    [loadMyJars]
  );

  /** Opens one jar from the picker, without touching the others. */
  const selectJar = useCallback((jarId: string, role: 'A' | 'B') => {
    setError(null);
    setMembership({ jarId, role });
  }, []);

  /** From inside a jar (or the create/join form), go back to the "my jars" list. */
  const backToJarList = useCallback(async () => {
    setMembership(null);
    setAppState(null);
    setInviteCode(null);
    setError(null);
    if (userIdRef.current) await loadMyJars(userIdRef.current);
    setStatus('picking');
  }, [loadMyJars]);

  /** Opens the create/join form — from the picker, to add another jar alongside existing ones. */
  const startCreatingJar = useCallback(() => {
    setError(null);
    setStatus('creating');
  }, []);

  const doSignOut = useCallback(async () => {
    await signOut();
    userIdRef.current = null;
    setMembership(null);
    setAppState(null);
    setInviteCode(null);
    setMyJars([]);
    setMyDisplayName('Partner');
    setError(null);
    setStatus('signed-out');
  }, []);

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

  /** Deletes one specific jar (for both members) and returns to the jar list (or the create form, if none are left). */
  const leaveJar = useCallback(async () => {
    if (!membership) return;
    try {
      await leaveJarApi(membership.jarId);
      setMembership(null);
      setAppState(null);
      setInviteCode(null);
      setError(null);
      const userId = userIdRef.current;
      const jars = userId ? await loadMyJars(userId) : [];
      setStatus(jars.length === 0 ? 'creating' : 'picking');
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
    }
  }, [membership, loadMyJars]);

  const tap = useCallback(async () => {
    if (!appStateRef.current || !membership) return;
    const before = appStateRef.current;
    const updated = progressState(tapAction(before, membership.role), new Date());
    setAppState(updated);
    await writeCycle(updated.cycle);
    const starsChanged = updated.starCountA !== before.starCountA || updated.starCountB !== before.starCountB;
    if (starsChanged || updated.streak.lastUpdatedCycleIndex !== before.streak.lastUpdatedCycleIndex) {
      await writeStreak(membership.jarId, updated.streak, updated.starCountA, updated.starCountB);
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

  /** Either partner can change only their own star's color, independent of the other's. */
  const updateStarColor = useCallback(
    async (color: string) => {
      if (!appStateRef.current || !membership) return;
      const before = appStateRef.current;
      const userId = membership.role === 'A' ? before.jar.userAId : before.jar.userBId;
      setAppState(membership.role === 'A' ? { ...before, userAStarColor: color } : { ...before, userBStarColor: color });
      await writeStarColor(userId, color);
    },
    [membership]
  );

  return {
    status,
    inviteCode,
    appState,
    myJars,
    myDisplayName,
    error,
    selfRole: membership?.role ?? null,
    sendCode,
    verifyCode,
    startNewJar,
    joinExistingJar,
    selectJar,
    backToJarList,
    startCreatingJar,
    signOut: doSignOut,
    leaveJar,
    tap,
    repair,
    updateStarColor,
    updateDisplayName,
  };
}
