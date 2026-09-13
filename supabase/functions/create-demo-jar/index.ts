// Provisions a fresh, fully-private demo account pair on demand: two throwaway accounts, already
// paired across TWO jars — one ("normal") mid-streak with an ordinary open cycle to tap, and one
// ("grace") deliberately sitting in an unresolved miss so a visitor can try the repair mechanic —
// so a visitor who taps "Try a live demo" lands straight into a live, populated pair of jars
// nobody else can see or touch, instead of an empty new-jar state (this app fundamentally needs
// two paired people before anything is visible at all).
//
// Also handles resetting an existing demo account's jars back to that same starting state in
// place (pass `{ jarId }` — any one of the pair's jar ids — in the request body) — used by the
// in-app "Reset demo" button, so someone showing the demo repeatedly doesn't pile up a fresh
// throwaway account pair on every replay. Resets BOTH jars for that account pair, not just the
// one whose id was passed, since the two are shown side by side as tabs.
//
// Runs with the service-role key (SUPABASE_SERVICE_ROLE_KEY, injected automatically by the Edge
// Functions runtime — never present in the app bundle or committed anywhere) so it can create
// auth users and bypass RLS to seed jars/streaks/cycles directly. Deploy with:
//   supabase functions deploy create-demo-jar
//
// Public endpoint by design (a visitor invokes it before they have any account of their own) —
// see the caller for the trade-off that implies. The reset path is scoped defensively: it only
// ever touches jars whose both members are themselves @sharedmemoryjar.demo accounts, so it can
// never be pointed at a real user's jar.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CYCLE_LENGTH_MS = 24 * 60 * 60 * 1000;
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
const DEMO_TARGET_DAYS_OUT = 14;
// How long ago the grace jar's "current" cycle actually ended, so it's already sitting in an
// unresolved grace period (not a fresh open day) — see seedGraceJarHistory's cycle_index 6 below.
const GRACE_CYCLE_ENDED_MS_AGO = 60 * 60 * 1000;
// How long the normal jar's current (open) cycle has already been running — leaves a plausible
// chunk of the 24h window still ahead, rather than either a barely-started or nearly-closing one.
const NORMAL_CURRENT_CYCLE_ELAPSED_MS = 6 * 60 * 60 * 1000;
const DEMO_EMAIL_DOMAIN = '@sharedmemoryjar.demo';

// Mirrors jarGeometry.ts / starColors.ts's starSizeForCapacity — duplicated here since Edge
// Functions run in a separate Deno module graph from the app's own TypeScript. If the jar
// illustration's proportions ever change, update both.
const JAR_USABLE_WIDTH = 201.38181818181818;
const JAR_USABLE_HEIGHT = 190.45333333333332;
const PACKING_EFFICIENCY = 0.7;
const MIN_STAR_SIZE = 8;
const MAX_STAR_SIZE = 30;

function starSizeForCapacity(capacity: number): number {
  const areaPerStar = (JAR_USABLE_WIDTH * JAR_USABLE_HEIGHT * PACKING_EFFICIENCY) / capacity;
  const size = Math.sqrt(areaPerStar) / 1.4;
  return Math.min(MAX_STAR_SIZE, Math.max(MIN_STAR_SIZE, size));
}

function randomInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function randomPassword(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 20);
}

/** Countdown fields shared by both jar scenarios: capacity/size computed from a fixed 14-day-out
 *  target date, anchored to whatever creation time the scenario needs. */
async function writeJarCountdownFields(admin: SupabaseClient, jarId: string, jarCreatedAtUTC: Date, now: Date): Promise<void> {
  const targetDateUTC = new Date(now.getTime() + DEMO_TARGET_DAYS_OUT * CYCLE_LENGTH_MS);
  const remainingDaysAtJoin = Math.max(1, Math.ceil((targetDateUTC.getTime() - jarCreatedAtUTC.getTime()) / CYCLE_LENGTH_MS));
  const starCapacityN = 2 * remainingDaysAtJoin;
  const starSizeFixed = starSizeForCapacity(starCapacityN);

  const { error } = await admin
    .from('jars')
    .update({
      created_at_utc: jarCreatedAtUTC.toISOString(),
      target_date_utc: targetDateUTC.toISOString(),
      star_capacity_n: starCapacityN,
      star_size_fixed: starSizeFixed,
    })
    .eq('id', jarId);
  if (error) throw error;
}

