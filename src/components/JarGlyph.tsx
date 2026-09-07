import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { INK } from '../theme';

// Same jar-body paths as StarJar.tsx, and the same 10-point regular-star
// geometry as Star.tsx (computed once, inlined — this glyph doesn't need the
// dynamic sizing/color-per-user logic the real jar view has).
const LID = 'M52,35 C52,20 78,10 110,9 C143,8 169,19 169,34 C169,49 143,52 110,52 C78,53 52,50 52,35 Z';
const NECK_L = 'M52,42 C46,58 40,66 30,78';
const NECK_R = 'M169,41 C175,58 181,66 191,78';
const RUFFLE =
  'M30,78 C15,86 12,98 22,104 C34,110 42,100 52,98 C64,96 66,108 80,110 C94,112 96,100 110,100 C124,100 126,112 140,110 C154,108 156,96 168,98 C178,100 186,110 199,104 C209,98 206,86 191,78';
const BODY =
  'M36,96 C18,113 16,132 16,155 L16,220 C16,250 26,272 64,274 L156,274 C194,272 204,250 204,220 L204,155 C204,132 202,113 184,96';
const STAR_A = 'M78,248 L84.5,232.9 L100.7,231.6 L88.5,220.5 L92.5,204.8 L78,212.6 L63.5,204.8 L67.5,220.5 L55.3,231.6 L71.5,232.9 Z';
const STAR_B = 'M142,248 L148.5,232.9 L164.7,231.6 L152.5,220.5 L156.5,204.8 L142,212.6 L127.5,204.8 L131.5,220.5 L119.3,231.6 L135.5,232.9 Z';

interface JarGlyphProps {
  /** Rendered width; height follows the jar's own ~0.73 aspect ratio. */
  size?: number;
}

/** Small decorative jar+stars illustration for auxiliary screens (sign-in, jar list, etc.) — the same artwork as the app icon, for visual continuity. */
export function JarGlyph({ size = 60 }: JarGlyphProps) {
  const height = size * (300 / 220);
  return (
    <View style={styles.wrap}>
      <Svg width={size} height={height} viewBox="0 0 220 300">
        <Path d={LID} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={NECK_L} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={NECK_R} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={RUFFLE} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={BODY} fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={STAR_A} fill="#FFC94A" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
        <Path d={STAR_B} fill="#F06A9C" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: 4 },
});
