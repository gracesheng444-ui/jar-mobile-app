import { useCallback, useEffect, useRef, useState } from 'react';
import { JarAppState } from './appState';
import { createInitialState } from './createInitialState';
import { progressState, repairAction, tapAction } from './jarEngine';
import { clearState, loadState, saveState } from './storage';

const TICK_INTERVAL_MS = 5000;

export function useJarApp() {
  const [state, setState] = useState<JarAppState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<JarAppState | null>(null);
  stateRef.current = state;

  const now = useCallback(() => new Date(Date.now() + (stateRef.current?.devClockOffsetMs ?? 0)), []);

  const commit = useCallback((next: JarAppState) => {
    setState(next);
    void saveState(next);
  }, []);

  useEffect(() => {
    void (async () => {
      const loaded = await loadState();
      const initial = loaded ?? createInitialState(new Date());
      commit(progressState(initial, new Date(Date.now() + initial.devClockOffsetMs)));
    })();
  }, [commit]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!stateRef.current) return;
      commit(progressState(stateRef.current, now()));
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [commit, now]);

  const tap = useCallback(
    (who: 'A' | 'B') => {
      if (!stateRef.current) return;
      commit(progressState(tapAction(stateRef.current, who), now()));
    },
    [commit, now]
  );

  const repair = useCallback(
    (who: 'A' | 'B') => {
      if (!stateRef.current) return;
      try {
        commit(repairAction(stateRef.current, who, now()));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [commit, now]
  );

  /** Dev-only: jump the virtual clock straight to a target time, then re-run the engine. */
  const jumpTo = useCallback(
    (targetUTC: Date) => {
      if (!stateRef.current) return;
      const offset = targetUTC.getTime() - Date.now();
      const withOffset = { ...stateRef.current, devClockOffsetMs: offset };
      commit(progressState(withOffset, targetUTC));
    },
    [commit]
  );

  const reset = useCallback(() => {
    void clearState();
    const initial = createInitialState(new Date());
    commit(progressState(initial, new Date()));
  }, [commit]);

  return { state, error, tap, repair, jumpTo, reset, now };
}
