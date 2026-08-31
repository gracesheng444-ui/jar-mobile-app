import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { starPath } from '../starPath';

interface StarProps {
  size: number;
  isNew?: boolean;
}

export function Star({ size, isNew }: StarProps) {
  const scale = useRef(new Animated.Value(isNew ? 0 : 1)).current;

  useEffect(() => {
    if (isNew) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 120 }).start();
    }
  }, [isNew, scale]);

  const box = size * 1.3;
  const center = box / 2;
  const gradientId = `starGradient-${Math.round(size)}`;

  return (
    <Animated.View style={{ transform: [{ scale }], margin: 2 }}>
      <Svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE58A" />
            <Stop offset="1" stopColor="#F5A623" />
          </LinearGradient>
        </Defs>
        <Path
          d={starPath(center, center, size / 2, size / 4.5)}
          fill={`url(#${gradientId})`}
          stroke="#E08E0B"
          strokeWidth={Math.max(size * 0.02, 0.5)}
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}
