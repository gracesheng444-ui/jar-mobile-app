import Svg, { Circle, Line, Path } from 'react-native-svg';

// Bottom-tab icon set: three simple line-drawn glyphs sharing one stroke
// weight/cap/join, in the same hand-drawn style as JarGlyph/StarJar — a
// deliberate replacement for the old mix of two emoji ("🫙", "⚙") and a
// plain "+" character, which rendered inconsistently (different weights,
// no shared visual language).

interface TabIconProps {
  color: string;
  size?: number;
}

const STROKE_WIDTH = 2;

export function JarTabIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 2.5H15" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Path d="M9 2.5C9 4.5 8 5 6.8 7" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 2.5C15 4.5 16 5 17.2 7" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeLinejoin="round" />
      <Path
        d="M6.8 7C5.3 7 4 8.5 4 11V17.5C4 19.9853 6 21.5 9 21.5H15C18 21.5 20 19.9853 20 17.5V11C20 8.5 18.7 7 17.2 7"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlusTabIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Svg>
  );
}

export function SettingsTabIcon({ color, size = 22 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Circle cx="14" cy="6" r="2.2" fill={color} />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Circle cx="8" cy="12" r="2.2" fill={color} />
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <Circle cx="16" cy="18" r="2.2" fill={color} />
    </Svg>
  );
}
