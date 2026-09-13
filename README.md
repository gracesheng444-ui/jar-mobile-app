# Shared Memory Jar

A small app for two people counting down to the day they see each other
again. Each person taps once a day; a star drops into a shared jar in their
own chosen color, so the jar visibly fills up as the wait gets shorter.

Built with Expo/React Native and Supabase.

![The jar mid-fill, with stars from both partners dropped in](docs/screenshot.png)

**[sharedmemoryjar.com](https://sharedmemoryjar.com)** — the web build is
live. No account needed: hit **"Try a live demo"** on the sign-in screen for
a fully working jar, pre-loaded with a week of history, that's yours alone
to poke around in (see [`demo_guide.md`](demo_guide.md) for a full
walkthrough). An Android build is on its way.

Curious about the product thinking behind it, not just the code? See
[`app_overview.md`](app_overview.md) for the intent and the mechanics in
plain language, and its Future Directions section for what's next.

## Features

- **Countdown jar** — pick the date you're meeting up; the jar's capacity
  and star size are computed once from that date, so it fills at a steady,
  satisfying pace no matter how far out it is.
- **Two-person, multi-jar** — an account can be in several jars at once (one
  per relationship, or however you want to use it); each jar tracks both
  people's taps, streaks, and a shared invite code to pair up with.
- **Streaks with grace and repair** — miss a day and there's a grace window
  to catch up before the streak resets, plus a limited monthly repair quota
  if you genuinely missed it.
- **Real accounts** — email + password sign-up/sign-in, forgot-password
  flow, change password, and self-service account deletion. No passwords or
  tokens ever touch anything but Supabase Auth.
- **Profile pictures** — upload a photo or fall back to a color+initial
  avatar, synced via Supabase Storage.
- **Bilingual** — English and Chinese, detected from the device by default
  and synced to your account across devices.
- **Realtime** — both partners' devices update live via Supabase Realtime
  when either one taps.

## Stack

- [Expo](https://expo.dev) / React Native — web + Android today (iOS is a
  standard Expo `eas build --platform ios` away, just not built yet)
- [Supabase](https://supabase.com) — Postgres, Row Level Security,
  security-definer RPCs for the few operations RLS alone can't express,
  Auth, Storage, Realtime
- [`jar-core-logic`](../jar-core-logic) — a sibling, stack-agnostic package
  with the pure domain logic (cycle timing, streak/repair rules, star
  sizing math), vendored in as a local tarball dependency
- Hand-rolled i18n (no library) and hand-drawn SVG illustrations
  (`react-native-svg`) instead of an icon/asset library

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npx expo start --web   # or --android / --ios
```

Then, in your Supabase project's SQL Editor, run `supabase/schema.sql` once
to set up the database (tables, RLS policies, RPCs, and the `avatars`
storage bucket).

Type-check with:

```bash
npx tsc --noEmit
```

## Deploying

**Web** (static export via Vercel):

```bash
npx expo export -p web
npx vercel dist --prod
```

**Android** (internal APK via EAS, no Play Store needed):

```bash
npx eas-cli build --platform android --profile preview
```

Both are manual — there's no CI pipeline wired up yet.

## Project structure

```
App.tsx                    top-level layout, tab bar, jar view
src/useOnlineJarApp.ts     the app's state — auth, jars, all mutations
src/supabase/              all Supabase access (api, client, row types)
src/i18n.tsx               every user-facing string, English + Chinese
src/components/            screens and shared UI pieces
supabase/schema.sql        full database schema (idempotent to re-run)
```

## Status

Actively evolving — this is a personal project, not a published product.
Auth, onboarding, jar creation/joining, tapping, streaks, and settings are
all working end-to-end on web and Android. Push notifications aren't built
yet. See `HANDOFF.md` for the fuller list of known trade-offs and what's
still tentative.

## License

[MIT](LICENSE)
