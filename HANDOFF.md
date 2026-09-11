# Handoff: Shared Memory Jar

Paste this whole file into a new Claude Code chat (rooted at
`/Users/maomaozhu/Desktop/jar/jar-mobile-app`) to pick up where the last
session left off. It covers what exists, what's genuinely done vs. a
placeholder, and the specific design calls worth revisiting.

## What this is

A two-person long-distance countdown app. Two partners each tap once a day;
a star drops into a shared jar in the tapper's own chosen color. Built with
Expo/React Native (web + Android so far) and Supabase (Postgres + RLS +
security-definer RPCs, Auth, Storage, Realtime).

- App: `/Users/maomaozhu/Desktop/jar/jar-mobile-app` (this repo)
- Core logic: `/Users/maomaozhu/Desktop/jar/jar-core-logic` — a separate,
  pure-logic npm package (cycle timing, streaks, repair quota, star sizing).
  Vendored into this app as a packed tarball, **not** a live link — see
  "Known rough edges" below.

## Live deployments

- Web: https://shared-memory-jar.vercel.app (Vercel; redeploy with
  `npx expo export -p web && npx vercel dist --prod --yes --name shared-memory-jar`)
- Android: internal EAS build (APK, no Play Store) — rebuild with
  `npx eas-cli build --platform android --profile preview --non-interactive`,
  distributed via the link EAS prints, not a static URL
- Supabase project ref: `ixqaliphymegainsfetd`
- Neither repo is pushed to GitHub yet (no git remote configured in either).

## What's built and working

- **Auth**: email + password (sign up, sign in, forgot/reset password via
  emailed link *or* a manually-typed confirmation code, change password,
  self-service account deletion). Originally email-OTP; migrated away from
  that this session because typing a code on every sign-in was the
  complaint.
- **Onboarding**: sign up → set a display name + profile picture (photo
  upload to Supabase Storage, or skip for a default color+initial avatar) →
  land on the jar list / create-or-join screen.
- **Jars**: create (pick a meet-up date + your star color for *this* jar) or
  join via a 6-character invite code (same color picker). An account can
  belong to several jars; "My jars" lists them all, each row showing
  "Jar with {partner}", days-till-meetup, and two dots (bright if that
  person tapped this cycle, dim if not).
- **Jar view**: countdown-mode star jar (fixed capacity/size computed once
  at creation), tap-to-drop-a-star, grace-period repair, streak tracking.
  Bottom tab bar (Jars / Start-Join / Settings) hides while a jar is open,
  replaced by a single back arrow.
- **Settings**: sectioned drill-down (not one long page) — profile picture,
  name, language (en/zh, device-detected default, synced via profile row),
  change password, delete account. Each section is its own back-arrow page.
- **i18n**: hand-rolled (no library), `src/i18n.tsx`, English + Chinese,
  covers every screen including the tab bar.

## Known rough edges / tentative designs worth revisiting

These all work today but were explicit trade-offs, not the "right" answer —
worth a second pass:

1. **jar-core-logic is a frozen vendored tarball**
   (`vendor/jar-core-logic-0.1.0.tgz`), not a live workspace link. If you
   change anything in the `jar-core-logic` repo, you must manually
   `npm pack` it there and copy the new tarball in, then bump the version in
   `package.json`. Nothing will warn you if these drift apart. A proper fix
   would be an npm/yarn workspace or at least a build script that re-packs
   automatically.

2. **jar-core-logic's `src/avatar.ts` (an 11-trait avatar-building system)
   is fully unused.** It was built before this app existed, then explicitly
   *not* used — the app went with "pick a photo or get a default
   color+initial" instead, which is simpler and was what the user actually
   wanted. It was deliberately left in place rather than deleted, since
   removing another package's code on an aside felt presumptuous. Either
   commit to deleting it, or actually use it — right now it's dead weight.

3. **Per-jar star color is immutable "by omission", not by constraint.**
   `jars.user_a_star_color` / `user_b_star_color` are set once (at
   create/join) and there is deliberately no RLS `UPDATE` policy on `jars`
   for regular clients — only two security-definer RPCs can write to the
   table, and neither exposes a color-change path. This *works*, but a
   reader has to know that absence-of-a-policy is the enforcement mechanism;
   an explicit trigger or check would be more legible.

4. **"Which cycle is current, per jar" is computed client-side.** Supabase's
   client can't express "top-1 row per group" directly, so
   `fetchMyJars` (`src/supabase/api.ts`) fetches *all* cycle rows for every
   started jar and reduces to the highest `cycle_index` per jar in
   JavaScript. Fine at the scale of "two people, a handful of jars", but
   would need a real query (a Postgres view, or `DISTINCT ON`) if jar counts
   or cycle history ever grow.

5. **No migration path for the original OTP-only test accounts.** They have
   no password set, so they can't sign in under the new email+password flow
   at all. Nobody built a "claim your old account" flow — the assumption
   was these are throwaway test accounts (delete and re-signup), which is
   fine for testing but would be a real gap for actual users mid-migration.

6. **Notification pipeline: not started, and genuinely undecided.** The
   user was asked to choose between (a) local-only scheduled reminders (no
   server changes, can't notify about the *partner's* actions) and (b) real
   cross-device push (needs push-token storage + a Supabase Edge Function
   triggered on jar/cycle changes) — and dismissed the question without
   answering. Don't assume an answer; ask again before building anything
   here.

7. **Deploys are manual, not CI.** Web: `expo export -p web` +
   `vercel dist --prod`. Android: `eas build`. Nothing runs on push (there's
   no push yet — no GitHub remote). If a repo gets pushed to GitHub, decide
   whether to wire up an actual pipeline or keep doing this by hand.

8. **Supabase Auth redirect URLs** were only added for
   `https://shared-memory-jar.vercel.app` this session. If the Vercel URL
   ever changes (a different project name, a custom domain), confirmation
   and password-reset email links will silently stop landing back in the
   app until someone updates Authentication → URL Configuration to match.

## Where things live

- `App.tsx` — top-level layout/state wiring, tab bar, jar view
- `src/useOnlineJarApp.ts` — the one big hook owning all online app state
  (auth, membership, jar data, all the mutation callbacks)
- `src/supabase/api.ts` / `client.ts` / `rows.ts` — all Supabase access
- `src/i18n.tsx` — all user-facing strings, en + zh
- `src/components/` — screens and pure UI pieces
- `supabase/schema.sql` — the full schema, cumulative; also has idempotent
  `alter table ... if not exists` migration statements appended at the
  bottom for re-running against an existing DB
- `supabase/migration_2026-09-08*.sql` — the individual migrations run this
  session, in order (a/b/c/d) — schema.sql is the merged result of all of
  them, these are kept for the run history

## Before you touch anything

Run `npx tsc --noEmit` after any change — that's the only automated check
in this repo (no test suite for the app itself; jar-core-logic has its own).
For UI changes, there's no way to see the running app without a preview
tool (Claude's Browser pane, or the user's own device) — don't claim
something works without actually clicking through it.
