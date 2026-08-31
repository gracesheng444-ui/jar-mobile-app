import { getLocalYearMonth, MONTHLY_REPAIR_ALLOWANCE, openCycle, StreakState, UserProfile } from 'jar-core-logic';
import { JarAppState } from './appState';

const USER_A_ID = 'you';
const USER_B_ID = 'partner';

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function freshUserProfile(id: string, nowUTC: Date, timeZone: string): UserProfile {
  return {
    id,
    currentIANATimezone: timeZone,
    repairBalance: MONTHLY_REPAIR_ALLOWANCE,
    lastRefilledYYYYMM: getLocalYearMonth(nowUTC, timeZone),
  };
}

export function createInitialState(nowUTC: Date): JarAppState {
  const timeZone = deviceTimeZone();
  const jar: JarAppState['jar'] = {
    id: 'demo-jar',
    userAId: USER_A_ID,
    userBId: USER_B_ID,
    createdAtUTC: nowUTC,
    mode: 'countup',
    estimatedDaysApart: 30,
  };
  const streak: StreakState = { jarId: jar.id, currentStreak: 0, longestStreak: 0, lastUpdatedCycleIndex: -1 };
  const cycle = openCycle(jar.id, jar.createdAtUTC, 0, streak.currentStreak);

  return {
    jar,
    userA: freshUserProfile(USER_A_ID, nowUTC, timeZone),
    userB: freshUserProfile(USER_B_ID, nowUTC, timeZone),
    cycle,
    streak,
    completedStarCount: 0,
    devClockOffsetMs: 0,
  };
}
