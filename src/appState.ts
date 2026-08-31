import { CycleRecord, Jar, StreakState, UserProfile } from 'jar-core-logic';

export interface JarAppState {
  jar: Jar;
  userA: UserProfile;
  userB: UserProfile;
  cycle: CycleRecord;
  streak: StreakState;
  /** Count of cycles that ever resolved 'complete' (a real mutual tap) — repaired cycles don't add to this, matching the streak-freeze design. */
  completedStarCount: number;
  /** Dev-only clock skew in ms, so the 24h cycle can be fast-forwarded for testing instead of waiting a real day. */
  devClockOffsetMs: number;
}
