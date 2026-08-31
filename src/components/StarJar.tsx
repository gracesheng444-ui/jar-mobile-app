import { computeStarSize, computeVisualCapacity, SizingConfig } from 'jar-core-logic';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Star } from './Star';

const SIZING: SizingConfig = { baseSize: 32, minSize: 11 };
const MAX_RENDERED_STARS = 200;

interface StarJarProps {
  starCount: number;
  estimatedDaysApart?: number;
}

export function StarJar({ starCount, estimatedDaysApart }: StarJarProps) {
  const visualCapacity = computeVisualCapacity(estimatedDaysApart);
  const starSize = computeStarSize(starCount, visualCapacity, SIZING);
  const rendered = Math.min(starCount, MAX_RENDERED_STARS);

  // Only the most-recently-added star plays the pop-in animation, so re-renders
  // (e.g. from the size-shrink recalculation) don't replay it for every star.
  const prevCountRef = useRef(starCount);
  const grewThisRender = starCount > prevCountRef.current;
  prevCountRef.current = starCount;

  return (
    <View style={styles.jarBody}>
      <Svg width="100%" height="100%" viewBox="0 0 200 250" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="jarGlass" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#EAF2FF" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#C9DDFF" stopOpacity={0.35} />
          </LinearGradient>
          <LinearGradient id="jarLid" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#9DB7E0" />
            <Stop offset="0.5" stopColor="#EAF2FF" />
            <Stop offset="1" stopColor="#9DB7E0" />
          </LinearGradient>
        </Defs>

        {/* Lid */}
        <Path d="M46 14 H154 V30 H46 Z" fill="url(#jarLid)" stroke="#5B8DEF" strokeWidth={2.5} />

        {/* Jar body */}
        <Path
          d="M50 30 H150 V56 Q182 66 182 108 V206 Q182 240 148 240 H52 Q18 240 18 206 V108 Q18 66 50 56 Z"
          fill="url(#jarGlass)"
          stroke="#5B8DEF"
          strokeWidth={3}
        />

        {/* Glass shine */}
        <Path
          d="M40 80 Q34 150 44 215"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={6}
          strokeLinecap="round"
          opacity={0.5}
        />
      </Svg>
      <View style={styles.starWrap}>
        {rendered === 0 ? (
          <Text style={styles.emptyText}>No stars yet — complete a cycle together to add the first one.</Text>
        ) : (
          Array.from({ length: rendered }).map((_, i) => (
            <Star key={i} size={starSize} isNew={grewThisRender && i === rendered - 1} />
          ))
        )}
      </View>
      {starCount > MAX_RENDERED_STARS && <Text style={styles.overflowText}>+{starCount - MAX_RENDERED_STARS} more</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  jarBody: { width: 220, height: 270, alignSelf: 'center', marginVertical: 16 },
  starWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingBottom: 34,
    paddingTop: 34,
  },
  emptyText: { textAlign: 'center', color: '#5B8DEF', fontSize: 13, marginTop: 70, paddingHorizontal: 16 },
  overflowText: { textAlign: 'center', color: '#5B8DEF', fontSize: 12, marginTop: 4 },
});
