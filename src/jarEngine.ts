import {
  applyRepair,
  closeCycle,
  expireGraceIfNeeded,
  openCycle,
  openCycleAt,
  refillIfDue,
  restoreStreakAfterRepair,
  spendRepair,
  updateStreakOnCycleClose,
} from 'jar-core-logic';
import { JarAppState } from './appState';

/**
 * Time-driven transitions only: quota refill, grace expiry, and closing an
 * open cycle once its 24h window has passed. Whenever a cycle ends up fully
 * resolved ('complete', 'incomplete_expired', or 'repaired'), the next cycle
 * opens immediately — so this is safe to call as often as you like (a timer
 * tick, app foreground, or right after a user action).
 *
 * The next cycle after a 'repaired' one is anchored to nowUTC (openCycleAt),
 * not the creation-time grid (openCycle) — the grace window is exactly one
 * cycle long, so the grid's next slot spans exactly that grace window.
 * Repairing late within it used to hand back a next cycle with almost no
 * time left (sometimes none at all, by the time this function ran again),
 * silently blocking the tap that had just been "saved" for. Anchoring to
 * nowUTC guarantees a repair always hands back a genuine full cycle.
 */
export function progressState(state: JarAppState, nowUTC: Date): JarAppState {
  let { userA, userB, cycle, streak } = state;

  userA = refillIfDue(userA, nowUTC);
  userB = refillIfDue(userB, nowUTC);
  cycle = expireGraceIfNeeded(cycle, nowUTC);

  if (cycle.status === 'open' && nowUTC.getTime() >= cycle.cycleEndUTC.getTime()) {
    cycle = closeCycle(cycle);
    streak = updateStreakOnCycleClose(streak, cycle);
  }

  if (cycle.status === 'repaired') {
    cycle = openCycleAt(state.jar.id, cycle.cycleIndex + 1, nowUTC, streak.currentStreak);
  } else if (cycle.status === 'complete' || cycle.status === 'incomplete_expired') {
    cycle = openCycle(state.jar.id, state.jar.createdAtUTC, cycle.cycleIndex + 1, streak.currentStreak);
  }

  return { ...state, userA, userB, cycle, streak };
}

/**
 * A user taps for the current open cycle: drops their own star immediately
 * (capped at one per user per cycle — the guard below, not a cycle-completion
 * check) and marks them done. Whether the *partner* has tapped, or ever does,
 * doesn't gate this — that's the whole point of an instant per-tap drop.
 */
export function tapAction(state: JarAppState, who: 'A' | 'B'): JarAppState {
  if (state.cycle.status !== 'open') return state;
  const alreadyTapped = who === 'A' ? state.cycle.userATapped : state.cycle.userBTapped;
  if (alreadyTapped) return state;
  return {
    ...state,
    cycle: {
      ...state.cycle,
      userATapped: who === 'A' ? true : state.cycle.userATapped,
      userBTapped: who === 'B' ? true : state.cycle.userBTapped,
    },
    starCountA: who === 'A' ? state.starCountA + 1 : state.starCountA,
    starCountB: who === 'B' ? state.starCountB + 1 : state.starCountB,
  };
}

/** A missing user spends a repair pass during the grace window. Throws if they have none left. */
export function repairAction(state: JarAppState, who: 'A' | 'B', nowUTC: Date): JarAppState {
  const userId = who === 'A' ? state.jar.userAId : state.jar.userBId;
  const spender = who === 'A' ? state.userA : state.userB;
  const spent = spendRepair(spender, nowUTC);

  let cycle = applyRepair(state.cycle, state.jar, userId, nowUTC);
  let streak = state.streak;
  if (cycle.status === 'repaired') {
    streak = restoreStreakAfterRepair(streak, cycle);
  }

  const next: JarAppState = {
    ...state,
    userA: who === 'A' ? spent : state.userA,
    userB: who === 'B' ? spent : state.userB,
    cycle,
    streak,
  };
  return progressState(next, nowUTC);
}
