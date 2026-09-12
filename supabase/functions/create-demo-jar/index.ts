// Provisions a fresh, fully-private demo jar on demand: two throwaway accounts, already paired,
// with a realistic multi-day history seeded in — so a visitor who taps "Try a live demo" lands
// straight in a live, populated jar nobody else can see or touch, instead of an empty new-jar
// state (this app fundamentally needs two paired people before anything is visible at all).
//
// Runs with the service-role key (SUPABASE_SERVICE_ROLE_KEY, injected automatically by the Edge
// Functions runtime — never present in the app bundle or committed anywhere) so it can create
// auth users and bypass RLS to seed jars/streaks/cycles directly. Deploy with:
//   supabase functions deploy create-demo-jar
//
// Public endpoint by design (a visitor invokes it before they have any account of their own) —
// see the caller for the trade-off that implies.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CYCLE_LENGTH_MS = 24 * 60 * 60 * 1000;
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;
const DEMO_TARGET_DAYS_OUT = 14;
// How long ago the "current" cycle's 24h window actually ended, so it's already sitting in an
// unresolved grace period (not a fresh open day) — see the cycle_index 6 seed below.
const MISSED_CYCLE_ENDED_MS_AGO = 60 * 60 * 1000;

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

    const demoId = crypto.randomUUID().slice(0, 8);
    const selfEmail = `demo-${demoId}-a@sharedmemoryjar.demo`;
    const partnerEmail = `demo-${demoId}-b@sharedmemoryjar.demo`;
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

    const now = new Date();
    // Both accounts are UTC, so YYYY-MM in UTC is exactly what getLocalYearMonth would compute —
    // setting it up front avoids refillIfDue silently resetting the "already spent one repair"
    // story back to a full balance the moment either account's very first progressState runs.
    const currentYearMonth = now.toISOString().slice(0, 7);

    const { error: profileErr } = await admin.from('user_profiles').insert([
      {
        id: selfId,
        display_name: 'You',
        current_timezone: 'UTC',
        email: selfEmail,
        star_color: '#FFC94A',
        avatar_color: '#FFC94A',
        repair_balance: 2,
        last_refilled_yyyymm: currentYearMonth,
      },
      {
        id: partnerId,
        display_name: 'Alex',
        current_timezone: 'UTC',
        email: partnerEmail,
        star_color: '#5B8DEF',
        avatar_color: '#5B8DEF',
        // A bulk insert needs every row to share the same key set — PostgREST sends an explicit
        // NULL (not the column default) for a key missing from one row but present on another.
        repair_balance: 3,
        last_refilled_yyyymm: currentYearMonth,
      },
    ]);
    if (profileErr) throw profileErr;

    // cycle_index 6 (the "current" cycle) needs to have already ended, with its grace window
    // still open — see below — so it's pushed back 7 full cycles plus the ended-ago offset,
    // rather than the usual 6.
    const jarCreatedAtUTC = new Date(now.getTime() - 7 * CYCLE_LENGTH_MS - MISSED_CYCLE_ENDED_MS_AGO);
    const targetDateUTC = new Date(now.getTime() + DEMO_TARGET_DAYS_OUT * CYCLE_LENGTH_MS);
    const remainingDaysAtJoin = Math.max(1, Math.ceil((targetDateUTC.getTime() - jarCreatedAtUTC.getTime()) / CYCLE_LENGTH_MS));
    const starCapacityN = 2 * remainingDaysAtJoin;
    const starSizeFixed = starSizeForCapacity(starCapacityN);

    const { data: jarRow, error: jarErr } = await admin
      .from('jars')
      .insert({
        invite_code: randomInviteCode(),
        user_a_id: selfId,
        user_b_id: partnerId,
        created_at_utc: jarCreatedAtUTC.toISOString(),
        mode: 'countdown',
        target_date_utc: targetDateUTC.toISOString(),
        star_capacity_n: starCapacityN,
        star_size_fixed: starSizeFixed,
        user_a_star_color: '#FFC94A',
        user_b_star_color: '#5B8DEF',
      })
      .select('id')
      .single();
    if (jarErr || !jarRow) throw jarErr ?? new Error('Failed to create demo jar');
    const jarId = jarRow.id as string;

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
        // The "current" cycle — deliberately seeded already missed, grace still open, rather
        // than a fresh empty day: lets a visitor try either repairing it (streak restores, then
        // a fresh day opens after) or tapping instead (forfeits the repair, streak stays at 0,
        // a fresh day opens after) — the app's most distinctive mechanic, front and center.
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

    // Unlike join_jar_by_code, inserting the jars row directly here doesn't also create a
    // streaks row — that only ever happens inside that RPC — so this is an insert, not an update.
    //
    // current_streak is 0, not 4, even though the run of complete days above would suggest 4 —
    // per streak.ts's recomputeStreak, an unresolved incomplete_grace cycle zeroes the *visible*
    // streak the instant it happens, before anyone repairs it (repairing is what restores it back
    // to streakBeforeCycle). Seeding 4 here would show a number a real jar could never actually
    // display while sitting in this exact state.
    const { error: streakErr } = await admin
      .from('streaks')
      .insert({ jar_id: jarId, current_streak: 0, longest_streak: 4, last_updated_cycle_index: 5, star_count_a: 4, star_count_b: 5 });
    if (streakErr) throw streakErr;

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
