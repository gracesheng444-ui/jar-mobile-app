import Svg, { Circle, Line, Path } from 'react-native-svg';

interface EyeIconProps {
  color: string;
  size?: number;
}

const STROKE_WIDTH = 2;

/** Password-visibility toggle icons, in the same hand-drawn line style as TabIcons. */
export function EyeIcon({ color, size = 20 }: EyeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={STROKE_WIDTH} />
    </Svg>
  );
}

export function EyeOffIcon({ color, size = 20 }: EyeIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12C2 12 5.5 5 12 5C18.5 5 22 12 22 12C22 12 18.5 19 12 19C5.5 19 2 12 2 12Z"
        stroke={color}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={STROKE_WIDTH} />
      <Line x1="4" y1="4" x2="20" y2="20" stroke={color} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </Svg>
  );
}