/** The "repair" scenario: a 7-cycle history ending in a deliberately unresolved miss, so a
 *  visitor's very first thing to try is the app's signature repair-vs-tap mechanic. Unchanged
 *  from the original single-jar demo. */
async function seedGraceJarHistory(admin: SupabaseClient, jarId: string, selfId: string, partnerId: string, now: Date): Promise<void> {
  // cycle_index 6 (the "current" cycle) needs to have already ended, with its grace window still
  // open — see below — so it's pushed back 7 full cycles plus the ended-ago offset, not 6.
  const jarCreatedAtUTC = new Date(now.getTime() - 7 * CYCLE_LENGTH_MS - GRACE_CYCLE_ENDED_MS_AGO);
  await writeJarCountdownFields(admin, jarId, jarCreatedAtUTC, now);

  // A reset replaces the whole history — the old cycles' cycle_index values would otherwise
  // collide with the freshly re-anchored ones below.
  const { error: deleteCyclesErr } = await admin.from('cycles').delete().eq('jar_id', jarId);
  if (deleteCyclesErr) throw deleteCyclesErr;

  const cycleAt = (index: number) => {
    const start = new Date(jarCreatedAtUTC.getTime() + index * CYCLE_LENGTH_MS);
    return { start, end: new Date(start.getTime() + CYCLE_LENGTH_MS) };
  };

  const c0 = cycleAt(0);
  const c1 = cycleAt(1);
  const c2 = cycleAt(2);
  const c3 = cycleAt(3);
  const c4 = cycleAt(4);
  const c5 = cycleAt(5);
  const c6 = cycleAt(6);

  const { error: cyclesErr } = await admin.from('cycles').insert([
    {
      // A genuinely missed, never-repaired day — the plain "Missed" calendar state, distinct
      // from the repaired one below. Zeroes the streak, which is why the run below starts at 1.
      jar_id: jarId,
      cycle_index: 0,
      cycle_start_utc: c0.start.toISOString(),
      cycle_end_utc: c0.end.toISOString(),
      user_a_tapped: false,
      user_b_tapped: false,
      status: 'incomplete_expired',
      grace_expires_at_utc: new Date(c0.end.getTime() + GRACE_PERIOD_MS).toISOString(),
      repaired_by: [],
      streak_before_cycle: 0,
      user_a_note: null,
      user_b_note: null,
    },
    {
      jar_id: jarId,
      cycle_index: 1,
      cycle_start_utc: c1.start.toISOString(),
      cycle_end_utc: c1.end.toISOString(),
      user_a_tapped: true,
      user_b_tapped: true,
      status: 'complete',
      grace_expires_at_utc: null,
      repaired_by: [],
      streak_before_cycle: 0,
      user_a_note: 'So glad we started this jar',
      user_b_note: "Can't wait for our trip",
    },
    {
      jar_id: jarId,
      cycle_index: 2,
      cycle_start_utc: c2.start.toISOString(),
      cycle_end_utc: c2.end.toISOString(),
      user_a_tapped: true,
      user_b_tapped: true,
      status: 'complete',
      grace_expires_at_utc: null,
      repaired_by: [],
      streak_before_cycle: 1,
      user_a_note: null,
      user_b_note: 'Missed you extra today',
    },
    {
      jar_id: jarId,
      cycle_index: 3,
      cycle_start_utc: c3.start.toISOString(),
      cycle_end_utc: c3.end.toISOString(),
      user_a_tapped: false,
      user_b_tapped: true,
      status: 'repaired',
      grace_expires_at_utc: new Date(c3.end.getTime() + GRACE_PERIOD_MS).toISOString(),
      repaired_by: [selfId],
      streak_before_cycle: 2,
      user_a_note: null,
      user_b_note: null,
    },
    {
      jar_id: jarId,
      cycle_index: 4,
      cycle_start_utc: c4.start.toISOString(),
      cycle_end_utc: c4.end.toISOString(),
      user_a_tapped: true,
      user_b_tapped: true,
      status: 'complete',
      grace_expires_at_utc: null,
      repaired_by: [],
      streak_before_cycle: 2,
      user_a_note: 'Lunch break, thinking of you',
      user_b_note: 'Found our song on the radio',
    },
    {
      jar_id: jarId,
      cycle_index: 5,
      cycle_start_utc: c5.start.toISOString(),
      cycle_end_utc: c5.end.toISOString(),
      user_a_tapped: true,
      user_b_tapped: true,
      status: 'complete',
      grace_expires_at_utc: null,
      repaired_by: [],
      streak_before_cycle: 3,
      user_a_note: 'Almost forgot to tap today!',
      user_b_note: null,
    },
    {
      // The "current" cycle — deliberately seeded already missed, grace still open, rather than
      // a fresh empty day: lets a visitor try either repairing it (streak restores, then a fresh
      // day opens after) or tapping instead (forfeits the repair, streak stays at 0, a fresh day
      // opens after) — the app's most distinctive mechanic, front and center.
      jar_id: jarId,
      cycle_index: 6,
      cycle_start_utc: c6.start.toISOString(),
      cycle_end_utc: c6.end.toISOString(),
      user_a_tapped: false,
      user_b_tapped: false,
      status: 'incomplete_grace',
      grace_expires_at_utc: new Date(c6.end.getTime() + GRACE_PERIOD_MS).toISOString(),
      repaired_by: [],
      streak_before_cycle: 4,
      user_a_note: null,
      user_b_note: null,
    },
  ]);
  if (cyclesErr) throw cyclesErr;

  // current_streak is 0, not 4, even though the run of complete days above would suggest 4 — per
  // streak.ts's recomputeStreak, an unresolved incomplete_grace cycle zeroes the *visible* streak
  // the instant it happens, before anyone repairs it (repairing is what restores it back to
  // streakBeforeCycle). Seeding 4 here would show a number a real jar could never actually
  // display while sitting in this exact state.
  const { error: streakErr } = await admin
    .from('streaks')
    .upsert({ jar_id: jarId, current_streak: 0, longest_streak: 4, last_updated_cycle_index: 5, star_count_a: 4, star_count_b: 5 }, { onConflict: 'jar_id' });
  if (streakErr) throw streakErr;
}

