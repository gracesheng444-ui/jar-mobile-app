import AsyncStorage from '@react-native-async-storage/async-storage';
import { JarAppState } from './appState';

const STORAGE_KEY = 'jar-app-state-v1';
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO_DATE_RE.test(value) ? new Date(value) : value;
}

export async function saveState(state: JarAppState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function loadState(): Promise<JarAppState | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw, reviveDates) as JarAppState) : null;
}

export async function clearState(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
