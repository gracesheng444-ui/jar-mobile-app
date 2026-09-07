import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { starGeometry } from '../starPath';

interface StarProps {
  size: number;
  color: string;
  /** Degrees — the pile layout picks this per star, for a "tossed in" look rather than a neat grid. */
  rotation: number;
  isNew?: boolean;
}

export function Star({ size, color, rotation, isNew }: StarProps) {
  const scale = useRef(new Animated.Value(isNew ? 0 : 1)).current;

  useEffect(() => {
    if (isNew) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }).start();
    }
  }, [isNew, scale]);

  const box = size * 1.4;
  const center = box / 2;
  const geometry = starGeometry(center, center, size / 2, rotation);

  return (
    <Animated.View style={{ transform: [{ scale }], width: box, height: box, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        <Path
          d={geometry.path}
          fill="none"
          stroke={color}
          strokeWidth={Math.max(size * 0.11, 1.5)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}
