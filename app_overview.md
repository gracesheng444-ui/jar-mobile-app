# Shared Memory Jar — App Overview

## Why This App Exists

This app is designed for people who are long-distance from their loved ones — romantic partners, friends, and family alike.

Being long-distance makes it easy to feel lonely: when you're in separate places, there aren't many chances to actually do something together. This app creates that feeling anyway — a small daily ritual you're both keeping alive, a sense of protecting something together, and something to look forward to as you count down to the day you actually meet again.

## How It Works

### Sign-in and sign-up

Users sign in with their email and password. 

New users sign up with their email and set a password, then receive a confirmation email. After entering the confirmation code, they set their profile picture and display name — both of which can be changed later from Settings.

### Creating or joining a jar

After signing up, users are automatically taken to the create/join screen. To create a jar, a user enters the meet-up date and picks a color for their stars, which generates an invite code to send to their partner. To join, the partner selects "Join with a code," enters the code, and picks their own star color.

Once the jar is created, the meet-up date can still be changed later. There's currently an upper limit on how far out it can be set, though — pushing past it causes the jar to start malfunctioning, which a future version will fix. Star colors, by contrast, are locked in permanently once the jar is created.

### Cycles, taps, and streaks

The cycle clock starts the moment the partner enters the invite code. From then on, each 24-hour cycle gives each user one tap, which drops a star of their chosen color into the jar. After tapping, a user can optionally attach a note to that cycle. The next 24-hour cycle then begins, and so on — a streak counts consecutive cycles where both users tapped.

If a user misses their tap, the cycle doesn't fail immediately — it enters a 24-hour grace period. During grace, either user (not just whoever missed) can repair it, which restores the streak to whatever it was right before the miss. Each user gets 3 repairs per month; once someone's used all 3, the app just shows they have no repairs left instead of offering the option.

If the grace period isn't repaired, it resolves one of two ways:

- **Someone taps instead of repairing:** that tap is treated as forfeiting the repair — the streak resets to 0, and a new cycle starts immediately, timed from that exact tap.
- **Nobody does anything:** the grace period simply expires once its 24 hours are up, the streak resets to 0, and the next cycle opens on the normal schedule.

Either way, once the cycle is resolved, the repair option is gone for good — there's no coming back to repair it afterward.

One more timing detail: when a repair **is** used, the next cycle also doesn't follow the normal schedule — it opens fresh, timed from the exact moment the repair happened. This is deliberate: since the grace period is exactly as long as one full cycle, following the normal schedule could hand back a next cycle with almost no time left (or none at all) if the repair happened late in the grace window.

## Future Directions

### 1. Animation

- Make the star-dropping motion feel more natural.
- Let users tap the jar itself, instead of only the "you" button, to drop a star.
- Support longer countdowns by raising the current upper limit on days.

### 2. Design

- **Avatar creation:** tried building this with SVG, but the results weren't good enough — worth finding someone with real illustration skills to do this properly.
- **Jar & star templates:** offer more visual choices for the jar and stars themselves.

### 3. Sign-in

- Add more sign-in methods beyond email and password.

### 4. Installation

- Publish to the Google Play Store.
- Get the app ready for the Apple App Store.
- Add home-screen widget support.
