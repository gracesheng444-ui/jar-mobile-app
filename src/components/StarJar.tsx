import { computeStarSize, computeVisualCapacity, SizingConfig } from 'jar-core-logic';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const SIZING: SizingConfig = { baseSize: 30, minSize: 10 };
const MAX_RENDERED_STARS = 200;

interface StarJarProps {
  starCount: number;
  estimatedDaysApart?: number;
}

export function StarJar({ starCount, estimatedDaysApart }: StarJarProps) {
  const visualCapacity = computeVisualCapacity(estimatedDaysApart);
  const starSize = computeStarSize(starCount, visualCapacity, SIZING);
  const rendered = Math.min(starCount, MAX_RENDERED_STARS);

  return (
    <View style={styles.jarBody}>
      <Svg width="100%" height="100%" viewBox="0 0 200 240" style={StyleSheet.absoluteFill} preserveAspectRatio="none">
        <Path
          d="M50 20 H150 V50 Q180 60 180 100 V200 Q180 230 150 230 H50 Q20 230 20 200 V100 Q20 60 50 50 Z"
          fill="rgba(120, 170, 255, 0.12)"
          stroke="#5B8DEF"
          strokeWidth={3}
        />
      </Svg>
      <View style={styles.starWrap}>
        {rendered === 0 ? (
          <Text style={styles.emptyText}>No stars yet — complete a cycle together to add the first one.</Text>
        ) : (
          Array.from({ length: rendered }).map((_, i) => (
            <Text key={i} style={{ fontSize: starSize }}>
              ⭐
            </Text>
          ))
        )}
      </View>
      {starCount > MAX_RENDERED_STARS && <Text style={styles.overflowText}>+{starCount - MAX_RENDERED_STARS} more</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  jarBody: { width: 220, height: 260, alignSelf: 'center', marginVertical: 16 },
  starWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-end',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 30,
  },
  emptyText: { textAlign: 'center', color: '#5B8DEF', fontSize: 13, marginTop: 60, paddingHorizontal: 12 },
  overflowText: { textAlign: 'center', color: '#5B8DEF', fontSize: 12, marginTop: 4 },
});
