import { CycleRecord, ReminderInterval, getCycleResetFireTime, getUpcomingTapReminders } from 'jar-core-logic';
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
 *  choice, not an error. */
export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
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
 */
export async function syncCycleNotifications(
  jarId: string,
  cycle: CycleRecord,
  hasTapped: boolean,
  strings: I18nStrings['notifications']
): Promise<void> {
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
