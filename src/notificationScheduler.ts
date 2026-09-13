import { CycleRecord, ReminderInterval, getCycleResetFireTime, getUpcomingTapReminders } from 'jar-core-logic';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { I18nStrings } from './i18n';

const ALL_INTERVALS: ReminderInterval[] = ['12h', '3h', '1h', '30m', '5m'];

function reminderId(jarId: string, cycleIndex: number, interval: ReminderInterval): string {
  return `tap-reminder-${jarId}-${cycleIndex}-${interval}`;
}

function cycleResetId(jarId: string, cycleIndex: number): string {
  return `cycle-reset-${jarId}-${cycleIndex}`;
}

/** Notifications that arrive while the app is open are suppressed by default — without this,
 *  reminders would be invisible to anyone with the app open in the background. Call once at
 *  app startup. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android requires a notification channel before anything can be shown (API 26+); a no-op on
 *  iOS/web. Call once at app startup alongside configureNotificationHandler. */
export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Shared Memory Jar',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Prompts for permission only if the user hasn't already granted or denied it. Callers should
 *  treat a `false` result as "silently skip scheduling" — declining is a normal, supported
 *  choice, not an error. Always false on web: see the platform note on syncCycleNotifications. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Gets this device's Expo push token, for the caller to save server-side so the
 *  notify-partner-tap Edge Function can reach it. Null on web (no push tokens there) or if the
 *  underlying native call fails for any reason (e.g. no EAS projectId, missing Google services
 *  config) — callers should treat that as "skip registering," not an error. */
export async function registerPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return data;
  } catch {
    return null;
  }
}

/**
 * Reconciles this device's locally-scheduled notifications for one cycle against
 * jar-core-logic's pure schedule (getUpcomingTapReminders / getCycleResetFireTime).
 *
 * Every possible notification slot for this cycle is cancelled first — cancelling an identifier
 * with nothing scheduled under it is a documented no-op, not an error — and only what's
 * currently due is rescheduled after. That makes this safe to call on every appState change: a
 * tap that flips hasTapped to true simply results in nothing being rescheduled, which clears out
 * whatever reminders were still pending from before the tap.
 *
 * No-op on web: expo-notifications' web implementation doesn't provide
 * scheduleNotificationAsync/cancelScheduledNotificationAsync at all (there's no OS-level
 * scheduler to fire a notification while the tab isn't open) — calling either throws
 * UnavailabilityError. requestNotificationPermission already returns false on web, so this
 * should never be reached from the app's own effect, but guards independently since it isn't
 * safe to call unconditionally regardless of caller.
 */
export async function syncCycleNotifications(
  jarId: string,
  cycle: CycleRecord,
  hasTapped: boolean,
  strings: I18nStrings['notifications']
): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all([
    ...ALL_INTERVALS.map((interval) => Notifications.cancelScheduledNotificationAsync(reminderId(jarId, cycle.cycleIndex, interval))),
    Notifications.cancelScheduledNotificationAsync(cycleResetId(jarId, cycle.cycleIndex)),
  ]);

  const now = new Date();

  const reminders = getUpcomingTapReminders(cycle, hasTapped, now);
  await Promise.all(
    reminders.map((reminder) =>
      Notifications.scheduleNotificationAsync({
        identifier: reminderId(jarId, cycle.cycleIndex, reminder.interval),
        content: {
          title: strings.tapReminderTitle,
          body: strings.tapReminderBody(strings.remainingLabels[reminder.interval]),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAtUTC },
      })
    )
  );

  const resetAt = getCycleResetFireTime(cycle);
  if (resetAt.getTime() > now.getTime()) {
    await Notifications.scheduleNotificationAsync({
      identifier: cycleResetId(jarId, cycle.cycleIndex),
      content: {
        title: strings.cycleResetTitle,
        body: strings.cycleResetBody,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: resetAt },
    });
  }
}
