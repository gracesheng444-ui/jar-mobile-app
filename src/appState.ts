import { CycleRecord, Jar, StreakState, UserProfile } from 'jar-core-logic';

export interface JarAppState {
  jar: Jar;
  userA: UserProfile;
  userB: UserProfile;
  /** Each user's own chosen star color — a display concern, not core jar-core-logic domain state. */
  userAStarColor: string;
  userBStarColor: string;
  /** Each user's own chosen display name — 'Partner' is the DB default for "never customized". */
  userADisplayName: string;
  userBDisplayName: string;
  cycle: CycleRecord;
  streak: StreakState;
  /** Stars each user has personally dropped, ever. Incremented the moment that user taps —
   *  independent of whether their partner has tapped this cycle or the cycle ever completes. */
  starCountA: number;
  starCountB: number;
  /** Dev-only clock skew in ms, so the 24h cycle can be fast-forwarded for testing instead of waiting a real day. */
  devClockOffsetMs: number;
}
