import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { uploadAvatarPhoto } from '../supabase/api';
import { cardStyles, INK, MUTED } from '../theme';
import { Avatar } from './Avatar';

interface AvatarPickerProps {
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarColor: string;
  /** Fires once the picked photo has finished uploading — already persisted by this component. */
  onAvatarChange: (next: { url: string | null; color: string }) => void;
  /** Only during first-time signup — offers "Skip for now" as an explicit alternative to picking a photo right away, since there's nothing else (like a color) to fall back to picking here. */
  showSkipOption?: boolean;
}

/** Photo profile picture picker — persists the upload itself, then reports the result up so the caller can update its preview. With no photo, the caller's default color-and-initial circle (see Avatar.tsx) is used as-is. */
export function AvatarPicker({ userId, name, avatarUrl, avatarColor, onAvatarChange, showSkipOption }: AvatarPickerProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  const pickPhoto = async () => {
    setPickError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickError(t.avatarPicker.permissionDenied);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const url = await uploadAvatarPhoto(userId, asset.uri, asset.mimeType ?? 'image/jpeg');
      onAvatarChange({ url, color: avatarColor });
      setSkipped(false);
    } catch {
      setPickError(t.avatarPicker.uploadFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Avatar url={avatarUrl} color={avatarColor} name={name} size={72} />
      {skipped ? (
        <Pressable style={styles.skippedRow} onPress={() => setSkipped(false)}>
          <Text style={styles.skippedText}>
            {t.avatarPicker.usingDefaultPicture} · <Text style={styles.changeLink}>{t.avatarPicker.changePicture}</Text>
          </Text>
        </Pressable>
      ) : (
        <View style={styles.actionsRow}>
          <Pressable onPress={pickPhoto} disabled={busy}>
            <Text style={styles.photoButtonText}>{busy ? t.avatarPicker.uploading : t.avatarPicker.choosePhoto}</Text>
          </Pressable>
          {showSkipOption && (
            <Pressable onPress={() => setSkipped(true)}>
              <Text style={styles.skipLink}>{t.avatarPicker.skipForNow}</Text>
            </Pressable>
          )}
        </View>
      )}
      {pickError && <Text style={cardStyles.errorText}>{pickError}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 8 },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  photoButtonText: { color: INK, fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' },
  skipLink: { color: MUTED, fontWeight: '600', fontSize: 13 },
  skippedRow: { marginTop: 10 },
  skippedText: { color: MUTED, fontSize: 12 },
  changeLink: { color: INK, fontWeight: '700', textDecorationLine: 'underline' },
});
