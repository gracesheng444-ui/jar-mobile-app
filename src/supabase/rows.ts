import { CycleRecord, CycleStatus, JarMode, UserProfile } from 'jar-core-logic';

export interface JarRow {
  id: string;
  invite_code: string;
  user_a_id: string;
  user_b_id: string | null;
  created_at_utc: string;
  mode: JarMode;
  estimated_days_apart: number | null;
}

export interface CycleRow {
  jar_id: string;
  cycle_index: number;
  cycle_start_utc: string;
  cycle_end_utc: string;
  user_a_tapped: boolean;
  user_b_tapped: boolean;
  status: CycleStatus;
  grace_expires_at_utc: string | null;
  repaired_by: string[];
  streak_before_cycle: number;
}

export interface StreakRow {
  jar_id: string;
  current_streak: number;
  longest_streak: number;
  last_updated_cycle_index: number;
  completed_star_count: number;
}

export interface UserProfileRow {
  id: string;
  display_name: string;
  current_timezone: string;
  repair_balance: number;
  last_refilled_yyyymm: string | null;
}

export function rowToCycle(row: CycleRow): CycleRecord {
  return {
    jarId: row.jar_id,
    cycleIndex: row.cycle_index,
    cycleStartUTC: new Date(row.cycle_start_utc),
    cycleEndUTC: new Date(row.cycle_end_utc),
    userATapped: row.user_a_tapped,
    userBTapped: row.user_b_tapped,
    status: row.status,
    graceExpiresAtUTC: row.grace_expires_at_utc ? new Date(row.grace_expires_at_utc) : undefined,
    repairedBy: row.repaired_by,
    streakBeforeCycle: row.streak_before_cycle,
  };
}

export function cycleToRow(cycle: CycleRecord): Omit<CycleRow, 'jar_id'> & { jar_id: string } {
  return {
    jar_id: cycle.jarId,
    cycle_index: cycle.cycleIndex,
    cycle_start_utc: cycle.cycleStartUTC.toISOString(),
    cycle_end_utc: cycle.cycleEndUTC.toISOString(),
    user_a_tapped: cycle.userATapped,
    user_b_tapped: cycle.userBTapped,
    status: cycle.status,
    grace_expires_at_utc: cycle.graceExpiresAtUTC ? cycle.graceExpiresAtUTC.toISOString() : null,
    repaired_by: cycle.repairedBy,
    streak_before_cycle: cycle.streakBeforeCycle,
  };
}

export function rowToProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    currentIANATimezone: row.current_timezone,
    repairBalance: row.repair_balance,
    lastRefilledYYYYMM: row.last_refilled_yyyymm,
  };
}
