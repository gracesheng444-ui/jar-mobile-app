import { Image, StyleSheet, Text, View } from 'react-native';
import { INK } from '../theme';

interface AvatarProps {
  /** A picked photo's URL, or null/undefined to render the color-initial fallback. */
  url?: string | null;
  color: string;
  /** Used only for the fallback's initial letter — 'Partner' (the DB default) renders as '?'. */
  name: string;
  size?: number;
}

/** A user's profile picture: their uploaded photo if they have one, otherwise a colored circle with their name's initial. */
export function Avatar({ url, color, name, size = 40 }: AvatarProps) {
  const initial = name && name !== 'Partner' ? name.trim().charAt(0).toUpperCase() : '?';
  const circleStyle = { width: size, height: size, borderRadius: size / 2 };

  if (url) {
    return <Image source={{ uri: url }} style={[styles.circle, circleStyle]} />;
  }
  return (
    <View style={[styles.circle, styles.colorCircle, circleStyle, { backgroundColor: color }]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 2, borderColor: INK },
  colorCircle: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '800', color: INK },
});