/** The "normal" scenario: an ordinary mid-streak jar with nothing dramatic going on — a plain,
 *  satisfying "tap and watch the star drop" moment, with the partner's side already done for
 *  today so tapping visibly completes the cycle and grows the streak in front of the visitor. */
async function seedNormalJarHistory(admin: SupabaseClient, jarId: string, selfId: string, partnerId: string, now: Date): Promise<void> {
  // cycle_index 4 (the "current" cycle) needs to still be open, mid-way through its window — see
  // NORMAL_CURRENT_CYCLE_ELAPSED_MS above.
  const jarCreatedAtUTC = new Date(now.getTime() - 4 * CYCLE_LENGTH_MS - NORMAL_CURRENT_CYCLE_ELAPSED_MS);
  await writeJarCountdownFields(admin, jarId, jarCreatedAtUTC, now);

  const { error: deleteCyclesErr } = await admin.from('cycles').delete().eq('jar_id', jarId);
  if (deleteCyclesErr) throw deleteCyclesErr;

  const cycleAt = (index: number) => {
    const start = new Date(jarCreatedAtUTC.getTime() + index * CYCLE_LENGTH_MS);
    return { start, end: new Date(start.getTime() + CYCLE_LENGTH_MS) };
  };

  const c0 = cycleAt(0);
  const c1 = cycleAt(1);
  const c2 = cycleAt(2);
  const c3 = cycleAt(3);
  const c4 = cycleAt(4);

  const { error: cyclesErr } = await admin.from('cycles').insert([
    {
      jar_id: jarId,
      cycle_index: 0,
      cycle_start_utc: c0.start.toISOString(),
      cycle_end_utc: c0.end.toISOString(),
      user_a_tapped: true,
      user_b_tapped: true,
      status: 'complete',
      grace_expires_at_utc: null,
      repaired_by: [],
      streak_before_cycle: 0,
      user_a_note: 'Morning! Off to work',
      user_b_note: 'Have a good day, love you!',
    },
    {
      jar_id: jarId,
      cycle_index: 1,
      cycle_start_utc: c1.start.toISOString(),
      cycle_end_utc: c1.end.toISOString(),
      user_a_tapped: true,
      user_b_tapped: true,
      status: 'complete',
      grace_expires_at_utc: null,
      repaired_by: [],
      streak_before_cycle: 1,
      user_a_note: null,
      user_b_note: 'Thinking of you today',
    },
    {
      jar_id: jarId,
      cycle_index: 2,
      cycle_start_utc: c2.start.toISOString(),
      cycle_end_utc: c2.end.toISOString(),
      user_a_tapped: true,
      user_b_tapped: true,
      status: 'complete',
      grace_expires_at_utc: null,
      repaired_by: [],
      streak_before_cycle: 2,
      user_a_note: 'Missed you at lunch today',
      user_b_note: null,
    },
    {
      jar_id: jarId,
      cycle_index: 3,
      cycle_start_utc: c3.start.toISOString(),
      cycle_end_utc: c3.end.toISOString(),
      user_a_tapped: true,
      user_b_tapped: true,
      status: 'complete',
      grace_expires_at_utc: null,
      repaired_by: [],
      streak_before_cycle: 3,
      user_a_note: null,
      user_b_note: null,
    },
    {
      // The "current" cycle — still open, partner's side already tapped so the visitor has
      // something satisfying to complete: tapping finishes the cycle and grows the streak live.
      jar_id: jarId,
      cycle_index: 4,
      cycle_start_utc: c4.start.toISOString(),
      cycle_end_utc: c4.end.toISOString(),
      user_a_tapped: false,
      user_b_tapped: true,
      status: 'open',
      grace_expires_at_utc: null,
      repaired_by: [],
      streak_before_cycle: 4,
      user_a_note: null,
      user_b_note: "Can't wait to see you this weekend!",
    },
  ]);
  if (cyclesErr) throw cyclesErr;

  // current_streak is 4, not 5 — cycle_index 4 is still 'open' (unresolved), so recomputeStreak
  // hasn't folded it in yet; it only ever counts cycles that have actually closed.
  const { error: streakErr } = await admin
    .from('streaks')
    .upsert({ jar_id: jarId, current_streak: 4, longest_streak: 4, last_updated_cycle_index: 3, star_count_a: 4, star_count_b: 5 }, { onConflict: 'jar_id' });
  if (streakErr) throw streakErr;
}

