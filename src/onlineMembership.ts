import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'jar-online-membership-v1';

export interface Membership {
  jarId: string;
  role: 'A' | 'B';
}

export async function saveMembership(membership: Membership): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(membership));
}

export async function loadMembership(): Promise<Membership | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Membership) : null;
}

export async function clearMembership(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
