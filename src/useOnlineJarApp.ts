import { useCallback, useEffect, useRef, useState } from 'react';
import { JarAppState } from './appState';
import { progressState, repairAction, tapAction } from './jarEngine';
import { clearMembership, loadMembership, Membership, saveMembership } from './onlineMembership';
import {
  createJar,
  ensureSignedIn,
  ensureUserProfile,
  fetchJar,
  fetchJarAppState,
  joinJar,
  subscribeToJar,
  writeCycle,
  writeStreak,
  writeUserProfile,
} from './supabase/api';

export type OnlineStatus = 'loading' | 'no-jar' | 'waiting-for-partner' | 'ready' | 'error';

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
      await writeStreak(jarId, progressed.streak, progressed.completedStarCount);
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

  // Initial boot: sign in, load any saved membership, and resolve to the right status.
  useEffect(() => {
    void (async () => {
      try {
        const userId = await ensureSignedIn();
        userIdRef.current = userId;
        await ensureUserProfile(userId, new Date());

        const saved = await loadMembership();
        if (!saved) {
          setStatus('no-jar');
          return;
        }
        setMembership(saved);
      } catch (e) {
        console.error('jar-app error:', e);
      setError(describeError(e));
        setStatus('error');
      }
    })();
  }, []);

  // Whenever membership changes (just created/joined a jar, or loaded from storage), resolve its state.
  useEffect(() => {
    if (membership) void refreshFromServer();
  }, [membership, refreshFromServer]);

  // Realtime: refresh whenever the partner's device changes the jar, or when it starts.
  useEffect(() => {
    if (!membership) return;
    return subscribeToJar(membership.jarId, () => void refreshFromServer());
  }, [membership, refreshFromServer]);

  // Periodic tick for time-driven transitions (cycle close, grace expiry).
  useEffect(() => {
    if (status !== 'ready' || !membership) return;
    const id = setInterval(() => void refreshFromServer(), 15000);
    return () => clearInterval(id);
  }, [status, membership, refreshFromServer]);

  const startNewJar = useCallback(async (estimatedDaysApart?: number) => {
    try {
      const userId = userIdRef.current!;
      const { jarId, inviteCode: code } = await createJar(userId, estimatedDaysApart);
      const nextMembership: Membership = { jarId, role: 'A' };
      await saveMembership(nextMembership);
      setInviteCode(code);
      setMembership(nextMembership);
      setStatus('waiting-for-partner');
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
    }
  }, []);

  const joinExistingJar = useCallback(async (code: string) => {
    try {
      const jarId = await joinJar(code);
      const nextMembership: Membership = { jarId, role: 'B' };
      await saveMembership(nextMembership);
      setMembership(nextMembership);
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
    }
  }, []);

  const leaveJar = useCallback(async () => {
    await clearMembership();
    setMembership(null);
    setAppState(null);
    setInviteCode(null);
    setStatus('no-jar');
  }, []);

  const tap = useCallback(async () => {
    if (!appStateRef.current || !membership) return;
    const updated = progressState(tapAction(appStateRef.current, membership.role), new Date());
    setAppState(updated);
    await writeCycle(updated.cycle);
    if (updated.streak.lastUpdatedCycleIndex !== appStateRef.current.streak.lastUpdatedCycleIndex) {
      await writeStreak(membership.jarId, updated.streak, updated.completedStarCount);
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
      await writeStreak(membership.jarId, updated.streak, updated.completedStarCount);
      setError(null);
    } catch (e) {
      console.error('jar-app error:', e);
      setError(describeError(e));
    }
  }, [membership]);

  return { status, inviteCode, appState, error, selfRole: membership?.role ?? null, startNewJar, joinExistingJar, leaveJar, tap, repair };
}
