import { computeCountdownCapacity, CycleRecord, getLocalYearMonth, MONTHLY_REPAIR_ALLOWANCE, StreakState, UserProfile } from 'jar-core-logic';
import { JarAppState } from '../appState';
import { defaultStarColorFor, starSizeForCapacity } from '../starColors';
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

export interface JarSummary {
  jarId: string;
  role: 'A' | 'B';
  inviteCode: string;
  hasStarted: boolean;
  targetDateUTC: Date | undefined;
  /** The other member's chosen display name, if they've set one. */
  partnerDisplayName: string | null;
  /** The other member's email, for telling jars apart in a list. Null until they've joined, or until they've signed in at least once since the email column was added. */
  partnerEmail: string | null;
  currentStreak: number;
}

/** Every jar this account belongs to (as either partner) — an account can be in several at once.
 *  Makes jar membership recoverable on a new device too, instead of living only in local storage. */
export async function fetchMyJars(userId: string): Promise<JarSummary[]> {
  const { data: jarRows, error } = await supabase
    .from('jars')
    .select('*')
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order('created_at_utc', { ascending: false })
    .returns<JarRow[]>();
  if (error) throw error;
  const jars = jarRows ?? [];

  const partnerIds = jars
    .map((j) => (j.user_a_id === userId ? j.user_b_id : j.user_a_id))
    .filter((id): id is string => id !== null);

  const emailByUserId = new Map<string, string>();
  const displayNameByUserId = new Map<string, string>();
  if (partnerIds.length > 0) {
    const { data: profileRows, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id, email, display_name')
      .in('id', partnerIds)
      .returns<Pick<UserProfileRow, 'id' | 'email' | 'display_name'>[]>();
    if (profileErr) throw profileErr;
    for (const p of profileRows ?? []) {
      if (p.email) emailByUserId.set(p.id, p.email);
      // The DB default is the literal string 'Partner' for anyone who's never set a real
      // name — treat that as "not customized" rather than showing it as if it were one.
      if (p.display_name && p.display_name !== 'Partner') displayNameByUserId.set(p.id, p.display_name);
    }
  }

  const jarIds = jars.map((j) => j.id);
  const streakByJarId = new Map<string, number>();
  if (jarIds.length > 0) {
    const { data: streakRows, error: streakErr } = await supabase
      .from('streaks')
      .select('jar_id, current_streak')
      .in('jar_id', jarIds)
      .returns<Pick<StreakRow, 'jar_id' | 'current_streak'>[]>();
    if (streakErr) throw streakErr;
    for (const s of streakRows ?? []) {
      streakByJarId.set(s.jar_id, s.current_streak);
    }
  }

  return jars.map((j) => {
    const role: 'A' | 'B' = j.user_a_id === userId ? 'A' : 'B';
    const partnerId = role === 'A' ? j.user_b_id : j.user_a_id;
    return {
      jarId: j.id,
      role,
      inviteCode: j.invite_code,
      hasStarted: j.user_b_id !== null,
      targetDateUTC: j.target_date_utc ? new Date(j.target_date_utc) : undefined,
      partnerDisplayName: partnerId ? (displayNameByUserId.get(partnerId) ?? null) : null,
      partnerEmail: partnerId ? (emailByUserId.get(partnerId) ?? null) : null,
      currentStreak: streakByJarId.get(j.id) ?? 0,
    };
  });
}

/** Returns the account's current display name — 'Partner' is the DB default for "never customized". */
export async function ensureUserProfile(userId: string, nowUTC: Date): Promise<{ displayName: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;

  const { data } = await supabase
    .from('user_profiles')
    .select('id, email, display_name')
    .eq('id', userId)
    .maybeSingle<Pick<UserProfileRow, 'id' | 'email' | 'display_name'>>();
  if (data) {
    // Backfill email for profiles created before that column existed — never overwrites a value that's already there.
    if (!data.email && email) {
      await supabase.from('user_profiles').update({ email }).eq('id', userId);
    }
    return { displayName: data.display_name };
  }

  const timeZone = deviceTimeZone();
  const { error } = await supabase.from('user_profiles').insert({
    id: userId,
    current_timezone: timeZone,
    repair_balance: MONTHLY_REPAIR_ALLOWANCE,
    last_refilled_yyyymm: getLocalYearMonth(nowUTC, timeZone),
    star_color: defaultStarColorFor(userId),
    email,
  });
  if (error) throw error;
  return { displayName: 'Partner' };
}

export async function writeDisplayName(userId: string, name: string): Promise<void> {
  const { error } = await supabase.from('user_profiles').update({ display_name: name }).eq('id', userId);
  if (error) throw error;
}

/**
 * Creates a countdown-mode jar with no partner yet (cycle/streak rows are
 * created later, when a partner joins). Capacity and star size are fixed
 * right here, from the target date, and never recalculated — per the
 * countdown design in jar-core-logic's starSizing.ts.
 */
export async function createJar(userId: string, targetDateUTC: Date): Promise<{ jarId: string; inviteCode: string }> {
  const remainingDaysAtCreation = Math.ceil((targetDateUTC.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const starCapacityN = computeCountdownCapacity(remainingDaysAtCreation);

  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from('jars')
      .insert({
        invite_code: inviteCode,
        user_a_id: userId,
        mode: 'countdown',
        target_date_utc: targetDateUTC.toISOString(),
        star_capacity_n: starCapacityN,
        star_size_fixed: starSizeForCapacity(starCapacityN),
      })
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

/** Detaches this account from one specific jar, deleting it for both members — see leave_jar() in schema.sql. */
export async function leaveJar(jarId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_jar', { target_jar_id: jarId });
  if (error) throw error;
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
      targetDateUTC: jarRow.target_date_utc ? new Date(jarRow.target_date_utc) : undefined,
      starCapacityN: jarRow.star_capacity_n ?? undefined,
      starSizeFixed: jarRow.star_size_fixed ?? undefined,
    },
    userA: rowToProfile(userARow),
    userB: rowToProfile(userBRow),
    userAStarColor: userARow.star_color,
    userBStarColor: userBRow.star_color,
    userADisplayName: userARow.display_name,
    userBDisplayName: userBRow.display_name,
    cycle: rowToCycle(cycleRow),
    streak: {
      jarId,
      currentStreak: streakRow.current_streak,
      longestStreak: streakRow.longest_streak,
      lastUpdatedCycleIndex: streakRow.last_updated_cycle_index,
    },
    starCountA: streakRow.star_count_a,
    starCountB: streakRow.star_count_b,
    devClockOffsetMs: 0,
  };
}

export async function writeCycle(cycle: CycleRecord): Promise<void> {
  const { error } = await supabase.from('cycles').upsert(cycleToRow(cycle), { onConflict: 'jar_id,cycle_index' });
  if (error) throw error;
}

export async function writeStreak(jarId: string, streak: StreakState, starCountA: number, starCountB: number): Promise<void> {
  const { error } = await supabase
    .from('streaks')
    .update({
      current_streak: streak.currentStreak,
      longest_streak: streak.longestStreak,
      last_updated_cycle_index: streak.lastUpdatedCycleIndex,
      star_count_a: starCountA,
      star_count_b: starCountB,
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

export async function writeStarColor(userId: string, color: string): Promise<void> {
  const { error } = await supabase.from('user_profiles').update({ star_color: color }).eq('id', userId);
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