/** Refills both accounts' repair quota and (for self) backdates last_repair_used_at_utc to match
 *  the grace jar's repaired cycle — account-level state shared by both jars, so this only needs
 *  doing once per pair, not once per jar. */
async function seedSharedProfileState(admin: SupabaseClient, selfId: string, partnerId: string, now: Date): Promise<void> {
  const currentYearMonth = now.toISOString().slice(0, 7);
  // current_timezone is included even though it never changes here: Postgres validates a
  // conflicting upsert row's NOT NULL columns while building the candidate INSERT tuple, before
  // it ever gets to the ON CONFLICT check — a column genuinely missing from the payload (as
  // opposed to just unchanged) fails that check even when the row already has a value.
  const { error } = await admin.from('user_profiles').upsert(
    [
      {
        id: selfId,
        current_timezone: 'UTC',
        repair_balance: 2,
        last_refilled_yyyymm: currentYearMonth,
        // Matches the grace jar's repaired cycle's end time, which self repairs — so "last used"
        // shows the same date the repaired cycle actually happened.
        last_repair_used_at_utc: new Date(now.getTime() - 3 * CYCLE_LENGTH_MS - GRACE_CYCLE_ENDED_MS_AGO).toISOString(),
      },
      { id: partnerId, current_timezone: 'UTC', repair_balance: 3, last_refilled_yyyymm: currentYearMonth, last_repair_used_at_utc: null },
    ],
    { onConflict: 'id' }
  );
  if (error) throw error;
}

