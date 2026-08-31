import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { starGeometry } from '../starPath';

/** Deep jewel-tone origami paper colors — richer and more muted than candy-bright, for an elegant read. */
const ORIGAMI_PALETTE = [
  { base: '#0E7A82', light: '#5FCFC7', crease: '#053F44' },
  { base: '#B03D74', light: '#E893BC', crease: '#6E1F49' },
  { base: '#5B3FA8', light: '#B29EE8', crease: '#33215E' },
  { base: '#C4881E', light: '#F0C878', crease: '#7A5210' },
  { base: '#2E56C4', light: '#8FADEE', crease: '#193269' },
];

interface StarProps {
  size: number;
  colorIndex: number;
  isNew?: boolean;
}

export function Star({ size, colorIndex, isNew }: StarProps) {
  const scale = useRef(new Animated.Value(isNew ? 0 : 1)).current;

  useEffect(() => {
    if (isNew) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }).start();
    }
  }, [isNew, scale]);

  const palette = ORIGAMI_PALETTE[colorIndex % ORIGAMI_PALETTE.length];
  const box = size * 1.5;
  const glowBox = size * 2.2;
  const center = box / 2;
  const glowCenter = glowBox / 2;
  const geometry = starGeometry(center, center, size / 2, size / 4.3);
  const uid = `${colorIndex}-${Math.round(size * 10)}`;

  // A small highlight facet over the top two points, as if that fold catches the light.
  const highlightPath = `M${center},${center} L${geometry.points[8].x.toFixed(2)},${geometry.points[8].y.toFixed(2)} L${geometry.points[9].x.toFixed(2)},${geometry.points[9].y.toFixed(2)} L${geometry.points[0].x.toFixed(2)},${geometry.points[0].y.toFixed(2)} Z`;

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        width: glowBox,
        height: glowBox,
        alignItems: 'center',
        justifyContent: 'center',
        margin: -size * 0.15,
      }}
    >
      <Svg width={glowBox} height={glowBox} viewBox={`0 0 ${glowBox} ${glowBox}`} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id={`glow-${uid}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.light} stopOpacity={0.32} />
            <Stop offset="1" stopColor={palette.light} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={glowCenter} cy={glowCenter} r={glowCenter} fill={`url(#glow-${uid})`} />
      </Svg>
      <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        <Defs>
          <LinearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={palette.light} />
            <Stop offset="1" stopColor={palette.base} />
          </LinearGradient>
        </Defs>
        <Path
          d={geometry.path}
          fill={`url(#fill-${uid})`}
          stroke={palette.crease}
          strokeWidth={Math.max(size * 0.02, 0.4)}
          strokeLinejoin="round"
        />
        <Path d={highlightPath} fill="#FFFFFF" opacity={0.18} />
        {/* Fine fold-crease lines from center to each point — thin, so paper reads as folded, not outlined. */}
        {geometry.points.map((p, i) => (
          <Line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke={palette.crease}
            strokeWidth={Math.max(size * 0.008, 0.25)}
            opacity={0.3}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}
