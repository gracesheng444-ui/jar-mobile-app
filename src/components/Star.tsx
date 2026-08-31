import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { starGeometry } from '../starPath';

/** Jewel-tone origami paper colors, echoing folded paper stars/cranes rather than flat emoji. */
const ORIGAMI_PALETTE = [
  { base: '#1FA8B0', light: '#8FEAE3', crease: '#0E6E78' },
  { base: '#E0559A', light: '#FFC1E0', crease: '#A62F6C' },
  { base: '#8B5CF6', light: '#D8CCFF', crease: '#5B32B0' },
  { base: '#F0A93A', light: '#FFE29A', crease: '#B9791A' },
  { base: '#4C7EFF', light: '#B7CBFF', crease: '#2A4FBF' },
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
  const glowBox = size * 2.4;
  const center = box / 2;
  const glowCenter = glowBox / 2;
  const geometry = starGeometry(center, center, size / 2, size / 4.3);
  const uid = `${colorIndex}-${Math.round(size * 10)}`;

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
            <Stop offset="0" stopColor={palette.light} stopOpacity={0.5} />
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
          strokeWidth={Math.max(size * 0.03, 0.6)}
          strokeLinejoin="round"
        />
        {/* Fold-crease lines from center to each point, suggesting folded paper facets. */}
        {geometry.points.map((p, i) => (
          <Line
            key={i}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke={palette.crease}
            strokeWidth={Math.max(size * 0.015, 0.4)}
            opacity={0.4}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}
