import { Image, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { CREAM_BORDER, INK, MUTED, cardStyles } from '../theme';

interface NotificationsGalleryProps {
  partnerName: string;
}

/** Static, non-interactive tab in the demo: a labeled gallery of the four notification types the
 *  real app sends (see jar-core-logic's notifications.ts and notify-partner-tap), so a visitor
 *  can see what they look like without needing a real device to receive one on — web can't
 *  receive push notifications at all, and even on a real device these mostly arrive hours apart,
 *  not on demand. Each preview reuses the exact same title/body strings the real app schedules,
 *  so this never drifts out of sync with actual wording. */
export function NotificationsGallery({ partnerName }: NotificationsGalleryProps) {
  const { t } = useI18n();
  const n = t.notifications;
  const g = t.demoScenarios;

  return (
    <View style={cardStyles.card}>
      <Text style={styles.heading}>{g.galleryHeading}</Text>
      <Text style={styles.intro}>{g.galleryIntro}</Text>

      <NotificationExample label={g.galleryTapReminderLabel} title={n.tapReminderTitle} body={n.tapReminderBody(n.remainingLabels['1h'])} />
      <NotificationExample label={g.galleryCycleCompleteLabel} title={n.cycleResetTitle} body={n.cycleResetBody} />
      <NotificationExample label={g.galleryCycleMissedLabel} title={n.cycleMissedTitle} body={n.cycleMissedBody} />
      <NotificationExample label={g.galleryPartnerActivityLabel} title={n.partnerActivityTitle} body={n.partnerActivityBody(partnerName)} />
    </View>
  );
}

function NotificationExample({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <View style={styles.exampleWrap}>
      <Text style={styles.exampleLabel}>{label}</Text>
      <View style={styles.preview}>
        {/* The app's own icon, exactly as it'd appear as the sender of a real OS notification —
            not a generic bell — so this reads as "a message from this app," not a system alert. */}
        <Image source={require('../../assets/icon.png')} style={styles.previewIcon} />
        <View style={styles.previewTextWrap}>
          <Text style={styles.previewTitle}>{title}</Text>
          <Text style={styles.previewBody}>{body}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 16, fontWeight: '800', color: INK, marginBottom: 8 },
  intro: { fontSize: 13, color: MUTED, lineHeight: 18, marginBottom: 18 },
  exampleWrap: { marginBottom: 16 },
  exampleLabel: { fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  // Deliberately styled unlike the app's own cream/black-border cards — a plain white bubble
  // with a soft shadow, closer to what an actual phone notification banner looks like, so it
  // reads as "a preview of something external" rather than more app UI.
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: CREAM_BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  previewIcon: { width: 32, height: 32, borderRadius: 8 },
  previewTextWrap: { flex: 1 },
  previewTitle: { fontSize: 14, fontWeight: '700', color: INK, marginBottom: 2 },
  previewBody: { fontSize: 13, color: '#374151', lineHeight: 18 },
});