// Edge Functions don't add CORS headers on their own — a browser calling this via
// supabase.functions.invoke() sends a preflight OPTIONS request first, which the platform's
// default response fails, so every response (including that preflight) needs these explicitly.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    let body: { jarId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body (or not JSON) — the plain "create a new demo" call sends none.
    }

    if (body.jarId) {
      // Reset path: only ever touch jars both of whose members are themselves demo accounts —
      // this is a public endpoint, so this check is what stops it from being pointed at a real
      // user's jar by id.
      const { data: jarRow, error: jarErr } = await admin.from('jars').select('id, user_a_id, user_b_id').eq('id', body.jarId).single();
      if (jarErr || !jarRow) throw jarErr ?? new Error('Demo jar not found');

      const { data: profiles, error: profilesErr } = await admin
        .from('user_profiles')
        .select('id, email')
        .in('id', [jarRow.user_a_id, jarRow.user_b_id]);
      if (profilesErr) throw profilesErr;
      const bothAreDemoAccounts = profiles?.length === 2 && profiles.every((p) => p.email?.endsWith(DEMO_EMAIL_DOMAIN));
      if (!bothAreDemoAccounts) throw new Error('This jar is not a demo jar and cannot be reset.');

      const now = new Date();
      await seedSharedProfileState(admin, jarRow.user_a_id, jarRow.user_b_id, now);

      // Reset every jar this pair has, not just the one whose id was passed — the two scenarios
      // are shown side by side as tabs, so "Reset demo" from either one resets both.
      const { data: pairJars, error: pairJarsErr } = await admin
        .from('jars')
        .select('id, demo_scenario')
        .eq('user_a_id', jarRow.user_a_id)
        .eq('user_b_id', jarRow.user_b_id);
      if (pairJarsErr) throw pairJarsErr;

      for (const pairJar of pairJars ?? []) {
        if (pairJar.demo_scenario === 'grace') {
          await seedGraceJarHistory(admin, pairJar.id, jarRow.user_a_id, jarRow.user_b_id, now);
        } else if (pairJar.demo_scenario === 'normal') {
          await seedNormalJarHistory(admin, pairJar.id, jarRow.user_a_id, jarRow.user_b_id, now);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create path: a brand-new throwaway pair, paired across both scenario jars.
    const demoId = crypto.randomUUID().slice(0, 8);
    const selfEmail = `demo-${demoId}-a${DEMO_EMAIL_DOMAIN}`;
    const partnerEmail = `demo-${demoId}-b${DEMO_EMAIL_DOMAIN}`;
    const selfPassword = randomPassword();

    const { data: selfUser, error: selfErr } = await admin.auth.admin.createUser({
      email: selfEmail,
      password: selfPassword,
      email_confirm: true,
    });
    if (selfErr || !selfUser.user) throw selfErr ?? new Error('Failed to create self demo account');

    const { data: partnerUser, error: partnerErr } = await admin.auth.admin.createUser({
      email: partnerEmail,
      password: randomPassword(),
      email_confirm: true,
    });
    if (partnerErr || !partnerUser.user) throw partnerErr ?? new Error('Failed to create partner demo account');

    const selfId = selfUser.user.id;
    const partnerId = partnerUser.user.id;

    const { error: profileErr } = await admin.from('user_profiles').insert([
      { id: selfId, display_name: 'You', current_timezone: 'UTC', email: selfEmail, star_color: '#FFC94A', avatar_color: '#FFC94A' },
      { id: partnerId, display_name: 'Alex', current_timezone: 'UTC', email: partnerEmail, star_color: '#5B8DEF', avatar_color: '#5B8DEF' },
    ]);
    if (profileErr) throw profileErr;

    const now = new Date();
    await seedSharedProfileState(admin, selfId, partnerId, now);

    const { data: normalJarRow, error: normalJarErr } = await admin
      .from('jars')
      .insert({
        invite_code: randomInviteCode(),
        user_a_id: selfId,
        user_b_id: partnerId,
        mode: 'countdown',
        user_a_star_color: '#FFC94A',
        user_b_star_color: '#5B8DEF',
        demo_scenario: 'normal',
      })
      .select('id')
      .single();
    if (normalJarErr || !normalJarRow) throw normalJarErr ?? new Error('Failed to create demo jar');
    await seedNormalJarHistory(admin, normalJarRow.id, selfId, partnerId, now);

    const { data: graceJarRow, error: graceJarErr } = await admin
      .from('jars')
      .insert({
        invite_code: randomInviteCode(),
        user_a_id: selfId,
        user_b_id: partnerId,
        mode: 'countdown',
        user_a_star_color: '#FFC94A',
        user_b_star_color: '#5B8DEF',
        demo_scenario: 'grace',
      })
      .select('id')
      .single();
    if (graceJarErr || !graceJarRow) throw graceJarErr ?? new Error('Failed to create demo jar');
    await seedGraceJarHistory(admin, graceJarRow.id, selfId, partnerId, now);

    return new Response(JSON.stringify({ email: selfEmail, password: selfPassword }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Supabase client errors (auth admin API, postgrest) are plain objects with a `.message`,
    // not real Error instances — String(e) on those collapses to the useless "[object Object]".
    const message = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
