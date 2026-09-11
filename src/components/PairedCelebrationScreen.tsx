import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { cardStyles } from '../theme';
import { JarGlyph } from './JarGlyph';

interface PairedCelebrationScreenProps {
  partnerName: string;
  targetDateUTC: Date | undefined;
  onContinue: () => void;
}

/** One-time screen shown the moment a jar goes from "waiting for a partner" to actually
 *  paired — for whichever side discovers it (the creator via realtime/poll, the joiner as the
 *  direct result of joining) — before dropping into the regular jar view. */
export function PairedCelebrationScreen({ partnerName, targetDateUTC, onContinue }: PairedCelebrationScreenProps) {
  const { t } = useI18n();

  const daysLabel = (): string => {
    if (!targetDateUTC) return t.jarList.noTargetDate;
    const days = Math.ceil((targetDateUTC.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days <= 0) return t.jarList.todayIsTheDay;
    return t.jarList.daysUntilMeet(days);
  };

  return (
    <View style={cardStyles.card}>
      <JarGlyph size={90} />
      <Text style={cardStyles.heading}>{t.paired.heading}</Text>
      <Text style={cardStyles.label}>{t.paired.subtitle(partnerName)}</Text>
      <Text style={styles.daysLabel}>{daysLabel()}</Text>
      <Pressable style={cardStyles.primaryButton} onPress={onContinue}>
        <Text style={cardStyles.primaryButtonText}>{t.paired.continueButton}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  daysLabel: { textAlign: 'center', fontWeight: '700', fontSize: 15, marginBottom: 18 },
});
