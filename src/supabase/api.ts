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

/** Creates a new account with a password. If the project requires email confirmation, no session is returned yet. */
export async function signUpWithPassword(email: string, password: string): Promise<{ userId: string | null; needsEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return { userId: data.session ? data.user!.id : null, needsEmailConfirmation: !data.session };
}

/** Confirms a new account using the numeric code from the signup email (an alternative to clicking the link in it). */
export async function confirmSignUp(email: string, code: string): Promise<string> {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'signup' });
  if (error) throw error;
  return data.user!.id;
}

/** Signs in an existing account with its password. */
export async function signInWithPassword(email: string, password: string): Promise<string> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  return data.user!.id;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Emails a password-reset link. On web, clicking it lands back on this app already signed into a recovery session. */
export async function sendPasswordReset(email: string): Promise<void> {
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), redirectTo ? { redirectTo } : undefined);
  if (error) throw error;
}

/** Sets a new password for the current (recovery) session. */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

/** Changes the signed-in account's password, first re-verifying the current one (Supabase's updateUser alone doesn't require it). */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const email = data.user?.email;
  if (!email) throw new Error('No email on this account.');
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) throw new Error('Current password is incorrect.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Permanently deletes the signed-in account and everything under it — see delete_own_account() in schema.sql. */
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
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
  /** The other member's profile picture — a photo if they've uploaded one, otherwise render partnerAvatarColor as an initial-letter circle. Null until they've joined. */
  partnerAvatarUrl: string | null;
  partnerAvatarColor: string | null;
  currentStreak: number;
  /** Each side's chosen star color, and whether they've tapped in the jar's most recent cycle — for the small bright/dim indicator dots in the jar list. Partner fields are null until they've joined; tapped is false for a jar that hasn't started yet (no cycle exists). */
  selfStarColor: string;
  partnerStarColor: string | null;
  selfTapped: boolean;
  partnerTapped: boolean;
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
  const avatarByUserId = new Map<string, { url: string | null; color: string }>();
  if (partnerIds.length > 0) {
    const { data: profileRows, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, avatar_url, avatar_color')
      .in('id', partnerIds)
      .returns<Pick<UserProfileRow, 'id' | 'email' | 'display_name' | 'avatar_url' | 'avatar_color'>[]>();
    if (profileErr) throw profileErr;
    for (const p of profileRows ?? []) {
      if (p.email) emailByUserId.set(p.id, p.email);
      // The DB default is the literal string 'Partner' for anyone who's never set a real
      // name — treat that as "not customized" rather than showing it as if it were one.
      if (p.display_name && p.display_name !== 'Partner') displayNameByUserId.set(p.id, p.display_name);
      avatarByUserId.set(p.id, { url: p.avatar_url, color: p.avatar_color });
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

  // Only started jars have any cycle rows at all — a jar still waiting for a
  // partner has none. Fetches every cycle for those jars (not just the
  // latest) since Supabase's client can't express "latest row per group" —
  // fine at this app's scale, reduced to the highest cycle_index per jar below.
  const startedJarIds = jars.filter((j) => j.user_b_id !== null).map((j) => j.id);
  const latestCycleByJarId = new Map<string, { userATapped: boolean; userBTapped: boolean }>();
  if (startedJarIds.length > 0) {
    const { data: cycleRows, error: cycleErr } = await supabase
      .from('cycles')
      .select('jar_id, cycle_index, user_a_tapped, user_b_tapped')
      .in('jar_id', startedJarIds)
      .returns<Pick<CycleRow, 'jar_id' | 'cycle_index' | 'user_a_tapped' | 'user_b_tapped'>[]>();
    if (cycleErr) throw cycleErr;
    const highestIndexByJarId = new Map<string, number>();
    for (const c of cycleRows ?? []) {
      const highest = highestIndexByJarId.get(c.jar_id);
      if (highest === undefined || c.cycle_index > highest) {
        highestIndexByJarId.set(c.jar_id, c.cycle_index);
        latestCycleByJarId.set(c.jar_id, { userATapped: c.user_a_tapped, userBTapped: c.user_b_tapped });
      }
    }
  }

  return jars.map((j) => {
    const role: 'A' | 'B' = j.user_a_id === userId ? 'A' : 'B';
    const partnerId = role === 'A' ? j.user_b_id : j.user_a_id;
    const latestCycle = latestCycleByJarId.get(j.id);
    return {
      jarId: j.id,
      role,
      inviteCode: j.invite_code,
      hasStarted: j.user_b_id !== null,
      targetDateUTC: j.target_date_utc ? new Date(j.target_date_utc) : undefined,
      partnerDisplayName: partnerId ? (displayNameByUserId.get(partnerId) ?? null) : null,
      partnerEmail: partnerId ? (emailByUserId.get(partnerId) ?? null) : null,
      partnerAvatarUrl: partnerId ? (avatarByUserId.get(partnerId)?.url ?? null) : null,
      partnerAvatarColor: partnerId ? (avatarByUserId.get(partnerId)?.color ?? null) : null,
      currentStreak: streakByJarId.get(j.id) ?? 0,
      selfStarColor: role === 'A' ? j.user_a_star_color : (j.user_b_star_color ?? defaultStarColorFor(userId)),
      partnerStarColor: partnerId ? (role === 'A' ? j.user_b_star_color : j.user_a_star_color) : null,
      selfTapped: latestCycle ? (role === 'A' ? latestCycle.userATapped : latestCycle.userBTapped) : false,
      partnerTapped: latestCycle ? (role === 'A' ? latestCycle.userBTapped : latestCycle.userATapped) : false,
    };
  });
}

/**
 * Returns the account's current profile fields, plus whether this call just
 * created the profile row (i.e. this is the account's very first sign-in —
 * the caller uses that to route to a one-time "set up your profile" step).
 * 'Partner' is the DB default for "never customized" display name.
 * `deviceLanguage` is only used to seed a brand-new profile (e.g. from the
 * device's locally detected preference); an existing profile's stored
 * language always wins, since that's what should follow the account across devices.
 */
export async function ensureUserProfile(
  userId: string,
  nowUTC: Date,
  deviceLanguage: string
): Promise<{ displayName: string; language: string; avatarUrl: string | null; avatarColor: string; isNewProfile: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;

  const { data } = await supabase
    .from('user_profiles')
    .select('id, email, display_name, language, avatar_url, avatar_color')
    .eq('id', userId)
    .maybeSingle<Pick<UserProfileRow, 'id' | 'email' | 'display_name' | 'language' | 'avatar_url' | 'avatar_color'>>();
  if (data) {
    // Backfill email for profiles created before that column existed — never overwrites a value that's already there.
    if (!data.email && email) {
      await supabase.from('user_profiles').update({ email }).eq('id', userId);
    }
    return { displayName: data.display_name, language: data.language, avatarUrl: data.avatar_url, avatarColor: data.avatar_color, isNewProfile: false };
  }

  const timeZone = deviceTimeZone();
  const avatarColor = defaultStarColorFor(userId);
  const { error } = await supabase.from('user_profiles').insert({
    id: userId,
    current_timezone: timeZone,
    repair_balance: MONTHLY_REPAIR_ALLOWANCE,
    last_refilled_yyyymm: getLocalYearMonth(nowUTC, timeZone),
    star_color: defaultStarColorFor(userId),
    email,
    language: deviceLanguage,
    avatar_color: avatarColor,
  });
  if (error) throw error;
  return { displayName: 'Partner', language: deviceLanguage, avatarUrl: null, avatarColor, isNewProfile: true };
}

export async function writeDisplayName(userId: string, name: string): Promise<void> {
  const { error } = await supabase.from('user_profiles').update({ display_name: name }).eq('id', userId);
  if (error) throw error;
}

export async function writeLanguage(userId: string, language: string): Promise<void> {
  const { error } = await supabase.from('user_profiles').update({ language }).eq('id', userId);
  if (error) throw error;
}

/**
 * Uploads a picked photo as this account's profile picture, overwriting any
 * previous one at the same path (one file per user, no accumulation — see
 * the "avatars" bucket policies in schema.sql). Returns the public URL to
 * store on the profile, with a cache-busting query param since the path
 * itself never changes across re-uploads.
 */
export async function uploadAvatarPhoto(userId: string, localUri: string, mimeType: string): Promise<string> {
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const arrayBuffer = await fetch(localUri).then((res) => res.arrayBuffer());
  const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, arrayBuffer, { contentType: mimeType, upsert: true });
  if (uploadErr) throw uploadErr;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;
  const { error: profileErr } = await supabase.from('user_profiles').update({ avatar_url: url }).eq('id', userId);
  if (profileErr) throw profileErr;
  return url;
}

/**
 * Creates a countdown-mode jar with no partner yet (cycle/streak rows, and
 * capacity/star size, are all set later — see joinJar). A jar can sit
 * waiting for a partner for any length of time, so computing capacity here
 * from "days until target as of right now" would silently go stale the
 * moment a real gap opens up between create and join.
 *
 * `starColor` is the creator's own star color for *this* jar specifically —
 * a jar-scoped choice, locked in here and never editable afterward, rather
 * than an account-wide setting (see schema.sql's comment on user_a_star_color).
 */
export async function createJar(userId: string, targetDateUTC: Date, starColor: string): Promise<{ jarId: string; inviteCode: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from('jars')
      .insert({
        invite_code: inviteCode,
        user_a_id: userId,
        mode: 'countdown',
        target_date_utc: targetDateUTC.toISOString(),
        user_a_star_color: starColor,
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

/**
 * Joins an existing jar by its invite code. Capacity is computed here (at
 * join time, matching the cycle countdown's actual start) rather than at
 * creation — see createJar's comment. The star-count-to-capacity formula is
 * one line and effectively fixed, so join_jar_by_code recomputes it
 * server-side as the authoritative value; the *size* formula is more
 * involved and has changed repeatedly, so re-implementing it in SQL would
 * just be a second copy to keep in sync — instead this fetches the target
 * date first, computes size with the same jar-core-logic/starColors
 * functions createJar used to use, and passes just that one number in.
 * `starColor` is the joiner's own star color for this jar — see createJar.
 */
export async function joinJar(inviteCode: string, starColor: string): Promise<string> {
  const code = inviteCode.trim().toUpperCase();

  const { data: targetDateRaw, error: dateErr } = await supabase.rpc('get_target_date_by_code', { code });
  if (dateErr) throw dateErr;
  const targetDateUTC = new Date(targetDateRaw as string);
  // Clamped to at least 1 day: if a jar sat unjoined long enough for its
  // target date to already be near or past, this keeps capacity/size
  // computable instead of throwing — the countdown is already moot at that
  // point, but joining shouldn't hard-fail over it.
  const remainingDaysAtJoin = Math.max(1, Math.ceil((targetDateUTC.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const starSizeFixed = starSizeForCapacity(computeCountdownCapacity(remainingDaysAtJoin));

  const { data, error } = await supabase.rpc('join_jar_by_code', { code, p_star_size_fixed: starSizeFixed, p_star_color: starColor });
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
    userAStarColor: jarRow.user_a_star_color,
    userBStarColor: jarRow.user_b_star_color ?? defaultStarColorFor(jarRow.user_b_id),
    userADisplayName: userARow.display_name,
    userBDisplayName: userBRow.display_name,
    userAAvatarUrl: userARow.avatar_url,
    userBAvatarUrl: userBRow.avatar_url,
    userAAvatarColor: userARow.avatar_color,
    userBAvatarColor: userBRow.avatar_color,
    cycle: rowToCycle(cycleRow),
    todayUserANote: cycleRow.user_a_note,
    todayUserBNote: cycleRow.user_b_note,
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

export type CycleWithNotes = CycleRecord & { userANote: string | null; userBNote: string | null };

/** Every cycle a jar has ever had, oldest first — for the calendar/history view. Unlike
 *  fetchJarAppState's cycle fetch (latest only), this is the full record, notes included. */
export async function fetchJarCycles(jarId: string): Promise<CycleWithNotes[]> {
  const { data, error } = await supabase.from('cycles').select('*').eq('jar_id', jarId).order('cycle_index', { ascending: true });
  if (error) throw error;
  return (data as CycleRow[]).map((row) => ({ ...rowToCycle(row), userANote: row.user_a_note, userBNote: row.user_b_note }));
}

export async function writeCycle(cycle: CycleRecord): Promise<void> {
  const { error } = await supabase.from('cycles').upsert(cycleToRow(cycle), { onConflict: 'jar_id,cycle_index' });
  if (error) throw error;
}

/** Sets (or clears, with an empty string) one side's note for one specific cycle — writable
 *  directly via the "update cycles of own jar" RLS policy, any day, not just today's. */
export async function writeMemoryNote(jarId: string, cycleIndex: number, role: 'A' | 'B', note: string): Promise<void> {
  const column = role === 'A' ? 'user_a_note' : 'user_b_note';
  const { error } = await supabase
    .from('cycles')
    .update({ [column]: note.trim().length > 0 ? note.trim() : null })
    .eq('jar_id', jarId)
    .eq('cycle_index', cycleIndex);
  if (error) throw error;
}

/** Changes a jar's meet-up date — see update_target_date() in schema.sql for why this needs to
 *  be an RPC (no RLS update policy on jars at all) and why capacity/star size are untouched. */
export async function updateTargetDate(jarId: string, newDate: Date): Promise<void> {
  const { error } = await supabase.rpc('update_target_date', { target_jar_id: jarId, new_target_date: newDate.toISOString() });
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

/** Keeps the "My Jars" list live (tap-status dots) while it's on screen — broader than
 *  subscribeToJar since Realtime's postgres_changes filter can only express a single equality
 *  condition, not "jar_id IN (my jars)". Fires on any cycle/streak change anywhere and lets the
 *  caller just refetch; fine at this app's scale (a couple of people, a handful of jars each). */
export function subscribeToMyJars(onChange: () => void) {
  const channel = supabase
    .channel('my-jars')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'cycles' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'streaks' }, onChange)
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
