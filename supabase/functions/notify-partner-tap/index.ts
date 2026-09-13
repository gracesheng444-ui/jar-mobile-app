// Sends the "Partner Activity" push notification (jar_des.md §6) — the one notification type
// that can't be scheduled in advance client-side, since it depends on the *other* device's
// action. Called by the tapping device itself, right after its tap is written, fire-and-forget:
// a failure here should never block or surface as an error on the tap that triggered it.
//
// Runs with the service-role key (auto-injected) so it can read the partner's expo_push_token
// regardless of RLS — a user's own profile row is only readable by themselves otherwise. Deploy
// with:
//   supabase functions deploy notify-partner-tap

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

// Duplicated from i18n.tsx's notifications.partnerActivity strings — this runs in a separate Deno
// module graph from the app's own TypeScript, so it can't import that directly. Keep both in sync
// if the wording changes.
const STRINGS = {
  en: {
    title: 'Your partner tapped in',
    body: (name: string) => `${name} just dropped their star for today.`,
    bodyFallback: 'Your partner just dropped their star for today.',
  },
  zh: {
    title: '对方刚刚打卡了',
    body: (name: string) => `${name} 刚刚投下了今天的星星。`,
    bodyFallback: '对方刚刚投下了今天的星星。',
  },
};

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

    const { jarId, tappedRole }: { jarId?: string; tappedRole?: 'A' | 'B' } = await req.json();
    if (!jarId || (tappedRole !== 'A' && tappedRole !== 'B')) {
      throw new Error('jarId and tappedRole ("A" | "B") are required');
    }

    const { data: jar, error: jarErr } = await admin.from('jars').select('user_a_id, user_b_id').eq('id', jarId).single();
    if (jarErr || !jar) throw jarErr ?? new Error('Jar not found');

    const tapperId = tappedRole === 'A' ? jar.user_a_id : jar.user_b_id;
    const partnerId = tappedRole === 'A' ? jar.user_b_id : jar.user_a_id;
    if (!partnerId) {
      // No partner has joined this jar yet — nothing to notify.
      return new Response(JSON.stringify({ ok: false, reason: 'no_partner' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profiles, error: profilesErr } = await admin
      .from('user_profiles')
      .select('id, display_name, language, expo_push_token')
      .in('id', [tapperId, partnerId]);
    if (profilesErr) throw profilesErr;

    const tapper = profiles?.find((p) => p.id === tapperId);
    const partner = profiles?.find((p) => p.id === partnerId);
    if (!partner?.expo_push_token) {
      // Partner hasn't granted notification permission (or hasn't opened the app since) — nothing
      // to push to. Not an error: this is the normal state for plenty of legitimate reasons.
      return new Response(JSON.stringify({ ok: false, reason: 'no_token' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const strings = partner.language === 'zh' ? STRINGS.zh : STRINGS.en;
    const tapperName = tapper?.display_name && tapper.display_name !== 'Partner' ? tapper.display_name : null;

    const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    const pushResponse = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
      },
      body: JSON.stringify({
        to: partner.expo_push_token,
        title: strings.title,
        body: tapperName ? strings.body(tapperName) : strings.bodyFallback,
        sound: 'default',
      }),
    });
    if (!pushResponse.ok) {
      throw new Error(`Expo push API responded ${pushResponse.status}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
