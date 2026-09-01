import { CycleRecord, getLocalYearMonth, MONTHLY_REPAIR_ALLOWANCE, StreakState, UserProfile } from 'jar-core-logic';
import { JarAppState } from '../appState';
import { supabase } from './client';
import { CycleRow, cycleToRow, JarRow, rowToCycle, rowToProfile, StreakRow, UserProfileRow } from './rows';

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

/** Sends a 6-digit sign-in code to the given email. Creates the account on first use. */
export async function sendSignInCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() });
  if (error) throw error;
}

/** Verifies the code from sendSignInCode and establishes the session. */
export async function verifySignInCode(email: string, code: string): Promise<string> {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw error;
  return data.user!.id;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Looks up the jar this account already belongs to (as either partner), if any — makes jar
 *  membership recoverable on a new device instead of living only in local storage. */
export async function findMyJar(userId: string): Promise<{ jarId: string; role: 'A' | 'B' } | null> {
  const { data, error } = await supabase
    .from('jars')
    .select('id, user_a_id, user_b_id')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .limit(1)
    .maybeSingle<Pick<JarRow, 'id' | 'user_a_id' | 'user_b_id'>>();
  if (error) throw error;
  if (!data) return null;
  return { jarId: data.id, role: data.user_a_id === userId ? 'A' : 'B' };
}

export async function ensureUserProfile(userId: string, nowUTC: Date): Promise<void> {
  const { data } = await supabase.from('user_profiles').select('id').eq('id', userId).maybeSingle();
  if (data) return;

  const timeZone = deviceTimeZone();
  const { error } = await supabase.from('user_profiles').insert({
    id: userId,
    current_timezone: timeZone,
    repair_balance: MONTHLY_REPAIR_ALLOWANCE,
    last_refilled_yyyymm: getLocalYearMonth(nowUTC, timeZone),
  });
  if (error) throw error;
}

/** Creates a jar with no partner yet. Cycle/streak rows are created later, when a partner joins. */
export async function createJar(userId: string, estimatedDaysApart: number | undefined): Promise<{ jarId: string; inviteCode: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from('jars')
      .insert({ invite_code: inviteCode, user_a_id: userId, mode: 'countup', estimated_days_apart: estimatedDaysApart ?? null })
      .select('id')
      .single();
    if (!error && data) {
      return { jarId: data.id as string, inviteCode };
    }
    if (error && error.code !== '23505') throw error; // 23505 = unique_violation on invite_code, retry
  }
  throw new Error('Could not generate a unique invite code — please try again.');
}

/** Joins an existing jar by its invite code. Fails if the code is invalid or already used. */
export async function joinJar(inviteCode: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_jar_by_code', { code: inviteCode.trim().toUpperCase() });
  if (error) throw error;
  return data as string;
}

export interface FetchedJar {
  id: string;
  inviteCode: string;
  userAId: string;
  userBId: string | null;
  hasStarted: boolean;
}

export async function fetchJar(jarId: string): Promise<FetchedJar> {
  const { data, error } = await supabase.from('jars').select('*').eq('id', jarId).single<JarRow>();
  if (error) throw error;
  return {
    id: data.id,
    inviteCode: data.invite_code,
    userAId: data.user_a_id,
    userBId: data.user_b_id,
    hasStarted: data.user_b_id !== null,
  };
}

/** Only call once both users have joined (fetchJar(...).hasStarted). */
export async function fetchJarAppState(jarId: string, selfUserId: string): Promise<JarAppState> {
  const { data: jarRow, error: jarErr } = await supabase.from('jars').select('*').eq('id', jarId).single<JarRow>();
  if (jarErr) throw jarErr;
  if (!jarRow.user_b_id) throw new Error('This jar does not have a partner yet.');

  const [{ data: cycleRow, error: cycleErr }, { data: streakRow, error: streakErr }, { data: userARow, error: userAErr }, { data: userBRow, error: userBErr }] =
    await Promise.all([
      supabase.from('cycles').select('*').eq('jar_id', jarId).order('cycle_index', { ascending: false }).limit(1).single<CycleRow>(),
      supabase.from('streaks').select('*').eq('jar_id', jarId).single<StreakRow>(),
      supabase.from('user_profiles').select('*').eq('id', jarRow.user_a_id).single<UserProfileRow>(),
      supabase.from('user_profiles').select('*').eq('id', jarRow.user_b_id).single<UserProfileRow>(),
    ]);
  if (cycleErr) throw cycleErr;
  if (streakErr) throw streakErr;
  if (userAErr) throw userAErr;
  if (userBErr) throw userBErr;

  return {
    jar: {
      id: jarRow.id,
      userAId: jarRow.user_a_id,
      userBId: jarRow.user_b_id,
      createdAtUTC: new Date(jarRow.created_at_utc),
      mode: jarRow.mode,
      estimatedDaysApart: jarRow.estimated_days_apart ?? undefined,
    },
    userA: rowToProfile(userARow),
    userB: rowToProfile(userBRow),
    cycle: rowToCycle(cycleRow),
    streak: {
      jarId,
      currentStreak: streakRow.current_streak,
      longestStreak: streakRow.longest_streak,
      lastUpdatedCycleIndex: streakRow.last_updated_cycle_index,
    },
    completedStarCount: streakRow.completed_star_count,
    devClockOffsetMs: 0,
  };
}

export async function writeCycle(cycle: CycleRecord): Promise<void> {
  const { error } = await supabase.from('cycles').upsert(cycleToRow(cycle), { onConflict: 'jar_id,cycle_index' });
  if (error) throw error;
}

export async function writeStreak(jarId: string, streak: StreakState, completedStarCount: number): Promise<void> {
  const { error } = await supabase
    .from('streaks')
    .update({
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      last_updated_cycle_index: streak.lastUpdatedCycleIndex,
      completed_star_count: completedStarCount,
    })
    .eq('jar_id', jarId);
  if (error) throw error;
}

export async function writeUserProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ repair_balance: profile.repairBalance, last_refilled_yyyymm: profile.lastRefilledYYYYMM })
    .eq('id', profile.id);
  if (error) throw error;
}

export function subscribeToJar(jarId: string, onChange: () => void) {
  const channel = supabase
    .channel(`jar-${jarId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cycles', filter: `jar_id=eq.${jarId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'streaks', filter: `jar_id=eq.${jarId}` }, onChange)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'jars', filter: `id=eq.${jarId}` }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
